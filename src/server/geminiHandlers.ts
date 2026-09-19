// Shared Gemini AI logic used by BOTH the local Express dev server (server.ts)
// and the Vercel serverless functions (/api/classify-audio.ts, /api/transcribe-audio.ts).
//
// Keeping this in one place means the prompt/schema only has to be right once -
// previously this logic lived only inside server.ts, which works fine for local
// dev but Vercel does NOT run a persistent Express server in production. Vercel
// invokes each file under /api as its own short-lived function, so the same
// classify/transcribe logic needs to be callable from both entry points without
// duplicating the Gemini prompt and JSON schema.
import { GoogleGenAI, Type } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;

// Reuse a single GoogleGenAI client per server process instead of constructing
// one on every request - the constructor does non-trivial setup and there's no
// reason to redo it per call.
function getGeminiAi(): GoogleGenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  cachedClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'audio2ool',
      },
    },
  });
  return cachedClient;
}

export interface SpectralMetricsContext {
  peakHz?: number;
  rmsDb?: number;
  bass?: number;
  treble?: number;
}

export interface ClassifyAudioParams {
  audioBase64: string;
  mimeType?: string;
  spectralMetrics?: SpectralMetricsContext;
}

export interface TranscribeAudioParams {
  audioBase64: string;
  mimeType?: string;
}

// Gemini model used across both endpoints. Centralized here so it only needs
// to be updated in one place if the model id ever changes.
//
// Using the rolling alias "gemini-flash-latest" instead of a pinned version
// string - this matches the exact model id from Google's own current
// quickstart snippet (confirmed by the user, since this sandbox's network
// policy blocks outbound calls to generativelanguage.googleapis.com entirely,
// so it couldn't be tested live from here). An alias like this auto-upgrades
// to newer Flash versions over time, which is usually what you want for a
// classifier/transcriber that isn't pinned to specific model behavior - but
// it also means behavior can shift under you without a code change. If you
// ever need reproducible output, swap this for a specific dated version
// string instead once you know what Google is currently offering.
const GEMINI_MODEL = 'gemini-flash-latest';

export async function classifyAudio({ audioBase64, mimeType = 'audio/webm', spectralMetrics }: ClassifyAudioParams) {
  if (!audioBase64) {
    throw new Error('Missing audioBase64 payload');
  }

  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
  const ai = getGeminiAi();

  const metricsContext = spectralMetrics
    ? `\nSpectral Metrics Context: Peak frequency: ${spectralMetrics.peakHz ?? 'N/A'} Hz, RMS Volume: ${spectralMetrics.rmsDb ?? 'N/A'} dB, Bass ratio: ${spectralMetrics.bass ?? 'N/A'}, Treble ratio: ${spectralMetrics.treble ?? 'N/A'}.`
    : '';

  const promptText = `
Analyze this short live microphone audio clip captured from an audio spectrum analyzer app.${metricsContext}
Identify and guess the noises or sound events occurring in the audio clip.
Consider possibilities such as:
- Human Sounds: Speech/Talking, Whistling, Clapping, Snapping Fingers, Coughing, Laughter, Humming, Breathing
- Environmental/Mechanical: Keyboard Typing, Mouse Clicks, Chair Creak, Fan/HVAC Noise, Room Reverb, Object Tapping, Rustling Paper
- Musical / Tonal: Singing, Whistling, Instrument Sounds, Synth / Pure Tones
- Silence / Ambient: Quiet Background, Soft Static, Low White Noise

Return a JSON object with your classification and assessment.
  `.trim();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      },
      {
        text: promptText,
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primarySound: {
            type: Type.STRING,
            description: 'The primary identified sound or noise (e.g. Clapping, Typing, Whistling, Speech, Fan Noise, Silence)',
          },
          confidence: {
            type: Type.INTEGER,
            description: 'Confidence percentage from 0 to 100',
          },
          category: {
            type: Type.STRING,
            description: 'Category: Human, Percussive, Mechanical, Musical, Ambient, Silence',
          },
          description: {
            type: Type.STRING,
            description: 'A concise 1-sentence acoustic description of what was detected',
          },
          top2OtherNoises: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '1 or 2 secondary candidate sound guesses',
          },
          acousticCharacteristics: {
            type: Type.STRING,
            description: 'Notable acoustic traits observed (e.g. Sharp transients, steady low hum, harmonic overtones)',
          },
          psychoacoustics: {
            type: Type.OBJECT,
            properties: {
              sharpnessScore: { type: Type.INTEGER, description: 'Sharpness score from 0 to 100' },
              brightnessScore: { type: Type.INTEGER, description: 'Brightness score from 0 to 100' },
              warmthScore: { type: Type.INTEGER, description: 'Warmth score from 0 to 100' },
              harshnessScore: { type: Type.INTEGER, description: 'Harshness score from 0 to 100' },
              perceivedLoudnessLufs: { type: Type.INTEGER, description: 'Estimated perceived LUFS (-60 to 0)' },
              soundPurity: { type: Type.STRING, description: 'One of: Pure Tone, Harmonic, Noise / Broadband, Impulsive / Transient' },
            },
            required: ['sharpnessScore', 'brightnessScore', 'warmthScore', 'harshnessScore', 'perceivedLoudnessLufs', 'soundPurity'],
          },
          recommendedFixes: {
            type: Type.OBJECT,
            properties: {
              eqAction: { type: Type.STRING, description: 'Actionable EQ recommendation to isolate or clean sound' },
              roomTreatment: { type: Type.STRING, description: 'Acoustic room treatment or mic positioning advice' },
              hardwareFix: { type: Type.STRING, description: 'Hardware or filter recommendation (e.g., High-pass, Noise Gate, Ground Isolator)' },
            },
            required: ['eqAction', 'roomTreatment', 'hardwareFix'],
          },
        },
        required: ['primarySound', 'confidence', 'category', 'description'],
      },
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('No response text received from Gemini AI model');
  }

  return JSON.parse(responseText);
}

export async function transcribeAudio({ audioBase64, mimeType = 'audio/webm' }: TranscribeAudioParams) {
  if (!audioBase64) {
    throw new Error('Missing audioBase64 payload');
  }

  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
  const ai = getGeminiAi();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: cleanMimeType,
          data: audioBase64,
        },
      },
      {
        text: 'Please transcribe the following audio clip carefully. Return only the transcription.',
      },
    ],
  });

  return response.text?.trim();
}
