import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `
You are a medical exam question extractor. You receive a document (PDF, PPTX, DOCX, image, etc.) that contains multiple-choice questions (MCQs).

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
      "image_url": null
    }
  ]
}

RULES:
1. Extract every single MCQ from the document — do not skip any.
2. The "correct" field must be the 0-based index of the correct answer in the choices array.
3. If the correct answer is marked/highlighted/bolded/starred in the document, use that. If no answer is marked as correct, set "correct" to -1 and the host will manually set it.
4. If the question is in Arabic, put it in both "question" and "question_ar". If in English, put in "question" only.
5. Preserve the original wording of questions and choices exactly as written.
6. If choices are labeled A/B/C/D or 1/2/3/4, remove the labels and just keep the text.
7. Set time_limit to 20 for normal questions, 30 for long/complex ones, 10 for simple recall.
8. Return ONLY the JSON object. No markdown backticks, no commentary.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { file_base64, file_mime_type, file_name } = await req.json()
    
    // Support either local .env or supabase secrets
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY'))
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          mimeType: file_mime_type,
          data: file_base64
        }
      }
    ])

    const responseText = result.response.text()
    
    // Clean potential markdown blocks
    let cleanedText = responseText.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '').trim()
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '').trim()
    }

    const parsed = JSON.parse(cleanedText)

    if (!parsed.title || !Array.isArray(parsed.questions)) {
      return new Response(JSON.stringify({ error: 'Invalid AI response' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
