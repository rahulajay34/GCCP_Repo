import { GapAnalysisResult } from "@/types/content";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const GapAnalysisPanel = ({ analysis }: { analysis: GapAnalysisResult | null }) => {
  if (!analysis) return null;
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-6 shadow-sm">
      <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
        <span>Transcript Coverage Analysis</span>
        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
           {new Date(analysis.timestamp).toLocaleTimeString()}
        </span>
      </h3>
      
      <div className="space-y-3">
        {analysis.covered.length > 0 && (
          <div>
            <p className="text-sm font-medium text-green-700 flex items-center gap-1 mb-1">
               <CheckCircle size={14} /> Fully Covered
            </p>
            <ul className="text-sm ml-5 space-y-1">
              {analysis.covered.map((topic, i) => (
                <li key={i} className="text-green-700">• {topic}</li>
              ))}
            </ul>
          </div>
        )}
        
        {analysis.partiallyCovered.length > 0 && (
          <div>
            <p className="text-sm font-medium text-yellow-700 flex items-center gap-1 mb-1">
               <AlertCircle size={14} /> Partially Covered
            </p>
            <ul className="text-sm ml-5 space-y-1">
              {analysis.partiallyCovered.map((topic, i) => (
                <li key={i} className="text-yellow-700">• {topic}</li>
              ))}
            </ul>
          </div>
        )}

        {analysis.notCovered.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm font-bold text-red-700 flex items-center gap-1 mb-1">
               <XCircle size={14} /> Not Covered
            </p>
            <p className="text-xs text-red-600 mb-2">The following subtopics were missing from the transcript:</p>
            <ul className="text-sm ml-5 space-y-1">
              {analysis.notCovered.map((topic, i) => (
                <li key={i} className="text-red-700 font-medium">• {topic}</li>
              ))}
            </ul>
          </div>
        )}
        
        {analysis.covered.length === 0 && analysis.partiallyCovered.length === 0 && analysis.notCovered.length === 0 && (
             <p className="text-sm text-gray-500 italic">No topics found in analysis.</p>
        )}
      </div>
    </div>
  );
};
