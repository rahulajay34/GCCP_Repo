import { BaseAgent } from "./base-agent";
import { CREATOR_SYSTEM_PROMPTS, getCreatorUserPrompt } from "@/prompts/creator";
import { ContentMode } from "@/types/content";

export class CreatorAgent extends BaseAgent {
  constructor(client: any, model: string = "claude-sonnet-4-5-20250929") {
    super("Creator", model, client);
  }

  getSystemPrompt(mode: ContentMode = "lecture"): string {
    return CREATOR_SYSTEM_PROMPTS[mode] || CREATOR_SYSTEM_PROMPTS["lecture"];
  }

  formatUserPrompt(topic: string, subtopics: string, mode: ContentMode, prerequisites?: string, assignmentCounts?: any): string {
    return getCreatorUserPrompt(topic, subtopics, mode, prerequisites, assignmentCounts);
  }

  async *generateStream(topic: string, subtopics: string, mode: ContentMode, prerequisites?: string, assignmentCounts?: any, signal?: AbortSignal) {
    const system = this.getSystemPrompt(mode);
    const user = this.formatUserPrompt(topic, subtopics, mode, prerequisites, assignmentCounts);

    yield* this.client.stream({
      system,
      messages: [{ role: "user", content: user }],
      model: this.model,
      signal
    });
  }
}
