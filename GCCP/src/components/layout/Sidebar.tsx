import Link from 'next/link';
import { LayoutDashboard, FileEdit, Database, Users } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Editor', icon: FileEdit, href: '/editor' },
  { label: 'Archives', icon: Database, href: '/archives' },
  { label: 'Users', icon: Users, href: '/users' }, // Admin only usually
];

export function Sidebar() {
  // Check active path logic would go here
  
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-gray-800 h-[calc(100vh-4rem)] bg-white dark:bg-gray-950 sticky top-16">
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">Pro Plan</h4>
          <p className="text-xs text-blue-700 dark:text-blue-300">Unlimited generations</p>
        </div>
      </div>
    </aside>
  );
}
