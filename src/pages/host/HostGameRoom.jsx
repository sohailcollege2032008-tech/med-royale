import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Play, UserCheck, UserX, XCircle, CheckCircle, SkipForward, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function HostGameRoom() {
  const { roomId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  
  const [room, setRoom] = useState(null)
  const [requests, setRequests] = useState([])
  const [players, setPlayers] = useState([])
  const [answers, setAnswers] = useState([])

  useEffect(() => {
    fetchInitialData()

    // Realtime subscriptions
    const sub = supabase.channel(`host_room_${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `room_id=eq.${roomId}` }, () => {
        fetchRequests()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => {
        fetchPlayers()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answers', filter: `room_id=eq.${roomId}` }, () => {
        fetchAnswers()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [roomId])

  const fetchInitialData = async () => {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (roomData) setRoom(roomData)
    fetchRequests()
    fetchPlayers()
    fetchAnswers()
  }

  const fetchRequests = async () => {
    const { data } = await supabase.from('join_requests').select('*').eq('room_id', roomId).eq('status', 'pending')
    if (data) setRequests(data)
  }

  const fetchPlayers = async () => {
    const { data } = await supabase.from('players').select('*').eq('room_id', roomId).order('score', { ascending: false })
    if (data) setPlayers(data)
  }

  const fetchAnswers = async () => {
    // get answers for current question if room exists
    if (!room) return
    const { data } = await supabase.from('answers').select('*').eq('room_id', roomId).eq('question_index', room.current_question_index)
    if (data) setAnswers(data)
  }

  useEffect(() => { if (room) fetchAnswers() }, [room?.current_question_index])

  useEffect(() => {
    if (room?.status === 'finished') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      })
    }
  }, [room?.status])

  const handleRequest = async (requestId, action) => {
    await supabase.rpc('process_join_request', {
      p_request_id: requestId,
      p_action: action
    })
  }

  const startGame = async () => {
    await supabase.from('rooms').update({ 
      status: 'playing', 
      current_question_index: 0,
      question_started_at: new Date().toISOString()
    }).eq('id', roomId)
  }

  const nextQuestion = async () => {
    if (!room || !room.questions.questions) return
    const isFinished = room.current_question_index + 1 >= room.questions.questions.length
    
    if (isFinished) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
    } else {
      await supabase.from('rooms').update({ 
        current_question_index: room.current_question_index + 1,
        question_started_at: new Date().toISOString()
      }).eq('id', roomId)
    }
  }

  if (!room) return <div className="text-white p-6">Loading Room...</div>

  return (
    <div className="min-h-screen bg-background text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
          <div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">{room.title}</h1>
            <p className="text-xl text-primary font-mono tracking-widest">JOIN CODE: {room.code}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{players.length} Players connected</div>
            <div className="text-gray-400 capitalize bg-gray-800 px-4 py-1 rounded-full inline-block mt-2">
              Status: {room.status}
            </div>
          </div>
        </div>

        {room.status === 'lobby' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pending Requests */}
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                Join Requests <span className="text-primary bg-primary/20 px-3 py-1 rounded-full text-sm">{requests.length}</span>
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {requests.length === 0 && <p className="text-gray-500 italic">No pending requests...</p>}
                {requests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl border border-gray-700">
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {req.player_avatar && <img src={req.player_avatar} alt="avatar" className="w-6 h-6 rounded-full" />}
                        {req.player_name}
                      </div>
                      <div className="text-sm text-gray-400">{req.player_email}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleRequest(req.id, 'approved')} className="bg-green-500/20 text-green-500 hover:bg-green-500/30 p-2 rounded-lg"><CheckCircle size={20} /></button>
                      <button onClick={() => handleRequest(req.id, 'rejected')} className="bg-red-500/20 text-red-500 hover:bg-red-500/30 p-2 rounded-lg"><XCircle size={20} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approved Players */}
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 flex flex-col">
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
                Ready Players <span className="text-secondary bg-secondary/20 px-3 py-1 rounded-full text-sm">{players.length}</span>
              </h2>
              <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-max overflow-y-auto pr-2">
                {players.length === 0 && <p className="text-gray-500 italic col-span-2">Waiting for approvals...</p>}
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                    {p.avatar_url ? <img src={p.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><UserCheck size={16} /></div>}
                    <span className="font-bold truncate">{p.nickname}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={startGame}
                disabled={players.length === 0}
                className="mt-6 w-full bg-primary text-background font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#00D4FF] disabled:opacity-50 disabled:hover:bg-primary transition-all active:scale-95 text-lg"
              >
                <Play size={24} fill="currentColor" /> Start Game
              </button>
            </div>
          </div>
        )}

        {room.status === 'playing' && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 p-8 rounded-2xl border border-primary relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                <div className="h-full bg-primary transition-all" style={{ width: `${((room.current_question_index + 1) / room.questions.questions.length) * 100}%` }}></div>
              </div>
              <div className="flex justify-between items-center mb-6 text-gray-400">
                <span className="font-bold text-primary">Question {room.current_question_index + 1} of {room.questions.questions.length}</span>
                <span>{answers.length} / {players.length} Answers</span>
              </div>
              <h2 className="text-3xl font-bold mb-8">{room.questions.questions[room.current_question_index].question}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {room.questions.questions[room.current_question_index].choices.map((choice, i) => {
                  const isCorrectBtn = i === room.questions.questions[room.current_question_index].correct
                  const count = answers.filter(a => a.selected_choice === i).length
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${isCorrectBtn ? 'border-primary bg-primary/10' : 'border-gray-700 bg-gray-800'} flex justify-between items-center`}>
                       <span>{choice}</span>
                       <span className="font-mono text-xl">{count}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 flex justify-end">
                 <button onClick={nextQuestion} className="bg-white text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-all">
                    Next <SkipForward size={20} />
                 </button>
              </div>
            </div>

            {/* Live Leaderboard Snippet */}
            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-[#FFD700]" /> Top Players</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {players.slice(0, 3).map((p, idx) => (
                  <div key={p.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-gray-500">#{idx + 1}</span>
                      <span className="font-bold">{p.nickname}</span>
                    </div>
                    <span className="font-mono text-primary font-bold">{p.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {room.status === 'finished' && (
          <div className="bg-gray-900/50 p-12 rounded-2xl border border-gray-800 text-center">
            <Trophy size={64} className="mx-auto text-[#FFD700] mb-6" />
            <h2 className="text-5xl font-display font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Game Finished!</h2>
            <p className="text-xl text-gray-400 mb-12">Final Leaderboard</p>
            
            <div className="max-w-2xl mx-auto space-y-4">
              {players.map((p, idx) => (
                <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${idx === 0 ? 'bg-primary/20 border-primary' : 'bg-gray-800 border-gray-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${idx === 0 ? 'text-primary' : 'text-gray-500'}`}>#{idx + 1}</span>
                    {p.avatar_url ? <img src={p.avatar_url} alt="avatar" className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center"><UserCheck size={20} /></div>}
                    <span className="font-bold text-xl">{p.nickname}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">{p.score} PTS</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
