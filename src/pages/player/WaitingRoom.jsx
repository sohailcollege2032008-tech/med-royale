import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ref, onValue, get } from 'firebase/database'
import { rtdb } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

export default function WaitingRoom() {
  const { roomId } = useParams()   // roomId = room code
  const { session } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!session) return
    const userId = session.uid

    // Initial check
    get(ref(rtdb, `rooms/${roomId}/join_requests/${userId}`)).then(snap => {
      if (snap.exists()) {
        const data = snap.val()
        setStatus(data.status)
        if (data.status === 'approved') navigate(`/player/game/${roomId}`)
      }
    })

    // Listen for status changes
    const reqRef = ref(rtdb, `rooms/${roomId}/join_requests/${userId}/status`)
    const unsubscribe = onValue(reqRef, (snap) => {
      if (!snap.exists()) return
      const newStatus = snap.val()
      setStatus(newStatus)
      if (newStatus === 'approved') {
        navigate(`/player/game/${roomId}`)
      }
    })

    return () => unsubscribe()
  }, [roomId, session, navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-background text-center p-6">
      <div className="space-y-6">
        {status === 'pending' && (
          <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        )}
        <h1 className="text-3xl font-display font-bold text-white">
          {status === 'pending'
            ? 'Waiting for Host Approval...'
            : status === 'rejected'
            ? 'Request Rejected'
            : 'Loading Game...'}
        </h1>
        <p className="text-lg text-gray-400 font-sans">
          {status === 'pending'
            ? 'The host must verify your identity before you can join the room.'
            : 'You can close this window if your request was rejected.'}
        </p>
      </div>
    </div>
  )
}
