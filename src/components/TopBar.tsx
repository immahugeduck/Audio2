import React from 'react';
import { Menu, Settings as SettingsIcon, FileBarChart } from 'lucide-react';
import { LogoMark } from './Logo';
import { ROUTES, RouteId, hrefFor } from '../utils/routes';
import { useAnalyzer } from '../context/AnalyzerContext';

interface TopBarProps {
  activeRoute: RouteId;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export const TopBar: React.FC<TopBarProps> = ({ activeRoute, drawerOpen, onToggleDrawer, menuButtonRef }) => {
  const { engineState, metrics, isLive, setReportOpen } = useAnalyzer();
  const route = ROUTES.find((r) => r.id === activeRoute)!;

  const sourceText =
    engineState.sourceType === 'mic'
      ? engineState.micActive
        ? 'Microphone'
        : 'Mic stopped'
      : engineState.sourceType === 'sample'
      ? 'Sample'
      : engineState.sourceType === 'url'
      ? 'Stream'
      : 'File';
  const hasTone = metrics.peakFrequencyHz > 16;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1360px] h-14 sm:h-16 px-3 sm:px-6 flex items-center gap-2 sm:gap-4">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onToggleDrawer}
          id="btn-open-drawer"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls="app-drawer"
          className="p-2.5 -ml-1 rounded-xl text-ink-200 hover:text-ink-50 hover:bg-ink-800 border border-transparent hover:border-ink-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a href={hrefFor('live')} className="flex items-center gap-2.5 shrink-0" aria-label="Auralis home">
          <LogoMark size={30} />
          <span className="hidden sm:block font-display text-[1.6rem] leading-none tracking-tight text-ink-50">Auralis</span>
        </a>

        <span className="hidden md:block w-px h-6 bg-ink-700 mx-1" aria-hidden="true" />
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <route.icon className="w-4 h-4 text-accent-400 shrink-0" />
          <h2 className="text-sm font-semibold text-ink-100 truncate">{route.label}</h2>
        </div>

        <div className="flex-1" />

        {/* Live source + peak readout */}
        <div
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-ink-700/80 bg-ink-900/70 text-xs min-w-0"
          aria-live="polite"
          data-testid="status-pill"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isLive ? 'bg-sage-400 shadow-[0_0_8px_var(--color-sage-400)] animate-pulse' : 'bg-ink-600'
            }`}
          />
          <span className="font-semibold text-ink-100 truncate">{isLive ? sourceText : 'Idle'}</span>
          <span className="hidden sm:inline text-ink-600">·</span>
          <span className="hidden sm:inline font-mono tabular-nums text-accent-300">
            {isLive && hasTone ? `${metrics.peakFrequencyFormatted} ${metrics.peakNoteName}` : '— Hz'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setReportOpen(true)}
          aria-label="Export report"
          title="Export sound audit report"
          className="hidden sm:inline-flex p-2.5 rounded-xl text-ink-300 hover:text-ink-50 hover:bg-ink-800 transition-colors"
        >
          <FileBarChart className="w-[18px] h-[18px]" />
        </button>
        <a
          href={hrefFor('settings')}
          aria-label="Settings"
          title="Settings"
          className={`p-2.5 rounded-xl transition-colors ${
            activeRoute === 'settings' ? 'text-accent-400 bg-accent-400/10' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-800'
          }`}
        >
          <SettingsIcon className="w-[18px] h-[18px]" />
        </a>
      </div>
    </header>
  );
};
