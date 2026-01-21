'use client';
import { useState, useEffect } from 'react';
import { Download, Table, Eye, Plus, Trash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';

// Support both legacy and new formats
interface Question {
    // New format fields
    questionType?: string;
    contentBody?: string;
    options?: string[] | { 1: string; 2: string; 3: string; 4: string };
    mcscAnswer?: number;
    mcmcAnswer?: string;
    subjectiveAnswer?: string;
    answerExplanation?: string;
    difficultyLevel?: string;
    // Legacy format fields
    type?: string;
    question_text?: string;
    correct_option?: string;
    explanation?: string;
    model_answer?: string;
}

interface AssignmentWorkspaceProps {
    jsonContent: string;
    onUpdate: (newJson: string) => void;
}

/**
 * Normalize any question to a consistent internal format for editing
 */
function normalizeQuestion(q: any): Question {
    // Get type - support both formats
    const type = q.questionType?.toUpperCase() || q.type?.toUpperCase() || 'MCSC';
    
    // Get question text - support both formats
    const questionText = q.contentBody || q.question_text || '';
    
    // Get options - normalize to array
    let optionsArray: string[] = [];
    if (q.options) {
        if (Array.isArray(q.options)) {
            optionsArray = q.options;
        } else if (typeof q.options === 'object') {
            // Object format { "1": "...", "2": "...", ... }
            optionsArray = [
                q.options['1'] || q.options[1] || '',
                q.options['2'] || q.options[2] || '',
                q.options['3'] || q.options[3] || '',
                q.options['4'] || q.options[4] || '',
            ];
        }
    }
    
    // Ensure 4 options
    while (optionsArray.length < 4) optionsArray.push('');
    
    // Get correct answer - normalize to letter format (A,B,C,D)
    let correctOption = '';
    if (q.correct_option) {
        correctOption = q.correct_option;
    } else if (q.mcscAnswer !== undefined) {
        // Convert number to letter
        const num = typeof q.mcscAnswer === 'number' ? q.mcscAnswer : parseInt(q.mcscAnswer);
        if (num >= 1 && num <= 4) {
            correctOption = String.fromCharCode(64 + num);
        }
    } else if (q.mcmcAnswer) {
        // Convert "1, 3" to "A,C"
        correctOption = q.mcmcAnswer.split(',')
            .map((n: string) => {
                const num = parseInt(n.trim());
                if (num >= 1 && num <= 4) return String.fromCharCode(64 + num);
                return n.trim();
            })
            .join(',');
    }
    
    // Get explanation - support both formats
    const explanation = q.answerExplanation || q.explanation || '';
    const modelAnswer = q.subjectiveAnswer || q.model_answer || '';
    
    return {
        type,
        question_text: questionText,
        options: optionsArray,
        correct_option: correctOption,
        explanation,
        model_answer: modelAnswer,
    };
}

export function AssignmentWorkspace({ jsonContent, onUpdate }: AssignmentWorkspaceProps) {
    const [view, setView] = useState<'table' | 'reference'>('table');
    const [questions, setQuestions] = useState<Question[]>([]);

    useEffect(() => {
        try {
            if (jsonContent) {
                const parsed = JSON.parse(jsonContent);
                if (Array.isArray(parsed)) {
                    // Normalize all questions to consistent format
                    const normalized = parsed.map(normalizeQuestion);
                    setQuestions(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(normalized)) return prev;
                        return normalized;
                    });
                }
            }
        } catch (e) {
            // Passive failure for invalid/incomplete JSON
        }
    }, [jsonContent]);

    const handleUpdate = (updatedQuestions: Question[]) => {
        if (JSON.stringify(updatedQuestions) === JSON.stringify(questions)) {
            return;
        }
        setQuestions(updatedQuestions);
        onUpdate(JSON.stringify(updatedQuestions, null, 2));
    };

    // Convert letter (A,B,C,D) to number (1,2,3,4) for display
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
        const headers = [
            "questionType,contentType,contentBody,intAnswer,prepTime(in_seconds),floatAnswer.max,floatAnswer.min,fitbAnswer,mcscAnswer,subjectiveAnswer,option.1,option.2,option.3,option.4,mcmcAnswer,tagRelationships,difficultyLevel,answerExplanation"
        ];

        // Convert difficulty string to numeric value
        const difficultyToNumber = (diff: string | undefined): string => {
            const d = (diff || 'Medium').toLowerCase();
            if (d === 'easy') return '0';
            if (d === 'hard') return '1';
            return '0.5'; // Medium default
        };

        // Strip markdown formatting to plain text
        const stripMarkdown = (text: string): string => {
            return text
                .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?|```/g, '').trim()) // Remove code block markers but keep code
                .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
                .replace(/\*([^*]+)\*/g, '$1')   // Italic
                .replace(/__([^_]+)__/g, '$1')   // Bold alt
                .replace(/_([^_]+)_/g, '$1')     // Italic alt
                .replace(/#{1,6}\s*/g, '')       // Headers
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
                .trim();
        };

        const rows = questions.map(q => {
            const opt = (i: number) => {
                if (Array.isArray(q.options)) {
                    return (q.options[i] || '').replace(/"/g, '""');
                }
                return '';
            };
            
            const typeMap: Record<string, string> = { 'MCSC': 'mcsc', 'MCMC': 'mcmc', 'SUBJECTIVE': 'subjective', 'Subjective': 'subjective' };
            const qType = typeMap[q.type || ''] || (q.type || '').toLowerCase();

            const correctRaw = letterToNumber(q.correct_option);
            
            const mcscAnswer = qType === 'mcsc' ? correctRaw : "";
            const mcmcAnswer = qType === 'mcmc' ? `"${correctRaw}"` : "";
            const subjectiveAnswer = qType === 'subjective' ? `"${(q.model_answer||'').replace(/"/g, '""')}"` : "";
            
            // Use numeric difficulty and plain text explanation
            const difficultyNumeric = difficultyToNumber(q.difficultyLevel);
            const explanationPlain = stripMarkdown(q.explanation || '');

            return [
                qType,
                "markdown",
                `"${(q.question_text||'').replace(/"/g, '""')}"`,
                "", "", "", "", "",
                mcscAnswer,
                subjectiveAnswer,
                `"${opt(0)}"`, `"${opt(1)}"`, `"${opt(2)}"`, `"${opt(3)}"`,
                mcmcAnswer,
                "", difficultyNumeric,
                `"${explanationPlain.replace(/"/g, '""')}"`
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

    const getOption = (options: string[] | { 1: string; 2: string; 3: string; 4: string } | undefined, index: number): string => {
        if (!options) return '';
        if (Array.isArray(options)) {
            return options[index] || '';
        }
        // Object format
        const key = String(index + 1) as '1' | '2' | '3' | '4';
        return (options as any)[key] || '';
    };

    const setOption = (idx: number, optIdx: number, value: string) => {
        const newQ = [...questions];
        if (!newQ[idx].options || !Array.isArray(newQ[idx].options)) {
            newQ[idx].options = ['', '', '', ''];
        }
        const opts = newQ[idx].options as string[];
        while (opts.length < 4) opts.push('');
        opts[optIdx] = value;
        handleUpdate(newQ);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex bg-zinc-200/50 dark:bg-zinc-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('table')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-700 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                    >
                        <Table size={14} /> Editor
                    </button>
                    <button 
                        onClick={() => setView('reference')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'reference' ? 'bg-white dark:bg-zinc-700 shadow-sm text-blue-700 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
                    >
                        <Eye size={14} /> Reference View
                    </button>
                </div>
                <button 
                    onClick={downloadCSV}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
                >
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {view === 'table' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-zinc-100 dark:bg-zinc-800 border-b-2 border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 font-bold uppercase tracking-wider">
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-24 bg-zinc-100 dark:bg-zinc-800">Question Type</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 min-w-[300px] bg-zinc-100 dark:bg-zinc-800">Question (Markdown)</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-32 bg-zinc-100 dark:bg-zinc-800">Option 1</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-32 bg-zinc-100 dark:bg-zinc-800">Option 2</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-32 bg-zinc-100 dark:bg-zinc-800">Option 3</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-32 bg-zinc-100 dark:bg-zinc-800">Option 4</th>
                                    <th className="p-2 border-r border-zinc-300 dark:border-zinc-700 w-20 bg-zinc-100 dark:bg-zinc-800">Correct</th>
                                    <th className="p-2 min-w-[250px] bg-zinc-100 dark:bg-zinc-800">Explanation (Markdown)</th>
                                    <th className="p-2 w-10 bg-zinc-100 dark:bg-zinc-800"></th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-zinc-200 dark:divide-zinc-700">
                                {questions.map((q, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 border-b border-zinc-200 dark:border-zinc-800">
                                        {/* TYPE */}
                                        <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 align-top">
                                            <select 
                                                value={q.type}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], type: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full text-xs p-1.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                                            >
                                                <option value="MCSC">MCSC</option>
                                                <option value="MCMC">MCMC</option>
                                                <option value="Subjective">Subjective</option>
                                            </select>
                                        </td>

                                        {/* QUESTION TEXT */}
                                        <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 align-top">
                                            <textarea 
                                                value={q.question_text || ''}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    newQ[idx] = { ...newQ[idx], question_text: e.target.value };
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[100px] font-mono whitespace-pre-wrap leading-relaxed dark:placeholder:text-zinc-500"
                                                placeholder="Write markdown here...&#10;&#10;Example:&#10;What is the output?&#10;```python&#10;print('hello')&#10;```"
                                            />
                                        </td>

                                        {/* OPTIONS 1-4 */}
                                        {[0, 1, 2, 3].map(optIdx => (
                                            <td key={optIdx} className="p-2 border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                {q.type === 'Subjective' ? (
                                                    <span className="text-xs text-zinc-400 italic">N/A</span>
                                                ) : (
                                                    <textarea
                                                        value={getOption(q.options, optIdx)}
                                                        onChange={(e) => setOption(idx, optIdx, e.target.value)}
                                                        className="w-full p-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 dark:text-zinc-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[50px] dark:placeholder:text-zinc-500"
                                                        placeholder={`Option ${optIdx + 1}`}
                                                    />
                                                )}
                                            </td>
                                        ))}

                                        {/* CORRECT ANSWER */}
                                        <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 align-top">
                                            {q.type !== 'Subjective' ? (
                                                <input 
                                                    value={letterToNumber(q.correct_option)}
                                                    onChange={(e) => {
                                                        const newQ = [...questions];
                                                        newQ[idx] = { ...newQ[idx], correct_option: numberToLetter(e.target.value) };
                                                        handleUpdate(newQ);
                                                    }}
                                                    className="w-full text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-800 rounded p-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                                                    placeholder={q.type === 'MCMC' ? '1,2' : '1'}
                                                />
                                            ) : (
                                                <span className="text-xs text-zinc-400 italic">N/A</span>
                                            )}
                                        </td>

                                        {/* EXPLANATION */}
                                        <td className="p-2 align-top">
                                            <textarea 
                                                value={q.type === 'Subjective' ? (q.model_answer || q.explanation || '') : (q.explanation || '')}
                                                onChange={(e) => {
                                                    const newQ = [...questions];
                                                    if (q.type === 'Subjective') {
                                                        newQ[idx] = { ...newQ[idx], model_answer: e.target.value, explanation: e.target.value };
                                                    } else {
                                                        newQ[idx] = { ...newQ[idx], explanation: e.target.value };
                                                    }
                                                    handleUpdate(newQ);
                                                }}
                                                className="w-full p-2 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none resize-none min-h-[100px] font-mono whitespace-pre-wrap dark:placeholder:text-zinc-500"
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
                        
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-center">
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
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            >
                                <Plus size={16} /> Add Question
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Reference View */
                    <div className="max-w-4xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">
                        <div className="text-center border-b-2 border-zinc-200 dark:border-zinc-800 pb-6 mb-8">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Assignment Reference</h1>
                            <p className="text-zinc-500 dark:text-zinc-400 mt-2">This shows how questions will appear after formatting.</p>
                        </div>
                        
                        {questions.map((q, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                {/* Question Header */}
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 px-6 py-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                                        {i + 1}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                        q.type === 'MCSC' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                        q.type === 'MCMC' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                                        'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                                    }`}>
                                        {q.type}
                                    </span>
                                </div>
                                
                                {/* Question Content */}
                                <div className="p-6">
                                    {/* Question Text */}
                                    <div className="prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200 mb-4 
                                        prose-pre:bg-zinc-900 prose-pre:text-zinc-50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                                        prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                                        dark:prose-strong:text-zinc-100 dark:prose-headings:text-zinc-100">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            rehypePlugins={[rehypeHighlight]}
                                        >
                                            {q.question_text || 'No question text'}
                                        </ReactMarkdown>
                                    </div>
                                    
                                    {/* Options for MCQ */}
                                    {Array.isArray(q.options) && q.options.length > 0 && q.type !== 'Subjective' && (
                                        <div className="space-y-2 mb-6">
                                            {q.options.map((opt, o) => {
                                                const isCorrect = q.correct_option?.toUpperCase().includes(String.fromCharCode(65 + o)) ||
                                                                  q.correct_option?.includes(String(o + 1));
                                                return (
                                                    <div 
                                                        key={o} 
                                                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                                                            isCorrect 
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                                                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                                                        }`}
                                                    >
                                                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            isCorrect 
                                                                ? 'bg-emerald-500 text-white' 
                                                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                                                        }`}>
                                                            {o + 1}
                                                        </div>
                                                        <span className={`text-sm ${isCorrect ? 'text-emerald-800 dark:text-emerald-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                                            {opt || '(empty)'}
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
                                    {(q.explanation || q.model_answer) && (
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
                                    )}
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
