import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AnalyzerProvider, useAnalyzer } from './context/AnalyzerContext';
import { useHashRoute } from './hooks/useHashRoute';
import { RouteId } from './utils/routes';
import { TopBar } from './components/TopBar';
import { Drawer } from './components/Drawer';
import { DropZone } from './components/DropZone';
import { ReportExporter } from './components/ReportExporter';
import { LiveView } from './views/LiveView';
import { MediaView } from './views/MediaView';
import { EqualizerView } from './views/EqualizerView';
import { TunerView } from './views/TunerView';
import { NoiseView } from './views/NoiseView';
import { AiView } from './views/AiView';
import { GuideView } from './views/GuideView';
import { SettingsView } from './views/SettingsView';

function Shell() {
  const { route, navigate } = useHashRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { loadAudioFile, metrics, profile, latestAiResult, isReportOpen, setReportOpen } = useAnalyzer();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Move focus to the new view and reset scroll on navigation (a11y + UX)
  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [route.id]);

  // A file dropped anywhere loads it and jumps to Media
  const handleFileDrop = useCallback(
    (file: File) => {
      loadAudioFile(file);
      navigate('media');
    },
    [loadAudioFile, navigate]
  );

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className="min-h-screen text-ink-100 font-sans antialiased" inert={drawerOpen}>
        <a
          href="#main"
          onClick={(e) => {
            e.preventDefault();
            mainRef.current?.focus();
          }}
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-accent-400 focus:text-ink-950 focus:font-semibold"
        >
          Skip to content
        </a>
        <TopBar
          activeRoute={route.id}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((o) => !o)}
          menuButtonRef={menuButtonRef}
        />
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto max-w-[1360px] px-3 sm:px-6 py-6 sm:py-8 pb-16 outline-none"
        >
          <RouteView id={route.id} sub={route.sub} />
        </main>

        <footer className="mx-auto max-w-[1360px] px-3 sm:px-6 pb-8">
          <div className="hairline mb-4" />
          <div className="text-[11px] text-ink-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              <span className="font-display text-sm text-ink-300">Auralis</span> · Web Audio API · Gemini-assisted sound classification
            </span>
            <span>Settings are stored locally in your browser.</span>
          </div>
        </footer>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        activeRoute={route.id}
        onNavigate={(id: RouteId) => navigate(id)}
        returnFocusRef={menuButtonRef}
      />

      <ReportExporter
        metrics={metrics}
        profile={profile}
        latestAiResult={latestAiResult}
        isOpen={isReportOpen}
        onClose={() => setReportOpen(false)}
      />
    </DropZone>
  );
}

function RouteView({ id, sub }: { id: RouteId; sub: string | null }) {
  switch (id) {
    case 'live':
      return <LiveView />;
    case 'media':
      return <MediaView />;
    case 'equalizer':
      return <EqualizerView />;
    case 'tuner':
      return <TunerView />;
    case 'noise':
      return <NoiseView />;
    case 'ai':
      return <AiView />;
    case 'guide':
      return <GuideView />;
    case 'settings':
      return <SettingsView sub={sub} />;
  }
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AnalyzerProvider>
        <Shell />
      </AnalyzerProvider>
    </MotionConfig>
  );
}
