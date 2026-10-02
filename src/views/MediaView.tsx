import React from 'react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { UrlAudioAnalyzer } from '../components/UrlAudioAnalyzer';
import { AudioControls } from '../components/AudioControls';
import { PageHeader } from '../components/ui';

export const MediaView: React.FC = () => {
  const a = useAnalyzer();
  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="Media"
        title="Bring your own sound."
        subtitle="Drop a file anywhere, paste a stream URL, or pick a built-in sample — then play, scrub and watch it unfold."
      />
      <Stage variant="compact" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <AudioControls
          engineState={a.engineState}
          play={a.play}
          pause={a.pause}
          seek={a.seek}
          setVolume={a.setVolume}
          toggleMute={a.toggleMute}
          loadSampleTrack={a.loadSampleTrack}
          loadAudioFile={a.loadAudioFile}
          enableMicrophone={a.enableMicrophone}
          toggleMicMonitoring={a.toggleMicMonitoring}
        />
        <UrlAudioAnalyzer
          engineState={a.engineState}
          loadAudioFromUrl={a.loadAudioFromUrl}
          enableMicrophone={a.enableMicrophone}
        />
      </div>
    </div>
  );
};
