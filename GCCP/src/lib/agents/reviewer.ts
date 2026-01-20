import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class ReviewerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        // user prompted "claude-haiku-4-5-20251001" and we are strictly adhering to this model availability.
        super("Reviewer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(mode?: string): string {
        return "You are a Quality Assurance Editor. Be strict but efficient.";
    }

    async review(content: string, criteria: string): Promise<{ needsPolish: boolean; feedback: string }> {
        const prompt = `Review the following educational content based on this goal: "${criteria}".
        
        Content:
        ${content.slice(0, 10000)}... (truncated)

        Task:
        Rate the quality (0-10).
        If Quality > 8, return status "PASS".
        If Quality <= 8, return status "POLISH" and a bulleted list of 3 specific improvements needed.
        
        Output format JSON: { "status": "PASS" | "POLISH", "feedback": "..." }`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        });

        const text = response.content.find(b => b.type === 'text')?.text || "{}";
        try {
            // Clean up potentially messy JSON markdown
            const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();

            // Try to find the first JSON object if there's extra text
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : jsonText;

            const result = JSON.parse(cleanJson);

            return {
                needsPolish: result.status === "POLISH",
                feedback: result.feedback
            };
        } catch (e) {
            console.error("Reviewer JSON parse error", e);
            return { needsPolish: true, feedback: "General refinement due to parse error" }; // Fail safe
        }
    }
}
