import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { SanitizerAgent } from "./sanitizer"; // NEW
import { FormatterAgent } from "./formatter"; // NEW
import { GenerationParams, GenerationState } from "@/types/content";
import { AuthManager } from "@/lib/storage/auth";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  private sanitizer: SanitizerAgent; // NEW
  private formatter: FormatterAgent; // NEW

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
    this.sanitizer = new SanitizerAgent(this.client);
    this.formatter = new FormatterAgent(this.client);
  }

  async *generate(params: GenerationParams) {
    const { topic, subtopics, mode, additionalInstructions, transcript } = params;
    let currentCost = 0;

    // 1. Transcript Analysis (Optional)
    if (transcript && subtopics) {
      yield {
        type: "step",
        agent: "Analyzer",
        status: "working",
        message: "Analyzing transcript coverage..."
      };

      try {
        const analysis = await this.analyzer.analyze(subtopics, transcript);
        // Calculate rough cost for analysis
        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        const stepCost = calculateCost("claude-haiku-4-5-20251001", inputTok, outputTok);
        currentCost += stepCost;

        yield {
          type: "gap_analysis",
          content: analysis
        };
      } catch (err) {
        console.error("Analysis failed", err);
        yield { type: "error", message: "Gap Analysis failed, continuing..." };
      }
    }

    // 2. Creator Phase
    yield {
      type: "step",
      agent: "Creator",
      status: "working",
      message: `Drafting ${mode} for ${topic}...`
    };

    let fullContent = "";

    try {
      const stream = this.creator.generateStream(topic, subtopics, mode, additionalInstructions);

      for await (const chunk of stream) {
        fullContent += chunk;
        yield {
          type: "chunk",
          content: chunk
        };
      }

      // Calculate costs for Creator
      const inputTokens = estimateTokens(this.creator.formatUserPrompt(topic, subtopics, mode));
      const outputTokens = estimateTokens(fullContent);
      const creatorCost = calculateCost("claude-sonnet-4-5-20250929", inputTokens, outputTokens);
      currentCost += creatorCost;

      // 3. Strictness Check (Sanitizer) - ONLY if transcript exists
      if (transcript) {
        yield {
          type: "step",
          agent: "Sanitizer",
          status: "working",
          message: "Auditing against Transcript (Strict Mode)..."
        };

        const sanitized = await this.sanitizer.sanitize(fullContent, transcript);
        fullContent = sanitized; // Update content

        // Cost for Sanitizer
        const sInput = estimateTokens(transcript.slice(0, 50000) + fullContent);
        const sOutput = estimateTokens(sanitized);
        const sCost = calculateCost("claude-haiku-4-5-20251001", sInput, sOutput);
        currentCost += sCost;

        yield {
          type: "replace",
          content: fullContent
        };
      }

      // 4. Formatting - If mode is assignment
      if (mode === 'assignment') {
        yield {
          type: "step",
          agent: "Formatter",
          status: "working",
          message: "Formatting Assignment to strict JSON..."
        };

        const formatted = await this.formatter.formatAssignment(fullContent);
        fullContent = formatted;

        // Cost for Formatter
        const fInput = estimateTokens(fullContent);
        const fOutput = estimateTokens(formatted);
        const fCost = calculateCost("claude-haiku-4-5-20251001", fInput, fOutput);
        currentCost += fCost;

        yield {
          type: "replace",
          content: fullContent
        };
      }

      // Update user stats
      const user = AuthManager.getCurrentUser();
      if (user) {
        user.usage.totalCost += currentCost;
        user.usage.requestCount += 1;
        AuthManager.updateUser(user);
      }

      yield {
        type: "complete",
        content: fullContent, // Final final content
        cost: currentCost
      };

    } catch (error: any) {
      yield {
        type: "error",
        message: error.message || "Generation failed"
      };
    }
  }
}
