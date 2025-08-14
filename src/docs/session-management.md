# Session Management System

This document describes the session management system implemented for the AI-powered CV Improvement Platform.

## Overview

The session management system provides:
- Unique session ID generation for anonymous users
- Browser storage persistence using localStorage
- React context provider for application-wide session access
- Automatic session validation and cleanup
- Activity tracking and session expiry handling

## Architecture

### Core Components

1. **Session Utilities** (`src/utils/session.ts`)
   - `generateSessionId()`: Creates unique session identifiers
   - `isValidSessionId()`: Validates session ID format
   - Session configuration constants

2. **Session Storage Service** (`src/services/sessionStorage.ts`)
   - `SessionStorageService`: Handles localStorage operations
   - Session data persistence and retrieval
   - Automatic expiry checking

3. **Session Context** (`src/contexts/SessionContext.tsx`)
   - `SessionProvider`: React context provider
   - `useSession()`: Hook for accessing session data
   - Activity tracking and validation

4. **Session Validation** (`src/utils/sessionValidation.ts`)
   - `SessionValidator`: Comprehensive session validation
   - `SessionCleanup`: Automatic cleanup mechanisms
   - `SessionMonitor`: Real-time session monitoring

5. **Session Management Hook** (`src/hooks/useSessionManagement.ts`)
   - `useSessionManagement()`: Convenient session utilities
   - Automatic cleanup and monitoring setup
   - Session expiry handling

## Usage

### Basic Setup

1. Wrap your app with the SessionProvider:

```tsx
import { SessionProvider } from './contexts/SessionContext';

function App() {
  return (
    <SessionProvider>
      {/* Your app components */}
    </SessionProvider>
  );
}
```

2. Use the session in components:

```tsx
import { useSession } from './contexts/SessionContext';

function MyComponent() {
  const { sessionId, sessionData, isSessionLoading } = useSession();
  
  if (isSessionLoading) {
    return <div>Loading session...</div>;
  }
  
  return <div>Session ID: {sessionId}</div>;
}
```

### Advanced Usage

Use the comprehensive session management hook:

```tsx
import { useSessionManagement } from './hooks/useSessionManagement';

function MyComponent() {
  const {
    sessionId,
    isSessionValid,
    performCleanup,
    forceRefresh
  } = useSessionManagement({
    enableAutoCleanup: true,
    enableMonitoring: true,
    onSessionExpired: () => {
      // Handle session expiry
      console.log('Session expired');
    }
  });
  
  return (
    <div>
      <p>Session Valid: {isSessionValid ? 'Yes' : 'No'}</p>
      <button onClick={performCleanup}>Clean Up</button>
      <button onClick={forceRefresh}>Refresh Session</button>
    </div>
  );
}
```

## Configuration

### Session Settings

```typescript
export const SESSION_CONFIG = {
  // Session expires after 24 hours of inactivity
  EXPIRY_HOURS: 24,
  // Clean up sessions older than 7 days
  CLEANUP_DAYS: 7,
} as const;
```

### Storage Keys

```typescript
export const SESSION_STORAGE_KEYS = {
  SESSION_ID: 'cv_platform_session_id',
  SESSION_CREATED_AT: 'cv_platform_session_created_at',
  SESSION_LAST_ACTIVITY: 'cv_platform_session_last_activity',
} as const;
```

## Features

### Automatic Session Creation
- Sessions are created automatically when the app loads
- No user authentication required
- Unique UUID-based session identifiers

### Activity Tracking
- Tracks user interactions (mouse, keyboard, touch events)
- Updates activity timestamp automatically
- Throttled to prevent excessive localStorage writes

### Session Validation
- Validates session format and expiry
- Automatic cleanup of expired sessions
- Comprehensive validation checks

### Error Handling
- Graceful fallbacks when localStorage is unavailable
- Error logging and recovery mechanisms
- Fallback session ID generation methods

### Monitoring and Cleanup
- Periodic session validation (every 30 seconds)
- Automatic cleanup of expired data (every hour)
- Real-time session validity monitoring

## API Reference

### SessionStorageService

```typescript
class SessionStorageService {
  static getCurrentSession(): SessionData | null
  static createNewSession(): SessionData
  static updateLastActivity(): void
  static clearSession(): void
  static getOrCreateSession(): SessionData
  static isStorageAvailable(): boolean
}
```

### SessionValidator

```typescript
class SessionValidator {
  static validateCurrentSession(): SessionValidationResult
  static checkSessionExpiry(lastActivity: string): SessionValidationResult
  static isValidSessionIdFormat(sessionId: string): boolean
  static isStorageAvailable(): boolean
}
```

### SessionCleanup

```typescript
class SessionCleanup {
  static performCleanup(): void
  static clearExpiredSession(): void
  static cleanupOldSessionData(): void
  static schedulePeriodicCleanup(): () => void
}
```

### SessionMonitor

```typescript
class SessionMonitor {
  static addValidityListener(callback: (isValid: boolean) => void): () => void
  static notifyValidityChange(isValid: boolean): void
  static startMonitoring(): () => void
}
```

## Types

### SessionData

```typescript
interface SessionData {
  sessionId: string;
  createdAt: string;
  lastActivity: string;
}
```

### SessionValidationResult

```typescript
interface SessionValidationResult {
  isValid: boolean;
  reason?: 'expired' | 'invalid_format' | 'missing_data' | 'storage_error';
  remainingTime?: number; // in milliseconds
}
```

## Security Considerations

- Session IDs are generated using crypto.randomUUID() when available
- No sensitive data is stored in localStorage
- Sessions automatically expire after 24 hours of inactivity
- Automatic cleanup prevents data accumulation
- Input validation prevents malformed session data

## Browser Compatibility

- Modern browsers with localStorage support
- Fallback session ID generation for older browsers
- Graceful degradation when localStorage is unavailable
- Cross-browser compatibility tested

## Performance

- Throttled activity updates (max every 30 seconds)
- Efficient localStorage operations
- Minimal memory footprint
- Optimized cleanup routines

## Testing

The session management system includes comprehensive validation and error handling. To test manually:

1. Open browser developer tools
2. Navigate to Application > Local Storage
3. Observe session data creation and updates
4. Test session expiry by manually modifying timestamps
5. Verify cleanup by checking for orphaned data

## Troubleshooting

### Common Issues

1. **Session not persisting**: Check if localStorage is available and not disabled
2. **Session expiring too quickly**: Verify activity tracking is working
3. **Multiple sessions**: Ensure only one SessionProvider is used
4. **Memory leaks**: Verify cleanup functions are called on component unmount

### Debug Mode

Enable debug logging by setting:

```typescript
localStorage.setItem('cv_platform_debug', 'true');
```

This will log session operations to the browser console.