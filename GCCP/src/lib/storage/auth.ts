import { User } from '@/types/user';

export class AuthManager {
  private static STORAGE_KEY = 'edu_auth_session';

  // User login
  static login(username: string, password: string): User | null {
    if (username === 'admin' && password === 'admin') {
      const user: User = {
        id: 'admin-id',
        username: 'admin',
        role: 'admin',
        apiKey: '', // User provides their own if needed
        createdAt: new Date().toISOString(),
        usage: { totalCost: 0, requestCount: 0 }
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
      }
      return user;
    }
    return null;
  }

  static logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      window.location.href = '/login';
    }
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  static updateUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
  }
}
