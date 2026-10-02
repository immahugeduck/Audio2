import React from 'react';
import { FileBarChart } from 'lucide-react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { AiNoiseDetector } from '../components/AiNoiseDetector';
import { TranscriptionPanel } from '../components/TranscriptionPanel';
import { PageHeader, Card, Button } from '../components/ui';

export const AiView: React.FC = () => {
  const a = useAnalyzer();
  return (
    <div className="flex flex-col gap-5 animate-fadeIn">
      <PageHeader
        eyebrow="AI & Reports"
        title="Ask the sound."
        subtitle="Classify what the microphone hears, transcribe speech from the loaded media, and export a full audit."
      />
      <AiNoiseDetector
        engineState={a.engineState}
        metrics={a.metrics}
        enableMicrophone={a.enableMicrophone}
        onDetectResult={a.setLatestAiResult}
      />
      <TranscriptionPanel
        mediaStreamDestinationRef={a.mediaStreamDestinationRef}
        engineState={a.engineState}
        loadedFile={a.loadedFile}
      />
      <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent-400/10 border border-accent-400/25 text-accent-400 flex items-center justify-center">
            <FileBarChart className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold text-ink-50">Sound audit report</h3>
            <p className="text-xs text-ink-400">Spectral telemetry, noise baseline and the latest AI result as Markdown.</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => a.setReportOpen(true)} id="btn-open-report">
          <FileBarChart className="w-4 h-4" /> Export report
        </Button>
      </Card>
    </div>
  );
};
