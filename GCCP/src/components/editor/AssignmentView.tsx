import { Download, Table, Eye, FileJson } from 'lucide-react';
import { useState } from 'react';

interface Question {
    type: string;
    question_text: string;
    options?: string[];
    correct_option?: string;
    correct_options?: string[]; // for MCMC
    explanation: string;
    model_answer?: string;
}

export function AssignmentView({ jsonContent }: { jsonContent: string }) {
    const [view, setView] = useState<'table' | 'student'>('table');
    let questions: Question[] = [];

    try {
        questions = JSON.parse(jsonContent);
    } catch (e) {
        return <div className="text-red-500 p-4">Error parsing assignment data.</div>;
    }

    const downloadCSV = () => {
        // Simple CSV construction
        const headers = ["Type", "Question", "Options", "Correct Answer", "Explanation"];
        const rows = questions.map(q => [
            q.type,
            `"${q.question_text.replace(/"/g, '""')}"`, // Escape quotes
            `"${(q.options || []).join(' | ')}"`,
            q.correct_option || (q.correct_options || []).join(', ') || q.model_answer || '',
            `"${q.explanation.replace(/"/g, '""')}"`
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assignment.csv';
        a.click();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
                <button 
                    onClick={() => setView('table')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'table' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Table size={14} /> Table View
                </button>
                <button 
                    onClick={() => setView('student')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === 'student' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    <Eye size={14} /> Student View
                </button>
                <button 
                    onClick={downloadCSV}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                    <Download size={14} /> Download CSV
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {view === 'table' ? (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                <tr>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Question</th>
                                    <th className="p-3">Correct</th>
                                    <th className="p-3">Explanation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {questions.map((q, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="p-3 font-mono text-xs text-gray-500">{q.type}</td>
                                        <td className="p-3 max-w-xs">{q.question_text}</td>
                                        <td className="p-3 font-medium text-emerald-600">
                                            {q.correct_option || (q.correct_options || []).join(', ') || 'N/A'}
                                        </td>
                                        <td className="p-3 text-gray-500 max-w-xs truncate" title={q.explanation}>{q.explanation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-3xl mx-auto">
                        {questions.map((q, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="flex justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Q{i + 1}. {q.question_text}</h3>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 h-fit">{q.type}</span>
                                </div>
                                
                                {q.options && (
                                    <div className="space-y-2 mb-4">
                                        {q.options.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-3 p-2 rounded border border-transparent hover:bg-gray-50 hover:border-gray-200 transition-all">
                                                <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs text-gray-500">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </div>
                                                <span className="text-sm text-gray-700">{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-50 bg-blue-50/30 -mx-6 -mb-6 p-4 rounded-b-xl">
                                    <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Answer Key</div>
                                    <p className="text-sm text-gray-800 font-medium">
                                        Correct: {q.correct_option || (q.correct_options || []).join(', ') || q.model_answer}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2 italic">
                                        <span className="font-semibold not-italic">Explanation:</span> {q.explanation}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
