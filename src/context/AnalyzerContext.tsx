import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AiNoiseDetectionResult,
  AppSettings,
  AudioEngineState,
  AudioMetrics,
  GainSettings,
  InputSettings,
  AppearanceSettings,
  NoiseBaselineProfile,
  VisualizerSettings,
} from '../types';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { useNoiseBaseline } from '../hooks/useNoiseBaseline';
import { SettingsSection, useAppSettings } from '../hooks/useAppSettings';

export interface AnalyzerContextValue {
  // persisted settings
  settings: AppSettings;
  visual: VisualizerSettings;
  updateVisual: (p: Partial<VisualizerSettings>) => void;
  updateInput: (p: Partial<InputSettings>) => void;
  updateGain: (p: Partial<GainSettings>) => void;
  updateAppearance: (p: Partial<AppearanceSettings>) => void;
  resetSection: (s: SettingsSection) => void;
  resetAll: () => void;

  // audio engine
  engineState: AudioEngineState;
  metrics: AudioMetrics;
  sampleRate: number;
  isLive: boolean;
  play: () => void;
  pause: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setEq: (bass: number, mid: number, treble: number) => void;
  setPlaybackRate: (r: number) => void;
  setPan: (p: number) => void;
  loadSampleTrack: (id: string) => Promise<void>;
  playSample: (id: string) => Promise<void>;
  loadAudioFile: (f: File) => Promise<void>;
  loadAudioFromUrl: (url: string, title?: string) => Promise<void>;
  enableMicrophone: (deviceId?: string) => Promise<void>;
  stopMicrophone: () => void;
  selectInputDevice: (deviceId: string | null) => void;
  toggleMicMonitoring: () => void;
  refreshAudioDevices: () => Promise<void>;
  getFrequencyData: () => Uint8Array;
  getTimeDomainData: () => Uint8Array;
  rangeRef: React.MutableRefObject<{ min: number; max: number }>;
  mediaStreamDestinationRef: React.MutableRefObject<MediaStreamAudioDestinationNode | null>;
  loadedFile: File | null;

  // noise baseline
  profile: NoiseBaselineProfile;
  isCalibrating: boolean;
  startCalibration: () => void;
  resetTransients: () => void;

  // AI / report
  latestAiResult: AiNoiseDetectionResult | null;
  setLatestAiResult: (r: AiNoiseDetectionResult | null) => void;
  isReportOpen: boolean;
  setReportOpen: (open: boolean) => void;
}

const Ctx = createContext<AnalyzerContextValue | null>(null);

export function useAnalyzer(): AnalyzerContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAnalyzer must be used inside <AnalyzerProvider>');
  return v;
}

export const AnalyzerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateVisual, updateInput, updateGain, updateAppearance, resetSection, resetAll } = useAppSettings();
  const engine = useAudioEngine(settings.visual, { input: settings.input, gain: settings.gain });
  const { engineState, metrics } = engine;

  const [latestAiResult, setLatestAiResult] = useState<AiNoiseDetectionResult | null>(null);
  const [isReportOpen, setReportOpen] = useState(false);

  const isLive = engineState.sourceType === 'mic' ? engineState.micActive : engineState.isPlaying;

  const { profile, isCalibrating, startCalibration, resetTransients } = useNoiseBaseline(
    engine.getFrequencyData,
    metrics,
    engineState.micActive || engineState.isPlaying
  );

  // ---- persisted wrappers around engine actions -------------------------------
  const enableMicrophone = useCallback(
    async (deviceId?: unknown) => {
      const id = typeof deviceId === 'string' ? deviceId : undefined;
      if (id) updateInput({ deviceId: id === 'default' ? null : id });
      await engine.enableMicrophone(id);
    },
    [engine.enableMicrophone, updateInput]
  );

  // Choose a capture device: remembered in settings; hot-swaps if the mic is already running
  const selectInputDevice = useCallback(
    (deviceId: string | null) => {
      updateInput({ deviceId: deviceId === 'default' ? null : deviceId });
      if (engineState.micActive) {
        engine.enableMicrophone(deviceId ?? undefined);
      } else {
        engine.setSelectedDevice(deviceId);
      }
    },
    [engine.enableMicrophone, engine.setSelectedDevice, updateInput, engineState.micActive]
  );

  const setVolume = useCallback(
    (v: number) => {
      engine.setVolume(v);
      updateGain({ outputVolume: v });
    },
    [engine.setVolume, updateGain]
  );

  const toggleMicMonitoring = useCallback(() => {
    const next = !engineState.micMonitoring;
    engine.setMicMonitoring(next);
    updateInput({ monitoring: next });
  }, [engine.setMicMonitoring, engineState.micMonitoring, updateInput]);

  // Keep engine in step with settings that can also change from elsewhere (cross-tab sync, reset)
  useEffect(() => {
    if (engineState.volume !== settings.gain.outputVolume) engine.setVolume(settings.gain.outputVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.gain.outputVolume]);
  useEffect(() => {
    engine.setMicMonitoring(settings.input.monitoring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.input.monitoring]);

  // Re-open the mic when capture constraints change so toggles apply instantly
  const procKey = `${settings.input.echoCancellation}|${settings.input.noiseSuppression}|${settings.input.autoGainControl}`;
  const lastProcKey = useRef(procKey);
  useEffect(() => {
    if (lastProcKey.current === procKey) return;
    lastProcKey.current = procKey;
    if (engineState.sourceType === 'mic' && engineState.micActive) {
      engine.enableMicrophone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procKey]);

  // Optional auto-start of the microphone on launch (off by default → no surprise permission prompt)
  const didAutoStart = useRef(false);
  useEffect(() => {
    if (didAutoStart.current) return;
    didAutoStart.current = true;
    if (settings.input.autoStart) engine.enableMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AnalyzerContextValue>(
    () => ({
      settings,
      visual: settings.visual,
      updateVisual,
      updateInput,
      updateGain,
      updateAppearance,
      resetSection,
      resetAll,
      engineState,
      metrics,
      sampleRate: engine.sampleRate,
      isLive,
      play: engine.play,
      pause: engine.pause,
      seek: engine.seek,
      setVolume,
      toggleMute: engine.toggleMute,
      setEq: engine.setEq,
      setPlaybackRate: engine.setPlaybackRate,
      setPan: engine.setPan,
      loadSampleTrack: engine.loadSampleTrack,
      playSample: engine.playSample,
      loadAudioFile: engine.loadAudioFile,
      loadAudioFromUrl: engine.loadAudioFromUrl,
      enableMicrophone,
      stopMicrophone: engine.stopMicrophone,
      selectInputDevice,
      toggleMicMonitoring,
      refreshAudioDevices: engine.refreshAudioDevices,
      getFrequencyData: engine.getFrequencyData,
      getTimeDomainData: engine.getTimeDomainData,
      rangeRef: engine.rangeRef,
      mediaStreamDestinationRef: engine.mediaStreamDestinationRef,
      loadedFile: engine.loadedFile,
      profile,
      isCalibrating,
      startCalibration,
      resetTransients,
      latestAiResult,
      setLatestAiResult,
      isReportOpen,
      setReportOpen,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, engineState, metrics, engine.sampleRate, engine.loadedFile, isLive, profile, isCalibrating, latestAiResult, isReportOpen,
     engine.play, engine.pause, engine.seek, setVolume, selectInputDevice, enableMicrophone, toggleMicMonitoring, engine.setEq, engine.loadSampleTrack, engine.playSample, engine.loadAudioFile, engine.loadAudioFromUrl]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
