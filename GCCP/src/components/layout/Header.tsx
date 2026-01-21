'use client';

import Link from 'next/link';
import { Menu, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthManager } from '@/lib/storage/auth';

export function Header() {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
        const user = AuthManager.getCurrentUser();
        if (user) setCost(user.usage.totalCost);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl lg:hidden transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">Agentic Core</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Cost Meter */}
        <div className="h-9 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center text-sm font-medium transition-colors">
          <span className="text-zinc-500 dark:text-gray-400 mr-2">Session:</span>
          <span className="font-bold text-zinc-900 dark:text-gray-100">${cost.toFixed(4)}</span>
        </div>
        
        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">
          A
        </div>
      </div>
    </header>
  );
}

