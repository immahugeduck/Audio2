import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VisualizerSettings, AudioMetrics } from '../types';
import { getPresetById, createCanvasGradient, getPeakColor, resolveStops, samplePalette, parseHex } from '../utils/colorGradients';
import { 
  Maximize2, 
  Minimize2, 
  Camera, 
  Sparkles, 
  Pin, 
  RefreshCw, 
  Layers, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  X,
} from 'lucide-react';

interface SpectrumLayer {
  id: string;
  name: string;
  data: Uint8Array;
  color: string;
  timestamp: string;
  visible: boolean;
}

const blendHexColors = (color1: string, color2: string, ratio: number): string => {
  ratio = Math.max(0, Math.min(1, ratio));
  const c1 = color1.startsWith('#') ? color1.slice(1) : color1;
  const c2 = color2.startsWith('#') ? color2.slice(1) : color2;
  
  const r1 = parseInt(c1.substring(0, 2), 16) || 0;
  const g1 = parseInt(c1.substring(2, 4), 16) || 0;
  const b1 = parseInt(c1.substring(4, 6), 16) || 0;
  
  const r2 = parseInt(c2.substring(0, 2), 16) || 0;
  const g2 = parseInt(c2.substring(2, 4), 16) || 0;
  const b2 = parseInt(c2.substring(4, 6), 16) || 0;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const LAYER_COLORS = [
  '#8fd0a4', // Sage
  '#b48ac8', // Plum
  '#6f9fd1', // Glacier
  '#e58aa8', // Rose
  '#f2b04a', // Gold
  '#ef6f5e', // Coral
];

const CANVAS_BG = '#0b0a0d';
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g) || ['0', '0', '0'];
  return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}
const FONT_MONO = "11px 'IBM Plex Mono', ui-monospace, monospace";
const rgba = (hex: string, a: number) => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// Typical audible-range tick labels (Hz) used for the frequency axis
const HZ_TICKS: { hz: number; label: string }[] = [
  { hz: 50, label: '50' },
  { hz: 100, label: '100' },
  { hz: 250, label: '250' },
  { hz: 500, label: '500' },
  { hz: 1000, label: '1k' },
  { hz: 2000, label: '2k' },
  { hz: 4000, label: '4k' },
  { hz: 8000, label: '8k' },
  { hz: 16000, label: '16k' },
];

interface CanvasVisualizerProps {
  settings: VisualizerSettings;
  getFrequencyData: () => Uint8Array;
  getTimeDomainData: () => Uint8Array;
  metrics: AudioMetrics;
  isPlaying: boolean;
  /** hero = tall stage with toolbar, compact = short preview strip */
  variant?: 'hero' | 'compact';
  /** Effective analyser dB window (differs from settings while auto-range is on) */
  rangeRef?: React.MutableRefObject<{ min: number; max: number }>;
  /** Rendered over the graph while nothing is playing (call-to-action / empty state) */
  overlay?: React.ReactNode;
  sampleRate?: number;
}

export const CanvasVisualizer: React.FC<CanvasVisualizerProps> = ({
  settings,
  getFrequencyData,
  getTimeDomainData,
  metrics,
  isPlaying,
  variant = 'hero',
  rangeRef,
  overlay,
  sampleRate = 44100,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const sampleRateRef = useRef(sampleRate);
  sampleRateRef.current = sampleRate;
  const radialPeaksRef = useRef<number[]>([]);
  const spectroLutRef = useRef<{ key: string; lut: Uint8ClampedArray } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Offscreen canvas for Spectrogram Waterfall scrolling
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // History buffer for 3D Waterfall & Spectrogram Rainfall depth
  const waterfallHistoryRef = useRef<Uint8Array[]>([]);

  // Peak hold array for frequency bars
  const peakValuesRef = useRef<number[]>([]);
  const peakHoldTimeRef = useRef<number[]>([]);

  // Peak hold array for smooth curve modes
  const curvePeakValuesRef = useRef<number[]>([]);
  const curvePeakHoldTimeRef = useRef<number[]>([]);

  // Particles for curve / radial mode
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[]>([]);

  // Beat Detection Algorithm Refs
  const bassHistoryRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const beatScaleRef = useRef<number>(1.0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom interactive features
  const [infinitePeakHold, setInfinitePeakHold] = useState(false);
  const [savedLayers, setSavedLayers] = useState<SpectrumLayer[]>([]);
  const [showLayersManager, setShowLayersManager] = useState(false);

  // PERF: the render loop below reads these through refs instead of the raw
  // props/state directly. `metrics` changes ~10x/sec (see useAudioEngine's
  // update loop), and this component used to list it as a useEffect dependency
  // on the render loop - meaning every single metrics tick tore down and
  // rebuilt the ResizeObserver + requestAnimationFrame loop from scratch, 10
  // times a second. Reading through refs lets the render loop mount ONCE and
  // just pick up the latest values each frame, which is what an animation
  // loop should do.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const rangeRefLocal = useRef(rangeRef);
  rangeRefLocal.current = rangeRef;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const savedLayersRef = useRef(savedLayers);
  savedLayersRef.current = savedLayers;
  const infinitePeakHoldRef = useRef(infinitePeakHold);
  infinitePeakHoldRef.current = infinitePeakHold;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => current === msg ? null : current);
    }, 2000);
  };

  // Capture current frequency spectrum as reference overlay layer
  const captureCurrentLayer = () => {
    const freqData = getFrequencyData();
    if (!freqData || freqData.length === 0) {
      showToast('No frequency data to capture');
      return;
    }

    // Capture clone of current data
    const dataClone = new Uint8Array(freqData);

    const newLayer: SpectrumLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Ref Spectrum ${savedLayers.length + 1}`,
      data: dataClone,
      color: LAYER_COLORS[savedLayers.length % LAYER_COLORS.length],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      visible: true,
    };

    setSavedLayers((prev) => [...prev, newLayer]);
    setShowLayersManager(true);
    showToast('Reference layer captured!');
  };

  // Reset absolute peak holds to zero
  const resetPeaks = () => {
    peakValuesRef.current = peakValuesRef.current.map(() => 0);
    curvePeakValuesRef.current = curvePeakValuesRef.current.map(() => 0);
    showToast('Peak values cleared');
  };

  // Layer manipulation utilities
  const renameLayer = (id: string, newName: string) => {
    setSavedLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, name: newName } : layer))
    );
  };

  const changeLayerColor = (id: string, color: string) => {
    setSavedLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, color } : layer))
    );
  };

  const toggleLayerVisibility = (id: string) => {
    setSavedLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer))
    );
  };

  const deleteLayer = (id: string) => {
    setSavedLayers((prev) => prev.filter((layer) => layer.id !== id));
  };

  // Initialize spectrogram offscreen canvas
  useEffect(() => {
    if (!spectrogramCanvasRef.current) {
      spectrogramCanvasRef.current = document.createElement('canvas');
      spectrogramCanvasRef.current.width = 1000;
      spectrogramCanvasRef.current.height = 500;
    }
  }, []);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Screenshot capture function
  const exportSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `spectrum-analyzer-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = dataUrl;
    link.click();

    showToast('High-res PNG frame exported!');
  };

  // Main Render Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const container = canvasWrapRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Handle high DPI display sizing
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    const render = () => {
      // Read the latest values via refs each frame (see refs declared above) -
      // this is what lets the effect this closure lives in run once on mount
      // instead of restarting on every metrics/settings change.
      const settings = settingsRef.current;
      const metrics = metricsRef.current;
      const isPlaying = isPlayingRef.current;
      const savedLayers = savedLayersRef.current;
      const infinitePeakHold = infinitePeakHoldRef.current;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep studio dark background (matches the app's near-black base)
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, width, height);

      // Fetch raw data
      const freqData = getFrequencyData();
      const timeData = getTimeDomainData();
      const binCount = freqData.length;

      // Beat Detection Algorithm (Internal State Tracking)
      const instantBass = metrics.subBass * 0.65 + metrics.bass * 0.35;
      const history = bassHistoryRef.current;
      history.push(instantBass);
      if (history.length > 35) history.shift();

      const avgBass = history.reduce((a, b) => a + b, 0) / (history.length || 1);
      const now = performance.now();

      if (
        instantBass > 30 &&
        instantBass > avgBass * 1.35 &&
        now - lastBeatTimeRef.current > 220
      ) {
        lastBeatTimeRef.current = now;
        beatScaleRef.current = 1.0;
      }

      // Ensure container transform/shadow remains completely stable without shaking
      if (containerRef.current && containerRef.current.style.transform) {
        containerRef.current.style.transform = '';
        containerRef.current.style.borderColor = '';
        containerRef.current.style.boxShadow = '';
      }

      const basePreset = getPresetById(settings.colorPresetId);
      const stops = resolveStops(basePreset, settings.customGradient, settings.useCustomGradient);
      // Effective palette: custom stops override the preset everywhere (all modes)
      const preset = settings.useCustomGradient
        ? { ...basePreset, colors: [...stops], peakColor: settings.customGradient.peak, glowColor: rgba(stops[1], 0.4) }
        : basePreset;
      const peakColor = getPeakColor(preset, settings.customGradient, settings.useCustomGradient);

      // Beat envelope (only drives visuals when "beat pulse" is enabled)
      beatScaleRef.current *= 0.9;
      const beat = settings.beatPulseAnimation ? beatScaleRef.current : 0;
      const winRange = rangeRefLocal.current?.current;
      const dbMin = winRange ? winRange.min : settings.minDecibels;
      const dbMax = winRange ? winRange.max : settings.maxDecibels;
      const nyquist = sampleRateRef.current / 2;
      const showAxis = settings.mode === 'bars' || settings.mode === 'curve' || settings.mode === 'hybrid' || settings.mode === 'spectrogram';

      // Smooth & subtle background reactive ambient glow (toned down)
      if (settings.reactiveColors && metrics.bass > 40) {
        const glowRadius = Math.min(width, height) * 0.5;
        const radialGlow = ctx.createRadialGradient(
          width / 2,
          height / 2,
          10,
          width / 2,
          height / 2,
          glowRadius
        );
        const glowOpacity = Math.min(0.12, (metrics.bass / 1000)).toFixed(2);
        radialGlow.addColorStop(0, rgba(stops[1], Number(glowOpacity)));
        radialGlow.addColorStop(1, 'rgba(11, 10, 13, 0)');
        ctx.fillStyle = radialGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // -------------------------------------------------------------
      // DRAW SAVED REFERENCE SPECTRUM LAYERS
      // -------------------------------------------------------------
      if (savedLayers.length > 0 && (settings.mode === 'bars' || settings.mode === 'curve' || settings.mode === 'hybrid')) {
        savedLayers.forEach((layer) => {
          if (!layer.visible) return;

          const pointsCount = 128; // standard comparative resolution
          const points: { x: number; y: number }[] = [];

          for (let i = 0; i < pointsCount; i++) {
            let dataIndex: number;
            if (settings.logScale) {
              const exp = Math.pow(i / pointsCount, 2.2);
              dataIndex = Math.min(layer.data.length - 1, Math.floor(exp * layer.data.length));
            } else {
              dataIndex = Math.floor((i / pointsCount) * (layer.data.length * 0.7));
            }

            const rawValue = layer.data[dataIndex] || 0;
            const normalized = (rawValue / 255) * settings.sensitivity;
            const h = normalized * (height * 0.75);

            const x = (i / (pointsCount - 1)) * width;
            const y = height - h - 35;
            points.push({ x, y });
          }

          if (points.length > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = (points[i].y + points[i + 1].y) / 2;
              ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            
            // Subtle comparative fill
            ctx.globalAlpha = 0.04;
            ctx.fillStyle = layer.color;
            ctx.lineTo(width, height - 35);
            ctx.lineTo(0, height - 35);
            ctx.closePath();
            ctx.fill();

            // Distinctive comparative outline
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 0; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const yc = (points[i].y + points[i + 1].y) / 2;
              ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // -------------------------------------------------------------
      // BARS SPECTRUM MODE
      // -------------------------------------------------------------
      if (settings.mode === 'bars') {
        const numBars = Math.min(binCount, Math.floor(width / (settings.barSpacing + 3)));
        // slot = horizontal space per bar; bar width scales inside the slot
        const slot = width / numBars;
        const barWidth = Math.max(1.5, Math.min(slot, (slot - settings.barSpacing) * settings.barWidthMultiplier));

        // Ensure peak values array length matches numBars
        if (peakValuesRef.current.length !== numBars) {
          peakValuesRef.current = new Array(numBars).fill(0);
          peakHoldTimeRef.current = new Array(numBars).fill(0);
        }

        const gradient = createCanvasGradient(ctx, width, height, preset, settings.customGradient, settings.useCustomGradient);

        for (let i = 0; i < numBars; i++) {
          // Logarithmic or Linear Bin Mapping
          let dataIndex: number;
          if (settings.logScale) {
            const exp = Math.pow(i / numBars, 2); // Logarithmic mapping accentuating low frequencies
            dataIndex = Math.min(binCount - 1, Math.floor(exp * binCount));
          } else {
            dataIndex = Math.floor((i / numBars) * (binCount * 0.75)); // Focus on audible range
          }

          const rawValue = freqData[dataIndex] || 0;
          const normalized = Math.min(1, (rawValue / 255) * settings.sensitivity);
          const barHeight = Math.max(3, normalized * (height * 0.78) * (1 + 0.07 * beat));

          const x = i * slot + (slot - barWidth) / 2;
          const y = height - barHeight - 35; // Leave space for bottom scale

          // Draw Bar
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Bar top accent cap
          ctx.fillStyle = peakColor;
          ctx.fillRect(x, y, barWidth, Math.min(2, barHeight));

          // Peak cap hold & decay physics.
          // Sustained tones refresh the hold timer while the bar stays near its
          // peak so a continuous pure tone keeps its cap locked (~1.2s hold).
          if (settings.showPeaks) {
            if (barHeight > peakValuesRef.current[i]) {
              peakValuesRef.current[i] = barHeight;
              peakHoldTimeRef.current[i] = performance.now();
            } else if (
              barHeight > 4 &&
              peakValuesRef.current[i] > 0 &&
              barHeight >= peakValuesRef.current[i] * 0.55
            ) {
              // Signal still present at this bin — keep hold alive
              peakHoldTimeRef.current[i] = performance.now();
            } else if (!infinitePeakHold) {
              const elapsed = performance.now() - peakHoldTimeRef.current[i];
              if (elapsed > 1200) {
                peakValuesRef.current[i] = Math.max(0, peakValuesRef.current[i] - 2.5);
              }
            }

            const peakY = height - peakValuesRef.current[i] - 35;
            if (peakValuesRef.current[i] > 2) {
              ctx.fillStyle = peakColor;
              ctx.shadowColor = preset.glowColor;
              ctx.shadowBlur = 6;
              ctx.fillRect(x, peakY - 3, barWidth, 3);
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      // -------------------------------------------------------------
      // SMOOTH CURVE SPECTRUM MODE
      // -------------------------------------------------------------
      else if (settings.mode === 'curve' || settings.mode === 'hybrid') {
        const pointsCount = Math.min(binCount, 128);
        const points: { x: number; y: number }[] = [];

        // Ensure peak values array length matches pointsCount
        if (curvePeakValuesRef.current.length !== pointsCount) {
          curvePeakValuesRef.current = new Array(pointsCount).fill(0);
          curvePeakHoldTimeRef.current = new Array(pointsCount).fill(0);
        }

        for (let i = 0; i < pointsCount; i++) {
          let dataIndex: number;
          if (settings.logScale) {
            const exp = Math.pow(i / pointsCount, 2.2);
            dataIndex = Math.min(binCount - 1, Math.floor(exp * binCount));
          } else {
            dataIndex = Math.floor((i / pointsCount) * (binCount * 0.7));
          }

          const rawValue = freqData[dataIndex] || 0;
          const normalized = Math.min(1, (rawValue / 255) * settings.sensitivity);
          const h = normalized * (height * 0.75) * (1 + 0.07 * beat);

          // Update peak values (sustained-tone hold refresh, matching bars mode)
          if (h > curvePeakValuesRef.current[i]) {
            curvePeakValuesRef.current[i] = h;
            curvePeakHoldTimeRef.current[i] = performance.now();
          } else if (
            h > 4 &&
            curvePeakValuesRef.current[i] > 0 &&
            h >= curvePeakValuesRef.current[i] * 0.55
          ) {
            curvePeakHoldTimeRef.current[i] = performance.now();
          } else if (!infinitePeakHold) {
            const elapsed = performance.now() - curvePeakHoldTimeRef.current[i];
            if (elapsed > 1200) {
              curvePeakValuesRef.current[i] = Math.max(0, curvePeakValuesRef.current[i] - 1.5);
            }
          }

          const x = (i / (pointsCount - 1)) * width;
          const y = height - h - 35;
          points.push({ x, y });
        }

        if (points.length > 0) {
          const gradient = createCanvasGradient(ctx, width, height, preset, settings.customGradient, settings.useCustomGradient);

          ctx.beginPath();
          ctx.moveTo(points[0].x, height - 35);
          ctx.lineTo(points[0].x, points[0].y);

          // Bezier curve interpolation
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }

          ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
          ctx.lineTo(points[points.length - 1].x, height - 35);
          ctx.closePath();

          // Gradient fill
          ctx.save();
          ctx.globalAlpha = settings.fillOpacity;
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.restore();

          // Glowing contour line
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          ctx.strokeStyle = peakColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = preset.glowColor;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Draw Curve Peak Hold Line
          if (settings.showPeaks) {
            ctx.beginPath();
            const peakY0 = height - curvePeakValuesRef.current[0] - 35;
            ctx.moveTo(points[0].x, peakY0);
            for (let i = 0; i < points.length - 1; i++) {
              const xc = (points[i].x + points[i + 1].x) / 2;
              const peakYc = height - (curvePeakValuesRef.current[i] + curvePeakValuesRef.current[i + 1]) / 2 - 35;
              ctx.quadraticCurveTo(points[i].x, height - curvePeakValuesRef.current[i] - 35, xc, peakYc);
            }
            ctx.strokeStyle = peakColor + 'bb'; // semi-transparent
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]); // Dashed line for peaks
            ctx.stroke();
            ctx.setLineDash([]); // Reset
          }
        }

        // Particle dynamics on heavy audio hits
        if (metrics.bass > 40 && isPlaying) {
          if (particlesRef.current.length < 40) {
            particlesRef.current.push({
              x: Math.random() * width,
              y: height - 40 - Math.random() * (metrics.bass * 2),
              vx: (Math.random() - 0.5) * 1.5,
              vy: -Math.random() * 2 - 1,
              size: Math.random() * 3 + 1.5,
              alpha: 1,
              color: preset.colors[Math.floor(Math.random() * preset.colors.length)],
            });
          }
        }

        // Render particles
        particlesRef.current.forEach((p, index) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.02;

          if (p.alpha <= 0) {
            particlesRef.current.splice(index, 1);
            return;
          }

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      }

      // -------------------------------------------------------------
      // RADIAL SPECTRUM MODE (mirrored, centered ring)
      // -------------------------------------------------------------
      else if (settings.mode === 'radial') {
        const cx = width / 2;
        const cy = height / 2 - 4;
        const minSide = Math.min(width, height);
        const baseR = minSide * 0.19 * (1 + 0.1 * beat);
        const maxLen = minSide * 0.27;
        const spokes = Math.max(48, Math.min(160, Math.floor(minSide / 3.2)));
        const half = spokes / 2;

        if (radialPeaksRef.current.length !== spokes) radialPeaksRef.current = new Array(spokes).fill(0);

        // Soft core glow
        const core = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.35);
        core.addColorStop(0, rgba(stops[1], 0.16 + 0.2 * beat));
        core.addColorStop(1, 'rgba(11, 10, 13, 0)');
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, width, height);

        ctx.lineCap = 'round';
        const lineW = Math.max(1.6, (Math.PI * 2 * baseR) / spokes * 0.55 * settings.barWidthMultiplier - settings.barSpacing * 0.15);
        for (let i = 0; i < spokes; i++) {
          // mirror left/right so the ring is symmetrical (low freqs at the top)
          const u = i < half ? i / half : (spokes - i) / half;
          let dataIndex: number;
          if (settings.logScale) {
            dataIndex = Math.min(binCount - 1, Math.floor(Math.pow(u, 2.2) * binCount));
          } else {
            dataIndex = Math.floor(u * (binCount * 0.7));
          }
          const norm = Math.min(1, ((freqData[dataIndex] || 0) / 255) * settings.sensitivity);
          const len = Math.max(2, norm * maxLen);
          const ang = -Math.PI / 2 + (i / spokes) * Math.PI * 2;
          const cos = Math.cos(ang);
          const sin = Math.sin(ang);

          ctx.strokeStyle = samplePalette(stops, norm);
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(cx + cos * baseR, cy + sin * baseR);
          ctx.lineTo(cx + cos * (baseR + len), cy + sin * (baseR + len));
          ctx.stroke();

          if (settings.showPeaks) {
            if (len > radialPeaksRef.current[i]) radialPeaksRef.current[i] = len;
            else radialPeaksRef.current[i] = Math.max(0, radialPeaksRef.current[i] - (infinitePeakHold ? 0 : 0.8));
            const pr = baseR + radialPeaksRef.current[i] + 4;
            if (radialPeaksRef.current[i] > 3) {
              ctx.fillStyle = peakColor;
              ctx.beginPath();
              ctx.arc(cx + cos * pr, cy + sin * pr, Math.max(1.1, lineW * 0.5), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Ring + readout
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(stops[2], 0.55);
        ctx.shadowColor = preset.glowColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR - 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const hasTone = metrics.peakFrequencyHz > 16;
        ctx.fillStyle = hasTone ? '#f7f5f8' : 'rgba(143, 138, 155, 0.8)';
        ctx.font = `600 ${Math.round(Math.max(13, baseR * 0.3))}px 'IBM Plex Mono', ui-monospace, monospace`;
        ctx.fillText(hasTone ? metrics.peakFrequencyFormatted : '— Hz', cx, cy - baseR * 0.1);
        ctx.fillStyle = rgba(stops[2], hasTone ? 0.95 : 0.4);
        ctx.font = `500 ${Math.round(Math.max(11, baseR * 0.19))}px 'IBM Plex Mono', ui-monospace, monospace`;
        ctx.fillText(hasTone ? metrics.peakNoteName : 'no tone', cx, cy + baseR * 0.26);
        ctx.textBaseline = 'alphabetic';
      }

      // -------------------------------------------------------------
      // 3D WATERFALL & SPECTROGRAM RAINFALL MODE
      // -------------------------------------------------------------
      else if (settings.mode === 'waterfall') {
        const historyDepth = 60; // Deeper history buffer for smooth waterfall trails
        // Push frame into waterfall history buffer
        if (freqData && freqData.length > 0) {
          const frameCopy = new Uint8Array(freqData);
          waterfallHistoryRef.current.unshift(frameCopy);
          if (waterfallHistoryRef.current.length > historyDepth) {
            waterfallHistoryRef.current.pop();
          }
        }

        const history = waterfallHistoryRef.current;
        const currentHistoryLength = history.length;
        const numBins = Math.min(binCount, 80); // Optimal bin resolution for high-performance mesh

        // Precompute all grid vertex coordinates
        const grid: { x: number; y: number; val: number; color: string }[][] = [];

        for (let f = 0; f < currentHistoryLength; f++) {
          const frameData = history[f];
          // depthVal goes from 0.0 (newest frame at back horizon) to 1.0 (oldest frame at front)
          const depthVal = f / (currentHistoryLength - 1 || 1);
          
          const scale = 0.32 + depthVal * 0.68; // perspective scaling factor
          const frameBaseY = (height * 0.36) + depthVal * (height * 0.48);
          const frameWidth = width * 0.84 * scale;
          const startX = (width - frameWidth) / 2;

          const frameRow: { x: number; y: number; val: number; color: string }[] = [];

          for (let i = 0; i < numBins; i++) {
            let dataIndex: number;
            if (settings.logScale) {
              const exp = Math.pow(i / (numBins - 1 || 1), 2.2);
              dataIndex = Math.min(frameData.length - 1, Math.floor(exp * frameData.length));
            } else {
              dataIndex = Math.floor((i / (numBins - 1 || 1)) * (frameData.length * 0.72));
            }

            const rawVal = frameData[dataIndex] || 0;
            const normalized = Math.min(1.2, (rawVal / 255) * settings.sensitivity);
            const barH = normalized * (120 * scale); // 3D mountain peak height displacement

            const px = startX + (i / (numBins - 1 || 1)) * frameWidth;
            const py = frameBaseY - barH;

            // Compute vertex color based on amplitude value
            const valNorm = Math.min(1.0, normalized);
            let vertexColor = '#f2b04a';
            if (preset.colors.length >= 3) {
              if (valNorm < 0.4) {
                vertexColor = blendHexColors(preset.colors[0], preset.colors[1], valNorm / 0.4);
              } else {
                vertexColor = blendHexColors(preset.colors[1], preset.colors[2], (valNorm - 0.4) / 0.6);
              }
            } else if (preset.colors.length === 2) {
              vertexColor = blendHexColors(preset.colors[0], preset.colors[1], valNorm);
            } else {
              vertexColor = preset.colors[0] || '#f2b04a';
            }

            frameRow.push({ x: px, y: py, val: rawVal, color: vertexColor });
          }
          grid.push(frameRow);
        }

        ctx.save();
        
        // Render from back (f = 0, horizon, depthVal = 0.0) to front (f = last, foreground, depthVal = 1.0)
        // This ensures proper 3D depth overlapping/masking
        for (let f = 0; f < currentHistoryLength; f++) {
          const depthVal = f / (currentHistoryLength - 1 || 1);
          const scale = 0.32 + depthVal * 0.68;
          const frameBaseY = (height * 0.36) + depthVal * (height * 0.48);
          
          const row = grid[f];
          if (!row || row.length === 0) continue;

          // 1. Draw solid masking shape below the mountains to obscure background peaks
          ctx.beginPath();
          ctx.moveTo(row[0].x, frameBaseY);
          for (let i = 0; i < numBins; i++) {
            ctx.lineTo(row[i].x, row[i].y);
          }
          ctx.lineTo(row[numBins - 1].x, frameBaseY);
          ctx.closePath();

          // Smooth depth fog to occlude background shapes completely
          const alphaFog = Math.min(0.98, 0.76 + depthVal * 0.22);
          ctx.fillStyle = `rgba(11, 10, 13, ${alphaFog})`;
          ctx.fill();

          // 2. Draw Longitudinal Grid Lines (Z-axis connectors/ribbons) connecting back-to-front
          if (f > 0) {
            const prevRow = grid[f - 1];
            ctx.beginPath();
            // Connect every 4th bin to create a beautiful grid spacing
            for (let i = 0; i < numBins; i += 4) {
              ctx.moveTo(row[i].x, row[i].y);
              ctx.lineTo(prevRow[i].x, prevRow[i].y);
            }
            ctx.lineWidth = Math.max(0.5, 0.8 * scale);
            // Dynamic grid connectors opacity
            ctx.strokeStyle = `rgba(214, 210, 220, ${0.05 + depthVal * 0.16})`;
            ctx.stroke();
          }

          // 3. Draw Transverse Contour Line (mountain peaks)
          ctx.beginPath();
          ctx.moveTo(row[0].x, row[0].y);
          for (let i = 1; i < numBins; i++) {
            ctx.lineTo(row[i].x, row[i].y);
          }
          
          // Symmetrical linear gradient for the crest line
          const crestGradient = ctx.createLinearGradient(row[0].x, 0, row[numBins - 1].x, 0);
          preset.colors.forEach((c, idx) => {
            crestGradient.addColorStop(idx / (preset.colors.length - 1 || 1), c);
          });

          ctx.strokeStyle = crestGradient;
          ctx.lineWidth = Math.max(1.0, 2.2 * scale);
          ctx.globalAlpha = 0.25 + depthVal * 0.75; // Horizon lines are slightly faded for atmospheric perspective
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // 4. Glow peaks - add bright glowing dots at the high spectral peaks of each frame
          for (let i = 2; i < numBins - 2; i += 2) {
            const pt = row[i];
            if (pt.val > 140) { // High amplitude signals get neon hot spots
              ctx.fillStyle = pt.color;
              ctx.shadowColor = pt.color;
              ctx.shadowBlur = Math.min(10, (pt.val - 120) * 0.15);
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, Math.max(1, 2.5 * scale), 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
        ctx.restore();
      }

      // -------------------------------------------------------------
      // SPECTROGRAM / WATERFALL MODE
      // -------------------------------------------------------------
      else if (settings.mode === 'spectrogram') {
        const sCanvas = spectrogramCanvasRef.current;
        if (sCanvas) {
          if (sCanvas.width !== width || sCanvas.height !== height) {
            sCanvas.width = width;
            sCanvas.height = height;
          }
          const sCtx = sCanvas.getContext('2d');
          if (sCtx) {
            // Scroll existing image down by 2 pixels
            sCtx.drawImage(sCanvas, 0, 0, width, height, 0, 2, width, height);

            // Render new line at top (y=0), colored from the active palette
            const lutKey = stops.join('|');
            if (!spectroLutRef.current || spectroLutRef.current.key !== lutKey) {
              const lut = new Uint8ClampedArray(256 * 3);
              const bgc = parseHex(CANVAS_BG);
              for (let v = 0; v < 256; v++) {
                const t = v / 255;
                // fade in from the background so the noise floor stays dark
                const col = parseHex(rgbToHex(samplePalette(stops, t)));
                const k = Math.min(1, t / 0.18);
                lut[v * 3] = bgc[0] + (col[0] - bgc[0]) * k;
                lut[v * 3 + 1] = bgc[1] + (col[1] - bgc[1]) * k;
                lut[v * 3 + 2] = bgc[2] + (col[2] - bgc[2]) * k;
              }
              spectroLutRef.current = { key: lutKey, lut };
            }
            const lut = spectroLutRef.current.lut;
            for (let x = 0; x < width; x++) {
              const f = x / width;
              const binIdx = settings.logScale
                ? Math.min(binCount - 1, Math.floor(Math.pow(f, 2) * binCount))
                : Math.floor(f * (binCount * 0.75));
              const intensity = freqData[binIdx] || 0;
              const v = Math.min(255, Math.round(intensity * settings.sensitivity));
              sCtx.fillStyle = `rgb(${lut[v * 3]},${lut[v * 3 + 1]},${lut[v * 3 + 2]})`;
              sCtx.fillRect(x, 0, 1, 2);
            }
            ctx.drawImage(sCanvas, 0, 0);
          }
        }
      }

      // -------------------------------------------------------------
      // OSCILLOSCOPE / WAVEFORM MODE
      // -------------------------------------------------------------
      else if (settings.mode === 'waveform') {
        ctx.beginPath();
        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0; // 128 is zero crossing
          const y = (v * (height / 2.5)) + (height / 2 - 15);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2 - 15);
        ctx.strokeStyle = preset.colors[2] || preset.colors[0] || '#f2b04a';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = preset.glowColor;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // -------------------------------------------------------------
      // HYBRID MODE OVERLAY: WAVEFORM MINI OSCILLOSCOPE
      // -------------------------------------------------------------
      if (settings.mode === 'hybrid') {
        const miniHeight = 60;
        const miniY = 25;

        ctx.save();
        ctx.fillStyle = 'rgba(19, 18, 23, 0.72)';
        ctx.strokeStyle = 'rgba(74, 70, 85, 0.5)';
        ctx.roundRect(15, miniY, width - 30, miniHeight, 6);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        const sliceWidth = (width - 40) / timeData.length;
        let x = 20;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = miniY + (miniHeight / 2) + ((v - 1) * (miniHeight / 2.2));

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.strokeStyle = preset.colors[2] || '#f8cf85';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // OVERLAYS: Hz FREQUENCY SCALE & dB GRID
      // -------------------------------------------------------------
      // Beat pulse wash (behind nothing — a subtle full-frame flash)
      if (beat > 0.02) {
        const wash = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, Math.max(width, height) * 0.8);
        wash.addColorStop(0, rgba(stops[1], 0.16 * beat));
        wash.addColorStop(1, 'rgba(11, 10, 13, 0)');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, width, height);
      }

      if (settings.showHzScale && showAxis) {
        ctx.fillStyle = 'rgba(143, 138, 155, 0.85)';
        ctx.font = FONT_MONO;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(74, 70, 85, 0.7)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(0, height - 32);
        ctx.lineTo(width, height - 32);
        ctx.stroke();

        // Tick positions follow the active frequency mapping of each mode
        HZ_TICKS.forEach((tick) => {
          if (tick.hz >= nyquist) return;
          const fraction = tick.hz / nyquist; // 0..1 of full bin range
          let ratio: number;
          if (settings.mode === 'bars') {
            ratio = settings.logScale ? Math.sqrt(fraction) : fraction / 0.75;
          } else if (settings.mode === 'spectrogram') {
            ratio = settings.logScale ? Math.sqrt(fraction) : fraction / 0.75;
          } else {
            ratio = settings.logScale ? Math.pow(fraction, 1 / 2.2) : fraction / 0.7;
          }
          if (ratio <= 0.01 || ratio >= 0.985) return;
          const labelX = ratio * width;
          ctx.fillText(tick.label, labelX, height - 12);
          ctx.beginPath();
          ctx.moveTo(labelX, height - 32);
          ctx.lineTo(labelX, height - 27);
          ctx.stroke();
        });
        ctx.textAlign = 'left';
        ctx.fillText('Hz', 8, height - 12);
      }

      if (settings.showDbGrid && (settings.mode === 'bars' || settings.mode === 'curve' || settings.mode === 'hybrid')) {
        ctx.fillStyle = 'rgba(143, 138, 155, 0.6)';
        ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
        ctx.textAlign = 'left';

        const span = dbMax - dbMin;
        const dbSteps = [-6, -12, -24, -36, -48, -60, -72, -84];
        dbSteps.forEach((db) => {
          const norm = (db - dbMin) / span;
          const lineY = height - 35 - norm * settings.sensitivity * (height * (settings.mode === 'bars' ? 0.78 : 0.75));

          if (norm > 0.04 && lineY > 20 && lineY < height - 40) {
            ctx.strokeStyle = 'rgba(143, 138, 155, 0.16)';
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(width, lineY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillText(`${db} dB`, 8, lineY - 3);
          }
        });
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
    // Intentionally empty: getFrequencyData/getTimeDomainData are stable
    // (useCallback with no deps in useAudioEngine), and everything else the
    // loop needs is read live through refs each frame (see top of render()).
    // This mounts the canvas render loop + ResizeObserver exactly once.
  }, [getFrequencyData, getTimeDomainData]);

  const isHero = variant === 'hero';

  return (
    <div
      ref={containerRef}
      id="spectrum-canvas-container"
      className={`relative w-full bg-ink-950 rounded-2xl overflow-hidden flex flex-col group ${
        isHero ? 'h-[min(56vh,540px)] min-h-[360px]' : 'h-[220px] sm:h-[280px]'
      }`}
    >
      {/* Floating canvas tools */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 pointer-events-auto opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={exportSnapshot}
          title="Export PNG snapshot"
          aria-label="Export PNG snapshot"
          id="btn-export-snapshot"
          className="p-2 bg-ink-900/70 hover:bg-ink-800 backdrop-blur-md text-ink-300 hover:text-white rounded-xl border border-ink-700/60 transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen display'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen display'}
          id="btn-toggle-fullscreen"
          className="p-2 bg-ink-900/70 hover:bg-ink-800 backdrop-blur-md text-ink-300 hover:text-white rounded-xl border border-ink-700/60 transition-all active:scale-95 cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div role="status" className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-accent-400 text-ink-950 px-4 py-2 rounded-full font-bold text-xs shadow-xl flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> {toastMessage}
        </div>
      )}

      {/* HTML5 Canvas */}
      <div ref={canvasWrapRef} className="flex-1 w-full min-h-0 relative">
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" aria-label="Live audio spectrum" role="img" />
        {!isPlaying && overlay && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-ink-950/55 backdrop-blur-[2px] z-10">
            {overlay}
          </div>
        )}
      </div>

      {/* Collapsible Layers Manager Drawer */}
      {showLayersManager && savedLayers.length > 0 && (
        <div className="bg-ink-950/95 border-t border-ink-800/85 p-3 max-h-[160px] overflow-y-auto z-10 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-ink-800/60">
            <h4 className="text-[11px] font-bold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent-400" />
              Active Spectrum Overlays & Comparators
            </h4>
            <button
              onClick={() => setShowLayersManager(false)}
              className="p-1 text-ink-500 hover:text-ink-300 hover:bg-ink-900 rounded-md transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {savedLayers.map((layer) => (
              <div key={layer.id} className="flex items-center justify-between gap-3 bg-ink-900/60 border border-ink-800/50 p-2 rounded-lg text-xs">
                {/* Name & input to edit */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: layer.color }} />
                  <input
                    type="text"
                    value={layer.name}
                    onChange={(e) => renameLayer(layer.id, e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-ink-700 focus:border-accent-500 focus:outline-none text-ink-200 font-medium px-1 py-0.5 rounded transition-all w-full max-w-[150px] sm:max-w-xs truncate"
                  />
                  <span className="text-[10px] text-ink-500 hidden sm:inline shrink-0">{layer.timestamp}</span>
                </div>

                {/* Controls (Visibility, Color change, Delete) */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick Color Selector */}
                  <div className="flex items-center gap-1 bg-ink-950/50 p-1 rounded-md border border-ink-800/40">
                    {LAYER_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => changeLayerColor(layer.id, color)}
                        className={`w-3 h-3 rounded-full hover:scale-125 transition-all shrink-0 cursor-pointer ${
                          layer.color === color ? 'ring-1 ring-offset-1 ring-offset-slate-950 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Toggle Visibility */}
                  <button
                    onClick={() => toggleLayerVisibility(layer.id)}
                    className={`p-1 rounded-md hover:bg-ink-800 border transition-all cursor-pointer ${
                      layer.visible
                        ? 'border-ink-850 text-ink-200'
                        : 'border-ink-850/40 text-ink-500 hover:text-ink-400'
                    }`}
                    title={layer.visible ? 'Hide overlay' : 'Show overlay'}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteLayer(layer.id)}
                    className="p-1 rounded-md hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-ink-500 hover:text-rose-400 transition-all cursor-pointer"
                    title="Delete reference layer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom toolbar: peak hold + reference layers (hero only) */}
      {isHero && (
      <div className="bg-ink-900/95 border-t border-ink-800/80 p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-ink-300">
        {/* Left side: Peak Hold Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Peak Hold:</span>
          <button
            onClick={() => setInfinitePeakHold(!infinitePeakHold)}
            id="btn-toggle-infinite-peak"
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
              infinitePeakHold
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                : 'bg-ink-950 border-ink-800 hover:bg-ink-850 text-ink-400 hover:text-ink-200'
            }`}
            title="Toggle infinite peak hold (locks peak lines at maximum values)"
          >
            {infinitePeakHold ? <Pin className="w-3.5 h-3.5 rotate-45 text-amber-400" /> : <Pin className="w-3.5 h-3.5 opacity-60" />}
            {infinitePeakHold ? 'Infinite Hold' : 'Decaying Peak'}
          </button>
          
          <button
            onClick={resetPeaks}
            id="btn-reset-peaks"
            className="px-2.5 py-1.5 rounded-lg bg-ink-950 border border-ink-800 hover:bg-ink-850 hover:border-ink-700 text-ink-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset current peak levels to zero"
          >
            <RefreshCw className="w-3.5 h-3.5 text-ink-400" />
            Reset Peaks
          </button>
        </div>

        {/* Right side: Layering system */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Layers:</span>
            <button
              onClick={captureCurrentLayer}
              disabled={!isPlaying && metrics.peakFrequencyHz === 0}
              id="btn-capture-layer"
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-accent-500/10 to-emerald-500/10 hover:from-accent-500/20 hover:to-emerald-500/20 border border-accent-500/30 hover:border-accent-500/50 text-accent-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Capture current frequency spectrum envelope as a comparative overlay"
            >
              <Plus className="w-3.5 h-3.5" />
              Capture Layer
            </button>
          </div>

          {savedLayers.length > 0 && (
            <button
              onClick={() => setShowLayersManager(!showLayersManager)}
              id="btn-toggle-layers-manager"
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                showLayersManager
                  ? 'bg-accent-500/15 border-accent-500/40 text-accent-300'
                  : 'bg-ink-950 border-ink-800 hover:bg-ink-850 text-ink-400 hover:text-ink-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Manage ({savedLayers.length})
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
