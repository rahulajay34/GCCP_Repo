import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { RefinerAgent } from "./refiner";
import { FormatterAgent } from "./formatter";
import { ValidatorAgent } from "./validator";
import { sanitizeAIPatterns } from "./utils/content-sanitizer";
import { GenerationParams, GenerationState } from "@/types/content";
import { AuthManager } from "@/lib/storage/auth";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";
import { cacheGapAnalysis, simpleHash } from "@/lib/utils/cache";

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  private validator: ValidatorAgent;
  private refiner: RefinerAgent;
  private formatter: FormatterAgent;

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
    this.validator = new ValidatorAgent(this.client);
    this.refiner = new RefinerAgent(this.client);
    this.formatter = new FormatterAgent(this.client);
  }

  async *generate(params: GenerationParams, signal?: AbortSignal) {
    const { topic, subtopics, mode, additionalInstructions, transcript, assignmentCounts } = params;
    let currentCost = 0;
    let currentContent = "";
    let gapAnalysisResult: { covered: string[]; notCovered: string[]; partiallyCovered: string[]; transcriptTopics: string[]; timestamp: string } | null = null;

    // 1. Transcript Analysis (Optional)
    let useTranscript = !!transcript; // Track if we should use the transcript

    if (transcript && subtopics) {
      yield {
        type: "step",
        agent: "Analyzer",
        action: "Checking transcript coverage...",
        message: "Analyzing Gaps"
      };

      try {
        // Use smart caching for gap analysis - avoids redundant API calls for same inputs
        const cacheKey = `${topic}:${subtopics.slice(0, 100)}`;
        const analysis = await cacheGapAnalysis(
          cacheKey,
          transcript,
          subtopics,
          () => this.analyzer.analyze(subtopics, transcript, signal)
        );
        gapAnalysisResult = analysis; // Store for passing to creator

        // Calculate rough cost for analysis (only if not cached)
        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        const stepCost = calculateCost("claude-haiku-4-5-20251001", inputTok, outputTok);
        currentCost += stepCost;

        yield {
          type: "gap_analysis",
          content: analysis
        };

        // EARLY MISMATCH DETECTION: If NO subtopics are covered at all, the transcript is irrelevant
        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;

        if (totalSubtopics > 0 && coveredCount === 0) {
          // Transcript is completely irrelevant - STOP and let user decide
          yield {
            type: "step",
            agent: "Analyzer",
            action: "⚠️ Transcript doesn't match topic - stopping for user decision",
            message: "Mismatch Detected"
          };

          // Yield a special mismatch_stop event and return early
          yield {
            type: "mismatch_stop",
            message: "The transcript appears unrelated to the topic/subtopics. None of the subtopics were found in the transcript.",
            cost: currentCost
          };

          // Stop generation here - user must decide what to do
          return;
        }
      } catch (err) {
        if (signal?.aborted) throw err;
        console.error("Analysis failed", err);
        yield { type: "error", message: "Gap Analysis failed, continuing..." };
      }
    }

    // 2. Creator Phase - Now with transcript and gap analysis
    yield {
      type: "step",
      agent: "Creator",
      action: useTranscript ? "Drafting content from transcript..." : "Drafting initial content...",
      message: "Writing Draft"
    };

    try {
      const creatorOptions = {
        topic,
        subtopics,
        mode,
        transcript: useTranscript ? transcript : undefined, // Only pass transcript if it's relevant
        gapAnalysis: useTranscript ? (gapAnalysisResult || undefined) : undefined,
        assignmentCounts
      };

      const stream = this.creator.generateStream(creatorOptions, signal);

      for await (const chunk of stream) {
        currentContent += chunk;
        yield {
          type: "chunk",
          content: chunk
        };
      }

      // Calculate costs for Creator
      const inputTokens = estimateTokens(this.creator.formatUserPrompt(creatorOptions));
      const outputTokens = estimateTokens(currentContent);
      const creatorCost = calculateCost("claude-sonnet-4-5-20250929", inputTokens, outputTokens);
      currentCost += creatorCost;

      // 3. Validator (Combined Fact Check + Quality Check)
      yield {
        type: "step",
        agent: "Validator",
        action: "Verifying facts and assessing quality...",
        message: "Validating"
      };

      // Cost for Validator
      const valInput = estimateTokens((useTranscript ? transcript?.slice(0, 50000) : '') + currentContent);
      const valOutput = 200; // rough estimate for JSON feedback
      const valCost = calculateCost("claude-haiku-4-5-20251001", valInput, valOutput);
      currentCost += valCost;

      const validation = await this.validator.validate(currentContent, transcript || null, mode);

      if (!validation.isValid) {
        // Only run Refiner if needed
        yield {
          type: "step",
          agent: "Refiner",
          action: `Polishing: ${validation.feedback}`,
          message: "Polishing Content"
        };

        let refined = "";
        // Note context: Reviewer feedback could be passed to Refiner if Refiner supported it. 
        // For now, RefinerAgent.refineStream takes (content, signal).
        // We'll rely on Refiner doing its standard job which is usually good enough, 
        // essentially the Reviewer acts as a boolean gate. 

        // Add clear communication before rewrite
        yield {
          type: "step",
          agent: "Refiner",
          action: "Applying targeted improvements...",
          message: "Refining Content"
        };

        // We do NOT wipe content here anymore (yield { type: "replace", content: "" })
        // because we are patching, not rewriting entirely.

        const refinerStream = this.refiner.refineStream(currentContent, validation.feedback, signal);
        let patchOutput = "";

        for await (const chunk of refinerStream) {
          if (signal?.aborted) throw new Error('Aborted');
          patchOutput += chunk;
          // We don't stream chunks blindly to UI because it's search/replace syntax
          // yield { type: "chunk", content: chunk }; 
        }

        // Apply Patches
        let refinedContent = currentContent;
        const blocks = patchOutput.split('<<<<<<< SEARCH');
        let appliedCount = 0;

        for (const block of blocks) {
          if (!block.trim()) continue;
          const parts = block.split('=======');
          if (parts.length === 2) {
            const search = parts[0].trim();
            const replaceParts = parts[1].split('>>>>>>>');
            const replace = replaceParts[0].trim();

            if (refinedContent.includes(search)) {
              refinedContent = refinedContent.replace(search, replace);
              appliedCount++;
            }
          }
        }

        if (appliedCount > 0) {
          currentContent = refinedContent;
          yield { type: "replace", content: currentContent };
          yield {
            type: "step",
            agent: "Refiner",
            action: `Applied ${appliedCount} fix${appliedCount !== 1 ? 'es' : ''}`,
            message: "Polished"
          };
        } else {
          // FALLBACK: User safety - if patching fails, keep original
          console.warn("Refiner ran but no patch blocks were detected in output of length: " + patchOutput.length);
          yield {
            type: "step",
            agent: "Refiner",
            action: "Formatting mismatch - keeping original draft.",
            message: "Polishing Skipped"
          };
        }

        // Cost for Refiner (use patchOutput since refined was never assigned)
        const rInput = estimateTokens(currentContent + (validation.feedback || ''));
        const rOutput = estimateTokens(patchOutput);
        const rCost = calculateCost("claude-sonnet-4-5-20250929", rInput, rOutput);
        currentCost += rCost;

      } else {
        yield {
          type: "step",
          agent: "Validator",
          action: "Content meets standards. Skipping Polish.",
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

      // Final cleanup: Remove any AI-sounding patterns that slipped through
      // Only for lecture/pre-read modes (assignment content is structured JSON)
      if (mode !== 'assignment') {
        currentContent = sanitizeAIPatterns(currentContent);
        yield {
          type: "replace",
          content: currentContent
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
