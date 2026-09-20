import React from 'react';
import { VisualizerSettings, VisualizationMode } from '../types';
import { BarChart3, Waves, Layers, Grid3x3, Activity, LayoutPanelTop } from 'lucide-react';

interface GraphModeSwitcherProps {
  settings: VisualizerSettings;
  updateSettings: (partial: Partial<VisualizerSettings>) => void;
}

interface ModeDef {
  id: VisualizationMode;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const MODES: ModeDef[] = [
  { id: 'bars', label: 'Bars', sub: 'FFT Spectrum', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'curve', label: 'Spectral', sub: 'SPL Contour', icon: <Waves className="w-4 h-4" /> },
  { id: 'waterfall', label: 'Waterfall', sub: '3D Rainfall', icon: <Layers className="w-4 h-4" /> },
  { id: 'spectrogram', label: 'Heatmap', sub: 'Time × Freq', icon: <Grid3x3 className="w-4 h-4" /> },
  { id: 'waveform', label: 'Scope', sub: 'Time Domain', icon: <Activity className="w-4 h-4" /> },
  { id: 'hybrid', label: 'Dual', sub: 'FFT + Scope', icon: <LayoutPanelTop className="w-4 h-4" /> },
];

export const GraphModeSwitcher: React.FC<GraphModeSwitcherProps> = ({ settings, updateSettings }) => {
  return (
    <div className="glass border border-slate-800/80 rounded-2xl p-2 shadow-xl">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {MODES.map((m) => {
          const active = settings.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => updateSettings({ mode: m.id })}
              id={`btn-graph-mode-${m.id}`}
              title={`${m.label} — ${m.sub}`}
              className={`group relative flex-1 min-w-[92px] flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-gradient-to-br from-cyan-500/25 via-indigo-500/15 to-fuchsia-500/20 border-cyan-400/50 text-white shadow-[0_0_20px_-4px_rgba(34,224,255,0.5)]'
                  : 'bg-slate-950/50 border-slate-800/70 text-slate-400 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              <span
                className={`shrink-0 transition-colors ${
                  active ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-400'
                }`}
              >
                {m.icon}
              </span>
              <span className="flex flex-col items-start leading-tight min-w-0">
                <span className="text-[13px] font-bold tracking-tight truncate">{m.label}</span>
                <span className="text-[10px] font-medium text-slate-500 truncate hidden sm:block">{m.sub}</span>
              </span>
              {active && (
                <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
