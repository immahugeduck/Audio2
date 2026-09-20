import React from 'react';
import { AudioWaveform, Radio, Sparkles, FileBarChart } from 'lucide-react';
import { AudioMetrics } from '../types';

interface HeaderProps {
  sourceType: string;
  metrics?: AudioMetrics;
  onOpenGuide?: () => void;
  onOpenReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sourceType,
  metrics,
  onOpenGuide,
  onOpenReport,
}) => {
  return (
    <header className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-5">
      {/* Brand */}
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 blur-lg opacity-60 animate-hero-glow" />
          <div className="relative p-3 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 rounded-2xl shadow-lg text-white">
            <AudioWaveform className="w-6 h-6" strokeWidth={2.25} />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-neon">
              Audio2une
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
              Spectrum Lab
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Premium real-time audio spectrum analyzer &amp; acoustic diagnostics
          </p>
        </div>
      </div>

      {/* Telemetry + actions */}
      <div className="flex items-center gap-2.5 flex-wrap self-stretch xl:self-auto justify-start xl:justify-end">
        {metrics && (
          <div
            id="header-live-prominent-frequency-badge"
            className="flex items-center gap-2 glass border border-slate-800/90 px-3 py-1.5 rounded-xl text-xs text-slate-200 shadow-sm"
            title="Real-time prominent peak frequency & chromatic pitch"
          >
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                metrics.peakFrequencyHz > 16
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Peak</span>
            <span className="font-mono font-extrabold text-cyan-300 text-xs sm:text-sm tracking-tight tabular-nums">
              {metrics.peakFrequencyHz > 16 ? metrics.peakFrequencyFormatted : '0.0 Hz'}
            </span>
            {metrics.peakFrequencyHz > 16 && (
              <>
                <span className="text-slate-700">|</span>
                <span className="font-mono text-[11px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {metrics.peakNoteName}
                </span>
              </>
            )}
            <span className="text-slate-700">|</span>
            <span className="font-mono text-[11px] font-medium text-slate-400 tabular-nums">{metrics.fps} FPS</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-slate-800 text-xs text-slate-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-slate-400">Source</span>
          <strong className="capitalize font-semibold text-emerald-300">{sourceType}</strong>
        </div>

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            id="btn-header-open-guide"
            className="px-3 py-1.5 rounded-xl glass hover:bg-slate-800/70 border border-slate-800 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Open acoustic diagnostic guide"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Guide
          </button>
        )}

        {onOpenReport && (
          <button
            onClick={onOpenReport}
            id="btn-header-open-report"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/15 hover:from-cyan-500/30 hover:to-fuchsia-500/25 border border-cyan-500/30 text-xs font-semibold text-cyan-200 flex items-center gap-1.5 cursor-pointer transition-all"
            title="Export acoustic sound audit report"
          >
            <FileBarChart className="w-3.5 h-3.5" />
            Export Report
          </button>
        )}
      </div>
    </header>
  );
};
