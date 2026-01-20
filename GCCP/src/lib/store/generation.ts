import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  addLog: (message: string, type?: string) => void;
  reset: () => void;
}

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set) => ({
      topic: '',
      subtopics: '',
      mode: 'lecture',
      transcript: '',
      status: 'idle',
      currentAgent: null,
      agentProgress: {},
      gapAnalysis: null,
      finalContent: '',
      logs: [],
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
      addLog: (message, type = 'info') => set((state) => ({
        logs: [...(state.logs || []), { message, type, timestamp: Date.now() }]
      })),
      reset: () => set({
        topic: '', subtopics: '', status: 'idle', finalContent: '', currentAgent: null, gapAnalysis: null, transcript: '', logs: []
      })
    }),
    {
      name: 'generation-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        topic: state.topic,
        subtopics: state.subtopics,
        mode: state.mode,
        transcript: state.transcript,
        finalContent: state.finalContent,
        gapAnalysis: state.gapAnalysis,
        logs: state.logs,
        status: state.status === 'generating' ? 'idle' : state.status // reset stuck generating
      }),
    }
  )
);
