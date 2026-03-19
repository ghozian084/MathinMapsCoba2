import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function MapsTab() {
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'maps'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMaps(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maps');
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMap) {
        await updateDoc(doc(db, 'maps', editingMap.id), formData);
      } else {
        const newDocRef = doc(collection(db, 'maps'));
        await setDoc(newDocRef, { ...formData, id: newDocRef.id, createdAt: Date.now() });
      }
      setIsModalOpen(false);
      setEditingMap(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      handleFirestoreError(error, editingMap ? OperationType.UPDATE : OperationType.CREATE, 'maps');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this map?')) {
      try {
        await deleteDoc(doc(db, 'maps', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `maps/${id}`);
      }
    }
  };

  const openEditModal = (mapObj: any) => {
    setEditingMap(mapObj);
    setFormData({
      name: mapObj.name || '',
      description: mapObj.description || ''
    });
    setIsModalOpen(true);
  };

  if (loading) return <div>Loading maps...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Maps</h3>
        <button
          onClick={() => {
            setEditingMap(null);
            setFormData({ name: '', description: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Map
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {maps.map((mapObj) => (
              <tr key={mapObj.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapObj.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{mapObj.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => openEditModal(mapObj)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(mapObj.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingMap ? 'Edit Map' : 'Add New Map'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Map Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded"></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded">Save Map</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
