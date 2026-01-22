'use client';
import { useState, useEffect } from 'react';
import { Download, Table, Eye, Plus, Trash } from 'lucide-react';
import { AssignmentItem, generateCSV } from '@/types/assignment';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function AssignmentWorkspace({ jsonContent, onUpdate }: { jsonContent: string, onUpdate: (s: string) => void }) {
    const [view, setView] = useState<'table' | 'reference'>('table');
    const [questions, setQuestions] = useState<AssignmentItem[]>([]);

    useEffect(() => {
        try {
            if (jsonContent) {
                const parsed = JSON.parse(jsonContent);
                // The Formatter now returns AssignmentItem[] directly
                if (Array.isArray(parsed)) {
                    setQuestions(parsed);
                }
            }
        } catch (e) {
            // Ignore parse errors while streaming
        }
    }, [jsonContent]);

    const handleDownloadCSV = () => {
        const csv = generateCSV(questions);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const updateQuestion = (index: number, field: keyof AssignmentItem | string, value: any) => {
        const newQuestions = [...questions];
        const question = { ...newQuestions[index] };

        // Handle nested options update
        if (field.startsWith('option.')) {
            const optionKey = parseInt(field.split('.')[1]) as 1 | 2 | 3 | 4;
            question.options = { ...question.options, [optionKey]: value };
        } else {
            (question as any)[field] = value;
        }

        newQuestions[index] = question;
        setQuestions(newQuestions);
        // Debounce this eventually, but for now update on every change
        onUpdate(JSON.stringify(newQuestions));
    };

    return (
        <div className="flex flex-col h-full font-sans bg-white dark:bg-zinc-900 transition-colors">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                <div className="flex bg-gray-200/50 dark:bg-zinc-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('table')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${view === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}`}
                    >
                        <Table size={14} /> Table Editor
                    </button>
                    <button 
                        onClick={() => setView('reference')} 
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${view === 'reference' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'}`}
                    >
                        <Eye size={14} /> Reference View
                    </button>
                </div>
                <button 
                    onClick={handleDownloadCSV} 
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900">
                {view === 'table' ? (
                    <div className="h-full overflow-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-zinc-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-700">
                                <tr>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-24">Type</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-64">Question (Markdown)</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-32">Option 1</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-32">Option 2</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-32">Option 3</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-32">Option 4</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-24">Correct</th>
                                    <th className="p-3 text-[10px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 uppercase w-48">Explanation (Markdown)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {questions.map((q, i) => (
                                    <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="p-2 align-top">
                                            <select 
                                                value={q.questionType} 
                                                onChange={(e) => updateQuestion(i, 'questionType', e.target.value)}
                                                className="w-full text-xs p-1.5 border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 outline-none focus:border-blue-500"
                                            >
                                                <option value="mcsc">MCSC</option>
                                                <option value="mcmc">MCMC</option>
                                                <option value="subjective">Subj.</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea 
                                                value={q.contentBody}
                                                onChange={(e) => updateQuestion(i, 'contentBody', e.target.value)}
                                                className="w-full h-20 text-xs p-2 border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 resize-none outline-none focus:border-blue-500 font-mono"
                                                placeholder="Question text..."
                                            />
                                        </td>
                                        
                                        {/* Options 1-4 */}
                                        {[1, 2, 3, 4].map(optKey => (
                                            <td key={optKey} className="p-2 align-top">
                                                {q.questionType !== 'subjective' ? (
                                                    <textarea 
                                                        value={q.options[optKey as 1|2|3|4]}
                                                        onChange={(e) => updateQuestion(i, `option.${optKey}`, e.target.value)}
                                                        className="w-full h-20 text-xs p-2 border border-gray-200 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-900/50 text-gray-700 dark:text-zinc-300 resize-none outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-800"
                                                        placeholder={`Option ${optKey}`}
                                                    />
                                                ) : (
                                                    <div className="h-20 flex items-center justify-center text-[10px] text-gray-300 dark:text-zinc-600 border border-transparent border-dashed rounded bg-gray-50/50 dark:bg-zinc-900/20">
                                                        N/A
                                                    </div>
                                                )}
                                            </td>
                                        ))}

                                        <td className="p-2 align-top">
                                            {q.questionType === 'mcsc' ? (
                                                <input 
                                                    type="number" min="1" max="4"
                                                    value={q.mcscAnswer || ''}
                                                    onChange={(e) => updateQuestion(i, 'mcscAnswer', parseInt(e.target.value) || undefined)}
                                                    className="w-full text-xs p-1.5 border border-emerald-200 dark:border-emerald-900/50 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold text-center outline-none focus:border-emerald-500"
                                                    placeholder="1-4"
                                                />
                                            ) : q.questionType === 'mcmc' ? (
                                                <input 
                                                    value={q.mcmcAnswer || ''}
                                                    onChange={(e) => updateQuestion(i, 'mcmcAnswer', e.target.value)}
                                                    className="w-full text-xs p-1.5 border border-emerald-200 dark:border-emerald-900/50 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 font-bold text-center outline-none focus:border-emerald-500"
                                                    placeholder="e.g. 1,3"
                                                />
                                            ) : (
                                                 <div className="text-[10px] text-gray-400 dark:text-zinc-500 text-center italic mt-2">See Model Ans</div>
                                            )}
                                        </td>

                                        <td className="p-2 align-top">
                                            <textarea
                                                value={q.answerExplanation}
                                                onChange={(e) => updateQuestion(i, 'answerExplanation', e.target.value)}
                                                className="w-full h-20 text-xs p-2 border border-gray-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 resize-none outline-none focus:border-blue-500"
                                                placeholder="Explanation..."
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {questions.length === 0 && (
                            <div className="text-center py-20 text-gray-400 dark:text-zinc-600">
                                No questions generated yet.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-8 bg-white dark:bg-zinc-900">
                        <div className="max-w-4xl mx-auto space-y-12">
                            {questions.map((q, i) => (
                                <div key={i} className="space-y-4 pb-8 border-b border-gray-100 dark:border-zinc-800 last:border-0">
                                    <div className="flex gap-4">
                                        <span className="font-bold text-gray-400 dark:text-zinc-600 text-lg select-none">{i+1}.</span>
                                        <div className="flex-1 space-y-4">
                                            {/* Question Body */}
                                            <div className="prose dark:prose-invert max-w-none text-gray-900 dark:text-zinc-100">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                                    {q.contentBody}
                                                </ReactMarkdown>
                                            </div>
                                            
                                            {/* Options */}
                                            {(q.questionType === 'mcsc' || q.questionType === 'mcmc') && (
                                                <div className="grid grid-cols-1 gap-2 pl-4">
                                                    {[1, 2, 3, 4].map((optNum) => {
                                                        const optionText = q.options[optNum as 1|2|3|4];
                                                        const isCorrect = 
                                                            (q.questionType === 'mcsc' && q.mcscAnswer === optNum) ||
                                                            (q.questionType === 'mcmc' && q.mcmcAnswer?.includes(String(optNum)));
                                                        
                                                        return (
                                                            <div key={optNum} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'}`}>
                                                                <div className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-xs font-medium ${isCorrect ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50' : 'border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-zinc-500'}`}>
                                                                    {String.fromCharCode(64 + optNum)}
                                                                </div>
                                                                <span className={`text-sm ${isCorrect ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-700 dark:text-zinc-300'}`}>
                                                                    {optionText}
                                                                </span>
                                                                {isCorrect && <span className="ml-auto text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Correct</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {/* Subjective Note */}
                                            {q.questionType === 'subjective' && (
                                                 <div className="pl-4 p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-sm text-gray-500 dark:text-zinc-400 italic">
                                                    Subjective question - answer in your own words.
                                                 </div>
                                            )}

                                            {/* Explanation & Answer (Always Visible) */}
                                            <div className="mt-6 space-y-4 pl-4 border-l-2 border-blue-100 dark:border-blue-900/30">
                                                <div className="space-y-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Explanation</span>
                                                    <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-zinc-300 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                                            {q.answerExplanation}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>

                                                {q.subjectiveAnswer && (
                                                    <div className="space-y-2">
                                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Model Answer</span>
                                                        <div className="prose dark:prose-invert max-w-none text-sm text-gray-600 dark:text-zinc-300 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-lg">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                                                {q.subjectiveAnswer}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
