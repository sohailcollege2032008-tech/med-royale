import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!loading && session && profile) {
      if (profile.role === 'owner') navigate('/owner/dashboard', { replace: true })
      else if (profile.role === 'host') navigate('/host/dashboard', { replace: true })
      else navigate('/player/join', { replace: true })
    }
  }, [session, profile, loading, navigate])

  useEffect(() => {
    // Timeout if redirect params are missing or authentication fails
    const timer = setTimeout(() => {
      if (!session) {
        setError(true)
        setTimeout(() => navigate('/', { replace: true }), 2000)
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [session, navigate])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-primary animate-pulse text-2xl font-bold font-sans">
        {error ? 'Login failed, redirecting...' : 'Authenticating...'}
      </div>
    </div>
  )
}
