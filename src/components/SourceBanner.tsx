import React from 'react';
import { Mic, Play, Radio } from 'lucide-react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Button } from './ui';

/** Shown at the top of tool views that need a live signal, when there is none. */
export const SourceBanner: React.FC<{ message?: string }> = ({ message }) => {
  const { isLive, engineState, enableMicrophone, loadSampleTrack, play } = useAnalyzer();
  if (isLive) return null;

  const demo = async () => {
    if (engineState.sourceType === 'mic') await loadSampleTrack(engineState.activeSampleId || 'synthwave');
    play();
  };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border border-accent-400/25 bg-accent-400/[0.06] text-sm"
    >
      <Radio className="w-4 h-4 text-accent-400 shrink-0" />
      <span className="text-ink-200 flex-1 min-w-[200px]">
        {message ?? 'No live signal. Start the microphone or play a track to use this tool.'}
      </span>
      <Button size="sm" variant="primary" onClick={() => enableMicrophone()}>
        <Mic className="w-3.5 h-3.5" /> Start microphone
      </Button>
      <Button size="sm" variant="secondary" onClick={demo}>
        <Play className="w-3.5 h-3.5" /> Play demo
      </Button>
    </div>
  );
};
