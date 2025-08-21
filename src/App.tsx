import './App.css'
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AppProvider from './providers/AppProvider'
import { SessionProvider } from './contexts/SessionContext'
import { SecurityProvider } from './components/SecurityProvider'
import { AppIntegration } from './components/AppIntegration'
import { ChatPage } from './components/ChatPage'
import { preloadCriticalComponents } from './components/LazyComponents'
import { performanceMonitoring } from './services/performanceMonitoringService'
import { validateEnvironment } from './config/production'

// Main App component with security and session providers
function App() {
  useEffect(() => {
    // Validate environment in development
    if (import.meta.env.DEV) {
      const validation = validateEnvironment();
      if (!validation.isValid) {
        console.warn('Environment validation failed:', validation.errors);
      }
    }
    
    // Initialize performance monitoring
    performanceMonitoring.trackUserInteraction('app_load', 'application', '/');
    
    // Preload critical components after initial render
    const preloadTimer = setTimeout(() => {
      preloadCriticalComponents();
    }, 1000); // Delay to not block initial render

    return () => {
      clearTimeout(preloadTimer);
    };
  }, []);

  return (
    <AppProvider>
      <SecurityProvider enableSecurity={true}>
        <SessionProvider>
          <Router>
            <Routes>
              <Route path="/" element={<AppIntegration />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </Router>
        </SessionProvider>
      </SecurityProvider>
    </AppProvider>
  )
}

export default App