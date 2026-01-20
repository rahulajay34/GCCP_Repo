import { useState, useRef } from 'react';
import { useGenerationStore } from '@/lib/store/generation';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { AuthManager } from '@/lib/storage/auth';
import { GenerationParams } from '@/types/content';
import { db } from '@/lib/storage/db';

export const useGeneration = () => {
    const store = useGenerationStore();
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            store.setStatus('idle');
            store.addLog('Generation stopped by user', 'warning');
            abortControllerRef.current = null;
        }
    };

    const clearStorage = () => {
        localStorage.removeItem('generation-storage');
        // also clear logs if needed, but store.reset() usually handles state
        store.reset();
        // Optional: clear DB or just local state. The user requested clearing storage.
        // Reload to ensure fresh state
        window.location.reload();
    };

    const startGeneration = async () => {
        // 1. Abort previous if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 2. Create new controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const user = AuthManager.getCurrentUser();
        const apiKey = user?.apiKey || window.localStorage.getItem('anthropic_api_key') || '';

        let orchestrator;
        try {
            orchestrator = new Orchestrator(apiKey);
        } catch (e: any) {
            setError(e.message);
            return;
        }

        store.setStatus('generating');
        store.setContent('');
        store.setFormattedContent('');
        setError(null);
        store.addLog(`Starting generation for topic: ${store.topic}`, 'info');

        const params: GenerationParams = {
            topic: store.topic,
            subtopics: store.subtopics,
            mode: store.mode,
            transcript: store.transcript || '',
            additionalInstructions: ''
        };

        try {
            const generator = orchestrator.generate(params, controller.signal);

            for await (const event of generator) {
                // Check if aborted logic is handled in the orchestrator, but we can also double check
                if (controller.signal.aborted) break;

                if (event.type === 'step') {
                    store.setCurrentAgent(event.agent || 'System');
                    store.addLog(event.message || '', 'info');
                } else if (event.type === 'chunk') {
                    store.updateContent(event.content as string || '');
                } else if (event.type === 'gap_analysis') {
                    store.setGapAnalysis(event.content);
                    store.addLog('Gap analysis complete', 'success');
                } else if (event.type === 'replace') {
                    store.setContent(event.content as string);
                    store.addLog('Content updated by agent', 'info');
                } else if (event.type === 'formatted') {
                    store.setFormattedContent(event.content as string);
                    store.addLog('Content formatted for LMS', 'success');
                } else if (event.type === 'complete') {
                    store.setStatus('complete');
                    store.addLog('Generation completed successfully', 'success');

                    // Persist to DB
                    try {
                        const currentStore = useGenerationStore.getState();
                        await db.generations.add({
                            topic: currentStore.topic,
                            subtopics: currentStore.subtopics,
                            mode: currentStore.mode,
                            status: 'complete',
                            currentAgent: 'Orchestrator',
                            agentProgress: {},
                            gapAnalysis: currentStore.gapAnalysis,
                            finalContent: (currentStore.finalContent || '') + (event.content as string || ''),
                            formattedContent: currentStore.formattedContent,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        } as any);
                    } catch (err) {
                        console.error("Failed to save generation", err);
                    }

                } else if (event.type === 'error') {
                    // console.error(event.message);
                    store.addLog(event.message || 'Error occurred', 'error');
                    setError(event.message || 'Unknown error');
                    store.setStatus('error');
                }
            }
        } catch (e: any) {
            if (e.message === 'Aborted' || e.name === 'AbortError') {
                store.addLog('Generation stopped by user', 'warning');
                store.setStatus('idle');
            } else {
                setError(e.message);
                store.addLog(e.message, 'error');
                store.setStatus('error');
            }
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    };

    return {
        ...store,
        logs: store.logs,
        formattedContent: store.formattedContent,
        setTranscript: store.setTranscript,
        error,
        startGeneration,
        stopGeneration,
        clearStorage
    };
};
