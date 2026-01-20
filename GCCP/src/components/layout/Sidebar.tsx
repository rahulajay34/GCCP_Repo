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
  const isAdmin = true; // Replace with actual check from AuthManager later
  
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 h-[calc(100vh-4rem)] bg-white sticky top-16">
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
            if (item.label === 'Users' && !isAdmin) return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
        })}
      </nav>
      
      {/* Pro Plan Removed */}
    </aside>
  );
}
