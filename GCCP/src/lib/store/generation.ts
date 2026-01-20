import { create } from 'zustand';
import { GenerationState, ContentMode, AgentStatus } from '@/types/content';

interface GenerationStore extends GenerationState {
  transcript?: string;
  setTopic: (topic: string) => void;
  setSubtopics: (subtopics: string) => void;
  setMode: (mode: ContentMode) => void;
  setTranscript: (transcript: string) => void;
  setStatus: (status: GenerationState['status']) => void;
  setCurrentAgent: (agent: string) => void;
  updateContent: (chunk: string) => void;
  setContent: (content: string) => void;
  setGapAnalysis: (result: any) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationStore>((set) => ({
  topic: '',
  subtopics: '',
  mode: 'lecture',
  transcript: '',
  status: 'idle',
  currentAgent: null,
  agentProgress: {},
  gapAnalysis: null,
  finalContent: '',
  createdAt: 0,
  updatedAt: 0,

  setTopic: (topic) => set({ topic }),
  setSubtopics: (subtopics) => set({ subtopics }),
  setMode: (mode) => set({ mode }),
  setTranscript: (transcript) => set({ transcript }),
  setStatus: (status) => set({ status }),
  setCurrentAgent: (currentAgent) => set({ currentAgent }),
  updateContent: (chunk) => set((state) => ({ finalContent: (state.finalContent || '') + chunk })),
  setContent: (content) => set({ finalContent: content }),
  setGapAnalysis: (result: any) => set({ gapAnalysis: result }),
  reset: () => set({ 
      topic: '', subtopics: '', status: 'idle', finalContent: '', currentAgent: null, gapAnalysis: null, transcript: ''
  })
}));
