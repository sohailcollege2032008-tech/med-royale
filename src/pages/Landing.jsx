import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import GoogleSignInButton from '../components/auth/GoogleSignInButton'

export default function Landing() {
  const { session, profile, loading } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 font-display">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            Mashrou3 <span className="text-primary">Dactoor</span>
          </h1>
          <p className="text-xl text-gray-400 font-sans">Welcome to the Medical Battleground</p>
        </div>

        {loading ? (
          <div className="text-primary animate-pulse py-8 font-sans">Loading...</div>
        ) : !session ? (
          <div className="pt-8 flex justify-center">
            <GoogleSignInButton />
          </div>
        ) : (
          <div className="space-y-6 pt-8 font-sans">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm">
              <img 
                src={profile?.avatar_url || ''} 
                alt="Profile" 
                className="mx-auto mb-4 h-20 w-20 rounded-full border-2 border-primary object-cover"
              />
              <h2 className="text-2xl font-bold text-white">{profile?.display_name}</h2>
              <p className="text-gray-400 mt-1">
                {profile?.role === 'owner' ? 'Owner' : profile?.role === 'host' ? 'Host' : 'Player'}
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <Link 
                to={profile?.role === 'owner' ? '/owner/dashboard' : profile?.role === 'host' ? '/host/dashboard' : '/player/join'}
                className="w-full rounded-xl bg-primary px-6 py-4 font-bold text-background transition-colors hover:bg-[#00D4FF]"
              >
                Enter Dashboard
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
