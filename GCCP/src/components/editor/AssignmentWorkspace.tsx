'use client';
import { useState, useEffect } from 'react';
import { Download, Table, Eye, Plus, Trash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Question {
    type: string;
    question_text: string;
    options?: string[];
    correct_option?: string;
    explanation: string;
    model_answer?: string;
}

interface AssignmentWorkspaceProps {
    jsonContent: string;
    onUpdate: (newJson: string) => void;
}

export function AssignmentWorkspace({ jsonContent, onUpdate }: AssignmentWorkspaceProps) {
    const [view, setView] = useState<'table' | 'student'>('table');
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        try {
            if (jsonContent) {
                // Handle potential incomplete JSON from streaming or string wrapping
                const parsed = JSON.parse(jsonContent);
                if (Array.isArray(parsed)) {
                    setQuestions(parsed);
                }
            }
        } catch (e) {
            // Passive failure for invalid/incomplete JSON
        }
    }, [jsonContent]);

    const handleUpdate = (updatedQuestions: Question[]) => {
        setQuestions(updatedQuestions);
        onUpdate(JSON.stringify(updatedQuestions, null, 2));
    };

    const downloadCSV = () => {
        const headers = ["Type", "Question", "Options", "Correct Answer", "Explanation"];
        const rows = questions.map(q => [
            q.type,
            `"${(q.question_text || '').replace(/"/g, '""')}"`,
            `"${(q.options || []).join(' | ')}"`,
            q.correct_option || '',
            `"${(q.explanation || '').replace(/"/g, '""')}"`
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex bg-gray-200/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Table size={14} /> Editor
                    </button>
                    <button 
                        onClick={() => setView('student')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'student' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Eye size={14} /> Student View
                    </button>
                </div>
                <button 
                    onClick={downloadCSV}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                >
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {view === 'table' ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                                    <th className="p-3 w-10 text-center">#</th>
                                    <th className="p-3 w-24">Type</th>
                                    <th className="p-3 min-w-[300px]">Question</th>
                                    <th className="p-3 w-48">Options / Model Answer</th>
                                    <th className="p-3 w-24">Correct</th>
                                    <th className="p-3 min-w-[200px]">Explanation</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {questions.map((q, idx) => (
                                    <tr key={idx} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="p-3 text-center align-top font-mono text-xs text-gray-400 pt-5">{idx + 1}</td>
                                        
                                        {/* TYPE */}
                                        <td className="p-3 align-top">
                                            <select 
                                                value={q.type}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], type: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full text-xs p-1.5 border border-gray-200 rounded-md bg-white focus:border-blue-300 outline-none"
                                            >
                                                <option value="MCSC">MCSC</option>
                                                <option value="MCMC">MCMC</option>
                                                <option value="Subjective">Subjective</option>
                                                <option value="TrueFalse">True/False</option>
                                            </select>
                                        </td>

                                        {/* QUESTION TEXT */}
                                        <td className="p-3 align-top">
                                            <textarea 
                                                value={q.question_text}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], question_text: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-sm border border-transparent hover:border-gray-200 focus:border-blue-300 rounded-md bg-transparent focus:bg-white outline-none resize-none transition-all min-h-[80px]"
                                                placeholder="Question text..."
                                            />
                                        </td>

                                        {/* OPTIONS or MODEL ANSWER */}
                                        <td className="p-3 align-top">
                                            {q.type === 'Subjective' ? (
                                                <textarea 
                                                    value={q.model_answer || ''}
                                                    onChange={(e) => {
                                                        const newQ = [...questions];
                                                        newQ[idx] = { ...newQ[idx], model_answer: e.target.value };
                                                        handleUpdate(newQ);
                                                    }}
                                                    className="w-full p-2 text-xs border border-transparent hover:border-gray-200 focus:border-blue-300 rounded-md bg-blue-50/50 focus:bg-white text-blue-900 outline-none resize-none transition-all min-h-[80px]"
                                                    placeholder="Model answer..."
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    {(q.options || []).map((opt, oIdx) => (
                                                        <div key={oIdx} className="flex gap-1 items-center">
                                                            <span className="text-[10px] w-4 text-gray-400 text-center font-mono">{String.fromCharCode(65+oIdx)}</span>
                                                            <input 
                                                                value={opt}
                                                                onChange={(e) => {
                                                                    const newQ = [...questions];
                                                                    if (!newQ[idx].options) newQ[idx].options = [];
                                                                    newQ[idx].options![oIdx] = e.target.value;
                                                                    handleUpdate(newQ);
                                                                }}
                                                                className="flex-1 p-1 text-xs border border-transparent hover:border-gray-200 focus:border-blue-300 rounded bg-transparent focus:bg-white outline-none"
                                                            />
                                                        </div>
                                                    ))}
                                                    <button 
                                                       onClick={() => {
                                                            const newQ = [...questions];
                                                            if (!newQ[idx].options) newQ[idx].options = [];
                                                            if (newQ[idx].options!.length < 6) {
                                                                newQ[idx].options!.push(`Option ${newQ[idx].options!.length + 1}`);
                                                                handleUpdate(newQ);
                                                            }
                                                       }}
                                                       className="text-[10px] text-blue-500 hover:text-blue-700 font-medium ml-5"
                                                    >
                                                        + Add Option
                                                    </button>
                                                </div>
                                            )}
                                        </td>

                                        {/* CORRECT ANSWER */}
                                        <td className="p-3 align-top">
                                             {q.type !== 'Subjective' && (
                                                <input 
                                                    value={q.correct_option || ''}
                                                    onChange={(e) => {
                                                        const newQ = [...questions];
                                                        newQ[idx] = { ...newQ[idx], correct_option: e.target.value };
                                                        handleUpdate(newQ);
                                                    }}
                                                    className="w-full text-center font-mono font-bold text-emerald-700 bg-emerald-50/50 border border-emerald-100 rounded p-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-200"
                                                    placeholder="A"
                                                />
                                             )}
                                        </td>

                                        {/* EXPLANATION */}
                                        <td className="p-3 align-top">
                                            <textarea 
                                                value={q.explanation}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], explanation: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-xs text-gray-600 border border-transparent hover:border-gray-200 focus:border-blue-300 rounded-md bg-transparent focus:bg-white outline-none resize-none transition-all min-h-[80px]"
                                                placeholder="Explanation..."
                                            />
                                        </td>

                                         {/* ACTIONS */}
                                         <td className="p-3 align-top pt-4">
                                            <button 
                                                onClick={() => {
                                                    const newQ = questions.filter((_, i) => i !== idx);
                                                    handleUpdate(newQ);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Question"
                                            >
                                                <Trash size={14} />
                                            </button>
                                         </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-center">
                            <button 
                                onClick={() => {
                                    const newQ = [...questions, {
                                        type: 'MCSC',
                                        question_text: '',
                                        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                                        correct_option: '',
                                        explanation: ''
                                    }];
                                    handleUpdate(newQ);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div className="text-center border-b pb-6 mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Assignment</h1>
                            <p className="text-gray-500 mt-2">Please answer all questions.</p>
                        </div>
                        {questions.map((q, i) => (
                            <div key={i} className="space-y-3 group">
                                <div className="font-medium text-gray-800 text-lg">
                                    <span className="font-bold mr-2 text-blue-600">Q{i+1}.</span> 
                                    <div className="prose prose-sm inline-block align-top max-w-none">
                                        <ReactMarkdown>{q.question_text}</ReactMarkdown>
                                    </div>
                                </div>
                                {q.options && q.options.length > 0 && (
                                    <div className="pl-4 space-y-2">
                                        {q.options.map((opt, o) => (
                                            <div key={o} className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500 group-hover:border-blue-300 transition-colors">
                                                    {String.fromCharCode(65+o)}
                                                </div>
                                                <span className="text-gray-600">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {q.type === 'Subjective' && (
                                     <div className="pl-4 mt-2 mb-4">
                                        <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-100">
                                            <span className="font-semibold block mb-1">Model Answer:</span>
                                            <ReactMarkdown>{q.model_answer || ''}</ReactMarkdown>
                                        </div>
                                     </div>
                                )}
                                
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100 shadow-sm print:break-inside-avoid">
                                    <div className="flex gap-2 mb-2">
                                        <span className="font-semibold text-gray-800">Answer:</span> 
                                        <span className="text-emerald-600 font-mono font-bold">{q.correct_option}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-800 block mb-1">Explanation:</span> 
                                        <div className="prose prose-sm max-w-none text-gray-600">
                                            <ReactMarkdown>{q.explanation}</ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
