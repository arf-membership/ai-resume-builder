import './App.css'
import AppProvider from './providers/AppProvider'
import { SessionProvider } from './contexts/SessionContext'
import { LandingPage } from './components/LandingPage'

// Step 2: Add back SessionProvider with simplified implementation
function App() {
  return (
    <AppProvider>
      <SessionProvider>
        <LandingPage />
      </SessionProvider>
    </AppProvider>
  )
}

export default App