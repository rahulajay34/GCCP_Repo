import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class RefinerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Refiner", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are a Precise Text Editor.
Your goal is to apply specific feedback to refine the content without rewriting everything.
You output "Search and Replace" blocks to minimize token usage and preserve the rest of the text.

CRITICAL: Preserve ALL markdown formatting, especially:
- Triple backticks for code blocks (\`\`\`python ... \`\`\`)
- Bold, italic, headers
- Never strip or modify code block delimiters`;
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

CRITICAL RULES:
1. If no changes are needed for a specific part, do not output it.
2. Output multiple blocks if needed.
3. PRESERVE ALL MARKDOWN FORMATTING - especially triple backticks for code blocks.
4. Do NOT remove or modify \`\`\`python or \`\`\` markers in code blocks.
5. When the content is JSON, be very careful to maintain valid JSON syntax.`;

        yield* this.client.stream({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });
    }
}
