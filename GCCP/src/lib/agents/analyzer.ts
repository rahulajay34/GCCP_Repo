import { BaseAgent } from "./base-agent";
import { GapAnalysisResult } from "@/types/content";

export class AnalyzerAgent extends BaseAgent {
  constructor(client: any, model: string = "claude-haiku-4-5-20251001") {
    super("Analyzer", model, client);
  }

  getSystemPrompt(): string {
    return `You are a topic extraction specialist. Analyze the transcript and determine which subtopics were covered.
Return strictly valid JSON in the following format:
{
  "covered": ["exact string of subtopic 1", "exact string of subtopic 2"],
  "notCovered": ["exact string of subtopic 3"],
  "partiallyCovered": ["exact string of subtopic 4"],
  "transcriptTopics": ["topic 1 mentioned in transcript", "topic 2", "topic 3"]
}

IMPORTANT: transcriptTopics should list the main topics/concepts that ARE discussed in the transcript (regardless of whether they match the requested subtopics). Keep it brief - 5-10 bullet points max.`;
  }

  formatUserPrompt(subtopics: string, transcript: string): string {
    const subtopicList = subtopics.split(',').map(s => s.trim()).filter(Boolean);

    return `Subtopics to check:
${subtopicList.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Transcript:
${transcript}

Analyze carefully if each subtopic is fully covered, partially covered, or not mentioned at all in the transcript.
Also list the main topics that ARE covered in the transcript (even if they don't match the requested subtopics).`;
  }

  async analyze(subtopics: string, transcript: string, signal?: AbortSignal): Promise<GapAnalysisResult> {
    const response = await this.client.generate({
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: this.formatUserPrompt(subtopics, transcript) }],
      model: this.model,
      temperature: 0,
      signal
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Remove markdown code blocks first
      let jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();

      // Try to extract JSON object from any extra text
      // Find the first { and last } to extract just the JSON
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(jsonStr);

      return {
        covered: result.covered || [],
        notCovered: result.notCovered || [],
        partiallyCovered: result.partiallyCovered || [],
        transcriptTopics: result.transcriptTopics || [],
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error("Failed to parse analyzer response: ", content, e);
      // Fallback
      return {
        covered: [],
        notCovered: [],
        partiallyCovered: [],
        transcriptTopics: [],
        timestamp: new Date().toISOString()
      };
    }
  }
}
