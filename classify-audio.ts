// Vercel serverless function - handles POST /api/classify-audio in production.
// This is the Vercel-native equivalent of the /api/classify-audio route in
// server.ts. Vercel doesn't run server.ts's Express app in production (it only
// runs files under /api as individual functions), so this file exists
// specifically for the deployed build. Local dev still goes through
// server.ts + Vite middleware, which calls the same classifyAudio() helper.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { classifyAudio } from '../src/server/geminiHandlers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { audioBase64, mimeType, spectralMetrics } = req.body || {};
    const detection = await classifyAudio({ audioBase64, mimeType, spectralMetrics });

    res.status(200).json({
      success: true,
      detection,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error classifying live audio:', err);
    res.status(500).json({
      error: err?.message || 'Failed to analyze live microphone noise',
    });
  }
}
