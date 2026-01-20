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
  "partiallyCovered": ["exact string of subtopic 4"]
}`;
  }

  formatUserPrompt(subtopics: string, transcript: string): string {
    const subtopicList = subtopics.split(',').map(s => s.trim()).filter(Boolean);
    
    return `Subtopics to check:
${subtopicList.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Transcript:
${transcript}

Analyze carefully if each subtopic is fully covered, partially covered, or not mentioned at all in the transcript.`;
  }

  async analyze(subtopics: string, transcript: string): Promise<GapAnalysisResult> {
    const response = await this.client.generate({
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: this.formatUserPrompt(subtopics, transcript) }],
      model: this.model,
      temperature: 0
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      // Basic JSON cleanup if needed
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(jsonStr);
      
      return {
        covered: result.covered || [],
        notCovered: result.notCovered || [],
        partiallyCovered: result.partiallyCovered || [],
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error("Failed to parse analyzer response", e);
      // Fallback
      return {
        covered: [],
        notCovered: [],
        partiallyCovered: [],
        timestamp: new Date().toISOString()
      };
    }
  }
}
