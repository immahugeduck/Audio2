# Auralis — Spectrum Studio

Auralis (evolved from **Audio2**) is a real-time audio spectrum analyzer that runs entirely in the browser on the Web Audio API. Point it at your microphone, a built-in sample, a local file or a stream URL and watch the signal in frequency.

## Features

- **Live Analyzer** – hero spectrum with a live stat strip (peak frequency + note, RMS, peak, centroid, crest). Peak frequency is temporally locked so steady tones stay stable.
- **Seven graph types** – Bars, Curve, Hybrid (curve + scope), Radial, Waterfall (3D), Spectrogram and Scope.
- **Media** – drag & drop or pick a file, paste a URL/stream, or use procedural sample tracks.
- **Equalizer** – bass / mid / treble, playback speed, stereo pan.
- **Tuner & Harmonics**, **Noise & Room** (noise baseline, RT60, sound timeline, event log), **AI & Reports** (Gemini sound classifier, transcription, Markdown audit report) and an acoustic **Guide**.
- **Slide-out drawer navigation** with hash routes (`#/live`, `#/media`, `#/equalizer`, `#/tuner`, `#/noise`, `#/ai`, `#/guide`, `#/settings/{graph|color|input|gain}`), keyboard accessible with focus trap, Esc / click-outside to close.
- **Settings page** (everything applies instantly and persists in `localStorage`, with a reset button per section and for everything):
  - *Graph* – type, FFT size, smoothing, log/linear scale, peak caps, bar spacing/width, fill opacity, beat pulse, reactive colors, Hz scale, dB grid.
  - *Color* – 10 gradient themes, custom 3-stop gradient + peak color, app accent color.
  - *Input* – microphone selection (remembered), start/stop, monitoring, echo-cancellation / noise-suppression / auto-gain (passed to `getUserMedia`, **off by default** for analysis accuracy), live stream details (channels, sample rate), optional auto-start.
  - *Gain* – input gain −12…+24 dB (a `GainNode` in front of the whole chain, works for mic, files, URLs and samples), output volume, graph sensitivity, min/max dB window with presets, auto-range, true dBFS level meter.

## Run it

```bash
npm install
npm run dev        # Express + Vite on http://localhost:3000
```

AI features (noise classification, transcription) need a Gemini key: copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Without it the rest of the app works and the AI panels degrade gracefully.

```bash
npm run lint       # tsc --noEmit
npm run build      # production build to dist/
npm run preview    # serve the production build
```

Microphone access requires a secure context (`https://` or `localhost`).

## Project layout

```
src/
  App.tsx                    app shell (top bar, drawer, routed views)
  context/AnalyzerContext    settings + audio engine + noise baseline, shared by all views
  hooks/useAudioEngine       Web Audio graph: source → input gain → EQ → panner → analyser → output
  hooks/useAppSettings       persisted settings (versioned, sanitized, cross-tab sync)
  utils/settingsStore        defaults, validation, localStorage I/O
  utils/theme, colorGradients  accent themes and graph palettes
  views/                     Live, Media, Equalizer, Tuner, Noise, AI, Guide, Settings
  components/                canvas visualizer, drawer, top bar, panels, UI primitives, logo
public/favicon.svg           app icon
```

## Design

Warm "studio at night" palette: charcoal ink surfaces (`#0b0a0d` → `#f7f5f8`), ember-gold accent (`#f2b04a`), coral `#ef6f5e`, plum `#b48ac8`, sage `#8fd0a4`. Instrument Serif for display, Inter for UI, IBM Plex Mono for numerals (loaded from Google Fonts with system fallbacks). Respects `prefers-reduced-motion`.
