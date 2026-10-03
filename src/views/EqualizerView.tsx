import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { EqualizerPanel } from '../components/EqualizerPanel';
import { PageHeader } from '../components/ui';
import { SourceBanner } from '../components/SourceBanner';
import { hrefFor } from '../utils/routes';

export const EqualizerView: React.FC = () => {
  const a = useAnalyzer();
  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="Equalizer"
        title="Shape the signal."
        subtitle="Bass, mid and treble bands plus playback speed and stereo pan. The graph above reflects your changes live."
        actions={
          <a
            href={hrefFor('settings', 'gain')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-200 bg-ink-800 border border-ink-700 hover:bg-ink-700 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-accent-400" /> Input &amp; output gain
          </a>
        }
      />
      <SourceBanner message="The equalizer shapes whatever is playing. Start a track or the microphone to hear it." />
      <Stage variant="compact" />
      <EqualizerPanel
        engineState={a.engineState}
        setEq={a.setEq}
        setPlaybackRate={a.setPlaybackRate}
        setPan={a.setPan}
      />
    </div>
  );
};
