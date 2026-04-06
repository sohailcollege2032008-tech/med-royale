import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Trophy, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function PlayerGameView() {
  const { roomId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  
  const [room, setRoom] = useState(null)
  const [player, setPlayer] = useState(null)
  const [currentAnswer, setCurrentAnswer] = useState(null)
  const [isAnswering, setIsAnswering] = useState(false)

  useEffect(() => {
    fetchInitialData()

    const sub = supabase.channel(`player_room_${roomId}_${session.user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new)
        setCurrentAnswer(null) // reset answer state on new question
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        setPlayer(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [roomId, session])

  const fetchInitialData = async () => {
    const { data: p } = await supabase.from('players').select('*').eq('room_id', roomId).eq('user_id', session.user.id).single()
    if (!p) {
      alert("You are not part of this room!")
      navigate('/')
      return
    }
    setPlayer(p)

    const { data: r } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    if (r) {
      setRoom(r)
      // Check if already answered current question
      if (r.status === 'playing' && r.current_question_index !== -1) {
        const { data: a } = await supabase.from('answers').select('*')
          .eq('room_id', roomId).eq('player_id', p.id).eq('question_index', r.current_question_index)
          .single()
        if (a) setCurrentAnswer(a)
      }
    }
  }

  useEffect(() => {
    if (room?.status === 'finished') {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 }
      })
    }
  }, [room?.status])

  const submitAnswer = async (choiceIndex) => {
    if (isAnswering || currentAnswer) return
    setIsAnswering(true)
    
    // Call RPC
    const { data, error } = await supabase.rpc('submit_answer', {
      p_room_id: roomId,
      p_player_id: player.id,
      p_question_index: room.current_question_index,
      p_selected_choice: choiceIndex,
      p_correct_choice: room.questions.questions[room.current_question_index].correct
    })

    if (error) {
      alert("Error saving answer: " + error.message)
    } else if (data.error) {
      if (data.error === 'already_answered') {
        // Just refetch
      } else {
        alert(data.error)
      }
    } else {
      setCurrentAnswer({
        selected_choice: choiceIndex,
        is_correct: data.is_correct,
        is_first_correct: data.is_first,
        response_time_ms: data.response_time_ms
      })
    }
    setIsAnswering(false)
  }

  if (!room || !player) return <div className="flex h-screen items-center justify-center text-white bg-background">Loading...</div>

  return (
    <div className="flex flex-col min-h-screen bg-background text-white">
      {/* Top Bar */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          {player.avatar_url && <img src={player.avatar_url} alt="avatar" className="w-10 h-10 rounded-full border-2 border-primary" />}
          <div className="font-bold text-lg">{player.nickname}</div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-xl">
          <Trophy className="text-[#FFD700]" size={20} />
          <span className="font-mono text-xl font-bold">{player.score} PTS</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-6">
        
        {room.status === 'lobby' && (
          <div className="text-center space-y-6 max-w-md w-full">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto border-4 border-primary">
              <Clock size={40} className="text-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-display font-bold">You're In!</h1>
            <p className="text-xl text-gray-400">Waiting for {room.title} to start...</p>
          </div>
        )}

        {room.status === 'playing' && (
          <div className="max-w-4xl w-full">
            {!currentAnswer ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                  <span className="text-primary font-bold text-sm tracking-widest uppercase mb-2 block">Question {room.current_question_index + 1}</span>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight">{room.questions.questions[room.current_question_index].question}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                  {room.questions.questions[room.current_question_index].choices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => submitAnswer(idx)}
                      disabled={isAnswering}
                      className="group relative p-6 bg-gray-800 border-2 border-gray-700 rounded-2xl hover:border-primary hover:bg-gray-800/80 transition-all text-left active:scale-95 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative z-10 text-xl font-medium">{choice}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center animate-in slide-in-from-bottom-8 duration-500 bg-gray-900/80 p-12 rounded-3xl border border-gray-800 backdrop-blur-md">
                {currentAnswer.is_correct ? (
                  <CheckCircle2 size={80} className="text-primary mx-auto mb-6" />
                ) : (
                  <XCircle size={80} className="text-red-500 mx-auto mb-6" />
                )}
                
                <h2 className={`text-4xl font-display font-bold mb-4 ${currentAnswer.is_correct ? 'text-primary' : 'text-red-500'}`}>
                  {currentAnswer.is_correct ? 'Correct!' : 'Incorrect!'}
                </h2>
                
                {currentAnswer.is_first_correct && (
                  <div className="inline-flex items-center gap-2 bg-[#FFD700]/20 text-[#FFD700] px-4 py-2 rounded-full font-bold mb-6">
                    <Trophy size={18} /> First to answer correctly! (+1)
                  </div>
                )}
                
                <p className="text-xl text-gray-400 mt-6 flex items-center justify-center gap-2">
                  <AlertCircle size={20} /> Waiting for host to proceed...
                </p>
              </div>
            )}
          </div>
        )}

        {room.status === 'finished' && (
          <div className="text-center animate-in fade-in duration-1000">
             <Trophy size={100} className="mx-auto text-[#FFD700] mb-8" />
             <h1 className="text-6xl font-display font-bold text-white mb-4">Game Over</h1>
             <p className="text-2xl text-gray-400 mb-8">You finished with a score of <span className="text-primary font-bold">{player.score}</span></p>
             <button onClick={() => navigate('/')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-xl transition-colors">
               Return Home
             </button>
          </div>
        )}
      </div>
    </div>
  )
}
