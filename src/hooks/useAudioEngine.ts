import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngineState, AudioMetrics, VisualizerSettings, InputSettings, GainSettings, MicTrackInfo } from '../types';
import { SAMPLE_TRACKS, generateSampleAudioBuffer, calculateAudioMetrics, formatFrequency, frequencyToNote } from '../utils/audioPresets';
import { PeakFrequencyTracker, sampleNeighborhoodMagnitude } from '../utils/peakFrequencyTracker';

export interface AudioEngineOptions {
  input: InputSettings;
  gain: GainSettings;
}

const dbToLinear = (db: number) => Math.pow(10, db / 20);

/** Set the analyser dB window safely (the setters throw while min >= max mid-update). */
function setAnalyserRange(an: AnalyserNode, min: number, max: number) {
  try {
    an.minDecibels = min;
    an.maxDecibels = max;
  } catch {
    try {
      an.maxDecibels = max;
      an.minDecibels = min;
    } catch {
      /* ignore invalid window */
    }
  }
}

/** Speaker level for the current state: mic is silent unless monitoring (feedback guard). */
function computeOutputGain(st: Pick<AudioEngineState, 'sourceType' | 'micMonitoring' | 'isMuted' | 'volume'>): number {
  if (st.isMuted) return 0;
  if (st.sourceType === 'mic' && !st.micMonitoring) return 0;
  return st.volume;
}

export function useAudioEngine(settings: VisualizerSettings, options: AudioEngineOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Audio state
  const [engineState, setEngineState] = useState<AudioEngineState>({
    sourceType: 'sample',
    isPlaying: false,
    isPaused: false,
    duration: 30,
    currentTime: 0,
    volume: options.gain.outputVolume,
    isMuted: false,
    bassGain: 0,
    midGain: 0,
    trebleGain: 0,
    playbackRate: 1.0,
    pan: 0,
    fileName: null,
    activeSampleId: 'synthwave',
    micActive: false,
    micError: null,
    micMonitoring: options.input.monitoring, // Default false: analyze mic audio without replaying to speakers
    audioInputDevices: [],
    selectedDeviceId: options.input.deviceId,
    isBluetoothConnected: false,
    bluetoothDeviceName: null,
    phoneMicDeviceName: null,
    micInfo: null,
  });

  const [loadedFile, setLoadedFile] = useState<File | null>(null);

  const [metrics, setMetrics] = useState<AudioMetrics>({
    peakFrequencyHz: 0,
    peakFrequencyFormatted: '0.0 Hz',
    peakNoteName: '---',
    prominenceDb: -100,
    spectralCentroidHz: 0,
    rmsDb: -100,
    peakDb: -100,
    crestFactorDb: 0,
    subBass: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    fps: 60,
  });

  const [sampleRate, setSampleRate] = useState(44100);

  // Web Audio Node Refs
  const engineStateRef = useRef(engineState);
  engineStateRef.current = engineState;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const inputGainRef = useRef<GainNode | null>(null);
  // Effective analyser dB window (differs from settings while auto-range is on)
  const rangeRef = useRef({ min: settings.minDecibels, max: settings.maxDecibels });
  const autoMaxRef = useRef(settings.maxDecibels);
  const floatDataRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const mediaStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Buffer and stream refs
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const bufferSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Playback position state tracking
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Data arrays
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Temporal peak-frequency lock so steady tones don't flash off the readout
  const peakTrackerRef = useRef(new PeakFrequencyTracker());

  // Initialize Audio Context and Audio Graph
  const initAudioGraph = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      setSampleRate(ctx.sampleRate);

      // Create Analyser Node
      const analyser = ctx.createAnalyser();
      analyser.fftSize = settingsRef.current.fftSize;
      analyser.smoothingTimeConstant = settingsRef.current.smoothing;
      analyser.minDecibels = settingsRef.current.minDecibels;
      analyser.maxDecibels = settingsRef.current.maxDecibels;
      analyserRef.current = analyser;

      // Equalizer nodes
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 250;
      bassFilter.gain.value = engineStateRef.current.bassGain;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1.0;
      midFilter.gain.value = engineStateRef.current.midGain;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 4000;
      trebleFilter.gain.value = engineStateRef.current.trebleGain;

      // Panner Node
      const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panner) panner.pan.value = engineStateRef.current.pan;

      // Input gain: the first node every source (mic, file, sample, url) feeds,
      // so the analyser, EQ and meters all see the boosted/attenuated signal.
      const inputGain = ctx.createGain();
      inputGain.gain.value = dbToLinear(optionsRef.current.gain.inputGainDb);
      inputGain.connect(bassFilter);
      inputGainRef.current = inputGain;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = computeOutputGain(engineStateRef.current);

      const mediaStreamDestination = ctx.createMediaStreamDestination();
      masterGain.connect(mediaStreamDestination);

      // Chain: Source -> InputGain -> Bass -> Mid -> Treble -> (Panner) -> Analyser -> Master Gain -> Destination
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);

      let lastNode: AudioNode = trebleFilter;
      if (panner) {
        lastNode.connect(panner);
        lastNode = panner;
      }

      lastNode.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);

      bassFilterRef.current = bassFilter;
      midFilterRef.current = midFilter;
      trebleFilterRef.current = trebleFilter;
      if (panner) pannerRef.current = panner;
      masterGainRef.current = masterGain;
      mediaStreamDestinationRef.current = mediaStreamDestination;

      // Initialize byte arrays
      const bufferLength = analyser.frequencyBinCount;
      frequencyDataRef.current = new Uint8Array(bufferLength);
      timeDataRef.current = new Uint8Array(bufferLength);
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // Sync Analyser Settings
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = settings.fftSize;
      analyserRef.current.smoothingTimeConstant = settings.smoothing;
      // (Re)set the dB window; auto-range then slides it from the metrics loop.
      setAnalyserRange(analyserRef.current, settings.minDecibels, settings.maxDecibels);
      autoMaxRef.current = settings.maxDecibels;
      rangeRef.current = { min: settings.minDecibels, max: settings.maxDecibels };

      const bufferLength = analyserRef.current.frequencyBinCount;
      frequencyDataRef.current = new Uint8Array(bufferLength);
      timeDataRef.current = new Uint8Array(bufferLength);
      floatDataRef.current = new Float32Array(bufferLength);
    }
  }, [settings.fftSize, settings.smoothing, settings.minDecibels, settings.maxDecibels, settings.autoRange]);

  // Clean up source node
  const stopSourceNode = useCallback(() => {
    if (bufferSourceRef.current) {
      try {
        bufferSourceRef.current.stop();
        bufferSourceRef.current.disconnect();
      } catch {
        // Source might already be stopped
      }
      bufferSourceRef.current = null;
    }

    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect();
      } catch {
        // Disconnect if active
      }
      micSourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Clear peak lock so a new source/tone starts fresh
    peakTrackerRef.current.reset();
  }, []);

  // Internal function to play buffer from position
  const playBufferFrom = useCallback(
    (offsetSec: number) => {
      initAudioGraph();
      const ctx = audioCtxRef.current;
      const inputGain = inputGainRef.current;
      if (!ctx || !inputGain || !audioBufferRef.current) return;

      stopSourceNode();

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.playbackRate.value = engineState.playbackRate;
      source.connect(inputGain);

      const duration = audioBufferRef.current.duration;
      const startOffset = Math.max(0, Math.min(offsetSec, duration));

      source.start(0, startOffset);
      bufferSourceRef.current = source;
      startTimeRef.current = ctx.currentTime - startOffset / engineState.playbackRate;

      source.onended = () => {
        // When audio natural ends
        const currentCtx = audioCtxRef.current;
        if (currentCtx && bufferSourceRef.current === source) {
          const played = (currentCtx.currentTime - startTimeRef.current) * engineState.playbackRate;
          if (played >= duration - 0.2) {
            setEngineState((prev) => ({
              ...prev,
              isPlaying: false,
              isPaused: false,
              currentTime: 0,
            }));
            pausedTimeRef.current = 0;
          }
        }
      };

      setEngineState((prev) => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        duration,
      }));
    },
    [initAudioGraph, stopSourceNode, engineState.playbackRate]
  );

  // Load procedural sample track
  const loadSampleTrack = useCallback(
    async (trackId: string) => {
      initAudioGraph();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      stopSourceNode();

      const track = SAMPLE_TRACKS.find((t) => t.id === trackId) || SAMPLE_TRACKS[0];
      const buffer = await generateSampleAudioBuffer(ctx, track.generatorType, 30);
      audioBufferRef.current = buffer;
      pausedTimeRef.current = 0;
      setLoadedFile(null);

      setEngineState((prev) => ({
        ...prev,
        sourceType: 'sample',
        activeSampleId: track.id,
        fileName: null,
        duration: buffer.duration,
        currentTime: 0,
        isPlaying: false,
        isPaused: false,
        micActive: false,
        micInfo: null,
      }));
    },
    [initAudioGraph, stopSourceNode]
  );

  // Load uploaded Audio File
  const loadAudioFile = useCallback(
    async (file: File) => {
      initAudioGraph();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      stopSourceNode();

      try {
        const arrayBuffer = await file.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedBuffer;
        pausedTimeRef.current = 0;
        setLoadedFile(file);

        setEngineState((prev) => ({
          ...prev,
          sourceType: 'file',
          fileName: file.name,
          duration: decodedBuffer.duration,
          currentTime: 0,
          isPlaying: false,
          isPaused: false,
          micActive: false,
          micInfo: null,
        }));

        // Auto play on upload
        setTimeout(() => playBufferFrom(0), 100);
      } catch (err) {
        console.error('Failed to decode audio file', err);
      }
    },
    [initAudioGraph, stopSourceNode, playBufferFrom]
  );

  // Load audio from direct URL with CORS proxy fallback
  const loadAudioFromUrl = useCallback(
    async (url: string, title?: string) => {
      initAudioGraph();
      const ctx = audioCtxRef.current;
      if (!ctx) return;

      stopSourceNode();

      setEngineState((prev) => ({
        ...prev,
        sourceType: 'url',
        fileName: title || url,
        activeUrl: url,
        urlLoading: true,
        urlError: null,
      }));

      const tryDecodeAndPlay = async (arrayBuffer: ArrayBuffer, streamTitle: string) => {
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decodedBuffer;
        pausedTimeRef.current = 0;
        setLoadedFile(null);

        setEngineState((prev) => ({
          ...prev,
          sourceType: 'url',
          fileName: streamTitle,
          activeUrl: url,
          duration: decodedBuffer.duration,
          currentTime: 0,
          isPlaying: false,
          isPaused: false,
          micActive: false,
          micInfo: null,
          urlLoading: false,
          urlError: null,
        }));

        setTimeout(() => playBufferFrom(0), 100);
      };

      try {
        // Attempt 1: Direct Fetch
        try {
          const response = await fetch(url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            await tryDecodeAndPlay(arrayBuffer, title || url.split('/').pop()?.split('?')[0] || 'Audio Stream');
            return;
          }
        } catch (directErr) {
          console.warn('Direct fetch failed (CORS restricted), trying CORS Proxy 1...', directErr);
        }

        // Attempt 2: AllOrigins CORS Proxy
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            await tryDecodeAndPlay(arrayBuffer, (title || 'Audio Stream') + ' (CORS Bypassed)');
            return;
          }
        } catch (proxy1Err) {
          console.warn('CORS Proxy 1 failed, trying CorsProxy.io...', proxy1Err);
        }

        // Attempt 3: CorsProxy.io
        try {
          const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl2);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            await tryDecodeAndPlay(arrayBuffer, (title || 'Audio Stream') + ' (CORS Bypassed)');
            return;
          }
        } catch (proxy2Err) {
          console.warn('CorsProxy.io failed', proxy2Err);
        }

        throw new Error('CORS Policy: Remote server blocked direct audio array buffer extraction.');
      } catch (err: any) {
        console.error('Failed to load audio from URL:', err);
        setEngineState((prev) => ({
          ...prev,
          urlLoading: false,
          urlError: 'CORS Restriction: The target URL server blocks direct cross-origin browser audio fetching. Try using YouTube links or one of our verified stream presets.',
        }));
      }
    },
    [initAudioGraph, stopSourceNode, playBufferFrom]
  );

  // Enumerate audio input devices and recognize Bluetooth vs Phone Microphone
  const refreshAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter((d) => d.kind === 'audioinput');

      const mappedDevices = inputDevices.map((d, index) => {
        const labelLower = (d.label || '').toLowerCase();
        const isBluetooth = 
          labelLower.includes('bluetooth') || 
          labelLower.includes('airpods') || 
          labelLower.includes('headset') || 
          labelLower.includes('hands-free') || 
          labelLower.includes('wireless') ||
          labelLower.includes('buds') ||
          labelLower.includes('headphones');

        const isPhoneMic = !isBluetooth && (
          labelLower.includes('built-in') || 
          labelLower.includes('phone') || 
          labelLower.includes('internal') || 
          labelLower.includes('microphone') ||
          d.deviceId === 'default' ||
          index === 0
        );

        let formattedLabel = d.label || `Microphone ${index + 1}`;
        if (isPhoneMic && !formattedLabel.toLowerCase().includes('built-in')) {
          formattedLabel = `Phone Mic (${formattedLabel})`;
        } else if (isBluetooth && !formattedLabel.toLowerCase().includes('bluetooth')) {
          formattedLabel = `Bluetooth (${formattedLabel})`;
        }

        return {
          deviceId: d.deviceId,
          label: formattedLabel,
          isBluetooth,
          isPhoneMic,
        };
      });

      const bluetoothDevice = mappedDevices.find((d) => d.isBluetooth);
      const phoneMicDevice = mappedDevices.find((d) => d.isPhoneMic) || mappedDevices[0] || null;

      setEngineState((prev) => ({
        ...prev,
        audioInputDevices: mappedDevices,
        isBluetoothConnected: !!bluetoothDevice,
        bluetoothDeviceName: bluetoothDevice ? bluetoothDevice.label : null,
        phoneMicDeviceName: phoneMicDevice ? phoneMicDevice.label : 'Phone Mic (Built-in)',
        selectedDeviceId: prev.selectedDeviceId || (phoneMicDevice ? phoneMicDevice.deviceId : null),
      }));
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, []);

  useEffect(() => {
    refreshAudioDevices();
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
      };
    }
  }, [refreshAudioDevices]);

  // Enable Microphone Input.
  // Capture constraints come from the persisted Input settings (all browser voice
  // processing defaults to OFF so the spectrum reflects the raw signal).
  const enableMicrophone = useCallback(async (targetDeviceId?: unknown) => {
    initAudioGraph();
    const ctx = audioCtxRef.current;
    const inputGain = inputGainRef.current;
    if (!ctx || !inputGain) return;

    stopSourceNode();
    setLoadedFile(null);

    // Guard: onClick={enableMicrophone} passes a click event, not a device id.
    const requested = typeof targetDeviceId === 'string' ? targetDeviceId : undefined;
    const deviceToUse = requested || engineStateRef.current.selectedDeviceId;
    const { echoCancellation, noiseSuppression, autoGainControl } = optionsRef.current.input;
    const processing = { echoCancellation, noiseSuppression, autoGainControl };

    try {
      let stream: MediaStream;
      try {
        const audioConstraints: MediaTrackConstraints =
          deviceToUse && deviceToUse !== 'default'
            ? { deviceId: { exact: deviceToUse }, ...processing }
            : { ...processing };
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (exactErr) {
        console.warn('Exact device constraint failed, falling back to general audio request', exactErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: { ...processing } });
      }

      mediaStreamRef.current = stream;
      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(inputGain);
      micSourceRef.current = micSource;

      const track = stream.getAudioTracks()[0];
      let micInfo: MicTrackInfo | null = null;
      let activeDeviceId: string | null = null;
      if (track) {
        const ts = track.getSettings();
        activeDeviceId = ts.deviceId ?? null;
        micInfo = {
          label: track.label || 'Microphone',
          channelCount: ts.channelCount ?? null,
          sampleRate: ts.sampleRate ?? null,
          echoCancellation: ts.echoCancellation ?? null,
          noiseSuppression: ts.noiseSuppression ?? null,
          autoGainControl: ts.autoGainControl ?? null,
        };
        // Device unplugged / permission revoked
        track.addEventListener('ended', () => {
          if (mediaStreamRef.current === stream) {
            mediaStreamRef.current = null;
            setEngineState((prev) =>
              prev.sourceType === 'mic'
                ? { ...prev, micActive: false, isPlaying: false, isPaused: true, micInfo: null, micError: 'Input device disconnected.' }
                : prev
            );
          }
        });
      }

      // Refresh labels after permission grant
      refreshAudioDevices();

      setEngineState((prev) => ({
        ...prev,
        sourceType: 'mic',
        isPlaying: true,
        isPaused: false,
        micActive: true,
        micError: null,
        currentTime: 0,
        duration: 0,
        micInfo,
        selectedDeviceId: deviceToUse || activeDeviceId || prev.selectedDeviceId,
      }));
    } catch (err) {
      console.error('Microphone access denied or error:', err);
      setEngineState((prev) => ({
        ...prev,
        micError: 'Microphone permission denied or unavailable.',
        micActive: false,
        micInfo: null,
      }));
    }
  }, [initAudioGraph, stopSourceNode, refreshAudioDevices]);

  // Stop capturing (releases the mic so the browser's recording indicator goes off)
  const stopMicrophone = useCallback(() => {
    stopSourceNode();
    setEngineState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
      micActive: false,
      micInfo: null,
    }));
  }, [stopSourceNode]);

  // Load a procedural sample and start it immediately (no stale-closure source check)
  const playSample = useCallback(
    async (trackId: string) => {
      await loadSampleTrack(trackId);
      playBufferFrom(0);
    },
    [loadSampleTrack, playBufferFrom]
  );

  // Audio Control Methods
  const play = useCallback(() => {
    if (engineState.sourceType === 'mic') {
      enableMicrophone();
      return;
    }

    if (!audioBufferRef.current) {
      loadSampleTrack(engineState.activeSampleId).then(() => {
        playBufferFrom(pausedTimeRef.current);
      });
      return;
    }

    playBufferFrom(pausedTimeRef.current);
  }, [engineState.sourceType, engineState.activeSampleId, enableMicrophone, loadSampleTrack, playBufferFrom]);

  const pause = useCallback(() => {
    if (engineState.sourceType === 'mic') {
      stopMicrophone();
      return;
    }

    if (audioCtxRef.current && engineState.isPlaying) {
      const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * engineState.playbackRate;
      pausedTimeRef.current = Math.min(elapsed, engineState.duration);
      stopSourceNode();
      setEngineState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: true,
        currentTime: pausedTimeRef.current,
      }));
    }
  }, [engineState.sourceType, engineState.isPlaying, engineState.playbackRate, engineState.duration, stopSourceNode, stopMicrophone]);

  const seek = useCallback(
    (timeSeconds: number) => {
      if (engineState.sourceType === 'mic') return;

      const clampedTime = Math.max(0, Math.min(timeSeconds, engineState.duration));
      pausedTimeRef.current = clampedTime;

      if (engineState.isPlaying) {
        playBufferFrom(clampedTime);
      } else {
        setEngineState((prev) => ({ ...prev, currentTime: clampedTime }));
      }
    },
    [engineState.sourceType, engineState.duration, engineState.isPlaying, playBufferFrom]
  );

  const setVolume = useCallback((volume: number) => {
    setEngineState((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const toggleMute = useCallback(() => {
    setEngineState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleMicMonitoring = useCallback(() => {
    setEngineState((prev) => ({ ...prev, micMonitoring: !prev.micMonitoring }));
  }, []);

  const setSelectedDevice = useCallback((deviceId: string | null) => {
    setEngineState((prev) => (prev.selectedDeviceId === deviceId ? prev : { ...prev, selectedDeviceId: deviceId }));
  }, []);

  const setMicMonitoring = useCallback((on: boolean) => {
    setEngineState((prev) => (prev.micMonitoring === on ? prev : { ...prev, micMonitoring: on }));
  }, []);

  // Single source of truth for the speaker level (see computeOutputGain). Runs after
  // every relevant state change so switching mic → file never leaves output silenced.
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(computeOutputGain(engineState), ctx.currentTime, 0.015);
  }, [engineState.sourceType, engineState.micMonitoring, engineState.isMuted, engineState.volume]);

  // Input gain (dB) → GainNode, applies to every source type
  const inputGainDb = options.gain.inputGainDb;
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const node = inputGainRef.current;
    if (!ctx || !node) return;
    node.gain.setTargetAtTime(dbToLinear(inputGainDb), ctx.currentTime, 0.02);
  }, [inputGainDb]);

  const setEq = useCallback((bassGain: number, midGain: number, trebleGain: number) => {
    setEngineState((prev) => {
      if (bassFilterRef.current) bassFilterRef.current.gain.value = bassGain;
      if (midFilterRef.current) midFilterRef.current.gain.value = midGain;
      if (trebleFilterRef.current) trebleFilterRef.current.gain.value = trebleGain;
      return { ...prev, bassGain, midGain, trebleGain };
    });
  }, []);

  const setPlaybackRate = useCallback(
    (rate: number) => {
      setEngineState((prev) => {
        if (bufferSourceRef.current) {
          bufferSourceRef.current.playbackRate.value = rate;
        }
        return { ...prev, playbackRate: rate };
      });
    },
    []
  );

  const setPan = useCallback((pan: number) => {
    setEngineState((prev) => {
      if (pannerRef.current) {
        pannerRef.current.pan.value = pan;
      }
      return { ...prev, pan };
    });
  }, []);

  // Update real-time metrics and playback playhead position (throttled to ~100ms).
  //
  // PERF NOTE: this used to wrap every setState call here in `setTimeout(fn, 0)`
  // with a comment about "avoiding React scheduler thrashing." That actually had
  // the opposite effect: each setTimeout(...,0) fires as its own separate macrotask,
  // so React could NOT batch them together - every tick was 2-3 uncoordinated
  // renders (fps, currentTime, metrics) instead of one. Calling setState directly
  // inside this rAF callback lets React's automatic batching do its job: all the
  // state updates from one tick collapse into a single render.
  useEffect(() => {
    let lastTime = performance.now();
    let lastStateUpdateTime = 0;
    let frameCount = 0;

    const updateLoop = () => {
      const now = performance.now();
      frameCount++;

      // FPS calculation every 1 second
      if (now - lastTime >= 1000) {
        const calculatedFps = Math.round((frameCount * 1000) / (now - lastTime));
        lastTime = now;
        frameCount = 0;
        setMetrics((prev) => ({ ...prev, fps: calculatedFps }));
      }

      // Throttle React state updates to every 100ms (10 FPS) to avoid re-rendering on every animation frame
      if (now - lastStateUpdateTime >= 100) {
        lastStateUpdateTime = now;

        const currentEngine = engineStateRef.current;
        const currentSettings = settingsRef.current;

        // Update current time playhead
        if (currentEngine.isPlaying && currentEngine.sourceType !== 'mic' && audioCtxRef.current) {
          const elapsed = (audioCtxRef.current.currentTime - startTimeRef.current) * currentEngine.playbackRate;
          if (elapsed <= currentEngine.duration) {
            setEngineState((prev) => ({ ...prev, currentTime: elapsed }));
          }
        }

        // Auto-range: slide the analyser's dB window so the loudest bin sits ~8 dB
        // below the top. Fast attack, slow release, window width stays as configured.
        if (currentSettings.autoRange && analyserRef.current && floatDataRef.current && (currentEngine.isPlaying || currentEngine.micActive)) {
          const an = analyserRef.current;
          if (floatDataRef.current.length !== an.frequencyBinCount) {
            floatDataRef.current = new Float32Array(an.frequencyBinCount);
          }
          an.getFloatFrequencyData(floatDataRef.current);
          let peakDb = -Infinity;
          for (let i = 1; i < floatDataRef.current.length; i++) {
            if (floatDataRef.current[i] > peakDb) peakDb = floatDataRef.current[i];
          }
          if (Number.isFinite(peakDb) && peakDb > -110) {
            const span = currentSettings.maxDecibels - currentSettings.minDecibels;
            const target = Math.max(currentSettings.minDecibels + span * 0.5, Math.min(0, peakDb + 8));
            const cur = autoMaxRef.current;
            const next = cur + (target - cur) * (target > cur ? 0.5 : 0.04);
            autoMaxRef.current = next;
            const newMin = Math.max(-140, next - span);
            if (Math.abs(an.maxDecibels - next) > 0.25) {
              setAnalyserRange(an, newMin, next);
              rangeRef.current = { min: newMin, max: next };
            }
          }
        }

        // Extract Audio metrics for UI text & gauges
        if (analyserRef.current && frequencyDataRef.current) {
          analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
          const sampleRate = audioCtxRef.current ? audioCtxRef.current.sampleRate : 44100;
          const tracker = peakTrackerRef.current;
          const preferredHz = tracker.lockedFrequencyHz || undefined;
          const calculated = calculateAudioMetrics(
            frequencyDataRef.current,
            sampleRate,
            currentSettings.fftSize,
            preferredHz ? { preferredHz } : undefined
          );

          const neighborhoodMag = preferredHz
            ? sampleNeighborhoodMagnitude(frequencyDataRef.current, sampleRate, preferredHz, 3)
            : 0;

          const tracked = tracker.update({
            rawHz: calculated.peakFrequencyHz,
            rawMagnitude: calculated.peakMagnitude,
            lockedNeighborhoodMagnitude: neighborhoodMag,
            now,
          });

          const stableHz = tracked.peakFrequencyHz;
          const peakFrequencyFormatted = formatFrequency(stableHz);
          const peakNoteName = frequencyToNote(stableHz).formatted;

          setMetrics((prev) => ({
            ...prev,
            peakFrequencyHz: stableHz,
            peakFrequencyFormatted,
            peakNoteName,
            prominenceDb: calculated.prominenceDb,
            spectralCentroidHz: calculated.spectralCentroidHz,
            rmsDb: calculated.rmsDb,
            peakDb: calculated.peakDb,
            crestFactorDb: calculated.crestFactorDb,
            subBass: calculated.subBass,
            bass: calculated.bass,
            mid: calculated.mid,
            treble: calculated.treble,
          }));
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Initial auto load default sample
  useEffect(() => {
    loadSampleTrack('synthwave');
  }, [loadSampleTrack]);

  // Helper getters for canvas
  const getFrequencyData = useCallback(() => {
    if (analyserRef.current && frequencyDataRef.current) {
      analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
      return frequencyDataRef.current;
    }
    return new Uint8Array(0);
  }, []);

  const getTimeDomainData = useCallback(() => {
    if (analyserRef.current && timeDataRef.current) {
      analyserRef.current.getByteTimeDomainData(timeDataRef.current);
      return timeDataRef.current;
    }
    return new Uint8Array(0);
  }, []);

  return {
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
    stopMicrophone,
    playSample,
    setMicMonitoring,
    setSelectedDevice,
    refreshAudioDevices,
    rangeRef,
  };
}
