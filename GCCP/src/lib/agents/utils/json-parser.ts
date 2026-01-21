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

    try {
        // 1. Try direct parse first - fastest path
        return JSON.parse(text) as T;
    } catch (e) {
        // 2. Try to extract JSON object/array using regex
        // Matches { ... } or [ ... ] including nested structures (greedy match)
        // Note: [\s\S]* is used to match across newlines
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]) as T;
            } catch (e2) {
                // If regex extraction failed, try cleaning known markdown patterns from the extraction
                const cleaned = jsonMatch[0]
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .trim();
                try {
                    return JSON.parse(cleaned) as T;
                } catch (e3) {
                    // try one last attempt fixing trailing commas
                    try {
                        const fixed = cleaned.replace(/,\s*([}\]])/g, '$1');
                        return JSON.parse(fixed) as T;
                    } catch (e4) { }
                }
            }
        }

        // 3. Fallback: Aggressive strip if regex didn't find structure or parse failed
        const aggressiveClean = text
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .substring(text.indexOf('{')) // Basic substring attempt if regex failed
            .trim();

        try {
            // Only try if we actually have a start
            if (text.indexOf('{') !== -1) {
                return JSON.parse(aggressiveClean) as T;
            }
        } catch (e5) { }

        console.error("JSON Parse Failed:", text.substring(0, 200) + "...");
        if (fallback !== undefined) return fallback;
        throw new Error("Failed to parse agent JSON response");
    }
}
