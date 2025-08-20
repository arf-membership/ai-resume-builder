import './App.css'
import { useEffect } from 'react'
import AppProvider from './providers/AppProvider'
import { SessionProvider } from './contexts/SessionContext'
import { SecurityProvider } from './components/SecurityProvider'
import { LandingPage } from './components/LandingPage'
import { preloadCriticalComponents } from './components/LazyComponents'
import { performanceMonitoring } from './services/performanceMonitoringService'

// Main App component with security and session providers
function App() {
  useEffect(() => {
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
          <LandingPage />
        </SessionProvider>
      </SecurityProvider>
    </AppProvider>
  )
}

export default App