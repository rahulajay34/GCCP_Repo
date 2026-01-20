import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class FormatterAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Formatter", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Data Formatter.
Your job is to convert Markdown content into structured JSON formats strictly.
Do not change the content, just the structure.`;
    }

    async formatAssignment(content: string): Promise<string> {
        const prompt = `CONTENT:
${content}

INSTRUCTIONS:
Convert the above assignment content into the following JSON structure:
[
  {
    "type": "MCSC" | "MCMC" | "Subjective",
    "question_text": "...",
    "options": ["A", "B", "C", "D"], // if applicable
    "correct_option": "A", // if MCSC
    "correct_options": ["A", "C"], // if MCMC
    "explanation": "...",
    "model_answer": "..." // if Subjective
  }
]
Output ONLY legitimate JSON. No markdown code blocks.`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        });

        const textBlock = response.content.find(b => b.type === 'text');
        const text = textBlock?.type === 'text' ? textBlock.text : '';

        return text.replace(/```json/g, '').replace(/```/g, '').trim();
    }
}
