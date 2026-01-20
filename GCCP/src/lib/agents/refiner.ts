import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class RefinerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Refiner", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are a Content Polisher and Editor. 
Your goal is to refine educational content to be "Gold Standard".
1. Improve formatting (use bolding, lists, and clear headers).
2. Fix any grammar or awkward phrasing.
3. Ensure the tone is professional yet engaging.
4. Do NOT remove core information, only improve the presentation.
5. Return the full polished Markdown.`;
    }

    async *refineStream(content: string, signal?: AbortSignal) {
        const prompt = `Please polish the following draft content:\n\n${content}`;

        yield* this.client.stream({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        }); // signal handling is inside client.stream if supported, or handled by orchestrator loop
    }
}
