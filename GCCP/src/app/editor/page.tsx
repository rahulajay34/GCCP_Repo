'use client';

import { useGeneration } from '@/hooks/useGeneration';
import ReactMarkdown from 'react-markdown';
import { useEffect, useState } from 'react';
import { Settings, FileText } from 'lucide-react';
import { GapAnalysisPanel } from '@/components/editor/GapAnalysis';
import { ContentMode } from '@/types/content';

export default function EditorPage() {
  const { 
      topic, subtopics, mode, status, finalContent, error, gapAnalysis,
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
          content: finalContent,
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
      
      alert("Simulated 'Push to LMS' - JSON downloaded.");
  };

  const handleGenerate = () => {
      startGeneration(); 
  };
  
  // Use hook's transcript (from store)
  const { transcript } = useGeneration(); 

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-6 gap-4">
        {/* ... INPUTS ... */}
        <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g. Intro to ML)"
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
                />
                <input 
                    value={subtopics}
                    onChange={(e) => setSubtopics(e.target.value)}
                    placeholder="Subtopics (comma separated)"
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white"
                />
            </div>
            
            <div className="flex gap-4 items-center flex-wrap">
                 <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200">
                    {(['lecture', 'pre-read', 'assignment'] as ContentMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors
                                ${mode === m 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {m}
                        </button>
                    ))}
                 </div>

                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                        ${showTranscript || transcript
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700'}`}
                 >
                    <FileText size={16} />
                    {transcript ? 'Transcript Added' : 'Add Transcript'}
                 </button>
                 
                 <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                    <span className="text-gray-700">Upload .txt</span>
                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                 </label>
                 
                 <button 
                    onClick={handlePushToLMS}
                    disabled={!finalContent}
                    className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg disabled:opacity-50"
                 >
                    Push to LMS
                 </button>
            </div>
        </div>
        
        {/* ... GENERATE ... */}
        <div className="flex gap-2 items-center">
           <button 
             onClick={startGeneration}
             disabled={status === 'generating' || !topic}
             className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all
                ${status === 'generating' 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'}`
             }
           >
             {status === 'generating' ? 'Generating...' : 'Generate Content'}
           </button>
        </div>
      </div>

      {(showTranscript || transcript) && (
          <div className="mb-6">
              <textarea
                  value={transcript}
                  onChange={(e) => hookSetTranscript(e.target.value)}
                  placeholder="Paste lecture transcript here for analysis and context..."
                  className="w-full h-32 p-3 rounded-lg border border-gray-300 bg-white text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-y"
              />
          </div>
      )}

      {gapAnalysis && (
        <GapAnalysisPanel analysis={gapAnalysis} />
      )}

      {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              Error: {error}
          </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Editor (Markdown)</span>
          </div>
          <div className="flex-1 p-0 overflow-hidden">
             <textarea 
                value={finalContent || ''}
                readOnly
                className="w-full h-full resize-none bg-transparent outline-none font-mono text-sm p-4" 
                placeholder="// Generated content will stream here..."
             ></textarea>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview (Rendered)</span>
          </div>
           <div className="flex-1 p-4 overflow-auto prose max-w-none">
             {finalContent ? <ReactMarkdown>{finalContent}</ReactMarkdown> : <p className="text-gray-400 italic">Preview will appear here...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
