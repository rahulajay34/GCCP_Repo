import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { GenerationParams, GenerationState } from "@/types/content";
import { AuthManager } from "@/lib/storage/auth";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  
  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
  }

  async *generate(params: GenerationParams) {
    const { topic, subtopics, mode, additionalInstructions, transcript } = params;
    
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
           const outputTok = estimateTokens(JSON.stringify(analysis)); // approximate
           const cost = calculateCost(this.analyzer['model'], inputTok, outputTok); // access model prop

           yield {
               type: "gap_analysis",
               content: analysis,
               cost
           };
       } catch (err) {
           console.error("Analysis failed", err);
           yield {
               type: "error", // Non-fatal
               message: "Gap Analysis failed, continuing..."
           };
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
        
        // Calculate costs
        const inputTokens = estimateTokens(this.creator.formatUserPrompt(topic, subtopics, mode));
        const outputTokens = estimateTokens(fullContent);
        const cost = calculateCost("claude-sonnet-4-5-20250929", inputTokens, outputTokens);
        
        // Update user stats
        const user = AuthManager.getCurrentUser();
        if (user) {
            user.usage.totalCost += cost;
            user.usage.requestCount += 1;
            AuthManager.updateUser(user);
        }

        yield {
          type: "complete",
          content: fullContent,
          cost
        };

    } catch (error: any) {
        yield {
            type: "error",
            message: error.message || "Generation failed"
        };
    }
  }
}
