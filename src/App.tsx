import './App.css'
import AppProvider from './providers/AppProvider'
import { SessionProvider } from './contexts/SessionContext'
import { SecurityProvider } from './components/SecurityProvider'
import { LandingPage } from './components/LandingPage'

// Main App component with security and session providers
function App() {
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