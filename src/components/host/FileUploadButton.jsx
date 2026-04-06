import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export default function FileUploadButton({ onUploadSuccess }) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { session } = useAuth();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('convert-questions', {
          body: {
            file_base64: base64Data,
            file_mime_type: file.type,
            file_name: file.name
          }
        });

        if (error) throw error;
        
        if (data && data.title && data.questions) {
          const { error: dbError } = await supabase
            .from('question_sets')
            .insert({
              host_id: session.user.id,
              title: data.title,
              questions: data,
              source_type: file.name.split('.').pop() || 'other',
              source_filename: file.name
            });
            
          if (dbError) throw dbError;
          onUploadSuccess();
        } else {
          throw new Error('Invalid data returned from AI');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Error processing file: " + err.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
  );
}
