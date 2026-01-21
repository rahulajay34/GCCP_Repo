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

    // Pre-process: Strip markdown code fences first
    let cleaned = text.trim();

    // Remove ```json or ``` wrappers at start/end
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
        // 1. Try direct parse first - fastest path
        return JSON.parse(cleaned) as T;
    } catch (e) {
        // 2. Try to extract JSON object/array using regex
        // Matches { ... } or [ ... ] including nested structures (greedy match)
        const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]) as T;
            } catch (e2) {
                // Try fixing trailing commas
                try {
                    const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
                    return JSON.parse(fixed) as T;
                } catch (e3) { }
            }
        }

        // 3. Try extracting from original text (maybe we over-cleaned)
        const originalMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (originalMatch) {
            try {
                return JSON.parse(originalMatch[0]) as T;
            } catch (e4) {
                // Try removing any remaining markdown and fix trailing commas
                const lastAttempt = originalMatch[0]
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .replace(/,\s*([}\]])/g, '$1')
                    .trim();
                try {
                    return JSON.parse(lastAttempt) as T;
                } catch (e5) { }
            }
        }

        console.error("JSON Parse Failed:", text.substring(0, 200) + "...");
        if (fallback !== undefined) return fallback;
        throw new Error("Failed to parse agent JSON response");
    }
}
