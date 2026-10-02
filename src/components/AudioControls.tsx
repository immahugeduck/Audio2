import React from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, Music, Upload, RotateCcw, Radio, Youtube, Headphones, Smartphone, Check } from 'lucide-react';
import { AudioEngineState, AudioSourceType } from '../types';
import { SAMPLE_TRACKS } from '../utils/audioPresets';

interface AudioControlsProps {
  engineState: AudioEngineState;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  loadSampleTrack: (trackId: string) => void;
  loadAudioFile: (file: File) => void;
  enableMicrophone: (targetDeviceId?: string) => void;
  toggleMicMonitoring?: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  engineState,
  play,
  pause,
  seek,
  setVolume,
  toggleMute,
  loadSampleTrack,
  loadAudioFile,
  enableMicrophone,
  toggleMicMonitoring,
}) => {
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadAudioFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-ink-900/90 rounded-2xl border border-ink-800 p-4 sm:p-5 shadow-xl flex flex-col gap-4">
      {/* Top Source Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-800">
        <div className="flex items-center gap-1.5 bg-ink-950 p-1 rounded-xl border border-ink-800">
          <button
            onClick={() => loadSampleTrack(engineState.activeSampleId)}
            id="tab-source-sample"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              engineState.sourceType === 'sample'
                ? 'bg-accent-500 text-ink-950 font-semibold shadow-md'
                : 'text-ink-400 hover:text-white hover:bg-ink-800'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            Presets
          </button>

          <label
            id="tab-source-file"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              engineState.sourceType === 'file'
                ? 'bg-accent-500 text-ink-950 font-semibold shadow-md'
                : 'text-ink-400 hover:text-white hover:bg-ink-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Audio File
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            onClick={() => enableMicrophone()}
            id="tab-source-mic"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              engineState.sourceType === 'mic'
                ? 'bg-coral-400 text-ink-950 font-semibold shadow-md'
                : 'text-ink-400 hover:text-white hover:bg-ink-800'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Mic Input
          </button>
        </div>

        {/* Microphone Source Selection (Phone Mic vs Bluetooth) */}
        {engineState.sourceType === 'mic' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Switcher Buttons */}
            <div className="flex items-center gap-1 bg-ink-950 p-1 rounded-xl border border-ink-800">
              {/* Phone Mic Button */}
              <button
                onClick={() => {
                  const phoneDevice = engineState.audioInputDevices.find((d) => d.isPhoneMic);
                  enableMicrophone(phoneDevice?.deviceId);
                }}
                id="btn-select-phone-mic"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  !engineState.audioInputDevices.find((d) => d.deviceId === engineState.selectedDeviceId)?.isBluetooth
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
                title="Phone Mic (Built-in) is recommended for superior sensitivity & acoustic measurement accuracy"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phone Mic (Default)</span>
              </button>

              {/* Bluetooth Button */}
              <button
                onClick={() => {
                  const btDevice = engineState.audioInputDevices.find((d) => d.isBluetooth);
                  if (btDevice) {
                    enableMicrophone(btDevice.deviceId);
                  } else {
                    enableMicrophone(); // Refresh and attempt
                  }
                }}
                id="btn-select-bluetooth-mic"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  engineState.audioInputDevices.find((d) => d.deviceId === engineState.selectedDeviceId)?.isBluetooth
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 font-bold'
                    : engineState.isBluetoothConnected
                    ? 'text-accent-400 hover:bg-ink-800'
                    : 'text-ink-500 hover:text-ink-400'
                }`}
                title={
                  engineState.isBluetoothConnected
                    ? `Bluetooth device detected: ${engineState.bluetoothDeviceName}`
                    : 'Connect Bluetooth headphones or headset to switch input'
                }
              >
                <Headphones className={`w-3.5 h-3.5 ${engineState.isBluetoothConnected ? 'text-accent-400' : 'text-ink-500'}`} />
                <span>
                  Bluetooth
                  {engineState.isBluetoothConnected && (
                    <span className="ml-1 text-[9px] bg-accent-500/30 text-accent-300 px-1 rounded-full uppercase font-bold">Connected</span>
                  )}
                </span>
              </button>
            </div>

            {/* Dropdown for All Detected Hardware Devices */}
            {engineState.audioInputDevices.length > 1 && (
              <select
                value={engineState.selectedDeviceId || ''}
                onChange={(e) => enableMicrophone(e.target.value)}
                id="select-audio-input-device"
                className="bg-ink-950 border border-ink-800 text-xs text-ink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-rose-500 cursor-pointer max-w-[180px] truncate"
              >
                {engineState.audioInputDevices.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Sample Selection Dropdown */}
        {engineState.sourceType === 'sample' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400">Track:</span>
            <select
              value={engineState.activeSampleId}
              onChange={(e) => loadSampleTrack(e.target.value)}
              id="select-sample-track"
              className="bg-ink-950 border border-ink-800 text-xs text-ink-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-accent-500 cursor-pointer"
            >
              {SAMPLE_TRACKS.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.title} ({track.genre})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Audio File Name Indicator */}
        {engineState.sourceType === 'file' && (
          <div className="text-xs text-accent-400 font-medium truncate max-w-[200px]">
            📁 {engineState.fileName || 'Uploaded Audio'}
          </div>
        )}

        {/* URL Stream Indicator */}
        {engineState.sourceType === 'url' && (
          <div className="text-xs text-red-400 font-medium truncate max-w-[260px] flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/30">
            <Youtube className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span className="truncate">URL: {engineState.fileName || 'Live Audio Stream'}</span>
          </div>
        )}

        {/* Mic Speaker Output Toggle */}
        {engineState.sourceType === 'mic' && toggleMicMonitoring && (
          <button
            onClick={toggleMicMonitoring}
            id="btn-toggle-mic-monitoring"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              engineState.micMonitoring
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold shadow-sm'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:border-emerald-500'
            }`}
            title={engineState.micMonitoring ? 'Speaker Output Enabled (Caution: may cause acoustic feedback)' : 'Analyze Only (Speaker Output Muted to Prevent Feedback)'}
          >
            <Radio className="w-3.5 h-3.5" />
            {engineState.micMonitoring ? 'Speaker Replay: ON' : 'Speaker Replay: OFF (Analyze Only)'}
          </button>
        )}

        {/* Mic Error Banner */}
        {engineState.micError && (
          <div className="text-xs text-rose-400 font-medium">
            ⚠️ {engineState.micError}
          </div>
        )}
      </div>

      {/* Main Playback Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Play/Pause Main Button */}
        <button
          onClick={engineState.isPlaying ? pause : play}
          id="btn-play-pause"
          className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
            engineState.isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-ink-950'
              : 'bg-accent-500 hover:bg-accent-400 text-ink-950'
          }`}
        >
          {engineState.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        {/* Timeline Seekbar */}
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="text-xs font-mono text-ink-400 min-w-[42px]">
            {formatTime(engineState.currentTime)}
          </span>

          <input
            type="range"
            min={0}
            max={engineState.duration || 100}
            step={0.1}
            value={engineState.currentTime}
            disabled={engineState.sourceType === 'mic'}
            onChange={(e) => seek(parseFloat(e.target.value))}
            id="input-seek-bar"
            className="w-full h-2 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-accent-400 disabled:opacity-40"
          />

          <span className="text-xs font-mono text-ink-400 min-w-[42px]">
            {engineState.sourceType === 'mic' ? 'LIVE' : formatTime(engineState.duration)}
          </span>
        </div>

        {/* Volume & Mute */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <button
            onClick={toggleMute}
            id="btn-toggle-mute"
            className="p-2 text-ink-400 hover:text-white transition-colors cursor-pointer"
          >
            {engineState.isMuted || engineState.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-accent-400" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={engineState.isMuted ? 0 : engineState.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            id="input-volume-slider"
            className="w-20 h-1.5 bg-ink-950 rounded-lg appearance-none cursor-pointer accent-accent-400"
          />
        </div>
      </div>
    </div>
  );
};
