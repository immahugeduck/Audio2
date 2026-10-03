import React, { useState } from 'react';
import { Mic, MicOff, RefreshCw, Headphones, ShieldCheck, Info, Bluetooth, Laptop } from 'lucide-react';
import { useAnalyzer } from '../../context/AnalyzerContext';
import { Section, Toggle, Button } from '../../components/ui';

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl bg-ink-950/60 border border-ink-800 px-3.5 py-3">
    <div className="eyebrow !text-[9.5px] mb-1">{label}</div>
    <div className="font-mono text-sm text-ink-100 truncate">{value}</div>
  </div>
);

const flag = (v: boolean | null | undefined) => (v === null || v === undefined ? '—' : v ? 'on' : 'off');

export const InputSettings: React.FC = () => {
  const {
    settings,
    updateInput,
    engineState,
    sampleRate,
    enableMicrophone,
    stopMicrophone,
    selectInputDevice,
    refreshAudioDevices,
    toggleMicMonitoring,
  } = useAnalyzer();
  const { input } = settings;
  const [refreshing, setRefreshing] = useState(false);

  const devices = engineState.audioInputDevices;
  const labelsHidden = devices.length > 0 && devices.every((d) => !d.label || /^Microphone \d+$/.test(d.label));
  const selected = engineState.selectedDeviceId || input.deviceId || 'default';
  const activeDevice = devices.find((d) => d.deviceId === selected);
  const micOn = engineState.micActive;
  const info = engineState.micInfo;

  const refresh = async () => {
    setRefreshing(true);
    await refreshAudioDevices();
    window.setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Input source"
        description="Choose the microphone and start or stop capture."
        icon={<Mic className="w-4 h-4" />}
        action={
          micOn ? (
            <Button variant="danger" size="sm" onClick={stopMicrophone} id="btn-settings-stop-input">
              <MicOff className="w-3.5 h-3.5" /> Stop input
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => enableMicrophone()} id="btn-settings-start-input">
              <Mic className="w-3.5 h-3.5" /> Start input
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="select-mic-device" className="text-[13px] font-medium text-ink-200">
            Microphone
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                {activeDevice?.isBluetooth ? <Bluetooth className="w-4 h-4 text-accent-400" /> : <Laptop className="w-4 h-4" />}
              </span>
              <select
                id="select-mic-device"
                value={selected}
                onChange={(e) => selectInputDevice(e.target.value)}
                className="w-full appearance-none bg-ink-950 border border-ink-700 hover:border-ink-500 focus:border-accent-400 rounded-xl py-2.5 pl-10 pr-9 text-sm text-ink-100 outline-none transition-colors truncate"
              >
                {devices.length === 0 && <option value="default">System default input</option>}
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none text-xs">▾</span>
            </div>
            <Button variant="secondary" onClick={refresh} aria-label="Refresh device list" id="btn-refresh-devices">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-[11px] text-ink-500 leading-snug">
            {labelsHidden
              ? 'Device names are hidden until the browser grants microphone access — press Start input, then refresh.'
              : 'Your choice is remembered. Switching while live restarts capture on the new device.'}
          </p>
          {engineState.micError && (
            <p role="alert" className="text-xs text-coral-300 bg-coral-500/10 border border-coral-500/25 rounded-lg px-3 py-2">
              {engineState.micError}
            </p>
          )}
        </div>

        <Toggle
          label="Start microphone on launch"
          description="Off by default so Auralis never prompts for permission uninvited."
          checked={input.autoStart}
          onChange={(autoStart) => updateInput({ autoStart })}
          id="toggle-autostart"
        />
      </Section>

      <Section
        title="Monitoring"
        description="Hear the input through your speakers or headphones."
        icon={<Headphones className="w-4 h-4" />}
      >
        <Toggle
          label="Mic monitoring"
          description="Routes the microphone to the output. Use headphones to avoid feedback."
          checked={engineState.micMonitoring}
          onChange={() => toggleMicMonitoring()}
          id="toggle-monitoring"
        />
        {engineState.micMonitoring && (
          <p className="text-[11px] text-accent-300 bg-accent-400/10 border border-accent-400/25 rounded-lg px-3 py-2">
            Monitoring is on — if you hear squealing, lower the output volume or switch to headphones.
          </p>
        )}
      </Section>

      <Section
        title="Capture processing"
        description="Browser voice processing is OFF by default so the spectrum reflects the true signal. These flags are passed straight to getUserMedia and apply immediately."
        icon={<ShieldCheck className="w-4 h-4" />}
      >
        <Toggle
          label="Echo cancellation"
          description="Removes speaker bleed in calls. Alters the spectrum."
          checked={input.echoCancellation}
          onChange={(echoCancellation) => updateInput({ echoCancellation })}
          id="toggle-echo"
        />
        <Toggle
          label="Noise suppression"
          description="Attenuates steady background noise. Hides the noise floor you may want to measure."
          checked={input.noiseSuppression}
          onChange={(noiseSuppression) => updateInput({ noiseSuppression })}
          id="toggle-ns"
        />
        <Toggle
          label="Automatic gain control"
          description="Lets the browser ride the level. Defeats level measurements."
          checked={input.autoGainControl}
          onChange={(autoGainControl) => updateInput({ autoGainControl })}
          id="toggle-agc"
        />
      </Section>

      <Section title="Stream details" description="What the browser actually granted." icon={<Info className="w-4 h-4" />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="stream-details">
          <Fact label="Status" value={micOn ? 'capturing' : 'stopped'} />
          <Fact label="Channels" value={info?.channelCount ?? '—'} />
          <Fact label="Capture rate" value={info?.sampleRate ? `${(info.sampleRate / 1000).toFixed(1)} kHz` : '—'} />
          <Fact label="Context rate" value={`${(sampleRate / 1000).toFixed(1)} kHz`} />
          <Fact label="Echo cancel" value={flag(info?.echoCancellation)} />
          <Fact label="Noise supp." value={flag(info?.noiseSuppression)} />
          <Fact label="Auto gain" value={flag(info?.autoGainControl)} />
          <Fact label="Device" value={info?.label ?? activeDevice?.label ?? '—'} />
        </div>
      </Section>
    </div>
  );
};
