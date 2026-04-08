import React, { useState, useRef } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../../lib/firebase'
import { X, Edit2, Save, XCircle, Image, ImageOff, ChevronDown, ChevronUp, Camera, Trash2, AlertTriangle } from 'lucide-react'

// ── Single Question Editor ────────────────────────────────────────────────────
function QuestionEditor({ question, index, bankId, onSave, onClose }) {
  const [q, setQ] = useState({ ...question })
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const fileInputRef = useRef(null)

  const handleChoiceChange = (i, value) => {
    const choices = [...q.choices]
    choices[i] = value
    setQ(prev => ({ ...prev, choices }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('يُسمح بالصور فقط'); return }

    const path = `question_images/${bankId}/q${index}_${Date.now()}`
    const ref = storageRef(storage, path)
    const task = uploadBytesResumable(ref, file)

    task.on('state_changed',
      (snap) => setUploadProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      (err) => { alert('فشل الرفع: ' + err.message); setUploadProgress(null) },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        setQ(prev => ({ ...prev, image_url: url, needs_image: false }))
        setUploadProgress(null)
      }
    )
  }

  const removeImage = () => setQ(prev => ({ ...prev, image_url: null }))

  const handleSave = async () => {
    if (!q.question.trim()) { alert('نص السؤال مطلوب'); return }
    if (q.choices.some(c => !c.trim())) { alert('كل الخيارات مطلوبة'); return }
    if (q.correct < 0 || q.correct >= q.choices.length) { alert('اختار الإجابة الصحيحة'); return }
    setSaving(true)
    await onSave(index, q)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0D1321] border border-gray-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-white font-display">تعديل سؤال #{index + 1}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">

          {/* Question text */}
          <div>
            <label className="text-sm text-gray-400 font-bold mb-2 block">نص السؤال</label>
            <textarea
              value={q.question}
              onChange={e => setQ(prev => ({ ...prev, question: e.target.value }))}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary resize-none transition-colors"
            />
          </div>

          {/* Image section */}
          <div>
            <label className="text-sm text-gray-400 font-bold mb-2 block flex items-center gap-2">
              <Image size={14} /> صورة السؤال
              {q.needs_image && !q.image_url && (
                <span className="text-amber-400 text-xs font-mono flex items-center gap-1">
                  <AlertTriangle size={12} /> AI: يحتاج صورة
                </span>
              )}
            </label>

            {q.image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-700">
                <img src={q.image_url} alt="question" className="w-full max-h-48 object-contain bg-gray-900" />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  q.needs_image
                    ? 'border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10'
                    : 'border-gray-600 hover:border-primary/60 hover:bg-gray-800/40'
                }`}
              >
                <Camera size={28} className={`mx-auto mb-2 ${q.needs_image ? 'text-amber-400' : 'text-gray-500'}`} />
                <p className={`text-sm font-bold ${q.needs_image ? 'text-amber-300' : 'text-gray-400'}`}>
                  {q.needs_image ? 'هذا السؤال يحتاج صورة — اضغط لرفعها' : 'اضغط لإضافة صورة (اختياري)'}
                </p>
                <p className="text-gray-600 text-xs mt-1">PNG, JPG, GIF</p>
              </div>
            )}

            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">جاري الرفع... {uploadProgress}%</p>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Choices */}
          <div>
            <label className="text-sm text-gray-400 font-bold mb-2 block">الخيارات</label>
            <div className="space-y-2">
              {q.choices.map((choice, i) => (
                <div key={i} className="flex items-center gap-3">
                  <button
                    onClick={() => setQ(prev => ({ ...prev, correct: i }))}
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm transition-all ${
                      q.correct === i
                        ? 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title="اضغط لتحديد كإجابة صحيحة"
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <input
                    value={choice}
                    onChange={e => handleChoiceChange(i, e.target.value)}
                    className={`flex-1 bg-gray-800 border rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors ${
                      q.correct === i ? 'border-green-500/60 focus:border-green-500' : 'border-gray-700 focus:border-primary'
                    }`}
                    placeholder={`الخيار ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">اضغط على الحرف لتحديد الإجابة الصحيحة (الأخضر = صح)</p>
          </div>

          {/* Time limit */}
          <div>
            <label className="text-sm text-gray-400 font-bold mb-2 block">وقت الإجابة (ثانية)</label>
            <input
              type="number"
              min={5}
              max={120}
              value={q.time_limit || 20}
              onChange={e => setQ(prev => ({ ...prev, time_limit: Number(e.target.value) }))}
              className="w-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || uploadProgress !== null}
            className="flex-1 bg-primary text-background font-bold py-3 rounded-xl hover:bg-[#00D4FF] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={16} /> {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all font-bold">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export default function QuestionBankModal({ bank, onClose, onUpdate }) {
  const [questions, setQuestions] = useState(bank.questions?.questions || [])
  const [editingIndex, setEditingIndex] = useState(null)
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [bankTitle, setBankTitle] = useState(bank.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [savingTitle, setSavingTitle] = useState(false)

  const needsImageCount = questions.filter(q => q.needs_image && !q.image_url).length

  const saveQuestion = async (index, updatedQ) => {
    const newQuestions = [...questions]
    newQuestions[index] = updatedQ
    setQuestions(newQuestions)

    // Save to Firestore
    const updatedData = { ...bank.questions, questions: newQuestions }
    await updateDoc(doc(db, 'question_sets', bank.id), {
      questions: updatedData,
      question_count: newQuestions.length
    })
    onUpdate && onUpdate(bank.id, updatedData, bankTitle)
  }

  const saveTitle = async () => {
    if (!bankTitle.trim()) return
    setSavingTitle(true)
    await updateDoc(doc(db, 'question_sets', bank.id), { title: bankTitle.trim() })
    onUpdate && onUpdate(bank.id, bank.questions, bankTitle.trim())
    setSavingTitle(false)
    setEditingTitle(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#0A0E1A] border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex-1 mr-4">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  value={bankTitle}
                  onChange={e => setBankTitle(e.target.value)}
                  className="flex-1 bg-gray-800 border border-primary rounded-lg px-3 py-1.5 text-white font-bold text-lg focus:outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveTitle()}
                />
                <button onClick={saveTitle} disabled={savingTitle} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors">
                  <Save size={16} />
                </button>
                <button onClick={() => { setEditingTitle(false); setBankTitle(bank.title) }} className="p-1.5 bg-gray-700 text-gray-400 rounded-lg hover:bg-gray-600 transition-colors">
                  <XCircle size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white font-display">{bankTitle}</h2>
                <button onClick={() => setEditingTitle(true)} className="p-1 text-gray-500 hover:text-primary transition-colors">
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-400 font-mono">{questions.length} سؤال</span>
              {needsImageCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={11} /> {needsImageCount} تحتاج صورة
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Questions list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {questions.map((q, i) => {
            const isExpanded = expandedIndex === i
            const hasImage = !!q.image_url
            const needsImg = q.needs_image && !hasImage

            return (
              <div
                key={i}
                className={`rounded-xl border transition-all ${
                  needsImg
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-gray-800 bg-gray-900/50'
                }`}
              >
                {/* Question header row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Number */}
                  <span className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                    {i + 1}
                  </span>

                  {/* Question text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm leading-snug line-clamp-2">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-green-400 font-mono">{q.choices[q.correct]}</span>
                      <span className="text-gray-600 text-xs">•</span>
                      <span className="text-xs text-gray-500 font-mono">{q.time_limit || 20}s</span>
                      {hasImage && <span className="flex items-center gap-1 text-xs text-blue-400"><Image size={10} /> صورة</span>}
                      {needsImg && <span className="flex items-center gap-1 text-xs text-amber-400"><AlertTriangle size={10} /> يحتاج صورة</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingIndex(i)}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className="p-2 text-gray-500 hover:text-gray-300 rounded-lg transition-colors"
                      title={isExpanded ? 'إخفاء' : 'عرض الخيارات'}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expanded choices */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-800/60 pt-3">
                    {/* Image preview */}
                    {hasImage && (
                      <img src={q.image_url} alt="question img" className="w-full max-h-40 object-contain bg-gray-900 rounded-lg mb-3 border border-gray-700" />
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.choices.map((choice, ci) => (
                        <div
                          key={ci}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            ci === q.correct
                              ? 'bg-green-500/15 border border-green-500/30 text-green-300'
                              : 'bg-gray-800/60 border border-gray-700 text-gray-400'
                          }`}
                        >
                          <span className="font-bold font-mono w-5">{String.fromCharCode(65 + ci)}</span>
                          <span>{choice}</span>
                          {ci === q.correct && <span className="ml-auto text-green-500 text-xs font-bold">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0 flex justify-between items-center">
          <p className="text-xs text-gray-500 font-mono">اضغط على ✏️ لتعديل أي سؤال أو إضافة صورة</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all font-bold text-sm">
            إغلاق
          </button>
        </div>
      </div>

      {/* Question editor overlay */}
      {editingIndex !== null && (
        <QuestionEditor
          question={questions[editingIndex]}
          index={editingIndex}
          bankId={bank.id}
          onSave={saveQuestion}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  )
}
