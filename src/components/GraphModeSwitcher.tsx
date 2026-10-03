import React from 'react';
import { VisualizerSettings, VisualizationMode } from '../types';

export interface ModeDef {
  id: VisualizationMode;
  label: string;
  sub: string;
  blurb: string;
}

export const MODES: ModeDef[] = [
  { id: 'bars', label: 'Bars', sub: 'FFT spectrum', blurb: 'Classic frequency bars with peak caps.' },
  { id: 'curve', label: 'Curve', sub: 'Smooth contour', blurb: 'A flowing filled curve with a glowing outline.' },
  { id: 'hybrid', label: 'Hybrid', sub: 'Curve + scope', blurb: 'Spectrum curve with a live oscilloscope strip.' },
  { id: 'radial', label: 'Radial', sub: 'Circular ring', blurb: 'Mirrored spokes around a pitch readout.' },
  { id: 'waterfall', label: 'Waterfall', sub: '3D rainfall', blurb: 'Perspective mountains scrolling into depth.' },
  { id: 'spectrogram', label: 'Spectrogram', sub: 'Time × freq', blurb: 'Scrolling heat-map of energy over time.' },
  { id: 'waveform', label: 'Scope', sub: 'Time domain', blurb: 'Raw waveform oscilloscope.' },
];

/** Little SVG glyphs that hint at what each mode looks like (used in picker + switcher). */
export const ModeGlyph: React.FC<{ mode: VisualizationMode; className?: string }> = ({ mode, className = 'w-full h-full' }) => {
  const stroke = 'currentColor';
  switch (mode) {
    case 'bars':
      return (
        <svg viewBox="0 0 64 40" className={className} fill={stroke} aria-hidden="true">
          {[6, 14, 22, 15, 28, 20, 11, 24, 8, 16, 10].map((h, i) => (
            <rect key={i} x={3 + i * 5.5} y={38 - h} width="3.6" height={h} rx="1.2" opacity={0.45 + h / 50} />
          ))}
        </svg>
      );
    case 'curve':
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path d="M2 36 C10 34 12 12 22 14 S34 34 42 20 S54 6 62 26 V38 H2Z" fill={stroke} opacity="0.22" />
          <path d="M2 36 C10 34 12 12 22 14 S34 34 42 20 S54 6 62 26" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'hybrid':
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          <path d="M2 4 q4 -3 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke={stroke} strokeWidth="1.4" opacity="0.7" transform="translate(0 3)" />
          <path d="M2 38 C10 36 12 18 22 20 S34 36 42 26 S54 14 62 30 V38 H2Z" fill={stroke} opacity="0.25" />
          <path d="M2 38 C10 36 12 18 22 20 S34 36 42 26 S54 14 62 30" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'radial':
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const len = 4 + ((i * 7) % 6) * 1.6;
            const r0 = 8;
            return (
              <line
                key={i}
                x1={32 + Math.cos(a) * r0}
                y1={20 + Math.sin(a) * r0}
                x2={32 + Math.cos(a) * (r0 + len)}
                y2={20 + Math.sin(a) * (r0 + len)}
                stroke={stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity={0.55 + len / 25}
              />
            );
          })}
        </svg>
      );
    case 'waterfall':
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none" stroke={stroke} strokeLinecap="round" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((r) => {
            const y = 12 + r * 6.5;
            const inset = 14 - r * 2.8;
            return (
              <path
                key={r}
                d={`M${inset} ${y} l5 -${4 + (r % 2) * 3} l5 ${3} l5 -${6 - (r % 3)} l5 ${5} l5 -${3} l${5} ${2}`}
                strokeWidth={1.1 + r * 0.25}
                opacity={0.3 + r * 0.17}
              />
            );
          })}
        </svg>
      );
    case 'spectrogram':
      return (
        <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
          {Array.from({ length: 9 }).map((_, x) =>
            Array.from({ length: 6 }).map((__, y) => {
              const v = (Math.sin(x * 1.3 + y * 0.7) + 1) / 2;
              return <rect key={`${x}-${y}`} x={4 + x * 6.4} y={4 + y * 5.6} width="5.4" height="4.6" rx="1" fill={stroke} opacity={0.12 + v * 0.8} />;
            })
          )}
        </svg>
      );
    case 'waveform':
      return (
        <svg viewBox="0 0 64 40" className={className} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M2 20 q3 -14 6 0 t6 0 t6 0 q3 -8 6 0 q3 14 6 0 t6 0 t6 0 q3 -12 6 0 t6 0" />
        </svg>
      );
  }
};

interface GraphModeSwitcherProps {
  settings: VisualizerSettings;
  updateSettings: (partial: Partial<VisualizerSettings>) => void;
}

/** Compact segmented control for switching graph type right above the hero stage. */
export const GraphModeSwitcher: React.FC<GraphModeSwitcherProps> = ({ settings, updateSettings }) => {
  return (
    <div
      role="radiogroup"
      aria-label="Graph type"
      className="flex items-center gap-1 p-1 rounded-2xl bg-ink-900/70 border border-ink-800 overflow-x-auto no-scrollbar"
    >
      {MODES.map((m) => {
        const active = settings.mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => updateSettings({ mode: m.id })}
            id={`btn-graph-mode-${m.id}`}
            title={`${m.label} — ${m.sub}`}
            className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors ${
              active ? 'bg-accent-400 text-ink-950 shadow' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-800'
            }`}
          >
            <span className={`w-6 h-4 shrink-0 ${active ? 'text-ink-950' : 'text-ink-400 group-hover:text-accent-300'}`}>
              <ModeGlyph mode={m.id} />
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
};
