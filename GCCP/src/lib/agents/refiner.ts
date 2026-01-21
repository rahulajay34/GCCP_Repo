import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class RefinerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Refiner", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are a Precise Text Editor.
Your goal is to apply specific feedback to refine the content without rewriting everything.
You output "Search and Replace" blocks to minimize token usage and preserve the rest of the text.`;
    }

    async *refineStream(content: string, feedback: string, signal?: AbortSignal) {
        const prompt = `You are a targeted text editor.
        
Current Content:
${content}

Feedback/Instructions:
${feedback}

TASK:
Apply the feedback by making specific edits. Do NOT rewrite the whole text.
Use the following strict format for each change:

<<<<<<< SEARCH
[Exact text to replace]
=======
[New improved text]
>>>>>>>

If no changes are needed for a specific part, do not output it.
Output multiple blocks if needed.`;

        yield* this.client.stream({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });
    }
}
