'use client';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Log {
    type: string;
    message?: string;
    agent?: string;
    content?: any;
}

interface StepperProps {
    logs: Log[];
    status: 'idle' | 'generating' | 'complete' | 'error';
}

export function GenerationStepper({ logs, status }: StepperProps) {
    // Filter out only relevant steps to show in the UI
    // We look for 'step' type logs
    const steps = logs.filter(l => l.type === 'step');
    
    // Determine current active step index
    // If status is complete, all are done.
    // If generating, the last one is active.
    
    return (
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Generation Progress
            </h3>
            
            <div className="space-y-4">
                {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    const isActive = status === 'generating' && isLast;
                    const isComplete = !isActive; // Past steps are done

                    return (
                        <div key={idx} className="flex items-start gap-3">
                            <div className="mt-0.5">
                                {isActive ? (
                                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {step.agent}: {step.message}
                                </p>
                                {isActive && (
                                    <p className="text-xs text-blue-500 mt-0.5 animate-pulse">
                                        Processing...
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {status === 'generating' && steps.length === 0 && (
                     <div className="flex items-start gap-3">
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-700">Initializing Orchestrator...</p>
                        </div>
                    </div>
                )}
            </div>
            
            {status === 'complete' && (
                 <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Complete</span>
                 </div>
            )}
        </div>
    );
}
