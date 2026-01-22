import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { CourseContext } from "@/types/content";

export class RefinerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Refiner", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are an Expert Content Editor and Polisher.
Your goal is to apply specific feedback to refine educational content to Gold Standard quality.

You output "Search and Replace" blocks to minimize token usage and preserve the rest of the text.

CRITICAL FORMATTING RULES:
- Preserve ALL markdown formatting (headers, bold, italic)
- Preserve triple backticks for code blocks (\`\`\`python ... \`\`\`)
- Never strip or modify code block delimiters
- Maintain valid JSON syntax when editing JSON content

CRITICAL CONTENT RULES:
- REMOVE all AI-sounding phrases ("It's important to note", "Let's dive in", etc.)
- REMOVE all meta-references to courses, materials, or generation process
- Keep language natural and conversational
- Ensure examples are concrete and relatable`;
    }

    async *refineStream(
        content: string,
        feedback: string,
        detailedFeedback?: string[],
        courseContext?: CourseContext,
        signal?: AbortSignal
    ) {
        // Build domain context hint if available
        const domainHint = courseContext ? `
DOMAIN CONTEXT (use this to guide your refinements):
- Style: ${courseContext.characteristics.styleHints.join(', ')}
- Good examples for this domain: ${courseContext.characteristics.exampleTypes.slice(0, 3).join(', ')}
` : '';

        // Build detailed feedback section
        const detailedSection = detailedFeedback && detailedFeedback.length > 0 ? `
═══════════════════════════════════════════════════════════════
📋 DETAILED ISSUES TO FIX (from Reviewer):
═══════════════════════════════════════════════════════════════
${detailedFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}
` : '';

        const prompt = `You are an expert content editor making targeted improvements.
${domainHint}
═══════════════════════════════════════════════════════════════
📝 CURRENT CONTENT:
═══════════════════════════════════════════════════════════════
${content}

═══════════════════════════════════════════════════════════════
🎯 FEEDBACK SUMMARY:
═══════════════════════════════════════════════════════════════
${feedback}
${detailedSection}
═══════════════════════════════════════════════════════════════
🔧 YOUR TASK:
═══════════════════════════════════════════════════════════════

Apply ALL the feedback by making specific edits. Do NOT rewrite the whole text.

MANDATORY FIXES (always do these even if not explicitly mentioned):
1. Remove AI-sounding phrases:
   - "It's important to note that..." → Remove or rephrase naturally
   - "Let's dive in..." → Just start the content
   - "As mentioned earlier..." → Reference directly
   - "crucial", "essential", "fundamental" (if overused) → Use variety

2. Remove meta-references:
   - "In this section/module/lecture..." → Just teach directly
   - "According to the transcript..." → State facts directly
   - Any course/program names → Remove completely

3. Make content engaging:
   - Convert passive voice to active
   - Add concrete examples where abstract
   - Use "you" language

OUTPUT FORMAT - Use this exact format for each change:

<<<<<<< SEARCH
[Exact text to find and replace - copy EXACTLY from content above]
=======
[Your improved replacement text]
>>>>>>>

CRITICAL RULES:
1. Each SEARCH block must contain text that exists EXACTLY in the content
2. Output multiple blocks for multiple changes
3. PRESERVE all markdown formatting
4. If no changes needed, output: NO_CHANGES_NEEDED`;

        yield* this.client.stream({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });
    }
}
