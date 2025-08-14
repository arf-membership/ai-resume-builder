import './App.css'
import { SessionProvider } from './contexts/SessionContext'
import { SessionDemo } from './components/SessionDemo'

function App() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
            AI-Powered CV Improvement Platform
          </h1>
          <div className="flex justify-center">
            <SessionDemo />
          </div>
        </div>
      </div>
    </SessionProvider>
  )
}

export default App