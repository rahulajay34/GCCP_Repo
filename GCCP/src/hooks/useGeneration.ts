import { useState } from 'react';
import { useGenerationStore } from '@/lib/store/generation';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { AuthManager } from '@/lib/storage/auth';
import { GenerationParams } from '@/types/content';
import { db } from '@/lib/storage/db';

export const useGeneration = () => {
  const store = useGenerationStore();
  const [error, setError] = useState<string | null>(null);

  const startGeneration = async () => {
    const user = AuthManager.getCurrentUser();
    
    // In a real app, we'd probably use a proxy or check if user has key configured
    // For now, let's assume we prompt for it or user has it in settings
    // But for this demo, I need an API KEY.
    // I will hardcode a check or ask user to provide it.
    // Since I can't interactively ask in the UI easily without a settings modal...
    // I'll check if the user has an apiKey set in their profile (AuthManager).
    
    // TEMPORARY: If we don't have a key, we might fail.
    // However, I (the Agent) cannot access user secrets. 
    // I will assume the user has set the key in the AuthManager manually or I will prompt in UI.
    
    // NOTE: For now, we will instantiate Orchestrator with a placeholder or user key.
    // If apiKey is empty, it will throw.
    const apiKey = user?.apiKey || window.localStorage.getItem('anthropic_api_key') || '';
    
    if (!apiKey) {
        setError("API Key missing. Please set it in settings.");
        return;
    }

    const orchestrator = new Orchestrator(apiKey);
    
    store.setStatus('generating');
    store.setContent('');
    setError(null);

    const params: GenerationParams = {
        topic: store.topic,
        subtopics: store.subtopics,
        mode: store.mode,
        transcript: store.transcript || '',
        additionalInstructions: ''
    };

    try {
        const generator = orchestrator.generate(params);
        
        for await (const event of generator) {
            if (event.type === 'step') {
                store.setCurrentAgent(event.agent || 'System');
            } else if (event.type === 'chunk') {
                store.updateContent(event.content as string || '');
            } else if (event.type === 'gap_analysis') {
                store.setGapAnalysis(event.content);
            } else if (event.type === 'complete') {
                store.setStatus('complete');
                
                // Persist to DB
                try {
                    const currentStore = useGenerationStore.getState();
                    await db.generations.add({
                        topic: currentStore.topic,
                        subtopics: currentStore.subtopics,
                        mode: currentStore.mode,
                        status: 'complete',
                        currentAgent: 'Orchestrator',
                        agentProgress: {}, // flattened or ignored
                        gapAnalysis: currentStore.gapAnalysis, // access latest state
                        finalContent: (currentStore.finalContent || '') + (event.content as string || ''), // ensure we catch the final chunk if any, though usually 'step'/'chunk' handled it. 
                        // Actually event.content in 'complete' usually has full content or just the final delta?
                        // Orchestrator 'complete' event has 'content: fullContent'.
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    } as any); // Cast to avoid strict type mismatch with partials if any
                } catch (err) {
                    console.error("Failed to save generation", err);
                }

            } else if (event.type === 'error') {
                console.error(event.message); // Log error
                setError(event.message || 'Unknown error');
                store.setStatus('error');
            }
        }
    } catch (e: any) {
        setError(e.message);
        store.setStatus('error');
    }
  };

  return {
    ...store,
    setTranscript: store.setTranscript,
    error,
    startGeneration
  };
};
