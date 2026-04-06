import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Link } from 'react-router-dom'
import FileUploadButton from '../../components/host/FileUploadButton'

export default function HostDashboard() {
  const { profile } = useAuth()
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBanks()
  }, [])

  const fetchBanks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Error fetching question banks:', error)
    } else {
      setBanks(data || [])
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary">Host Dashboard</h1>
            <p className="text-gray-400 mt-2 font-sans">Manage your Question Banks and Game Rooms</p>
          </div>
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">Return Home</Link>
        </header>

        <section className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-display">My Question Banks</h2>
            <FileUploadButton onUploadSuccess={fetchBanks} />
          </div>

          {loading ? (
            <div className="text-primary animate-pulse py-4 font-mono">Loading banks...</div>
          ) : banks.length === 0 ? (
            <div className="text-gray-500 italic py-4">No question banks added yet. Upload a PDF/PPTX to extract MCQs automatically using AI.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banks.map(bank => (
                <div key={bank.id} className="bg-gray-800/80 p-6 rounded-xl border border-gray-700 hover:border-primary transition-colors flex flex-col justify-between shadow-lg hover:shadow-primary/20">
                  <div>
                    <h3 className="text-xl font-bold mb-2 font-display">{bank.title}</h3>
                    <div className="flex gap-2 text-sm text-gray-400 mb-4 font-mono">
                      <span className="bg-gray-700 px-2 py-1 rounded">{bank.question_count} Qs</span>
                      <span className="bg-gray-700 px-2 py-1 rounded uppercase">{bank.source_type}</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-4">
                    <button 
                      onClick={async () => {
                        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
                        const { data, error } = await supabase.from('rooms').insert({
                          code,
                          host_id: profile.id,
                          question_set_id: bank.id,
                          title: bank.title + " Room",
                          questions: bank.questions,
                          status: 'lobby'
                        }).select().single()
                        
                        if (error) alert("Error creating room: " + error.message)
                        else window.location.href = `/host/game/${data.id}`
                      }}
                      className="bg-green-500/10 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors font-medium border border-green-500/30"
                    >
                      Host Game
                    </button>
                    <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium border border-gray-600">
                      Edit Bank
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
