import { useAuth } from './context/AuthContext'
import LandingPage from './LandingPage'
import Portal from './Portal'

function App() {
  const { user, session, loading, signOut, setUser } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-lg">Loading...</div>
      </div>
    )
  }

  if (session && user) {
    return <Portal onLogout={signOut} user={user} setUser={setUser} />
  }

  return <LandingPage />
}

export default App
