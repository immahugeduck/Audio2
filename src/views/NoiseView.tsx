import React, { useState } from 'react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { NoiseBaselineMonitor } from '../components/NoiseBaselineMonitor';
import { AcousticRoomRt60 } from '../components/AcousticRoomRt60';
import { SoundTimelineProfiler } from '../components/SoundTimelineProfiler';
import { EventAnomalyLog } from '../components/EventAnomalyLog';
import { PageHeader } from '../components/ui';
import { SourceBanner } from '../components/SourceBanner';

type NoiseTab = 'baseline' | 'rt60' | 'timeline' | 'events';
const TABS: { id: NoiseTab; label: string }[] = [
  { id: 'baseline', label: 'Noise baseline' },
  { id: 'rt60', label: 'Room RT60' },
  { id: 'timeline', label: 'Sound timeline' },
  { id: 'events', label: 'Events & anomalies' },
];

export const NoiseView: React.FC = () => {
  const a = useAnalyzer();
  const [tab, setTab] = useState<NoiseTab>('baseline');
  const listening = a.engineState.micActive || a.engineState.isPlaying;

  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="Noise & Room"
        title="Know your space."
        subtitle="Calibrate the ambient noise floor, measure reverberation, and log what happens over time."
      />
      <SourceBanner message="These measurements need a continuous signal — start the microphone for room work." />
      <Stage variant="compact" />

      <div role="tablist" aria-label="Noise and room tools" className="flex gap-1 p-1 rounded-2xl bg-ink-900/70 border border-ink-800 overflow-x-auto no-scrollbar self-start max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-noise-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="noise-panel"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-accent-400 text-ink-950' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="noise-panel" role="tabpanel" aria-labelledby={`tab-noise-${tab}`}>
        {tab === 'baseline' && (
          <NoiseBaselineMonitor
            profile={a.profile}
            metrics={a.metrics}
            isCalibrating={a.isCalibrating}
            startCalibration={a.startCalibration}
            resetTransients={a.resetTransients}
            isListening={listening}
          />
        )}
        {tab === 'rt60' && (
          <AcousticRoomRt60 metrics={a.metrics} isListening={listening} getFrequencyData={a.getFrequencyData} />
        )}
        {tab === 'timeline' && (
          <SoundTimelineProfiler metrics={a.metrics} isListening={listening} getFrequencyData={a.getFrequencyData} />
        )}
        {tab === 'events' && (
          <EventAnomalyLog
            metrics={a.metrics}
            currentTime={a.engineState.currentTime}
            isPlaying={a.engineState.isPlaying || a.engineState.sourceType === 'mic'}
          />
        )}
      </div>
    </div>
  );
};
