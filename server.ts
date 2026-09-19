import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { classifyAudio, transcribeAudio } from './src/server/geminiHandlers';

// This Express server is for LOCAL DEV ONLY. In production the app deploys to
// Vercel, which serves the built SPA as static files and runs api/*.ts as
// independent serverless functions - it does not invoke this file at all.
// Both entry points share the same Gemini logic via src/server/geminiHandlers.ts
// so there's exactly one place the classify/transcribe prompts live.
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json({ limit: '20mb' }));

  // API Route: Live Audio Noise Detection & Classification
  app.post('/api/classify-audio', async (req, res) => {
    try {
      const { audioBase64, mimeType, spectralMetrics } = req.body;
      const detection = await classifyAudio({ audioBase64, mimeType, spectralMetrics });

      res.json({
        success: true,
        detection,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error classifying live audio:', err);
      res.status(500).json({
        error: err.message || 'Failed to analyze live microphone noise',
      });
    }
  });

  // API Route: Transcribe Audio
  app.post('/api/transcribe-audio', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body;
      const transcription = await transcribeAudio({ audioBase64, mimeType });

      res.json({
        success: true,
        transcription,
      });
    } catch (err: any) {
      console.error('Error transcribing audio:', err);
      res.status(500).json({
        error: err.message || 'Failed to transcribe audio',
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Audio2ool dev server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
