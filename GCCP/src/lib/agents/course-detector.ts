import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";

/**
 * CourseContext represents the automatically detected domain context
 * Used to tailor content generation for different educational domains
 */
export interface CourseContext {
    domain: string;              // e.g., "cybersecurity", "software-engineering"
    confidence: number;          // 0-1 confidence score
    characteristics: {
        exampleTypes: string[];    // Types of examples to use
        formats: string[];         // Preferred content formats
        vocabulary: string[];      // Domain-specific terms
        styleHints: string[];      // Writing style guidelines
        relatableExamples: string[]; // Real-world examples students can relate to
    };
    contentGuidelines: string;   // Detailed guidelines for Creator
    qualityCriteria: string;     // Quality criteria for Reviewer
}

export class CourseDetectorAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        // Using Haiku for cost efficiency - detection is a classification task
        super("CourseDetector", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are an Educational Content Domain Specialist.
Your task is to analyze educational content requests and determine the most appropriate domain context.

You understand various educational domains including:
- Software Engineering (coding, architecture, design patterns)
- Cybersecurity (threats, defense, vulnerabilities, compliance)
- Product Management (roadmaps, user research, stakeholders)
- Data Science & Analytics (statistics, ML, visualization)
- AI/ML (neural networks, training, models)
- Drone Technology (hardware, flight dynamics, sensors)
- Agentic Systems (multi-agent, workflows, tools)
- And any other technical or non-technical domain

Your output helps other agents tailor their content to the specific domain.

CRITICAL: You must output ONLY valid JSON. No additional text.`;
    }

    async detect(topic: string, subtopics: string, transcript?: string): Promise<CourseContext> {
        const prompt = `Analyze this educational content request and determine the domain context.

═══════════════════════════════════════════════════════════════
INPUT ANALYSIS
═══════════════════════════════════════════════════════════════

TOPIC: ${topic}
SUBTOPICS: ${subtopics}
${transcript ? `\nTRANSCRIPT EXCERPT (for additional context):\n${transcript.slice(0, 5000)}` : ''}

═══════════════════════════════════════════════════════════════
ANALYSIS REQUIRED
═══════════════════════════════════════════════════════════════

Based on the topic and subtopics:
1. What domain/field is this content for?
2. What types of examples would be most effective for students in this domain?
3. What content formats work best (code blocks, diagrams, case studies, math formulas)?
4. What vocabulary is natural for this domain?
5. How should the writing style be adapted?
6. What real-world examples would students in this field find relatable?

═══════════════════════════════════════════════════════════════
OUTPUT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "domain": "identified domain name (e.g., 'software-engineering', 'cybersecurity', 'product-management')",
  "confidence": <number 0.0-1.0>,
  "characteristics": {
    "exampleTypes": ["3-5 specific example types ideal for this domain"],
    "formats": ["preferred content formats like 'code blocks', 'mermaid diagrams', 'tables', 'latex math'"],
    "vocabulary": ["5-10 key domain terms to use naturally"],
    "styleHints": ["2-4 specific writing style guidelines"],
    "relatableExamples": ["3-5 real-world scenarios students can relate to"]
  },
  "contentGuidelines": "A detailed paragraph (3-5 sentences) explaining how to create effective educational content for this domain. Include what makes content engaging for students in this field, what to emphasize, and what approaches work best. Do NOT mention the domain name in this text.",
  "qualityCriteria": "A detailed paragraph explaining what makes high-quality content in this domain. What should reviewers look for? What are the must-haves? What are common pitfalls to avoid? Be specific and actionable."
}`;

        try {
            const response = await this.client.generate({
                system: this.getSystemPrompt(),
                messages: [{ role: "user", content: prompt }],
                model: this.model,
                temperature: 0.3 // Slightly creative but mostly deterministic
            });

            const text = response.content.find(b => b.type === 'text')?.text || "{}";
            const result = await parseLLMJson<any>(text, {});

            return {
                domain: result.domain || "general",
                confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
                characteristics: {
                    exampleTypes: result.characteristics?.exampleTypes || ["practical examples"],
                    formats: result.characteristics?.formats || ["markdown"],
                    vocabulary: result.characteristics?.vocabulary || [],
                    styleHints: result.characteristics?.styleHints || ["clear and accessible"],
                    relatableExamples: result.characteristics?.relatableExamples || []
                },
                contentGuidelines: result.contentGuidelines || "Create clear, engaging educational content with practical examples.",
                qualityCriteria: result.qualityCriteria || "Content should be accurate, well-structured, and engaging."
            };

        } catch (error) {
            console.error("CourseDetector failed:", error);
            // Return a safe fallback
            return {
                domain: "general",
                confidence: 0.3,
                characteristics: {
                    exampleTypes: ["practical examples", "real-world scenarios"],
                    formats: ["markdown", "code blocks where relevant"],
                    vocabulary: [],
                    styleHints: ["clear", "accessible", "engaging"],
                    relatableExamples: ["everyday technology use cases"]
                },
                contentGuidelines: "Create clear, well-structured educational content with practical examples that help students understand and apply the concepts.",
                qualityCriteria: "Content should be accurate, logically structured, and free of AI-sounding patterns. Include practical examples."
            };
        }
    }
}
