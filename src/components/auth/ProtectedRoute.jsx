import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0A0E1A]" dir="rtl">
        <div className="text-[#00F5A0] animate-pulse font-mono text-xl">جاري التحميل...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/not-authorized" replace />
  }

  return children
}
