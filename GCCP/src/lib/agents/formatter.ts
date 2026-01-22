import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { AssignmentItem } from "@/types/assignment";

export class FormatterAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Formatter", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Data Formatter.
Your job is to convert assignment content into structured JSON format.
CRITICAL: Preserve all markdown formatting inside contentBody and answerExplanation fields.
This includes code blocks with triple backticks, bold text, etc.
Do not strip or modify the content, only structure it as JSON.`;
    }

    async formatAssignment(content: string, signal?: AbortSignal): Promise<string> {
        // FAST PATH: Check if content is already valid JSON
        try {
            const fastParsed = await parseLLMJson<any[]>(content, []);
            if (fastParsed.length > 0) {
                // Check if it's already in new format
                if (fastParsed[0].questionType || fastParsed[0].contentBody) {
                    const validated = this.ensureAssignmentItemFormat(fastParsed);
                    console.log("Formatter: Fast Path (new format) - skipping LLM");
                    return JSON.stringify(validated, null, 2);
                }
            }
        } catch (e) {
            // Fast path failed, proceed to LLM
        }

        // LLM Path - ask model to format
        const prompt = `CONTENT:
${content}

INSTRUCTIONS:
Convert the above assignment content into the NEW JSON structure.

OUTPUT SCHEMA (EXACT FORMAT REQUIRED):
[
  {
    "questionType": "mcsc" | "mcmc" | "subjective",
    "contentBody": "Question text (preserve markdown)",
    "options": {
      "1": "First option",
      "2": "Second option",
      "3": "Third option",
      "4": "Fourth option"
    },
    "mcscAnswer": 2,           // For mcsc: number 1-4
    "mcmcAnswer": "1, 3",      // For mcmc: comma-separated numbers
    "subjectiveAnswer": "...", // For subjective: model answer
    "difficultyLevel": "Medium",
    "answerExplanation": "... (preserve markdown)"
  }
]

CRITICAL RULES:
1. Preserve ALL markdown formatting in contentBody and answerExplanation
2. Code blocks with triple backticks MUST be preserved exactly
3. Use \\n for newlines inside JSON strings
4. Output ONLY the JSON array, no markdown wrapper
5. Convert letter-based answers (A,B,C,D) to number-based (1,2,3,4)`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });

        const textBlock = response.content.find(b => b.type === 'text');
        let text = textBlock?.type === 'text' ? textBlock.text : '[]';

        // Only strip the OUTER markdown wrapper, NOT backticks inside JSON content
        // This regex matches ```json at the very start and ``` at the very end
        text = text.trim();
        if (text.startsWith('```json')) {
            text = text.slice(7);
        } else if (text.startsWith('```')) {
            text = text.slice(3);
        }
        if (text.endsWith('```')) {
            text = text.slice(0, -3);
        }
        text = text.trim();

        try {
            const parsed = await parseLLMJson<any[]>(text, []);
            const formatted = this.ensureAssignmentItemFormat(parsed);
            return JSON.stringify(formatted, null, 2);
        } catch (e) {
            console.error("Formatter JSON parse error, attempting recovery", e);
            return this.attemptRecovery(text);
        }
    }

    /**
     * Ensure all items conform to AssignmentItem interface
     */
    private ensureAssignmentItemFormat(items: any[]): AssignmentItem[] {
        return items.map(item => {
            // Ensure options is an object with keys 1-4
            let options = item.options;
            if (Array.isArray(options)) {
                options = {
                    1: options[0] || '',
                    2: options[1] || '',
                    3: options[2] || '',
                    4: options[3] || '',
                };
            } else if (!options) {
                options = { 1: '', 2: '', 3: '', 4: '' };
            }

            // Normalize questionType
            let questionType = item.questionType || 'mcsc';
            questionType = questionType.toLowerCase();

            // Handle answer conversion from letters to numbers
            let mcscAnswer = item.mcscAnswer;
            let mcmcAnswer = item.mcmcAnswer;

            if (item.correct_option && !mcscAnswer && !mcmcAnswer) {
                const letterToNum: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
                if (questionType === 'mcsc') {
                    mcscAnswer = letterToNum[item.correct_option.toUpperCase().trim()] || 1;
                } else if (questionType === 'mcmc') {
                    const letters = item.correct_option.split(',').map((l: string) => l.trim().toUpperCase());
                    mcmcAnswer = letters.map((l: string) => letterToNum[l]).filter(Boolean).join(', ');
                }
            }

            return {
                questionType,
                contentType: 'markdown' as const,
                contentBody: item.contentBody || item.question_text || '',
                options,
                mcscAnswer: questionType === 'mcsc' ? mcscAnswer : undefined,
                mcmcAnswer: questionType === 'mcmc' ? mcmcAnswer : undefined,
                subjectiveAnswer: questionType === 'subjective' ? (item.subjectiveAnswer || item.model_answer) : undefined,
                difficultyLevel: item.difficultyLevel || 'Medium',
                answerExplanation: item.answerExplanation || item.explanation || '',
            } as AssignmentItem;
        });
    }

    /**
     * Attempt to recover from parse errors
     */
    private attemptRecovery(text: string): string {
        try {
            const questions: any[] = [];
            const objectMatches = text.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

            for (const match of objectMatches) {
                try {
                    const obj = JSON.parse(match[0]);
                    if ((obj.questionType) && (obj.contentBody)) {
                        questions.push(obj);
                    }
                } catch {
                    // Skip malformed objects
                }
            }

            if (questions.length > 0) {
                console.log(`Recovered ${questions.length} questions from partial JSON`);
                const formatted = this.ensureAssignmentItemFormat(questions);
                return JSON.stringify(formatted, null, 2);
            }
        } catch (recoveryError) {
            console.error("Recovery also failed", recoveryError);
        }

        return '[]';
    }
}
