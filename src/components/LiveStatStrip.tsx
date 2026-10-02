import React from 'react';
import { AudioMetrics } from '../types';

interface LiveStatStripProps {
  metrics: AudioMetrics;
  isLive: boolean;
}

interface Stat {
  label: string;
  value: string;
  unit?: string;
  accent: string;
}

// Clean telemetry strip under the hero graph: the numbers the engine already computes.
export const LiveStatStrip: React.FC<LiveStatStripProps> = ({ metrics, isLive }) => {
  const hasTone = isLive && metrics.peakFrequencyHz > 16;
  const num = (v: number, digits = 1) => (isLive ? v.toFixed(digits) : '—');
  const stats: Stat[] = [
    {
      label: 'Peak frequency',
      value: hasTone ? metrics.peakFrequencyFormatted.replace(/\s?k?Hz$/i, '') : '—',
      unit: hasTone ? (/khz/i.test(metrics.peakFrequencyFormatted) ? 'kHz' : 'Hz') : undefined,
      accent: 'text-accent-300',
    },
    { label: 'Note', value: hasTone ? metrics.peakNoteName : '—', accent: 'text-coral-300' },
    { label: 'RMS', value: num(metrics.rmsDb), unit: isLive ? 'dB' : undefined, accent: 'text-sage-300' },
    { label: 'Peak level', value: num(metrics.peakDb), unit: isLive ? 'dB' : undefined, accent: 'text-plum-300' },
    {
      label: 'Centroid',
      value: isLive && metrics.spectralCentroidHz > 0 ? (metrics.spectralCentroidHz / 1000).toFixed(2) : '—',
      unit: isLive && metrics.spectralCentroidHz > 0 ? 'kHz' : undefined,
      accent: 'text-ink-100',
    },
    { label: 'Crest', value: num(metrics.crestFactorDb), unit: isLive ? 'dB' : undefined, accent: 'text-ink-100' },
  ];

  return (
    <div className="card overflow-hidden" data-testid="live-stat-strip">
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-ink-800/70">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-1 px-4 py-3.5 bg-ink-900">
            <dt className="eyebrow !text-[9.5px]">{s.label}</dt>
            <dd className={`font-mono text-xl sm:text-[22px] font-medium tabular-nums tracking-tight ${s.accent}`}>
              {s.value}
              {s.unit && <span className="ml-1 text-xs text-ink-500 font-normal">{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
