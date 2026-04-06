import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { session, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        if (profile.role === 'owner') navigate('/owner/dashboard', { replace: true })
        else if (profile.role === 'host') navigate('/host/dashboard', { replace: true })
        else navigate('/player/join', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [session, profile, loading, navigate])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-primary animate-pulse text-2xl font-bold font-sans">Logging in...</div>
    </div>
  )
}
