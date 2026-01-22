import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return "You are a strict fact-checker. Output only the corrected text.";
    }

    async sanitize(content: string, transcript: string, signal?: AbortSignal): Promise<string> {
        if (!transcript) return content;

        const p = `You are a Fact Checker.
        
TRANSCRIPT:
${transcript.slice(0, 50000)}

CONTENT:
${content}

TASK:
Verify every claim in CONTENT against TRANSCRIPT.
- If a claim is consistent, keep it.
- If a claim is contradicted or unsupported (hallucination), REWRITE it to align with the transcript or REMOVE it.
- Maintain the original flow and tone.
- Do NOT add new information not in the content (unless correcting a fact).

OUTPUT:
Return the sanitized content ONLY. Do not add markdown blocks or conversational fillers.`;

        try {
            const stream = this.client.stream({
                system: "You are a strict fact-checker. Output only the corrected text.",
                messages: [{ role: "user", content: p }],
                model: this.model
            });

            let sanitized = "";
            for await (const chunk of stream) {
                if (signal?.aborted) throw new Error("Aborted");
                sanitized += chunk;
            }
            return sanitized || content;
        } catch (e) {
            console.error("Sanitizer failed", e);
            return content; // Fallback to original
        }
    }
}
