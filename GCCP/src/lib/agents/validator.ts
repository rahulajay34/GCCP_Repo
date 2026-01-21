import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";

export interface ValidationResult {
    isValid: boolean;     // If true, no refinement needed (Score > 8 AND No hallucinations)
    needsRefinement: boolean;
    score: number;
    feedback: string;
    issues: string[];     // specific issues found
}

export class ValidatorAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        // Using Haiku for cost efficiency check
        super("Validator", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Lead Editor and Fact Checker.
Your goal is to validate educational content for:
1. ACCURACY: Verify facts against the provided Source Material (if any).
2. QUALITY: Assess clarity, flow, structure, and engagement.

Be strict but constructive. High quality content should pass without interference.`;
    }

    async validate(content: string, transcript: string | null, mode: string): Promise<ValidationResult> {
        let prompt = `Validate the following content.`;

        if (transcript) {
            prompt += `\n\nSOURCE MATERIAL (Transcript):
${transcript.slice(0, 50000)}${transcript.length > 50000 ? '...[truncated]' : ''}
⚠️ CRITICAL: Check for hallucinations. Any claim in the content NOT supported by the source must be flagged. Educational explanations are allowed, but specific attributions or claims about "what was said" must be accurate.`;
        }

        prompt += `\n\nCONTENT TO DATACHECK:
${content.slice(0, 15000)}

EVALUATION CRITERIA:
1. Hallucinations: Are there claims not supported by the transcript? (Fail immediately if yes)
2. Clarity: Is the writing clear, concise, and easy to understand?
3. Structure: Does it follow a logical flow?
4. AI Patterns: Are there robotic phrases like "In this section...", "As mentioned..."?

OUTPUT FORMAT (JSON ONLY):
{
  "score": <number 0-10>,
  "has_hallucinations": <boolean>,
  "main_issues": ["list", "of", "major", "issues"],
  "refinement_instructions": "Specific instructions for the editor to fix the issues. If score > 8 and no hallucinations, keep brief."
}

SCORING:
- 9-10: Perfect accuracy, great style. (PASS)
- < 9: Hallucinations present OR style needs work. (NEEDS REFINEMENT)
`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        });

        const text = response.content.find(b => b.type === 'text')?.text || "{}";

        try {
            const result = await parseLLMJson<any>(text, {});
            const score = typeof result.score === 'number' ? result.score : 7;
            const hasHallucinations = !!result.has_hallucinations;

            // It needs refinement if score is low OR hallucinations exist
            const needsRefinement = score <= 8 || hasHallucinations;

            // Construct feedback
            let feedback = result.refinement_instructions || "General polish needed.";
            if (hasHallucinations) {
                feedback = `Fix hallucinations: ${feedback}`;
            }

            return {
                isValid: !needsRefinement,
                needsRefinement,
                score,
                feedback,
                issues: result.main_issues || []
            };
        } catch (e) {
            console.error("Validator JSON parse error", e);
            return {
                isValid: false,
                needsRefinement: true,
                score: 5,
                feedback: "Validate and polish content (parser error).",
                issues: ["Parser error"]
            };
        }
    }
}
