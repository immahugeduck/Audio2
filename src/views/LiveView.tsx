import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { GraphModeSwitcher } from '../components/GraphModeSwitcher';
import { LiveStatStrip } from '../components/LiveStatStrip';
import { AudioMeters } from '../components/AudioMeters';
import { MicSettingsSelector } from '../components/MicSettingsSelector';
import { PageHeader } from '../components/ui';
import { hrefFor } from '../utils/routes';

export const LiveView: React.FC = () => {
  const { visual, updateVisual, metrics, isLive, engineState, enableMicrophone, toggleMicMonitoring } = useAnalyzer();

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="Live Analyzer"
        title="The room, in frequency."
        subtitle="A real-time spectrum of whatever Auralis is hearing — microphone, sample, file or stream."
        actions={
          <a
            href={hrefFor('settings', 'graph')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-200 bg-ink-800 border border-ink-700 hover:bg-ink-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent-400" /> Graph settings
          </a>
        }
      />

      <GraphModeSwitcher settings={visual} updateSettings={updateVisual} />
      <Stage variant="hero" />
      <LiveStatStrip metrics={metrics} isLive={isLive} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-3">
          <MicSettingsSelector
            engineState={engineState}
            enableMicrophone={enableMicrophone}
            toggleMicMonitoring={toggleMicMonitoring}
            metrics={metrics}
          />
        </div>
        <div className="xl:col-span-2">
          <AudioMeters metrics={metrics} />
        </div>
      </div>
    </div>
  );
};
