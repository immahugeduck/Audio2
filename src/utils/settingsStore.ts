import {
  AppSettings,
  VisualizationMode,
  VisualizerSettings,
  InputSettings,
  GainSettings,
  AppearanceSettings,
} from '../types';
import { COLOR_PRESETS, DEFAULT_PRESET_ID } from './colorGradients';
import { ACCENT_THEMES, DEFAULT_ACCENT_ID } from './theme';

export const SETTINGS_STORAGE_KEY = 'auralis.settings';
export const SETTINGS_VERSION = 1;

export const VISUALIZATION_MODES: VisualizationMode[] = [
  'bars',
  'curve',
  'radial',
  'waterfall',
  'spectrogram',
  'waveform',
  'hybrid',
];

export const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192, 16384];

export const GAIN_LIMITS = { minDb: -12, maxDb: 24 };

export const DEFAULT_VISUAL: VisualizerSettings = {
  mode: 'bars',
  fftSize: 2048,
  smoothing: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  showHzScale: true,
  showDbGrid: true,
  showPeaks: true,
  colorPresetId: DEFAULT_PRESET_ID,
  customGradient: {
    start: '#5c1b3d',
    middle: '#ef6f5e',
    end: '#f8cf85',
    peak: '#fff1d0',
  },
  useCustomGradient: false,
  sensitivity: 1.0,
  logScale: true,
  reactiveColors: true,
  beatPulseAnimation: false,
  fillOpacity: 0.6,
  barSpacing: 3,
  barWidthMultiplier: 1.0,
  autoRange: false,
};

// Analysis-accurate defaults: all browser voice processing OFF.
export const DEFAULT_INPUT: InputSettings = {
  deviceId: null,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  monitoring: false,
  autoStart: false,
};

export const DEFAULT_GAIN: GainSettings = {
  inputGainDb: 0,
  outputVolume: 0.8,
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accentId: DEFAULT_ACCENT_ID,
};

export const DEFAULT_SETTINGS: AppSettings = {
  visual: DEFAULT_VISUAL,
  input: DEFAULT_INPUT,
  gain: DEFAULT_GAIN,
  appearance: DEFAULT_APPEARANCE,
};

// ---------------------------------------------------------------- sanitizers

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function num(v: unknown, fallback: number, min: number, max: number, step?: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  let n = Math.min(max, Math.max(min, v));
  if (step) n = Math.round(n / step) * step;
  return n;
}
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const hex = (v: unknown, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;

export function sanitizeVisual(raw: unknown): VisualizerSettings {
  const d = DEFAULT_VISUAL;
  const r = isObj(raw) ? raw : {};
  const cg = isObj(r.customGradient) ? r.customGradient : {};

  let minDb = num(r.minDecibels, d.minDecibels, -140, -30);
  let maxDb = num(r.maxDecibels, d.maxDecibels, -60, 0);
  if (maxDb - minDb < 20) {
    minDb = d.minDecibels;
    maxDb = d.maxDecibels;
  }

  return {
    mode: VISUALIZATION_MODES.includes(r.mode as VisualizationMode) ? (r.mode as VisualizationMode) : d.mode,
    fftSize: FFT_SIZES.includes(r.fftSize as number) ? (r.fftSize as number) : d.fftSize,
    smoothing: num(r.smoothing, d.smoothing, 0, 0.95),
    minDecibels: minDb,
    maxDecibels: maxDb,
    showHzScale: bool(r.showHzScale, d.showHzScale),
    showDbGrid: bool(r.showDbGrid, d.showDbGrid),
    showPeaks: bool(r.showPeaks, d.showPeaks),
    colorPresetId: COLOR_PRESETS.some((p) => p.id === r.colorPresetId) ? (r.colorPresetId as string) : d.colorPresetId,
    customGradient: {
      start: hex(cg.start, d.customGradient.start),
      middle: hex(cg.middle, d.customGradient.middle),
      end: hex(cg.end, d.customGradient.end),
      peak: hex(cg.peak, d.customGradient.peak),
    },
    useCustomGradient: bool(r.useCustomGradient, d.useCustomGradient),
    sensitivity: num(r.sensitivity, d.sensitivity, 0.5, 2.5),
    logScale: bool(r.logScale, d.logScale),
    reactiveColors: bool(r.reactiveColors, d.reactiveColors),
    beatPulseAnimation: bool(r.beatPulseAnimation, d.beatPulseAnimation),
    fillOpacity: num(r.fillOpacity, d.fillOpacity, 0.1, 1),
    barSpacing: num(r.barSpacing, d.barSpacing, 1, 8),
    barWidthMultiplier: num(r.barWidthMultiplier, d.barWidthMultiplier, 0.5, 2),
    autoRange: bool(r.autoRange, d.autoRange),
  };
}

export function sanitizeInput(raw: unknown): InputSettings {
  const d = DEFAULT_INPUT;
  const r = isObj(raw) ? raw : {};
  return {
    deviceId: typeof r.deviceId === 'string' && r.deviceId.length < 512 ? r.deviceId : null,
    echoCancellation: bool(r.echoCancellation, d.echoCancellation),
    noiseSuppression: bool(r.noiseSuppression, d.noiseSuppression),
    autoGainControl: bool(r.autoGainControl, d.autoGainControl),
    monitoring: bool(r.monitoring, d.monitoring),
    autoStart: bool(r.autoStart, d.autoStart),
  };
}

export function sanitizeGain(raw: unknown): GainSettings {
  const d = DEFAULT_GAIN;
  const r = isObj(raw) ? raw : {};
  return {
    inputGainDb: num(r.inputGainDb, d.inputGainDb, GAIN_LIMITS.minDb, GAIN_LIMITS.maxDb),
    outputVolume: num(r.outputVolume, d.outputVolume, 0, 1),
  };
}

export function sanitizeAppearance(raw: unknown): AppearanceSettings {
  const r = isObj(raw) ? raw : {};
  return {
    accentId: ACCENT_THEMES.some((t) => t.id === r.accentId) ? (r.accentId as string) : DEFAULT_ACCENT_ID,
  };
}

export function sanitizeSettings(raw: unknown): AppSettings {
  const r = isObj(raw) ? raw : {};
  return {
    visual: sanitizeVisual(r.visual),
    input: sanitizeInput(r.input),
    gain: sanitizeGain(r.gain),
    appearance: sanitizeAppearance(r.appearance),
  };
}

// ------------------------------------------------------------------ storage

export function loadSettings(): AppSettings {
  try {
    const text = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (!text) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(text);
    if (!isObj(parsed)) return DEFAULT_SETTINGS;
    // Future migrations: switch on parsed.version here. Unknown/newer → best effort via sanitizers.
    return sanitizeSettings(parsed.data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: SETTINGS_VERSION, savedAt: Date.now(), data: settings })
    );
  } catch {
    // Storage may be full/disabled (private mode) — settings just won't persist.
  }
}

export function clearSavedSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
