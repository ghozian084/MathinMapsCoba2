import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, ArrowLeft } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import TaskSidebar from '../components/TaskSidebar';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView() {
  const { mapName } = useParams<{ mapName: string }>();
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [mapPoints, setMapPoints] = useState<any[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [showTaskSidebar, setShowTaskSidebar] = useState(false);

  useEffect(() => {
    if (!mapName) return;
    
    const q = query(collection(db, 'mapPoints'), where('mapName', '==', mapName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const points = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMapPoints(points);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mapPoints');
    });

    return () => unsubscribe();
  }, [mapName]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="h-screen w-full flex flex-col relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/maps')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Maps
          </button>
          <h1 className="text-xl font-bold text-indigo-600">MathInMaps: {mapName}</h1>
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
      </header>

      {/* Map Container */}
      <div className="flex-1 w-full relative z-0">
        <MapContainer
          center={[37.42, -122.08]}
          zoom={12}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapPoints.map(point => (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              eventHandlers={{
                click: () => setSelectedPoint(point),
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Point Tooltip/Popup */}
      {selectedPoint && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-2xl p-6 w-96 z-20 transition-all duration-300">
          <button 
            onClick={() => setSelectedPoint(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
          {selectedPoint.pointImageUrl && (
            <img 
              src={selectedPoint.pointImageUrl} 
              alt={selectedPoint.title} 
              className="w-full h-40 object-cover rounded-lg mb-4"
              referrerPolicy="no-referrer"
            />
          )}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedPoint.title}</h3>
          <p className="text-gray-600 text-sm mb-6 line-clamp-3">{selectedPoint.description}</p>
          <button 
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            onClick={() => {
              setShowTaskSidebar(true);
            }}
          >
            Start Task
          </button>
        </div>
      )}

      {/* Task Sidebar Overlay */}
      {showTaskSidebar && selectedPoint && (
        <TaskSidebar 
          mapName={mapName || 'Map'} 
          point={selectedPoint} 
          onClose={() => setShowTaskSidebar(false)} 
        />
      )}
    </div>
  );
}
