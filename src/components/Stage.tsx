import React from 'react';
import { Mic, Play, Pause, AudioWaveform } from 'lucide-react';
import { CanvasVisualizer } from './CanvasVisualizer';
import { EmptyState, Button } from './ui';
import { useAnalyzer } from '../context/AnalyzerContext';

interface StageProps {
  variant?: 'hero' | 'compact';
  className?: string;
}

/** The shared spectrum canvas, wired to the analyzer context. */
export const Stage: React.FC<StageProps> = ({ variant = 'hero', className = '' }) => {
  const {
    visual,
    metrics,
    engineState,
    sampleRate,
    getFrequencyData,
    getTimeDomainData,
    rangeRef,
    enableMicrophone,
    loadSampleTrack,
    play,
  } = useAnalyzer();

  const startSample = async () => {
    if (engineState.sourceType !== 'sample' && engineState.sourceType !== 'file' && engineState.sourceType !== 'url') {
      await loadSampleTrack(engineState.activeSampleId || 'synthwave');
    }
    play();
  };

  const paused = engineState.isPaused && engineState.sourceType !== 'mic';

  const overlay =
    variant === 'hero' ? (
      <EmptyState
        icon={paused ? <Pause className="w-6 h-6" /> : <AudioWaveform className="w-6 h-6" />}
        title={paused ? 'Paused' : 'Ready when you are'}
        body={
          paused
            ? 'Playback is paused. Resume to see the spectrum move.'
            : 'Start your microphone to analyze the room, or play a demo track to see Auralis in motion.'
        }
      >
        {!paused && (
          <Button variant="primary" onClick={() => enableMicrophone()} id="btn-stage-start-mic">
            <Mic className="w-4 h-4" /> Start microphone
          </Button>
        )}
        <Button variant="secondary" onClick={paused ? play : startSample} id="btn-stage-play-sample">
          <Play className="w-4 h-4" /> {paused ? 'Resume' : 'Play demo track'}
        </Button>
      </EmptyState>
    ) : (
      <div className="flex items-center gap-2 text-sm text-ink-300">
        <span className="text-ink-400">No signal.</span>
        <Button size="sm" variant="primary" onClick={() => enableMicrophone()}>
          <Mic className="w-3.5 h-3.5" /> Mic
        </Button>
        <Button size="sm" variant="secondary" onClick={paused ? play : startSample}>
          <Play className="w-3.5 h-3.5" /> {paused ? 'Resume' : 'Demo'}
        </Button>
      </div>
    );

  return (
    <div className={`rounded-2xl stage-frame ${className}`}>
      <CanvasVisualizer
        settings={visual}
        getFrequencyData={getFrequencyData}
        getTimeDomainData={getTimeDomainData}
        metrics={metrics}
        isPlaying={engineState.isPlaying}
        variant={variant}
        rangeRef={rangeRef}
        overlay={overlay}
        sampleRate={sampleRate}
      />
    </div>
  );
};
