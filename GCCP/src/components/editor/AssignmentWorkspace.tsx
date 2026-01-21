'use client';
import { useState, useEffect } from 'react';
import { Download, Table, Eye, Plus, Trash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';

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
    const [view, setView] = useState<'table' | 'reference'>('table');
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        try {
            if (jsonContent) {
                const parsed = JSON.parse(jsonContent);
                if (Array.isArray(parsed)) {
                    // Prevent infinite loops/unnecessary re-renders
                    setQuestions(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(parsed)) return prev;
                        return parsed;
                    });
                }
            }
        } catch (e) {
            // Passive failure for invalid/incomplete JSON
        }
    }, [jsonContent]);

    const handleUpdate = (updatedQuestions: Question[]) => {
        // Semantic check to prevent redundant updates/loops
        if (JSON.stringify(updatedQuestions) === JSON.stringify(questions)) {
            return;
        }
        setQuestions(updatedQuestions);
        onUpdate(JSON.stringify(updatedQuestions, null, 2));
    };

    // Convert letter (A,B,C,D) to number (1,2,3,4)
    const letterToNumber = (letter: string | undefined): string => {
        if (!letter) return '';
        const upper = letter.toUpperCase().trim();
        if (/^[1-4]$/.test(upper)) return upper;
        if (upper.includes(',')) {
            return upper.split(',').map(l => {
                const trimmed = l.trim().toUpperCase();
                if (/^[1-4]$/.test(trimmed)) return trimmed;
                const code = trimmed.charCodeAt(0);
                if (code >= 65 && code <= 68) return String(code - 64);
                return trimmed;
            }).join(',');
        }
        const code = upper.charCodeAt(0);
        if (code >= 65 && code <= 68) return String(code - 64);
        return letter;
    };

    // Convert number (1,2,3,4) back to letter (A,B,C,D) for storage
    const numberToLetter = (num: string): string => {
        if (!num) return '';
        if (num.includes(',')) {
            return num.split(',').map(n => {
                const trimmed = n.trim();
                const val = parseInt(trimmed);
                if (val >= 1 && val <= 4) return String.fromCharCode(64 + val);
                return trimmed;
            }).join(',');
        }
        const val = parseInt(num);
        if (val >= 1 && val <= 4) return String.fromCharCode(64 + val);
        return num;
    };

    const downloadCSV = () => {
        // Strict Template Headers
        const headers = [
            "questionType,contentType,contentBody,intAnswer,prepTime(in_seconds),floatAnswer.max,floatAnswer.min,fitbAnswer,mcscAnswer,subjectiveAnswer,option.1,option.2,option.3,option.4,mcmcAnswer,tagRelationships,difficultyLevel,answerExplanation"
        ];

        const rows = questions.map(q => {
            // Helper to get option text safely and escape quotes for CSV
            const opt = (i: number) => (q.options?.[i] || '').replace(/"/g, '""');
            
            // Map Type
            const typeMap: Record<string, string> = { 'MCSC': 'mcsc', 'MCMC': 'mcmc', 'Subjective': 'subjective' };
            const qType = typeMap[q.type] || q.type.toLowerCase();

            // Map Answers
            const correctRaw = letterToNumber(q.correct_option); // e.g., "1" or "1,2"
            
            // Specific Logic per type
            const mcscAnswer = qType === 'mcsc' ? correctRaw : "";
            const mcmcAnswer = qType === 'mcmc' ? `"${correctRaw}"` : ""; // Quote if comma separated? Usually safe in CSV to quote
            const subjectiveAnswer = qType === 'subjective' ? `"${(q.model_answer||'').replace(/"/g, '""')}"` : "";

            return [
                qType,                                      // questionType (mcsc, mcmc, subjective)
                "markdown",                                 // contentType (hardcoded)
                `"${(q.question_text||'').replace(/"/g, '""')}"`, // contentBody
                "", "", "", "", "",                         // int, prep, float(max/min), fitb (empty)
                mcscAnswer,                                 // mcscAnswer
                subjectiveAnswer,                           // subjectiveAnswer
                `"${opt(0)}"`, `"${opt(1)}"`, `"${opt(2)}"`, `"${opt(3)}"`, // option.1 - option.4
                mcmcAnswer,                                 // mcmcAnswer
                "", "Medium",                               // tagRelationships, difficultyLevel
                `"${(q.explanation||'').replace(/"/g, '""')}"` // answerExplanation
            ].join(',');
        });

        const csv = [headers.join('\n'), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const getOption = (options: string[] | undefined, index: number): string => {
        return options?.[index] || '';
    };

    const setOption = (idx: number, optIdx: number, value: string) => {
        const newQ = [...questions];
        if (!newQ[idx].options) newQ[idx].options = ['', '', '', ''];
        while (newQ[idx].options!.length < 4) {
            newQ[idx].options!.push('');
        }
        newQ[idx].options![optIdx] = value;
        handleUpdate(newQ);
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
                        onClick={() => setView('reference')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'reference' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Eye size={14} /> Reference View
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
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {view === 'table' ? (
                    <div className="overflow-x-auto">
                        {/* Excel-like 8-column table */}
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-100 border-b-2 border-gray-300 text-xs text-gray-700 font-bold uppercase tracking-wider">
                                    <th className="p-2 border-r border-gray-300 w-24 bg-gray-100">Question Type</th>
                                    <th className="p-2 border-r border-gray-300 min-w-[300px] bg-gray-100">Question (Markdown)</th>
                                    <th className="p-2 border-r border-gray-300 w-32 bg-gray-100">Option 1</th>
                                    <th className="p-2 border-r border-gray-300 w-32 bg-gray-100">Option 2</th>
                                    <th className="p-2 border-r border-gray-300 w-32 bg-gray-100">Option 3</th>
                                    <th className="p-2 border-r border-gray-300 w-32 bg-gray-100">Option 4</th>
                                    <th className="p-2 border-r border-gray-300 w-20 bg-gray-100">Correct</th>
                                    <th className="p-2 min-w-[250px] bg-gray-100">Explanation (Markdown)</th>
                                    <th className="p-2 w-10 bg-gray-100"></th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-200">
                                {questions.map((q, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 border-b border-gray-200">
                                        {/* TYPE */}
                                        <td className="p-2 border-r border-gray-200 align-top">
                                            <select 
                                                value={q.type}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], type: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full text-xs p-1.5 border border-gray-300 rounded bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                                            >
                                                <option value="MCSC">MCSC</option>
                                                <option value="MCMC">MCMC</option>
                                                <option value="Subjective">Subjective</option>
                                            </select>
                                        </td>

                                        {/* QUESTION TEXT - Raw Markdown Editor */}
                                        <td className="p-2 border-r border-gray-200 align-top">
                                            <textarea 
                                                value={q.question_text}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], question_text: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-xs border border-gray-300 rounded bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[100px] font-mono whitespace-pre-wrap leading-relaxed"
                                                placeholder="Write markdown here...&#10;&#10;Example:&#10;What is the output?&#10;```python&#10;print('hello')&#10;```"
                                            />
                                        </td>

                                        {/* OPTIONS 1-4 */}
                                        {[0, 1, 2, 3].map(optIdx => (
                                            <td key={optIdx} className="p-2 border-r border-gray-200 align-top">
                                                {q.type === 'Subjective' ? (
                                                    <span className="text-xs text-gray-400 italic">N/A</span>
                                                ) : (
                                                    <textarea
                                                        value={getOption(q.options, optIdx)}
                                                        onChange={(e) => setOption(idx, optIdx, e.target.value)}
                                                        className="w-full p-1.5 text-xs border border-gray-300 rounded bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[50px]"
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                )}
                                            </td>
                                        ))}

                                        {/* CORRECT ANSWER - Number */}
                                        <td className="p-2 border-r border-gray-200 align-top">
                                            {q.type !== 'Subjective' ? (
                                                <input 
                                                    value={letterToNumber(q.correct_option)}
                                                    onChange={(e) => {
                                                        const newQ = [...questions];
                                                        newQ[idx] = { ...newQ[idx], correct_option: numberToLetter(e.target.value) };
                                                        handleUpdate(newQ);
                                                    }}
                                                    className="w-full text-center font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                                                    placeholder={q.type === 'MCMC' ? '1,2' : '1'}
                                                />
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">N/A</span>
                                            )}
                                        </td>

                                        {/* EXPLANATION - Raw Markdown Editor */}
                                        <td className="p-2 align-top">
                                            <textarea 
                                                value={q.type === 'Subjective' ? (q.model_answer || q.explanation) : q.explanation}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    if (q.type === 'Subjective') {
                                                        newQ[idx] = { ...newQ[idx], model_answer: e.target.value, explanation: e.target.value };
                                                    } else {
                                                        newQ[idx] = { ...newQ[idx], explanation: e.target.value };
                                                    }
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-xs border border-gray-300 rounded bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[100px] font-mono whitespace-pre-wrap"
                                                placeholder="Write markdown explanation..."
                                            />
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-2 align-top">
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
                                        options: ['', '', '', ''],
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
                    /* Reference View - Properly Formatted with Syntax Highlighting */
                    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
                        <div className="text-center border-b-2 border-gray-200 pb-6 mb-8">
                            <h1 className="text-2xl font-bold text-gray-900">Assignment Reference</h1>
                            <p className="text-gray-500 mt-2">This shows how questions will appear after formatting.</p>
                        </div>
                        
                        {questions.map((q, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {/* Question Header */}
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                                        {i + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                        q.type === 'MCSC' ? 'bg-blue-100 text-blue-700' :
                                        q.type === 'MCMC' ? 'bg-purple-100 text-purple-700' :
                                        'bg-amber-100 text-amber-700'
                                    }`}>
                                        {q.type}
                                    </span>
                                </div>
                                
                                {/* Question Content */}
                                <div className="p-6">
                                    {/* Question Text with Markdown & Syntax Highlighting */}
                                    <div className="prose prose-sm max-w-none text-gray-800 mb-4 
                                        prose-pre:bg-gray-900 prose-pre:text-gray-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                                        prose-code:text-pink-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            rehypePlugins={[rehypeHighlight]}
                                        >
                                            {q.question_text}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {/* Options for MCQ */}
                                    {q.options && q.options.length > 0 && q.type !== 'Subjective' && (
                                        <div className="space-y-2 mb-6">
                                            {q.options.map((opt, o) => {
                                                const isCorrect = q.correct_option?.toUpperCase().includes(String.fromCharCode(65 + o)) ||
                                                                  q.correct_option?.includes(String(o + 1));
                                                return (
                                                    <div 
                                                        key={o} 
                                                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                                                            isCorrect 
                                                                ? 'bg-emerald-50 border-emerald-200' 
                                                                : 'bg-gray-50 border-gray-200'
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            isCorrect 
                                                                ? 'bg-emerald-500 text-white' 
                                                                : 'bg-gray-200 text-gray-600'
                                                        }`}>
                                                            {o + 1}
                                                        </div>
                                                        <span className={`text-sm ${isCorrect ? 'text-emerald-800 font-medium' : 'text-gray-700'}`}>
                                                            {opt}
                                                        </span>
                                                        {isCorrect && (
                                                            <span className="ml-auto text-xs font-semibold text-emerald-600">✓ Correct</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {/* Model Answer for Subjective */}
                                    {q.type === 'Subjective' && q.model_answer && (
                                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <h4 className="text-sm font-bold text-blue-800 mb-2">Model Answer:</h4>
                                            <div className="prose prose-sm max-w-none text-blue-900 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                                                <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                                    rehypePlugins={[rehypeHighlight]}
                                                >
                                                    {q.model_answer}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Explanation */}
                                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                        <h4 className="text-sm font-bold text-amber-800 mb-2">Explanation:</h4>
                                        <div className="prose prose-sm max-w-none text-amber-900 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                                rehypePlugins={[rehypeHighlight]}
                                            >
                                                {q.explanation || q.model_answer || ''}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {questions.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <p>No questions to display.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
