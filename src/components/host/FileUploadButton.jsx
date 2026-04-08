import React, { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const AI_PROMPT = `You are a medical exam question extractor. You receive a document (PDF, PPTX, DOCX, image, etc.) that contains multiple-choice questions (MCQs).

Your task is to extract ALL questions from the document and return them in this EXACT JSON format. Return ONLY valid JSON, no markdown, no explanation.

{
  "title": "<infer a title from the document content>",
  "questions": [
    {
      "id": 1,
      "question": "<the question text in its original language>",
      "question_ar": "<Arabic version if the original is in Arabic, otherwise null>",
      "choices": ["<choice A>", "<choice B>", "<choice C>", "<choice D>"],
      "correct": <0-indexed position of the correct answer>,
      "time_limit": 20,
      "needs_image": false,
      "image_url": null
    }
  ]
}

RULES:
1. Extract every single MCQ from the document — do not skip any.
2. The "correct" field must be the 0-based index of the correct answer in the choices array.
3. If the correct answer is marked/highlighted/bolded/starred, use that. If no answer is marked, set "correct" to -1.
4. If the question is in Arabic, put it in both "question" and "question_ar". If in English, put in "question" only and set "question_ar" to null.
5. Preserve the original wording of questions and choices exactly as written.
6. If choices are labeled A/B/C/D or 1/2/3/4, remove the labels and just keep the text.
7. Set time_limit to 20 for normal questions, 30 for long/complex ones, 10 for simple recall.
8. Set "needs_image" to true if the question refers to a figure, image, photograph, diagram, graph, table, or any visual element that is required to answer correctly. Set to false otherwise.
9. Return ONLY the JSON object. No markdown backticks, no commentary.`

export default function FileUploadButton({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  const { session } = useAuth()

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!GEMINI_API_KEY) {
      alert('VITE_GEMINI_API_KEY is not set in .env.local')
      return
    }

    setLoading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1]

        // Call Gemini API directly
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: AI_PROMPT },
                  { inline_data: { mime_type: file.type, data: base64Data } }
                ]
              }]
            })
          }
        )

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status}`)
        }

        const result = await response.json()
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('No response from AI')

        // Clean markdown fences if present
        const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
        const data = JSON.parse(cleaned)

        if (!data.title || !data.questions) {
          throw new Error('Invalid data returned from AI')
        }

        await addDoc(collection(db, 'question_sets'), {
          host_id: session.uid,
          title: data.title,
          questions: data,
          question_count: data.questions.length,
          source_type: file.name.split('.').pop() || 'other',
          source_filename: file.name,
          created_at: serverTimestamp()
        })

        onUploadSuccess()
      }
      reader.readAsDataURL(file)
    } catch (err) {
      alert('Error processing file: ' + err.message)
      setLoading(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.pptx,.docx,image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={loading}
        className="bg-primary text-background font-bold px-6 py-3 rounded-xl hover:bg-[#00D4FF] hover:scale-105 active:scale-95 transition-all outline-none"
      >
        {loading ? 'AI analyzing file...' : 'Upload Bank (PDF/PPTX/Image)'}
      </button>
    </div>
  )
}
