import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, get, set, update } from 'firebase/database'
import { rtdb } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'

export default function JoinGame() {
  const { profile, session } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = () => useAuthStore.getState().signOut()

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code || code.length !== 6) return
    setLoading(true)

    const roomCode = code.toUpperCase()

    try {
      // 1. Verify room exists
      const roomSnap = await get(ref(rtdb, `rooms/${roomCode}`))
      if (!roomSnap.exists()) {
        alert('Invalid Room Code')
        setLoading(false)
        return
      }

      const userId = session.uid

      // 2. Check for existing request
      const existingSnap = await get(ref(rtdb, `rooms/${roomCode}/join_requests/${userId}`))

      if (existingSnap.exists()) {
        const existing = existingSnap.val()
        if (existing.status === 'rejected') {
          // Reset to pending to allow re-joining
          await update(ref(rtdb, `rooms/${roomCode}/join_requests/${userId}`), {
            status: 'pending',
            created_at: Date.now()
          })
        }
        // Either way, go to waiting room
        navigate(`/player/waiting/${roomCode}`)
      } else {
        // 3. Submit new join request
        await set(ref(rtdb, `rooms/${roomCode}/join_requests/${userId}`), {
          player_id: userId,
          player_email: profile.email,
          player_name: profile.display_name || profile.email,
          player_avatar: profile.avatar_url || null,
          status: 'pending',
          created_at: Date.now()
        })
        navigate(`/player/waiting/${roomCode}`)
      }
    } catch (err) {
      alert('Error joining: ' + err.message)
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-gray-900/50 p-8 rounded-2xl border border-gray-800 shadow-xl text-center backdrop-blur-sm">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Join a Game</h1>
        <p className="text-gray-400 mb-8 font-sans">Enter the 6-digit code provided by your host</p>

        <form onSubmit={handleJoin} className="space-y-6">
          <input
            type="text"
            placeholder="e.g. A1B2C3"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full text-center text-4xl tracking-[0.5em] font-mono bg-gray-800 border-2 border-gray-700 rounded-xl py-4 focus:outline-none focus:border-primary text-white transition-colors uppercase"
            required
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-primary text-background font-bold text-lg py-4 rounded-xl hover:bg-[#00D4FF] disabled:opacity-50 disabled:hover:bg-primary transition-all active:scale-95"
          >
            {loading ? 'Requesting to Join...' : 'Enter Battle'}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="mt-6 w-full rounded-xl bg-gray-800/50 border border-gray-700 px-6 py-3 font-bold text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors text-sm"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
