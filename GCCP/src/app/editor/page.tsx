'use client';

import { useGeneration } from '@/hooks/useGeneration';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useState } from 'react';
import { FileText, Loader2, Download, RefreshCw } from 'lucide-react';
import { GapAnalysisPanel } from '@/components/editor/GapAnalysis';
import { ContentMode } from '@/types/content';
import { GenerationStepper } from '@/components/editor/GenerationStepper';

export default function EditorPage() {
  const { 
      topic, subtopics, mode, status, finalContent, formattedContent, error, gapAnalysis, logs,
      setTopic, setSubtopics, setMode, setTranscript: hookSetTranscript, startGeneration 
  } = useGeneration();
  
  const [showTranscript, setShowTranscript] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const text = await file.text();
      hookSetTranscript(text);
      if (!showTranscript) setShowTranscript(true);
  };
  
  const handlePushToLMS = () => {
      if (!finalContent) return;
      
      const payload = {
          topic,
          subtopics,
          content: formattedContent || finalContent,
          timestamp: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lms_export_${topic.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  // Use hook's transcript (from store)
  const { transcript } = useGeneration(); 

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-start mb-6 gap-6">
        {/* ... INPUTS ... */}
        <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g. Intro to ML)"
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
                <input 
                    value={subtopics}
                    onChange={(e) => setSubtopics(e.target.value)}
                    placeholder="Subtopics (comma separated)"
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
            </div>
            
            <div className="flex gap-3 items-center flex-wrap">
                 <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    {(['lecture', 'pre-read', 'assignment'] as ContentMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all
                                ${mode === m 
                                    ? 'bg-white text-blue-700 shadow-sm border border-gray-100' 
                                    : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {m}
                        </button>
                    ))}
                 </div>

                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                        ${showTranscript || transcript
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                 >
                    <FileText size={14} />
                    {transcript ? 'Transcript Added' : 'Add Transcript'}
                 </button>
                 
                 <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer text-gray-600 transition-colors">
                    Upload .txt
                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                 </label>
                 
                 <button 
                    onClick={handlePushToLMS}
                    disabled={!finalContent}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors ml-auto"
                 >
                    <Download size={14} />
                    Push to LMS
                 </button>
            </div>
        </div>
        
        {/* ... GENERATE ... */}
        <div className="flex gap-2 items-center">
           <button 
             onClick={startGeneration}
             disabled={status === 'generating' || !topic}
             className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2
                ${status === 'generating' 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 hover:scale-[1.02]'}`
             }
           >
             {status === 'generating' ? (
                 <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                 </>
             ) : (
                 <>
                    <RefreshCw size={16} />
                    Generate Content
                 </>
             )}
           </button>
        </div>
      </div>

      {(showTranscript || transcript) && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
              <textarea
                  value={transcript}
                  onChange={(e) => hookSetTranscript(e.target.value)}
                  placeholder="Paste lecture transcript here for analysis and context..."
                  className="w-full h-32 p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-mono focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none resize-y transition-all"
              />
          </div>
      )}

      {/* Progress Stepper & Logs */}
      {status !== 'idle' && (
          <GenerationStepper logs={logs || []} status={status} />
      )}

      {gapAnalysis && (
        <GapAnalysisPanel analysis={gapAnalysis} />
      )}

      {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Error: {error}
          </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Editor (Markdown)
            </span>
          </div>
          <div className="flex-1 p-0 overflow-hidden relative group">
             <textarea 
                value={finalContent || ''}
                readOnly
                className="w-full h-full resize-none bg-transparent outline-none font-mono text-sm p-6 leading-relaxed text-gray-800"
                placeholder="// Generated content will stream here..."
             ></textarea>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Preview
            </span>
          </div>
           <div className="flex-1 p-8 overflow-auto bg-gray-50/30">
             {finalContent ? (
                 <article className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-a:text-blue-600 prose-img:rounded-xl prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalContent}</ReactMarkdown>
                 </article>
             ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <FileText size={32} className="mb-2 opacity-50" />
                    <p className="text-sm italic">Preview will appear here...</p>
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
