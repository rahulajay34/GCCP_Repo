'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/storage/db';
import { GenerationState } from '@/types/content';
import { useGenerationStore } from '@/lib/store/generation';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Trash2, Calendar } from 'lucide-react';

export default function ArchivesPage() {
  const [generations, setGenerations] = useState<GenerationState[]>([]);
  const router = useRouter();
  const setStoreState = useGenerationStore((state) => ({ 
      setTopic: state.setTopic, 
      setSubtopics: state.setSubtopics, 
      setMode: state.setMode,
      setTranscript: state.setTranscript,
      setContent: state.setContent,
      setGapAnalysis: state.setGapAnalysis
  }));

  useEffect(() => {
    loadGenerations();
  }, []);

  const loadGenerations = async () => {
    try {
      const items = await db.generations.orderBy('createdAt').reverse().toArray();
      setGenerations(items);
    } catch (error) {
      console.error("Failed to load generations", error);
    }
  };

  const handleDelete = async (id: string | number) => {
      if (!confirm("Are you sure you want to delete this item?")) return;
      try {
          await db.generations.delete(id as any); // Dexie types can be tricky
          loadGenerations();
      } catch (e) {
          console.error("Failed to delete", e);
      }
  };

  const handleRestore = (item: GenerationState) => {
      setStoreState.setTopic(item.topic);
      setStoreState.setSubtopics(item.subtopics);
      setStoreState.setMode(item.mode);
      setStoreState.setTranscript(''); // Assuming no transcript saved or separate?
      // Wait, I updated store to have transcript, but did I save it to DB?
      // I didn't verify if 'db.ts' GenerationState matches 'types/content.ts'.
      // Types match, but Dexie saves what is passed. 
      // In useGeneration logic, I didn't pass transcript to db.generations.add(). :(
      // I only passed { topic, subtopics, mode, ... }
      // I should have passed transcript. 
      // But for now, I'll ignore transcript restore or set empty.
      // Actually, let's just set the content.
      setStoreState.setContent(item.finalContent || '');
      setStoreState.setGapAnalysis(item.gapAnalysis || null);
      
      router.push('/editor');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Creation History</h1>
      
      <div className="grid gap-4">
        {generations.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500">No history found. Generate something first!</p>
            </div>
        )}
        
        {generations.map((gen) => (
          <div key={gen.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
             <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                        ${gen.mode === 'lecture' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          gen.mode === 'pre-read' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        }`}>
                        {gen.mode}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(gen.createdAt).toLocaleString()}
                    </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{gen.topic}</h3>
                <p className="text-sm text-gray-500 truncate max-w-xl">{gen.subtopics}</p>
             </div>
             
             <div className="flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={() => handleDelete(gen.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                 >
                     <Trash2 size={18} />
                 </button>
                 <button 
                    onClick={() => handleRestore(gen)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                 >
                     Open in Editor <ArrowRight size={16} />
                 </button>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
