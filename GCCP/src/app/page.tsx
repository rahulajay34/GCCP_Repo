import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center py-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Create Educational Content with AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Orchestrate multi-agent workflows to generate high-quality lecture notes, assignments, and pre-reading materials.
        </p>
        
        <div className="mt-8 flex justify-center gap-4">
          <Link 
            href="/editor"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
          >
            Start New Session
          </Link>
          <button className="px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 rounded-lg font-semibold transition-all">
            View History
          </button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-lg font-bold mb-2">Lecture Notes</h3>
          <p className="text-gray-500 text-sm">Generate comprehensive notes from transcripts with examples and diagrams.</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <h3 className="text-lg font-bold mb-2">Assignments</h3>
          <p className="text-gray-500 text-sm">Create structured assignments (MCQ, MSQ, Subjective) with answer keys.</p>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="text-lg font-bold mb-2">Pre-reads</h3>
          <p className="text-gray-500 text-sm">Generate curiosity-inducing materials to prepare students for class.</p>
        </div>
      </div>
    </div>
  );
}
