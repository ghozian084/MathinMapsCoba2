import React from 'react';
import { Settings, AlertTriangle } from 'lucide-react';

export default function ResetSessionsTab() {
  const handleReset = () => {
    alert('This feature requires a Firebase Cloud Function using the Firebase Admin SDK to revoke all refresh tokens. It is not implemented in this client-only preview.');
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">Reset All Sessions</h3>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Warning: Resetting all sessions will immediately log out all active users. They will be required to re-authenticate.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleReset}
        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
      >
        Reset All Active Sessions
      </button>
    </div>
  );
}
