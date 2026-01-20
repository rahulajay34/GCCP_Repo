export type ContentMode = "pre-read" | "lecture" | "assignment";

export type AgentStatus = "idle" | "working" | "completed" | "error";

export interface GapAnalysisResult {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
  timestamp: string;
}

export interface GenerationParams {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  additionalInstructions?: string;
}

export interface GenerationLog {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface GenerationState {
  id?: string | number;
  topic: string;
  subtopics: string;
  mode: ContentMode;
  status: "idle" | "generating" | "complete" | "error";
  currentAgent: string | null;
  agentProgress: Record<string, AgentStatus>;
  gapAnalysis: GapAnalysisResult | null;
  finalContent: string | null;
  formattedContent?: string | null;
  logs: GenerationLog[];
  createdAt: number;
  updatedAt: number;
}
