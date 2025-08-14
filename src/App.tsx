import './App.css'
import { SessionProvider } from './contexts/SessionContext'
import { LandingPage } from './components/LandingPage'

function App() {
  return (
    <SessionProvider>
      <LandingPage />
    </SessionProvider>
  )
}

export default App