import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { SanitizerAgent } from "./sanitizer";
import { RefinerAgent } from "./refiner";
import { FormatterAgent } from "./formatter";
import { ReviewerAgent } from "./reviewer"; // NEW
import { GenerationParams, GenerationState } from "@/types/content";
import { AuthManager } from "@/lib/storage/auth";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  private sanitizer: SanitizerAgent;
  private refiner: RefinerAgent;
  private formatter: FormatterAgent;
  private reviewer: ReviewerAgent; // NEW

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
    this.sanitizer = new SanitizerAgent(this.client);
    this.refiner = new RefinerAgent(this.client);
    this.formatter = new FormatterAgent(this.client);
    this.reviewer = new ReviewerAgent(this.client); // NEW
  }

  async *generate(params: GenerationParams, signal?: AbortSignal) {
    const { topic, subtopics, mode, additionalInstructions, transcript, assignmentCounts } = params;
    let currentCost = 0;
    let currentContent = "";

    // 1. Transcript Analysis (Optional)
    if (transcript && subtopics) {
      yield {
        type: "step",
        agent: "Analyzer",
        action: "Checking transcript coverage...",
        message: "Analyzing Gaps"
      };

      try {
        const analysis = await this.analyzer.analyze(subtopics, transcript, signal);
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
        if (signal?.aborted) throw err;
        console.error("Analysis failed", err);
        yield { type: "error", message: "Gap Analysis failed, continuing..." };
      }
    }

    // 2. Creator Phase
    yield {
      type: "step",
      agent: "Creator",
      action: "Drafting initial content...",
      message: "Writing Draft"
    };

    try {
      const stream = this.creator.generateStream(topic, subtopics, mode, additionalInstructions, assignmentCounts, signal);

      for await (const chunk of stream) {
        currentContent += chunk;
        yield {
          type: "chunk",
          content: chunk
        };
      }

      // Calculate costs for Creator
      const inputTokens = estimateTokens(this.creator.formatUserPrompt(topic, subtopics, mode));
      const outputTokens = estimateTokens(currentContent);
      const creatorCost = calculateCost("claude-sonnet-4-5-20250929", inputTokens, outputTokens);
      currentCost += creatorCost;

      // 3. Strictness Check (Sanitizer) - ONLY if transcript exists
      if (transcript) {
        yield {
          type: "step",
          agent: "Sanitizer",
          action: "Verifying facts against transcript...",
          message: "Fact Checking"
        };

        const sanitized = await this.sanitizer.sanitize(currentContent, transcript, signal);
        currentContent = sanitized; // Update content

        // Cost for Sanitizer
        const sInput = estimateTokens(transcript.slice(0, 50000) + currentContent);
        const sOutput = estimateTokens(sanitized);
        const sCost = calculateCost("claude-haiku-4-5-20251001", sInput, sOutput);
        currentCost += sCost;

        yield {
          type: "replace",
          content: currentContent
        };
      }

      // 4. QUALITY GATE (The Token Saver)
      yield {
        type: "step",
        agent: "Reviewer",
        action: "Assessing draft quality...",
        message: "Quality Check"
      };

      // Reviewer Logic
      // Cost for Reviewer
      const revInput = estimateTokens(currentContent + mode);
      // Rough output estimate
      const revOutput = 50;
      const revCost = calculateCost("claude-haiku-4-5-20251001", revInput, revOutput);
      currentCost += revCost;

      const review = await this.reviewer.review(currentContent, mode);

      if (review.needsPolish) {
        // Only run Refiner if needed
        yield {
          type: "step",
          agent: "Refiner",
          action: `Polishing: ${review.feedback}`,
          message: "Polishing Content"
        };

        let refined = "";
        // Note context: Reviewer feedback could be passed to Refiner if Refiner supported it. 
        // For now, RefinerAgent.refineStream takes (content, signal).
        // We'll rely on Refiner doing its standard job which is usually good enough, 
        // essentially the Reviewer acts as a boolean gate. 

        yield { type: "replace", content: "" };

        const refinerStream = this.refiner.refineStream(currentContent, signal);

        for await (const chunk of refinerStream) {
          if (signal?.aborted) throw new Error('Aborted');
          refined += chunk;
          yield { type: "chunk", content: chunk };
        }
        currentContent = refined;

        // Cost for Refiner
        const rInput = estimateTokens(params.topic + currentContent); // currentContent was pre-refinement
        const rOutput = estimateTokens(refined);
        const rCost = calculateCost("claude-sonnet-4-5-20250929", rInput, rOutput);
        currentCost += rCost;

      } else {
        yield {
          type: "step",
          agent: "Reviewer",
          action: "Draft meets Gold Standard. Skipping Polish.",
          message: "Quality Assured"
        };
      }

      // 5. Formatting - If mode is assignment
      if (mode === 'assignment') {
        yield {
          type: "step",
          agent: "Formatter",
          action: "Converting to structured data...",
          message: "Formatting"
        };

        const formatted = await this.formatter.formatAssignment(currentContent, signal);

        // Cost for Formatter
        const fInput = estimateTokens(currentContent);
        const fOutput = estimateTokens(formatted);
        const fCost = calculateCost("claude-haiku-4-5-20251001", fInput, fOutput);
        currentCost += fCost;

        yield {
          type: "formatted",
          content: formatted
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
        content: currentContent,
        cost: currentCost
      };

    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error('Aborted');
      }
      yield {
        type: "error",
        message: error.message || "Generation failed"
      };
    }
  }
}
