// Vercel serverless function - handles POST /api/transcribe-audio in production.
// See api/classify-audio.ts for why this exists alongside server.ts.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { transcribeAudio } from '../src/server/geminiHandlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { audioBase64, mimeType } = req.body || {};
    const transcription = await transcribeAudio({ audioBase64, mimeType });

    res.status(200).json({
      success: true,
      transcription,
    });
  } catch (err: any) {
    console.error('Error transcribing audio:', err);
    res.status(500).json({
      error: err?.message || 'Failed to transcribe audio',
    });
  }
}
