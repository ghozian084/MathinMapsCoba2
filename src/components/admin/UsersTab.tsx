import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Shield, ShieldAlert, Trash2 } from 'lucide-react';

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, []);

  const toggleRole = async (user: any) => {
    if (window.confirm(`Change role for ${user.email} to ${user.role === 'Admin' ? 'User' : 'Admin'}?`)) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          role: user.role === 'Admin' ? 'User' : 'Admin'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
      }
    }
  };

  const resetUserAnswers = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete all progress for this user?')) {
      try {
        const q = query(collection(db, 'userProgress'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(docSnapshot => 
          deleteDoc(doc(db, 'userProgress', docSnapshot.id))
        );
        
        await Promise.all(deletePromises);
        alert('User progress reset successfully.');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'userProgress');
      }
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">User Management</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.photoURL && (
                      <img className="h-8 w-8 rounded-full mr-3" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
                    )}
                    <div className="text-sm font-medium text-gray-900">{user.displayName || 'Unknown'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => toggleRole(user)} 
                    className="text-indigo-600 hover:text-indigo-900 mr-4 flex items-center gap-1"
                    title="Toggle Role"
                  >
                    {user.role === 'Admin' ? <ShieldAlert className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                    Toggle Role
                  </button>
                  <button 
                    onClick={() => resetUserAnswers(user.id)} 
                    className="text-red-600 hover:text-red-900 flex items-center gap-1 mt-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset Progress
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
