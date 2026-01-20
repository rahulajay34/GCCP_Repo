'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthManager } from '@/lib/storage/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // initial check
    checkAuth();
    
    // Listen for storage changes in case of logout
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname, router]);

  const checkAuth = () => {
    if (pathname === '/login') {
        setAuthorized(true);
        return;
    }

    const user = AuthManager.getCurrentUser();
    if (!user) {
      router.push('/login');
    } else {
      setAuthorized(true);
    }
  };

  // Prevent flashing of protected content
  if (!authorized && pathname !== '/login') return null;

  return <>{children}</>;
}
