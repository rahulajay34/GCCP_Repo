import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";

export class FormatterAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Formatter", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Data Formatter.
Your job is to convert assignment content into structured JSON format.
CRITICAL: Preserve all markdown formatting inside question_text and explanation fields.
This includes code blocks with triple backticks, bold text, etc.
Do not strip or modify the content, only structure it as JSON.`;
    }

    async formatAssignment(content: string, signal?: AbortSignal): Promise<string> {
        const prompt = `CONTENT:
${content}

INSTRUCTIONS:
Convert the above assignment content into the following JSON structure:
[
  {
    "type": "MCSC" | "MCMC" | "Subjective",
    "question_text": "... (preserve markdown including code blocks)",
    "options": ["A", "B", "C", "D"], // if applicable
    "correct_option": "A", // if MCSC, or "A,C" if MCMC
    "explanation": "... (preserve markdown)",
    "model_answer": "..." // if Subjective
  }
]

CRITICAL RULES:
1. Preserve ALL markdown formatting in question_text and explanation fields
2. Code blocks with triple backticks MUST be preserved exactly
3. Use \\n for newlines inside JSON strings
4. Output ONLY the JSON array, no markdown wrapper`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });

        const textBlock = response.content.find(b => b.type === 'text');
        const text = textBlock?.type === 'text' ? textBlock.text : '[]';

        try {
            const parsed = await parseLLMJson<any[]>(text, []);
            // Return nicely formatted JSON string
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            console.error("Formatter JSON parse error", e);
            return '[]';
        }
    }
}
