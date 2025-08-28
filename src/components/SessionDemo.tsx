/**
 * Demo component showing session management usage
 * This can be used for testing and demonstration purposes
 */


import { useSessionManagement } from '../hooks/useSessionManagement';

function SessionDemo() {
  const {
    sessionId,
    sessionData,
    isSessionLoading,
    isSessionValid,
    refreshSession,
    clearSession,
    updateActivity,
    performCleanup,
    forceRefresh
  } = useSessionManagement({
    enableAutoCleanup: true,
    enableMonitoring: true,
    onSessionExpired: () => {
      console.log('Session expired - user would be notified here');
    }
  });

  if (isSessionLoading) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Session Management Demo</h2>
      
      <div className="space-y-4">
        {/* Session Status */}
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Session Status</h3>
          <div className="space-y-1 text-sm">
            <p><strong>Valid:</strong> {isSessionValid ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Session ID:</strong> {sessionId || 'None'}</p>
            {sessionData && (
              <>
                <p><strong>Created:</strong> {new Date(sessionData.createdAt).toLocaleString()}</p>
                <p><strong>Last Activity:</strong> {new Date(sessionData.lastActivity).toLocaleString()}</p>
              </>
            )}
          </div>
        </div>

        {/* Session Controls */}
        <div className="p-4 bg-blue-50 rounded">
          <h3 className="font-semibold mb-2">Session Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshSession}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh Session
            </button>
            
            <button
              onClick={clearSession}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Session
            </button>
            
            <button
              onClick={updateActivity}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Update Activity
            </button>
            
            <button
              onClick={performCleanup}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
            >
              Perform Cleanup
            </button>
            
            <button
              onClick={forceRefresh}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Force Refresh
            </button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-semibold mb-2">How to Use</h3>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Session is automatically created when the app loads</li>
            <li>Activity is tracked automatically on user interactions</li>
            <li>Session expires after 24 hours of inactivity</li>
            <li>Automatic cleanup runs every hour</li>
            <li>Session monitoring checks validity every 30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SessionDemo;