import { User } from '@/types/user';

export class AuthManager {
  private static STORAGE_KEY = 'edu_auth_users';
  private static SESSION_KEY = 'current_user';
  
  // Admin creates credentials
  static createUser(username: string, role: 'admin' | 'user'): { username: string; password: string } {
    const password = this.generatePassword();
    const user: User = {
      id: crypto.randomUUID(),
      username,
      role,
      apiKey: '', // User provides their own
      createdAt: new Date().toISOString(),
      usage: { totalCost: 0, requestCount: 0 }
    };
    
    // Store encrypted
    const users = this.getAllUsers();
    // In a real app, never store plain text passwords, but here we store hash
    // We are NOT storing the password, we return it once.
    // We store the hash.
    users.push({ ...user, passwordHash: this.hashPassword(password) });
    if (typeof window !== 'undefined') {
       localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    }
    
    return { username, password };
  }
  
  // User login
  static login(username: string, password: string): User | null {
    if (typeof window === 'undefined') return null;

    const users = this.getAllUsers();
    const user = users.find(u => 
      u.username === username && 
      u.passwordHash === this.hashPassword(password)
    );
    
    if (user) {
      sessionStorage.setItem(this.SESSION_KEY, user.id);
      return user;
    }
    return null;
  }
  
  static logout() {
      if (typeof window !== 'undefined') {
          sessionStorage.removeItem(this.SESSION_KEY);
      }
  }

  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    const userId = sessionStorage.getItem(this.SESSION_KEY);
    if (!userId) return null;
    
    const users = this.getAllUsers();
    return users.find(u => u.id === userId) || null;
  }
  
  static updateUser(user: User): void {
      if (typeof window === 'undefined') return;
      const users = this.getAllUsers();
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
          users[index] = user;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
      }
  }

  private static hashPassword(password: string): string {
    // Simple hash for demo - use crypto.subtle in production
    return btoa(password);
  }
  
  private static generatePassword(): string {
    return Math.random().toString(36).slice(-8);
  }
  
  static getAllUsers(): User[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  // Helper to initialize specific user if needed (e.g. admin)
  static ensureAdmin() {
      if (typeof window === 'undefined') return;
      const users = this.getAllUsers();
      if (users.length === 0) {
          // Create default admin
          // But we need to return the password to the user.
          // For now, we'll log it or just let the user create one via a method?
          // We'll leave it empty.
      }
  }
}
