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

  formatUserPrompt(topic: string, subtopics: string, mode: ContentMode, prerequisites?: string): string {
    return getCreatorUserPrompt(topic, subtopics, mode, prerequisites);
  }

  async *generateStream(topic: string, subtopics: string, mode: ContentMode, prerequisites?: string) {
    const system = this.getSystemPrompt(mode);
    const user = this.formatUserPrompt(topic, subtopics, mode, prerequisites);

    yield* this.client.stream({
      system,
      messages: [{ role: "user", content: user }],
      model: this.model
    });
  }
}
