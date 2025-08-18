import './App.css'
import { SessionProvider } from './contexts/SessionContext'
import { LandingPage } from './components/LandingPage'
import ErrorAndLoadingProvider from './providers/ErrorAndLoadingProvider'

function App() {
  return (
    <ErrorAndLoadingProvider>
      <SessionProvider>
        <LandingPage />
      </SessionProvider>
    </ErrorAndLoadingProvider>
  )
}

export default App