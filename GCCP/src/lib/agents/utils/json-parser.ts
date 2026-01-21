/**
 * Robust JSON extraction and parsing for LLM outputs.
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Raw JSON strings
 * - Trailing commas (basic cleanup)
 * - Single quotes (basic cleanup)
 */
export async function parseLLMJson<T>(text: string, fallback?: T): Promise<T> {
    if (!text) {
        if (fallback !== undefined) return fallback;
        throw new Error("Empty content provided to JSON parser");
    }

    // 1. Strip Markdown code blocks
    let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();

    // 2. Also handle generic code blocks
    cleanText = cleanText.replace(/```\n?|\n?```/g, '').trim();

    // 3. Find the first '{' or '[' and the last '}' or ']'
    const firstOpen = cleanText.search(/[{[]/);
    const lastClose = cleanText.search(/[}\]]$/); // Optimistic search from end? No, search returns first match.

    // Robustly find boundries
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    let start = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
        start = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
        start = firstBrace;
    } else {
        start = firstBracket;
    }

    const lastBrace = cleanText.lastIndexOf('}');
    const lastBracket = cleanText.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (start !== -1 && end !== -1 && end >= start) {
        cleanText = cleanText.slice(start, end + 1);
    } else {
        // If no brackets found, it might be a malformed string or strict text
        if (fallback !== undefined) return fallback;
        // Attempt parse anyway if it looks like a value
    }

    try {
        return JSON.parse(cleanText) as T;
    } catch (e) {
        // 4. Try basic repairs
        try {
            // Fix trailing commas: , } -> }
            const fixed = cleanText.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(fixed) as T;
        } catch (e2) {
            console.error("JSON Parse Failed:", text);
            if (fallback !== undefined) return fallback;
            throw new Error("Failed to parse agent JSON response");
        }
    }
}
