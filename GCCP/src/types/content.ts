export type ContentMode = "pre-read" | "lecture" | "assignment";

export type AgentStatus = "idle" | "working" | "completed" | "error";

export interface GapAnalysisResult {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
  transcriptTopics: string[]; // Topics mentioned in the transcript
  timestamp: string;
}

export interface GenerationParams {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  additionalInstructions?: string;
  assignmentCounts?: {
    mcsc: number;
    mcmc: number;
    subjective: number;
  };
}

export interface GenerationLog {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'step';
  agent?: string;
  timestamp: number;
}

export interface GenerationState {
  id?: string | number;
  topic: string;
  subtopics: string;
  mode: ContentMode;
  status: "idle" | "generating" | "complete" | "error" | "mismatch";
  currentAgent: string | null;
  currentAction: string | null;
  agentProgress: Record<string, AgentStatus>;
  gapAnalysis: GapAnalysisResult | null;
  finalContent: string | null;
  formattedContent?: string | null;
  logs: GenerationLog[];
  createdAt: number;
  updatedAt: number;
}
