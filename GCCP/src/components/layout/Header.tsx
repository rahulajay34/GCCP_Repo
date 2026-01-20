'use client';

import Link from 'next/link';
import { Menu, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthManager } from '@/lib/storage/auth';

export function Header() {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    // Simple poll or event listener for now. 
    // Ideally we'd use a context or store, but polling is cheap local op.
    const interval = setInterval(() => {
        const user = AuthManager.getCurrentUser();
        if (user) setCost(user.usage.totalCost);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-gray-200 bg-white/80 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Agentic Core
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Cost Meter */}
        <div className="h-8 px-3 rounded-full bg-gray-100 flex items-center text-sm font-medium">
          <span className="text-gray-500 mr-2">Session Cost:</span>
          <span>${cost.toFixed(4)}</span>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
      </div>
    </header>
  );
}
