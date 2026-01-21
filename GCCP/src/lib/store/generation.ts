import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GenerationState, ContentMode, AgentStatus } from '@/types/content';

interface GenerationStore extends GenerationState {
  transcript?: string;
  formattedContent?: string;
  estimatedCost?: number;
  tokenUsage?: { input: number; output: number };
  setTopic: (topic: string) => void;
  setSubtopics: (subtopics: string) => void;
  setMode: (mode: ContentMode) => void;
  setTranscript: (transcript: string) => void;
  setStatus: (status: GenerationState['status']) => void;
  setCurrentAgent: (agent: string) => void;
  setCurrentAction: (action: string) => void;
  updateContent: (chunk: string) => void;
  setContent: (content: string) => void;
  setFormattedContent: (content: string) => void;
  setGapAnalysis: (result: any) => void;
  setEstimatedCost: (cost: number) => void;
  addLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  addStepLog: (agent: string, message: string) => void;

  reset: () => void;
  clearGenerationState: () => void;
  assignmentCounts: { mcsc: number; mcmc: number; subjective: number };
  setAssignmentCounts: (counts: { mcsc: number; mcmc: number; subjective: number }) => void;
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
      currentAction: null, // NEW
      agentProgress: {},
      gapAnalysis: null,
      finalContent: '',
      formattedContent: '',
      logs: [],
      createdAt: 0,
      updatedAt: 0,
      assignmentCounts: { mcsc: 5, mcmc: 3, subjective: 2 },

      setTopic: (topic) => set({ topic }),
      setAssignmentCounts: (assignmentCounts) => set({ assignmentCounts }),
      setSubtopics: (subtopics) => set({ subtopics }),
      setMode: (mode) => set({ mode }),
      setTranscript: (transcript) => set({ transcript }),
      setStatus: (status) => set({ status }),
      setCurrentAgent: (currentAgent) => set({ currentAgent }),
      setCurrentAction: (currentAction) => set({ currentAction }),
      updateContent: (chunk) => set((state) => ({ finalContent: (state.finalContent || '') + chunk })),
      setContent: (content) => set({ finalContent: content }),
      setFormattedContent: (content) => set({ formattedContent: content }),
      setGapAnalysis: (result: any) => set({ gapAnalysis: result }),
      setEstimatedCost: (estimatedCost) => set({ estimatedCost }),
      addLog: (message, type: 'info' | 'success' | 'warning' | 'error' = 'info') => set((state) => ({
        logs: [...(state.logs || []), { message, type, timestamp: Date.now() }]
      })),
      addStepLog: (agent, message) => set((state) => ({
        logs: [...(state.logs || []), { type: 'step', agent, message, timestamp: Date.now() }]
      })),
      reset: () => set({
        topic: '', subtopics: '', status: 'idle', finalContent: '', formattedContent: '', currentAgent: null, currentAction: null, gapAnalysis: null, transcript: '', logs: [], estimatedCost: 0
      }),
      clearGenerationState: () => set({
        logs: [],
        finalContent: '',
        formattedContent: '',
        gapAnalysis: null,
        currentAgent: null,
        currentAction: null,
        agentProgress: {},
        estimatedCost: 0
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
        formattedContent: state.formattedContent,
        gapAnalysis: state.gapAnalysis,
        logs: state.logs,
        status: (state.status === 'generating' || state.status === 'mismatch') ? 'idle' : state.status // reset stuck generating or mismatch
      }),
      // Reset stuck agents on store rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Reset any stuck agent states
          const cleanedProgress: Record<string, any> = {};
          if (state.agentProgress) {
            for (const [agent, status] of Object.entries(state.agentProgress)) {
              // Reset 'working' to 'idle' on reload
              cleanedProgress[agent] = status === 'working' ? 'idle' : status;
            }
          }
          // Apply the cleaned state
          useGenerationStore.setState({
            agentProgress: cleanedProgress,
            currentAgent: null,
            currentAction: null,
          });
          console.log('[Store] Rehydrated and reset stuck agents');
        }
      },
    }
  )
);
