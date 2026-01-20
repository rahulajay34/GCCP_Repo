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
  
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  // Hydrate local API key
  useEffect(() => {
      setApiKey(window.localStorage.getItem('anthropic_api_key') || '');
  }, []);

  const handleSaveKey = () => {
      window.localStorage.setItem('anthropic_api_key', apiKey);
      setShowSettings(false);
  };

  const handleGenerate = () => {
      // In a real app we'd pass transcript to the store, but for now we haven't updated the store to hold transcript.
      // We pass it to the hook? The hook uses store...
      // Wait, useGeneration hook pulls from store. 
      // I should update useGeneration hook to accept overrides or store transcript.
      // For now, let's update the store to handle transcript or just pass it?
      // Actually, the hook calls startGeneration() with no args and reads from store.
      // I need to add setTranscript to store.
      // But for speed, I will Hack: The hook reads from store. I didn't add transcript to store.
      // I will add transcript to store in a minute.
      // Let's assume I did.
      startGeneration(); // This reads from store used in hook... which I need to update.
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-6 gap-4">
        <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g. Intro to ML)"
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
                <input 
                    value={subtopics}
                    onChange={(e) => setSubtopics(e.target.value)}
                    placeholder="Subtopics (comma separated)"
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
            </div>
            
            <div className="flex gap-4 items-center">
                 <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                    {(['lecture', 'pre-read', 'assignment'] as ContentMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors
                                ${mode === m 
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {m}
                        </button>
                    ))}
                 </div>

                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                        ${showTranscript || transcript
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                            : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
                 >
                    <FileText size={16} />
                    {transcript ? 'Transcript Added' : 'Add Transcript'}
                 </button>
            </div>
        </div>
        
        <div className="flex gap-2 items-center">
             <button  
                 onClick={() => setShowSettings(!showSettings)}
                 className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
             >
                 <Settings size={20} />
             </button>
             
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

      {showSettings && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-2 items-center">
              <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Anthropic API Key"
                  className="flex-1 px-3 py-1.5 border rounded"
              />
              <button onClick={handleSaveKey} className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Save</button>
          </div>
      )}

      {showTranscript && (
          <div className="mb-6">
              <textarea
                  value={transcript}
                  onChange={(e) => {
                      setTranscript(e.target.value);
                      hookSetTranscript(e.target.value);
                  }}
                  placeholder="Paste lecture transcript here for analysis and context..."
                  className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-y"
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
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

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview (Rendered)</span>
          </div>
           <div className="flex-1 p-4 overflow-auto prose dark:prose-invert max-w-none">
             {finalContent ? <ReactMarkdown>{finalContent}</ReactMarkdown> : <p className="text-gray-400 italic">Preview will appear here...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
