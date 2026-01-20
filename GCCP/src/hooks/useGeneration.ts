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

        // NOTE: We prioritize user key if set, but don't strictly require it if env is available.
        // The AnthropicClient constructor handles the fallback to process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY.
        const apiKey = user?.apiKey || window.localStorage.getItem('anthropic_api_key') || '';

        // We instantiate with whatever we have. If it's empty and no env var, AnthropicClient will throw.
        // We catch that error in the try/catch block below or immediately.

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
            const generator = orchestrator.generate(params);

            for await (const event of generator) {
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
                            agentProgress: {}, // flattened or ignored
                            gapAnalysis: currentStore.gapAnalysis, // access latest state
                            finalContent: (currentStore.finalContent || '') + (event.content as string || ''),
                            formattedContent: currentStore.formattedContent,
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        } as any);
                    } catch (err) {
                        console.error("Failed to save generation", err);
                    }

                } else if (event.type === 'error') {
                    console.error(event.message); // Log error
                    store.addLog(event.message || 'Error occurred', 'error');
                    setError(event.message || 'Unknown error');
                    store.setStatus('error');
                }
            }
        } catch (e: any) {
            setError(e.message);
            store.addLog(e.message, 'error');
            store.setStatus('error');
        }
    };

    return {
        ...store,
        logs: store.logs,
        formattedContent: store.formattedContent,
        setTranscript: store.setTranscript,
        error,
        startGeneration
    };
};
