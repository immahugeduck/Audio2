import React, { useState, useEffect, useCallback } from 'react';
import { VisualizerSettings, AiNoiseDetectionResult } from './types';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useNoiseBaseline } from './hooks/useNoiseBaseline';
import { Header } from './components/Header';
import { CanvasVisualizer } from './components/CanvasVisualizer';
import { AudioControls } from './components/AudioControls';
import { VisualizerControls } from './components/VisualizerControls';
import { ColorGradientPicker } from './components/ColorGradientPicker';
import { EqualizerPanel } from './components/EqualizerPanel';
import { AiNoiseDetector } from './components/AiNoiseDetector';
import { NoiseBaselineMonitor } from './components/NoiseBaselineMonitor';
import { AcousticGuide } from './components/AcousticGuide';
import { ReportExporter } from './components/ReportExporter';
import { AudioMeters } from './components/AudioMeters';
import { DropZone } from './components/DropZone';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { SoundTimelineProfiler } from './components/SoundTimelineProfiler';
import { AcousticRoomRt60 } from './components/AcousticRoomRt60';
import { HarmonicTuner } from './components/HarmonicTuner';
import { EventAnomalyLog } from './components/EventAnomalyLog';
import { UrlAudioAnalyzer } from './components/UrlAudioAnalyzer';
import { MicSettingsSelector } from './components/MicSettingsSelector';
import { GraphModeSwitcher } from './components/GraphModeSwitcher';
import { LiveStatStrip } from './components/LiveStatStrip';
import { Mic, Music } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: 'bars',
    fftSize: 2048,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    showHzScale: true,
    showDbGrid: true,
    showPeaks: true,
    colorPresetId: 'cyberpunk',
    customGradient: {
      start: '#00f0ff',
      middle: '#7000ff',
      end: '#ff007f',
      peak: '#ffffff',
    },
    useCustomGradient: false,
    sensitivity: 1.0,
    logScale: true,
    reactiveColors: true,
    beatPulseAnimation: false,
    fillOpacity: 0.6,
    barSpacing: 3,
    barWidthMultiplier: 1.0,
  });

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [latestAiResult, setLatestAiResult] = useState<AiNoiseDetectionResult | null>(null);

  // Tab state: 'live' (mic-driven room/acoustic tools) or 'media' (anything that
  // starts from an uploaded file or a URL: playback deck, EQ, transcription).
  const [activeTab, setActiveTab] = useState<'live' | 'media'>('live');

  const updateSettings = useCallback((partial: Partial<VisualizerSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const {
    engineState,
    metrics,
    sampleRate,
    play,
    pause,
    seek,
    setVolume,
    toggleMute,
    setEq,
    setPlaybackRate,
    setPan,
    loadSampleTrack,
    loadAudioFile,
    loadAudioFromUrl,
    enableMicrophone,
    toggleMicMonitoring,
    getFrequencyData,
    getTimeDomainData,
    mediaStreamDestinationRef,
    loadedFile,
  } = useAudioEngine(settings);

  // Long-term noise baseline profiling (calibration)
  const { profile, isCalibrating, startCalibration, resetTransients } = useNoiseBaseline(
    getFrequencyData,
    metrics,
    engineState.sourceType === 'mic' || engineState.isPlaying
  );

  // Tab switcher side effects:
  // - Switching to 'live' auto-enables the microphone (this tab is about the room).
  // - Switching to 'media' falls back to the default sample track so there's
  //   always something audible to analyze while you pick a file/URL.
  useEffect(() => {
    if (activeTab === 'live') {
      enableMicrophone();
    } else {
      loadSampleTrack('synthwave');
    }
  }, [activeTab, enableMicrophone, loadSampleTrack]);

  // A file dropped anywhere in the app (drag & drop works on both tabs) loads
  // it AND jumps to the Media tab, since that's where the playback deck,
  // equalizer, and transcription tools that make sense for a loaded file live.
  const handleFileDrop = useCallback(
    (file: File) => {
      loadAudioFile(file);
      setActiveTab('media');
    },
    [loadAudioFile]
  );

  const isLive = engineState.sourceType === 'mic' || engineState.isPlaying;

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className="min-h-screen text-slate-100 font-sans antialiased">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

          {/* Header */}
          <Header
            sourceType={engineState.sourceType}
            metrics={metrics}
            onOpenGuide={() => setIsGuideOpen(true)}
            onOpenReport={() => setIsReportOpen(true)}
          />

          {/* ============ HERO STAGE ============ */}
          {/* The spectrum analyzer is the centerpiece: a prominent graph-type
              switcher, the live canvas, and a real-time telemetry strip, all
              wrapped in a glowing neon stage. */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,224,255,0.9)] animate-pulse" />
                Live Spectrum Stage
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {settings.fftSize} bins &middot; {isLive ? 'streaming' : 'idle'}
              </span>
            </div>

            {/* Prominent graph-option switcher */}
            <GraphModeSwitcher settings={settings} updateSettings={updateSettings} />

            {/* The analyzer canvas, framed with a neon ring */}
            <div className="rounded-2xl neon-ring">
              <CanvasVisualizer
                settings={settings}
                getFrequencyData={getFrequencyData}
                getTimeDomainData={getTimeDomainData}
                metrics={metrics}
                isPlaying={engineState.isPlaying}
              />
            </div>

            {/* Real-time level & spectral telemetry */}
            <LiveStatStrip metrics={metrics} isLive={isLive} />
          </section>

          {/* Tab Bar Navigation */}
          <div className="flex glass border border-slate-800 p-1.5 rounded-2xl gap-2 shadow-lg self-center md:self-stretch">
            <button
              onClick={() => setActiveTab('live')}
              id="tab-btn-live-space"
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-gradient-to-r from-fuchsia-500/25 to-rose-500/20 border border-fuchsia-500/50 text-fuchsia-200 shadow-[0_0_16px_-4px_rgba(217,70,239,0.5)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-850'
              }`}
            >
              <Mic className={`w-4 h-4 ${activeTab === 'live' ? 'text-fuchsia-300 animate-pulse' : 'text-slate-400'}`} />
              <span>Live Acoustic Space</span>
            </button>

            <button
              onClick={() => setActiveTab('media')}
              id="tab-btn-media-analyzer"
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/20 border border-cyan-500/50 text-cyan-200 shadow-[0_0_16px_-4px_rgba(34,224,255,0.5)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-850'
              }`}
            >
              <Music className={`w-4 h-4 ${activeTab === 'media' ? 'text-cyan-300 animate-pulse' : 'text-slate-400'}`} />
              <span>File &amp; Stream Analyzer</span>
            </button>
          </div>

          {/* Responsive Dashboard Grid */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Primary Space: swaps per-tab */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {activeTab === 'live' ? (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Mic & Bluetooth device selector */}
                  <MicSettingsSelector
                    engineState={engineState}
                    enableMicrophone={enableMicrophone}
                    toggleMicMonitoring={toggleMicMonitoring}
                    metrics={metrics}
                  />

                  {/* Background noise baseline (calibration) */}
                  <NoiseBaselineMonitor
                    profile={profile}
                    metrics={metrics}
                    isCalibrating={isCalibrating}
                    startCalibration={startCalibration}
                    resetTransients={resetTransients}
                    isListening={engineState.sourceType === 'mic' || engineState.isPlaying}
                  />

                  {/* AI live mic classifier & sound guesser */}
                  <AiNoiseDetector
                    engineState={engineState}
                    metrics={metrics}
                    enableMicrophone={enableMicrophone}
                    onDetectResult={setLatestAiResult}
                  />

                  {/* Room acoustic response (RT60 decay) - needs a continuous live signal */}
                  <AcousticRoomRt60
                    metrics={metrics}
                    isListening={engineState.sourceType === 'mic' || engineState.isPlaying}
                    getFrequencyData={getFrequencyData}
                  />

                  {/* Continuous room sound timeline profiler - live-only */}
                  <SoundTimelineProfiler
                    metrics={metrics}
                    isListening={engineState.sourceType === 'mic' || engineState.isPlaying}
                    getFrequencyData={getFrequencyData}
                  />

                  {/* Live sound event & anomaly log */}
                  <EventAnomalyLog
                    metrics={metrics}
                    currentTime={engineState.currentTime}
                    isPlaying={engineState.isPlaying || engineState.sourceType === 'mic'}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-fadeIn">
                  {/* Upload a file / paste a URL to analyze */}
                  <UrlAudioAnalyzer
                    engineState={engineState}
                    loadAudioFromUrl={loadAudioFromUrl}
                    enableMicrophone={enableMicrophone}
                  />

                  {/* Playback deck (also has the file upload control) */}
                  <AudioControls
                    engineState={engineState}
                    play={play}
                    pause={pause}
                    seek={seek}
                    setVolume={setVolume}
                    toggleMute={toggleMute}
                    loadSampleTrack={loadSampleTrack}
                    loadAudioFile={loadAudioFile}
                    enableMicrophone={enableMicrophone}
                    toggleMicMonitoring={toggleMicMonitoring}
                  />

                  {/* Graphic equalizer & spatial panner */}
                  <EqualizerPanel
                    engineState={engineState}
                    setEq={setEq}
                    setPlaybackRate={setPlaybackRate}
                    setPan={setPan}
                  />

                  {/* Harmonic pitch tuner - makes most sense against a loaded track */}
                  <HarmonicTuner
                    metrics={metrics}
                    getFrequencyData={getFrequencyData}
                    sampleRate={sampleRate}
                  />

                  {/* Speech-to-text transcription of the loaded file/stream */}
                  <TranscriptionPanel
                    mediaStreamDestinationRef={mediaStreamDestinationRef}
                    engineState={engineState}
                    loadedFile={loadedFile}
                  />
                </div>
              )}
            </div>

            {/* Right Secondary Space: shared visualizer/telemetry tools, same
                on both tabs (no reason to duplicate this markup per tab - it
                just reflects whatever source is currently active). */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="glass border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
                <VisualizerControls settings={settings} updateSettings={updateSettings} />
              </div>

              <ColorGradientPicker settings={settings} updateSettings={updateSettings} />

              <AudioMeters metrics={metrics} />
            </div>

          </main>

          {/* Interactive Acoustic Diagnostic Guide Modal */}
          <AcousticGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

          {/* Exportable Sound Audit Report Modal */}
          <ReportExporter
            metrics={metrics}
            profile={profile}
            latestAiResult={latestAiResult}
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
          />

          {/* Footer */}
          <footer className="mt-2">
            <div className="neon-divider mb-4" />
            <div className="text-center text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <span className="font-display font-bold text-neon">Audio2une</span>
                &bull; Web Audio API &bull; Gemini AI Noise Classifier
              </span>
              <span className="font-semibold text-cyan-400">Premium Spectrum Lab</span>
            </div>
          </footer>

        </div>
      </div>
    </DropZone>
  );
}
