import React from 'react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { HarmonicTuner } from '../components/HarmonicTuner';
import { PageHeader } from '../components/ui';
import { SourceBanner } from '../components/SourceBanner';

export const TunerView: React.FC = () => {
  const a = useAnalyzer();
  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="Tuner & Harmonics"
        title="Find the pitch."
        subtitle="A stable peak-frequency lock, chromatic note and cents offset, with the harmonic series laid out."
      />
      <SourceBanner message="Play a sustained note or start the microphone to read pitch and harmonics." />
      <Stage variant="compact" />
      <HarmonicTuner metrics={a.metrics} getFrequencyData={a.getFrequencyData} sampleRate={a.sampleRate} />
    </div>
  );
};
