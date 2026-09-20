import React from 'react';
import { AudioMetrics } from '../types';

interface LiveStatStripProps {
  metrics: AudioMetrics;
  isLive: boolean;
}

interface Stat {
  label: string;
  value: string;
  accent: string;
  glow: string;
}

// A compact premium telemetry bar shown directly under the hero graph.
// Surfaces the real-time levels & spectral numbers the engine already computes.
export const LiveStatStrip: React.FC<LiveStatStripProps> = ({ metrics, isLive }) => {
  const stats: Stat[] = [
    {
      label: 'Peak Freq',
      value: metrics.peakFrequencyHz > 16 ? metrics.peakFrequencyFormatted : '—',
      accent: 'text-cyan-300',
      glow: 'rgba(34,224,255,0.55)',
    },
    {
      label: 'Note',
      value: metrics.peakFrequencyHz > 16 ? metrics.peakNoteName : '—',
      accent: 'text-amber-300',
      glow: 'rgba(251,191,36,0.5)',
    },
    {
      label: 'RMS',
      value: `${metrics.rmsDb.toFixed(1)} dB`,
      accent: 'text-emerald-300',
      glow: 'rgba(52,211,153,0.5)',
    },
    {
      label: 'Peak',
      value: `${metrics.peakDb.toFixed(1)} dB`,
      accent: 'text-fuchsia-300',
      glow: 'rgba(232,121,249,0.5)',
    },
    {
      label: 'Centroid',
      value: metrics.spectralCentroidHz > 0 ? `${(metrics.spectralCentroidHz / 1000).toFixed(2)}k` : '—',
      accent: 'text-indigo-300',
      glow: 'rgba(129,140,248,0.5)',
    },
    {
      label: 'Crest',
      value: `${metrics.crestFactorDb.toFixed(1)} dB`,
      accent: 'text-sky-300',
      glow: 'rgba(56,189,248,0.5)',
    },
  ];

  return (
    <div className="glass border border-slate-800/80 rounded-2xl px-2 py-2.5 shadow-lg">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center justify-center px-2 py-1.5 rounded-xl hover:bg-slate-900/60 transition-colors"
          >
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.12em] mb-0.5">
              {s.label}
            </span>
            <span
              className={`font-mono font-extrabold text-sm sm:text-base tracking-tight tabular-nums ${s.accent}`}
              style={isLive && s.value !== '—' ? { textShadow: `0 0 12px ${s.glow}` } : undefined}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
