import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { CourseContext } from "@/types/content";

export interface ReviewResult {
    needsPolish: boolean;
    feedback: string;
    detailedFeedback: string[];  // Detailed list of issues for Refiner
    score: number;
}

export class ReviewerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Reviewer", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are a STRICT Content Quality Reviewer for educational materials.
Your job is to ensure content meets Gold Standard quality.

You are VERY STRICT - only perfect content passes without refinement.
You provide DETAILED, ACTIONABLE feedback for the Refiner agent.

Return JSON only.`;
    }

    async review(content: string, mode: string, courseContext?: CourseContext): Promise<ReviewResult> {
        // Build domain-specific criteria if available
        const domainCriteria = courseContext ? `
DOMAIN-SPECIFIC REQUIREMENTS (${courseContext.domain}):
${courseContext.qualityCriteria}

Expected example types: ${courseContext.characteristics.exampleTypes.slice(0, 3).join(', ')}
Expected formats: ${courseContext.characteristics.formats.slice(0, 3).join(', ')}
` : '';

        const prompt = `You are a STRICT Quality Reviewer. Review this educational content with high standards.

═══════════════════════════════════════════════════════════════
CONTENT TO REVIEW:
═══════════════════════════════════════════════════════════════
${content.slice(0, 20000)}

═══════════════════════════════════════════════════════════════
STRICT EVALUATION CRITERIA:
═══════════════════════════════════════════════════════════════

${domainCriteria}

MANDATORY CHECKS (Automatic fail if violated):
1. ❌ AI-SOUNDING PATTERNS: Look for robotic phrases like:
   - "It's important to note that..."
   - "Let's dive in..." / "Let's explore..."
   - "In this section, we will..."
   - "As mentioned earlier..."
   - "According to the transcript/material..."
   - "As an AI..." or "I've generated..."
   - Excessive use of "crucial", "essential", "fundamental"
   
2. ❌ META-REFERENCES: Content must NOT reference:
   - The transcript, source material, or generation process
   - "This course", "this module", "this lesson" excessively
   - Any course/program names

3. ❌ ENGAGEMENT: Content must NOT be:
   - Dry and textbook-like
   - Overly formal or stiff
   - Missing concrete examples

4. ❌ DOLLAR SIGN FORMATTING: Check for unescaped '$' symbols.
   - All '$' should be escaped as '\\$' to prevent LaTeX misinterpretation
   - Exception: Actual LaTeX math equations are OK
   
5. ❌ BROKEN MARKDOWN/FORMATTING: Check for:
   - Unclosed HTML tags (e.g., <br> without closing if needed, though self-closing is fine)
   - Broken tables (missing pipes | or alignment)
   - Malformed lists (mixed markers without indentation)
   - Unclosed code blocks (missing triple backticks)
   - Improper header hierarchy (h1 -> h3 without h2)

QUALITY CHECKS (Score reduction):
6. CLARITY: Is language direct and easy to understand?
7. STRUCTURE: Are headings logical? Is progression clear?
8. EXAMPLES: Are examples relevant, practical, and domain-appropriate?
9. COMPLETENESS: Does it cover the topic thoroughly?
10. FLOW: Does it read naturally, like expert teaching?

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY):
═══════════════════════════════════════════════════════════════

{
  "score": <0-10>,
  "needsPolish": <boolean - TRUE if score < 9>,
  "summary": "One-line summary of overall quality",
  "issues": [
    {
      "category": "ai_patterns|meta_references|engagement|clarity|structure|examples|completeness|flow",
      "severity": "high|medium|low",
      "description": "Specific issue description",
      "fix_instruction": "Exactly what the Refiner should do to fix this"
    }
  ]
}

SCORING GUIDELINES:
- 10: Perfect - engaging, clear, domain-appropriate, no AI patterns
- 9: Excellent - minor polish might help but not required
- 7-8: Good but has noticeable issues that should be fixed
- 5-6: Mediocre - multiple issues affecting quality
- <5: Poor - major rewrite needed

Be STRICT. Most first drafts should score 7-8.`;

        try {
            const response = await this.client.generate({
                system: this.getSystemPrompt(),
                messages: [{ role: "user", content: prompt }],
                model: this.model,
                temperature: 0.2 // Low temperature for consistent, strict evaluation
            });

            const text = response.content.find(b => b.type === 'text')?.text || "{}";
            const result = await parseLLMJson<any>(text, { score: 7, needsPolish: true, issues: [] });

            const score = typeof result.score === 'number' ? result.score : 7;

            // Extract detailed feedback from issues for Refiner
            const detailedFeedback: string[] = [];
            if (Array.isArray(result.issues)) {
                for (const issue of result.issues) {
                    if (issue.fix_instruction) {
                        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
                        detailedFeedback.push(`${severity} [${issue.category}] ${issue.fix_instruction}`);
                    }
                }
            }

            // Build summary feedback for logging
            const summaryFeedback = result.summary ||
                (detailedFeedback.length > 0
                    ? detailedFeedback.slice(0, 2).join('; ')
                    : "General polish needed");

            return {
                needsPolish: score < 9, // Strict: must be 9+ to pass
                feedback: summaryFeedback,
                detailedFeedback,
                score
            };

        } catch (e) {
            console.error("Reviewer failed", e);
            return {
                needsPolish: true, // Assume needs work if review fails
                feedback: "Review failed - recommend polish pass",
                detailedFeedback: ["Review process failed - do a general quality pass"],
                score: 7
            };
        }
    }
}
