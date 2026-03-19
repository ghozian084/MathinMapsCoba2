import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { handleFirestoreError, OperationType } from '../../utils/firestoreErrorHandler';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

function LocationPicker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function MapPointsTab() {
  const [points, setPoints] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    mapName: '',
    latitude: 37.42,
    longitude: -122.08,
    title: '',
    description: '',
    pointImageUrl: '',
    taskSetId: ''
  });

  useEffect(() => {
    const qPoints = query(collection(db, 'mapPoints'));
    const unsubscribePoints = onSnapshot(qPoints, (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'mapPoints');
    });

    const qMaps = query(collection(db, 'maps'));
    const unsubscribeMaps = onSnapshot(qMaps, (snapshot) => {
      const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setMaps(mapsData);
      if (mapsData.length > 0 && !formData.mapName) {
        setFormData(prev => ({ ...prev, mapName: mapsData[0].name }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'maps');
    });

    return () => {
      unsubscribePoints();
      unsubscribeMaps();
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Image size must be less than 1MB');
      return;
    }

    setImageUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, pointImageUrl: reader.result as string });
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        await updateDoc(doc(db, 'mapPoints', editingPoint.id), {
          ...formData,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude)
        });
      } else {
        const newDocRef = doc(collection(db, 'mapPoints'));
        await setDoc(newDocRef, {
          ...formData,
          id: newDocRef.id,
          latitude: Number(formData.latitude),
          longitude: Number(formData.longitude)
        });
      }
      setIsModalOpen(false);
      setEditingPoint(null);
      setFormData({ mapName: 'Map 1', latitude: 37.42, longitude: -122.08, title: '', description: '', pointImageUrl: '', taskSetId: '' });
    } catch (error) {
      handleFirestoreError(error, editingPoint ? OperationType.UPDATE : OperationType.CREATE, 'mapPoints');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this point?')) {
      try {
        await deleteDoc(doc(db, 'mapPoints', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `mapPoints/${id}`);
      }
    }
  };

  const openEditModal = (point: any) => {
    setEditingPoint(point);
    setFormData({
      mapName: point.mapName || 'Map 1',
      latitude: point.latitude || 37.42,
      longitude: point.longitude || -122.08,
      title: point.title || '',
      description: point.description || '',
      pointImageUrl: point.pointImageUrl || '',
      taskSetId: point.taskSetId || ''
    });
    setIsModalOpen(true);
  };

  if (loading) return <div>Loading points...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Map Points</h3>
        <button
          onClick={() => {
            setEditingPoint(null);
            setFormData({ 
              mapName: maps.length > 0 ? maps[0].name : '', 
              latitude: 37.42, 
              longitude: -122.08, 
              title: '', 
              description: '', 
              pointImageUrl: '', 
              taskSetId: '' 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Point
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Map Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {points.map((point) => (
              <tr key={point.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{point.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{point.mapName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => openEditModal(point)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(point.id)} className="text-red-600 hover:text-red-900">
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingPoint ? 'Edit Point' : 'Add New Point'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Form Fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Map Name</label>
                      <select required value={formData.mapName} onChange={e => setFormData({...formData, mapName: e.target.value})} className="w-full p-2 border rounded">
                        <option value="" disabled>Select a map</option>
                        {maps.map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input type="number" step="any" required value={formData.latitude} onChange={e => setFormData({...formData, latitude: Number(e.target.value)})} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input type="number" step="any" required value={formData.longitude} onChange={e => setFormData({...formData, longitude: Number(e.target.value)})} className="w-full p-2 border rounded" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Upload (Max 1MB)</label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border rounded mb-2" />
                    {imageUploading && <p className="text-sm text-indigo-600">Uploading...</p>}
                    {formData.pointImageUrl && !imageUploading && (
                      <img src={formData.pointImageUrl} alt="Preview" className="h-20 object-cover rounded border" />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Task Set ID (Optional)</label>
                    <input type="text" value={formData.taskSetId} onChange={e => setFormData({...formData, taskSetId: e.target.value})} className="w-full p-2 border rounded" />
                  </div>
                </div>

                {/* Right Column: Map */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Point Location (Click map to set)</label>
                  <div className="flex-1 min-h-[300px] w-full rounded-lg overflow-hidden border border-gray-300 relative z-0">
                    <MapContainer
                      center={[formData.latitude || 37.42, formData.longitude || -122.08]}
                      zoom={13}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPicker 
                        position={[formData.latitude, formData.longitude]} 
                        setPosition={(pos) => setFormData({ ...formData, latitude: pos[0], longitude: pos[1] })} 
                      />
                    </MapContainer>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded">Save Point</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
