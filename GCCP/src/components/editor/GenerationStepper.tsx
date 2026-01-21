'use client';
import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Log {
    type: string;
    message?: string;
    agent?: string;
    content?: any;
}

interface StepperProps {
    logs: Log[];
    status: 'idle' | 'generating' | 'complete' | 'error' | 'mismatch';
    mode?: string;
    hasTranscript?: boolean;
}

// Define the full agent pipeline
const getAgentPipeline = (mode: string = 'lecture', hasTranscript: boolean = false) => {
    const pipeline = [
        { id: 'Creator', label: 'Drafting', required: true },
        { id: 'Sanitizer', label: 'Fact Checking', required: hasTranscript },
        { id: 'Reviewer', label: 'Quality Review', required: true },
        { id: 'Refiner', label: 'Polishing', required: false },
        mode === 'assignment' ? { id: 'Formatter', label: 'Formatting', required: true } : null
    ].filter(Boolean) as Array<{ id: string; label: string; required: boolean }>;
    
    return pipeline;
};

export function GenerationStepper({ logs, status, mode = 'lecture', hasTranscript = false }: StepperProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Filter out only relevant steps to show in the UI
    const completedSteps = logs.filter(l => l.type === 'step');
    const pipeline = getAgentPipeline(mode, hasTranscript);
    
    // Find current active agent from logs
    const currentAgent = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].agent : null;
    
    // Calculate progress
    const completedCount = pipeline.filter(stage => 
        completedSteps.some(s => s.agent === stage.id)
    ).length;
    const progressPercent = pipeline.length > 0 ? (completedCount / pipeline.length) * 100 : 0;

    return (
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            {/* Header with compact view */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Pipeline
                    </h3>
                    {/* Compact View */}
                    <div className="flex items-center gap-2">
                        {pipeline.map((stage, idx) => {
                            const hasCompleted = completedSteps.some(s => s.agent === stage.id);
                            const isActive = status === 'generating' && currentAgent === stage.id;
                            
                            return (
                                <div key={idx} className="flex items-center gap-1">
                                    {idx > 0 && (
                                        <div className={`w-6 h-0.5 ${hasCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                    )}
                                    <div className={`
                                        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                                        ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200' : 
                                          hasCompleted ? 'bg-emerald-50 text-emerald-700' : 
                                          'bg-gray-100 text-gray-400'}
                                    `}>
                                        {isActive ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : hasCompleted ? (
                                            <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                            <Circle className="w-3 h-3" />
                                        )}
                                        <span className="hidden sm:inline">{stage.id}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Less' : 'More'}
                </button>
            </div>
            
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${status === 'complete' ? 100 : progressPercent}%` }}
                />
            </div>
            
            {/* Expanded detailed view */}
            {isExpanded && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                    {pipeline.map((stage, idx) => {
                        const hasCompleted = completedSteps.some(s => s.agent === stage.id);
                        const isActive = status === 'generating' && currentAgent === stage.id;
                        const isPending = !hasCompleted && !isActive;
                        
                        return (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {isActive ? (
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    ) : hasCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-4 h-4 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                        isActive ? 'text-blue-700' : 
                                        hasCompleted ? 'text-gray-700' : 
                                        'text-gray-400'
                                    }`}>
                                        {stage.id}: {stage.label}
                                    </p>
                                    {isActive && (
                                        <p className="text-xs text-blue-500 mt-0.5 animate-pulse">
                                            Processing...
                                        </p>
                                    )}
                                    {isPending && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Pending...
                                        </p>
                                    )}
                                    {hasCompleted && !isActive && (
                                        <p className="text-xs text-emerald-600 mt-0.5">
                                            ✓ Complete
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {status === 'complete' && (
                <div className="mt-2 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">All Agents Complete</span>
                </div>
            )}
        </div>
    );
}
