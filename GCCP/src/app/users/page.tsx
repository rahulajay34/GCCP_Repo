'use client';

import { useEffect, useState } from 'react';
import { AuthManager } from '@/lib/storage/auth';
import { User } from '@/types/user';
import { UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [createdCreds, setCreatedCreds] = useState<{username: string, password: string} | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(AuthManager.getAllUsers());
  };

  const handleCreateUser = () => {
    if (!newUsername) return;
    const creds = AuthManager.createUser(newUsername, 'user');
    setCreatedCreds(creds);
    loadUsers();
    setNewUsername('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">User Management</h1>

      <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
         <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-500" />
            Create New User
         </h2>
         <div className="flex gap-4">
             <input 
                 value={newUsername}
                 onChange={(e) => setNewUsername(e.target.value)}
                 placeholder="Username"
                 className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-50"
             />
             <button 
                 onClick={handleCreateUser}
                 disabled={!newUsername}
                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
             >
                 Create
             </button>
         </div>
         
         {createdCreds && (
             <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-900">
                 <p className="font-semibold mb-1">User Created Successfully!</p>
                 <p className="text-sm">Username: <span className="font-mono bg-white px-1 rounded">{createdCreds.username}</span></p>
                 <p className="text-sm">Password: <span className="font-mono bg-white px-1 rounded">{createdCreds.password}</span></p>
                 <p className="text-xs mt-2 opacity-75">Make sure to copy these credentials now. Providing a new API Key is required upon login.</p>
             </div>
         )}
      </div>

      <div className="grid gap-4">
         {users.map((user) => (
             <div key={user.id} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center">
                 <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                         {user.role === 'admin' ? <Shield size={20} /> : <UserIcon size={20} />}
                     </div>
                     <div>
                         <h3 className="font-semibold text-gray-900">{user.username}</h3>
                         <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-6 text-sm text-gray-500">
                     <div className="text-right">
                         <p>Cost: ${user.usage.totalCost.toFixed(4)}</p>
                         <p>{user.usage.requestCount} Requests</p>
                     </div>
                     {/* Delete mechanism could go here */}
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
}
