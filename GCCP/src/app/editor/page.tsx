'use client';

import { useGeneration } from '@/hooks/useGeneration';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import { useEffect, useState, useRef } from 'react';
import { FileText, Loader2, Download, RefreshCw, Square, Trash2 } from 'lucide-react';
import { Mermaid } from '@/components/ui/Mermaid';
import { GapAnalysisPanel } from '@/components/editor/GapAnalysis';
import { ContentMode } from '@/types/content';
import { GenerationStepper } from '@/components/editor/GenerationStepper';

export default function EditorPage() {
  const { 
      topic, subtopics, mode, status, finalContent, formattedContent, error, gapAnalysis, logs,
      setTopic, setSubtopics, setMode, setTranscript: hookSetTranscript, startGeneration, stopGeneration, clearStorage 
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

  // 1. Add this ref for auto-scrolling
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Only scroll if we are generating
      if (status === 'generating') {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [finalContent, status]);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex-shrink-0 flex justify-between items-start mb-6 gap-6">
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
        
        {/* ... GENERATE & ACTIONS ... */}
        <div className="flex gap-2 items-center">
           {status !== 'idle' && (
              <button
                  onClick={clearStorage}
                  title="Clear Storage & Reset"
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                  <Trash2 size={20} />
              </button>
           )}

           {status === 'generating' ? (
                <button 
                onClick={stopGeneration}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Square size={16} fill="currentColor" />
                Stop
              </button>
           ) : (
                <button 
                  onClick={startGeneration}
                  disabled={!topic}
                  className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2
                      ${!topic
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 hover:scale-[1.02]'}`
                  }
                >
                  <RefreshCw size={16} />
                  Generate
                </button>
           )}
        </div>
      </div>

      {(showTranscript || transcript) && (
          <div className="flex-shrink-0 mb-6 animate-in fade-in slide-in-from-top-2">
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
          <div className="flex-shrink-0">
            <GenerationStepper logs={logs || []} status={status} />
          </div>
      )}

      {gapAnalysis && (
        <div className="flex-shrink-0">
            <GapAnalysisPanel analysis={gapAnalysis} />
        </div>
      )}

      {error && (
          <div className="flex-shrink-0 mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Error: {error}
          </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden relative">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Editor (Markdown)
            </span>
          </div>
          <div className="flex-1 overflow-y-auto relative p-0 group">
             <textarea 
                value={finalContent || ''}
                readOnly
                className="w-full h-full resize-none bg-transparent outline-none font-mono text-sm p-6 leading-relaxed text-gray-800"
                placeholder="// Generated content will stream here..."
             ></textarea>
                 
             {/* Overlay for Sanitizer Phase */}
             {logs && logs.length > 0 && logs[logs.length-1].message.includes('Sanitizer') && (
               <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                   <div className="flex flex-col items-center gap-2 text-blue-600">
                       <Loader2 className="animate-spin w-8 h-8" />
                       <span className="font-semibold">Sanitizer is auditing content...</span>
                   </div>
               </div>
            )}
            
            {/* Alternative check using status or specific agent tracking if available directly in component state, but logs check is a quick proxy based on event stream */}
            
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Preview
            </span>
          </div>
           <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
             {finalContent ? (
                 <article className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-a:text-blue-600 prose-img:rounded-xl prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]} 
                        rehypePlugins={[rehypeKatex, rehypeHighlight]}
                        components={{
                            code: ({node, inline, className, children, ...props}: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                if (!inline && match && match[1] === 'mermaid') {
                                     return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                                }
                                return <code className={className} {...props}>{children}</code>;
                            }
                        }}
                    >
                        {finalContent}
                    </ReactMarkdown>
                    <div ref={bottomRef} /> {/* Auto-scroll anchor */}
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
