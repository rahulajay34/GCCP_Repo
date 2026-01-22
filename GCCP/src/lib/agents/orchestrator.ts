import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { SanitizerAgent } from "./sanitizer";
import { RefinerAgent } from "./refiner";
import { FormatterAgent } from "./formatter";
import { ReviewerAgent } from "./reviewer";
import { CourseDetectorAgent, CourseContext } from "./course-detector";
import { GenerationParams } from "@/types/content";
import { AuthManager } from "@/lib/storage/auth";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";
import { cacheGapAnalysis, cache, simpleHash } from "@/lib/utils/cache";
import { applySearchReplace } from "./utils/text-diff";

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  private sanitizer: SanitizerAgent;
  private refiner: RefinerAgent;
  private formatter: FormatterAgent;
  private reviewer: ReviewerAgent;
  private courseDetector: CourseDetectorAgent;

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
    this.sanitizer = new SanitizerAgent(this.client);
    this.refiner = new RefinerAgent(this.client);
    this.formatter = new FormatterAgent(this.client);
    this.reviewer = new ReviewerAgent(this.client);
    this.courseDetector = new CourseDetectorAgent(this.client);
  }

  async *generate(params: GenerationParams, signal?: AbortSignal) {
    const { topic, subtopics, mode, additionalInstructions, transcript, assignmentCounts } = params;
    let currentCost = 0;
    let currentContent = "";
    let gapAnalysisResult: { covered: string[]; notCovered: string[]; partiallyCovered: string[]; transcriptTopics: string[]; timestamp: string } | null = null;
    let courseContext: CourseContext | undefined;

    // 0. Course Detection + Transcript Analysis (Parallel when possible)
    yield {
      type: "step",
      agent: "CourseDetector",
      status: "working",
      action: "Analyzing content domain...",
      message: "Detecting Course Context"
    };

    // Check cache for CourseContext first
    const courseContextCacheKey = `course:${simpleHash(topic + subtopics)}`;
    let cachedCourseContext = cache.get<CourseContext>(courseContextCacheKey);

    if (cachedCourseContext) {
      courseContext = cachedCourseContext;
      yield {
        type: "course_detected",
        content: courseContext,
        message: `Detected domain: ${courseContext.domain} (cached)`
      };
    }

    // Run CourseDetector and Analyzer in parallel if both needed
    const needsCourseDetection = !cachedCourseContext;
    const needsAnalysis = transcript && subtopics;

    try {
      if (needsCourseDetection && needsAnalysis) {
        // PARALLEL: Run both together
        yield {
          type: "step",
          agent: "Analyzer",
          action: "Checking transcript coverage...",
          message: "Analyzing Gaps (parallel)"
        };

        const cacheKey = `${topic}:${subtopics.slice(0, 100)}`;
        const [detectedContext, analysis] = await Promise.all([
          this.courseDetector.detect(topic, subtopics, transcript),
          cacheGapAnalysis(cacheKey, transcript, subtopics, () => this.analyzer.analyze(subtopics, transcript, signal))
        ]);

        courseContext = detectedContext;
        cache.set(courseContextCacheKey, courseContext); // Cache for next time
        gapAnalysisResult = analysis;

        const detectInputTok = estimateTokens(`${topic} ${subtopics} ${(transcript || '').slice(0, 5000)}`);
        const detectOutputTok = estimateTokens(JSON.stringify(courseContext));
        currentCost += calculateCost(this.courseDetector.model, detectInputTok, detectOutputTok);

        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        currentCost += calculateCost(this.analyzer.model, inputTok, outputTok);

        yield {
          type: "course_detected",
          content: courseContext,
          message: `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)`
        };
        yield { type: "gap_analysis", content: analysis };

        // Check for mismatch
        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;
        if (totalSubtopics > 0 && coveredCount === 0) {
          yield {
            type: "mismatch_stop",
            message: "The transcript appears unrelated to the topic/subtopics.",
            cost: currentCost
          };
          return;
        }
      } else if (needsCourseDetection) {
        // Only CourseDetection needed
        courseContext = await this.courseDetector.detect(topic, subtopics, transcript);
        cache.set(courseContextCacheKey, courseContext);

        const detectInputTok = estimateTokens(`${topic} ${subtopics} ${(transcript || '').slice(0, 5000)}`);
        const detectOutputTok = estimateTokens(JSON.stringify(courseContext));
        currentCost += calculateCost(this.courseDetector.model, detectInputTok, detectOutputTok);

        yield {
          type: "course_detected",
          content: courseContext,
          message: `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)`
        };
      } else if (needsAnalysis) {
        // Only Analysis needed (CourseContext was cached)
        yield {
          type: "step",
          agent: "Analyzer",
          action: "Checking transcript coverage...",
          message: "Analyzing Gaps"
        };

        const cacheKey = `${topic}:${subtopics.slice(0, 100)}`;
        const analysis = await cacheGapAnalysis(cacheKey, transcript, subtopics, () => this.analyzer.analyze(subtopics, transcript, signal));
        gapAnalysisResult = analysis;

        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        currentCost += calculateCost(this.analyzer.model, inputTok, outputTok);

        yield { type: "gap_analysis", content: analysis };

        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;
        if (totalSubtopics > 0 && coveredCount === 0) {
          yield {
            type: "mismatch_stop",
            message: "The transcript appears unrelated to the topic/subtopics.",
            cost: currentCost
          };
          return;
        }
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      console.error("Initial analysis failed", err);
      yield { type: "error", message: "Analysis failed, continuing..." };
    }

    // 2. Creator Phase
    const useTranscript = !!transcript;
    yield {
      type: "step",
      agent: "Creator",
      status: "working",
      action: useTranscript ? "Drafting with transcript..." : "Drafting initial content...",
      message: `Drafting ${mode}...`
    };

    try {
      const creatorOptions = {
        topic,
        subtopics,
        mode,
        transcript: useTranscript ? transcript : undefined,
        gapAnalysis: useTranscript ? (gapAnalysisResult || undefined) : undefined,
        courseContext,
        assignmentCounts
      };

      const stream = this.creator.generateStream(creatorOptions, signal);

      for await (const chunk of stream) {
        currentContent += chunk;
        yield { type: "chunk", content: chunk };
      }

      const cInput = estimateTokens(this.creator.formatUserPrompt(creatorOptions));
      const cOutput = estimateTokens(currentContent);
      currentCost += calculateCost(this.creator.model, cInput, cOutput);

      // 3. SANITIZER (Strictness)
      if (transcript) {
        yield {
          type: "step",
          agent: "Sanitizer",
          status: "working",
          action: "Verifying facts against transcript...",
          message: "Verifying facts..."
        };
        const sanitized = await this.sanitizer.sanitize(currentContent, transcript, signal);

        if (sanitized !== currentContent) {
          currentContent = sanitized;
          yield { type: "replace", content: currentContent };
        }

        // Sanitizer Cost (approximated, input roughly same as Creator output + transcript portion)
        const sInput = estimateTokens(transcript.slice(0, 50000) + currentContent);
        const sOutput = estimateTokens(sanitized);
        currentCost += calculateCost(this.sanitizer.model, sInput, sOutput);
      }

      // 4. QUALITY LOOP (Iterative Refinement with Progressive Thresholds)
      let loopCount = 0;
      const MAX_LOOPS = 3;
      let isQualityMet = false;
      let previousIssues: string[] = []; // Track issues for section-based refinement

      while (loopCount < MAX_LOOPS && !isQualityMet) {
        loopCount++;

        yield {
          type: "step",
          agent: "Reviewer",
          status: "working",
          action: loopCount > 1 ? `Re-evaluating (Round ${loopCount})...` : "Reviewing content quality...",
          message: loopCount > 1 ? `Quality Check (Round ${loopCount})` : "Assessing draft quality..."
        };

        const review = await this.reviewer.review(currentContent, mode, courseContext);

        // Reviewer Cost
        const revInput = estimateTokens(currentContent.slice(0, 20000));
        const revOutput = 200;
        currentCost += calculateCost(this.reviewer.model, revInput, revOutput);

        // Progressive thresholds: 9 for first loop, 8 for subsequent
        const qualityThreshold = loopCount === 1 ? 9 : 8;
        const passesThreshold = review.score >= qualityThreshold;

        if (passesThreshold || !review.needsPolish) {
          isQualityMet = true;
          yield {
            type: "step",
            agent: "Reviewer",
            status: "success",
            action: "Draft meets standards...",
            message: `✅ Draft meets quality threshold (score: ${review.score}).`
          };
          break;
        }

        // Last loop - don't refine, just proceed
        if (loopCount >= MAX_LOOPS) {
          yield {
            type: "step",
            agent: "Reviewer",
            status: "success",
            action: "Max attempts reached - proceeding...",
            message: "⚠️ Max loops reached. Proceeding."
          };
          break;
        }

        // Refine Phase - pass previous issues for section context
        yield {
          type: "step",
          agent: "Refiner",
          status: "working",
          action: `Refining: ${review.feedback}`,
          message: `Refining: ${review.feedback}`
        };

        // For loop 2+, include previous issues for context awareness
        const contextAwareFeedback = loopCount > 1 && previousIssues.length > 0
          ? [...review.detailedFeedback, `\nCONTEXT FROM PREVIOUS REVIEW: ${previousIssues.slice(0, 3).join('; ')}`]
          : review.detailedFeedback;

        let refinerOutput = "";
        const refinerStream = this.refiner.refineStream(
          currentContent,
          review.feedback,
          contextAwareFeedback,
          courseContext,
          signal
        );

        for await (const chunk of refinerStream) {
          if (signal?.aborted) throw new Error('Aborted');
          refinerOutput += chunk;
        }

        // Apply the patches
        let refinedContent = applySearchReplace(currentContent, refinerOutput);

        currentContent = refinedContent;
        yield { type: "replace", content: currentContent };

        // Store issues for next loop's context
        previousIssues = review.detailedFeedback;

        const refInput = estimateTokens(currentContent + review.feedback);
        const refOutput = estimateTokens(refinedContent);
        currentCost += calculateCost(this.refiner.model, refInput, refOutput);
      }

      // 5. FORMATTER (Assignment Only)
      if (mode === 'assignment') {
        yield {
          type: "step",
          agent: "Formatter",
          status: "working",
          action: "Structuring assignment data...",
          message: "Converting to structured data..."
        };

        const formatted = await this.formatter.formatAssignment(currentContent, signal);
        yield { type: "formatted", content: formatted };

        const fInput = estimateTokens(currentContent);
        const fOutput = estimateTokens(formatted);
        currentCost += calculateCost(this.formatter.model, fInput, fOutput);
      }

      // Final cleanup done by Validator previously (sanitizeAIPatterns) could go here if needed,
      // but Refiner usually handles it.

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
