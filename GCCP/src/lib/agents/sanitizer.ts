import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a strict Validator and Sanitizer.
Your goal is to inspect the "Draft Content" against the "Transcript".
Rules:
1. Identify any facts in the Draft that are NOT supported by the Transcript.
2. If a fact is supported, keep it.
3. If a fact is hallucinated or unsupported, remove it or rephrase it to align with the transcript.
4. Do not delete educational explanations if they are generally true, but remove specific claims about "what was said" if not in the transcript.
5. Return the cleaned, sanitized markdown content. Do not add meta-commentary.`;
    }

    async sanitize(draft: string, transcript: string, signal?: AbortSignal): Promise<string> {
        const prompt = `TRANSCRIPT:
${transcript.slice(0, 50000)} ... [truncated if too long]

DRAFT CONTENT:
${draft}

INSTRUCTIONS:
Refine the Draft Content to ensure strict adherence to the Transcript. Remove hallucinations. Output the Final Validated Markdown.`;

        // Haiku is cheap, we can do a direct generation
        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });

        const textBlock = response.content.find(b => b.type === 'text');
        return textBlock?.type === 'text' ? textBlock.text : '';
    }
}
