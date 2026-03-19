import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Map, MapPin, CheckSquare, Users, Activity, LogOut, Settings } from 'lucide-react';
import MapsTab from '../components/admin/MapsTab';
import MapPointsTab from '../components/admin/MapPointsTab';
import TaskSetsTab from '../components/admin/TaskSetsTab';
import UsersTab from '../components/admin/UsersTab';
import MonitoringTab from '../components/admin/MonitoringTab';
import ResetSessionsTab from '../components/admin/ResetSessionsTab';

export default function AdminDashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Maps');

  if (userProfile?.role !== 'Admin') {
    return <div>Unauthorized</div>;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const tabs = [
    { name: 'Maps', icon: Map },
    { name: 'Points', icon: MapPin },
    { name: 'Tasks', icon: CheckSquare },
    { name: 'Users', icon: Users },
    { name: 'Monitoring', icon: Activity },
    { name: 'Reset Sessions', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <MapPin className="h-6 w-6" /> MathInMaps
          </h1>
          <p className="text-sm text-gray-500 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.name
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            {activeTab === 'Maps' && <MapsTab />}
            {activeTab === 'Points' && <MapPointsTab />}
            {activeTab === 'Tasks' && <TaskSetsTab />}
            {activeTab === 'Users' && <UsersTab />}
            {activeTab === 'Monitoring' && <MonitoringTab />}
            {activeTab === 'Reset Sessions' && <ResetSessionsTab />}
            {activeTab !== 'Maps' && activeTab !== 'Points' && activeTab !== 'Tasks' && activeTab !== 'Users' && activeTab !== 'Monitoring' && activeTab !== 'Reset Sessions' && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">{activeTab} Management</h2>
                <div className="text-gray-500">
                  {activeTab} content will be implemented here.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
