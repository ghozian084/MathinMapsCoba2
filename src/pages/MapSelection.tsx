import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Map as MapIcon, ChevronRight } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export default function MapSelection() {
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">MathInMaps</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 font-medium">Welcome, {userProfile?.displayName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Select a Map</h2>
          <p className="mt-2 text-gray-600">Choose a map to explore and complete math tasks.</p>
        </div>

        {maps.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-200">
            <MapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No maps available</h3>
            <p className="text-gray-500 mt-2">Check back later when an administrator has added some maps.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((mapObj) => (
              <div 
                key={mapObj.id}
                onClick={() => navigate(`/map/${encodeURIComponent(mapObj.name)}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group flex flex-col"
              >
                {mapObj.imageUrl ? (
                  <img 
                    src={mapObj.imageUrl} 
                    alt={mapObj.name} 
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-48 bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <MapIcon className="h-12 w-12 text-indigo-200" />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{mapObj.name}</h3>
                  <p className="text-gray-600 text-sm flex-1 line-clamp-3 mb-4">
                    {mapObj.description || 'No description available.'}
                  </p>
                  <div className="flex items-center text-indigo-600 font-medium text-sm group-hover:text-indigo-700">
                    Explore Map <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
