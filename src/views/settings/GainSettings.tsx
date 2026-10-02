import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Sliders, Waves, Wand2 } from 'lucide-react';
import { useAnalyzer } from '../../context/AnalyzerContext';
import { Section, Slider, Toggle, Button } from '../../components/ui';
import { GAIN_LIMITS } from '../../utils/settingsStore';

const RANGE_PRESETS = [
  { label: 'Studio', min: -90, max: -10, hint: '−90 … −10 dB' },
  { label: 'Quiet room', min: -100, max: -30, hint: '−100 … −30 dB' },
  { label: 'Loud', min: -70, max: 0, hint: '−70 … 0 dB' },
  { label: 'Wide', min: -120, max: 0, hint: '−120 … 0 dB' },
];

const fmtDb = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)} dB`;

export const GainSettings: React.FC = () => {
  const { settings, visual: v, updateGain, updateVisual, setVolume, engineState, toggleMute, metrics, isLive, rangeRef } = useAnalyzer();
  const { gain } = settings;

  // Show the effective analyser window (it moves while auto-range is on)
  const [eff, setEff] = useState(rangeRef.current);
  useEffect(() => {
    const t = window.setInterval(() => setEff({ ...rangeRef.current }), 250);
    return () => window.clearInterval(t);
  }, [rangeRef]);

  const levelPct = Math.min(100, Math.max(0, (metrics.rmsDb + 90) * (100 / 90)));
  const peakPct = Math.min(100, Math.max(0, (metrics.peakDb + 90) * (100 / 90)));
  const clipping = isLive && metrics.peakDb > -1;

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Input gain"
        description="Applied before the equalizer and analyser on every source — microphone, files, URLs and samples."
        icon={<Sliders className="w-4 h-4" />}
        action={
          <Button size="sm" variant="ghost" onClick={() => updateGain({ inputGainDb: 0 })} disabled={gain.inputGainDb === 0}>
            0 dB
          </Button>
        }
      >
        <Slider
          label="Input gain"
          value={gain.inputGainDb}
          min={GAIN_LIMITS.minDb}
          max={GAIN_LIMITS.maxDb}
          step={0.5}
          format={fmtDb}
          onChange={(inputGainDb) => updateGain({ inputGainDb })}
          id="input-gain-slider"
          hint="Boost quiet microphones, or trim hot sources to avoid clipping."
        />
        <div className="rounded-xl bg-ink-950/60 border border-ink-800 p-3.5" data-testid="level-meter">
          <div className="flex items-center justify-between mb-2">
            <span className="eyebrow !text-[9.5px]">Level after gain</span>
            <span className={`font-mono text-xs tabular-nums ${clipping ? 'text-coral-300' : 'text-ink-200'}`}>
              {isLive ? `RMS ${metrics.rmsDb.toFixed(1)} · peak ${metrics.peakDb.toFixed(1)} dB` : 'no signal'}
              {clipping && ' · CLIP'}
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-ink-800 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sage-400 via-accent-400 to-coral-400 transition-[width] duration-100"
              style={{ width: isLive ? `${levelPct}%` : '0%' }}
            />
            {isLive && <div className="absolute top-0 bottom-0 w-0.5 bg-ink-50/80" style={{ left: `${peakPct}%` }} />}
          </div>
        </div>
      </Section>

      <Section
        title="Output"
        description="What you hear. The analyser is unaffected by output volume."
        icon={<Volume2 className="w-4 h-4" />}
        action={
          <Button size="sm" variant="ghost" onClick={toggleMute} aria-pressed={engineState.isMuted}>
            {engineState.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {engineState.isMuted ? 'Muted' : 'Mute'}
          </Button>
        }
      >
        <Slider
          label="Output volume"
          value={engineState.volume}
          min={0}
          max={1}
          step={0.01}
          format={(n) => `${Math.round(n * 100)}%`}
          onChange={setVolume}
          id="output-volume-slider"
          hint="Microphone audio only reaches the speakers when Mic monitoring is on (Input settings)."
        />
      </Section>

      <Section
        title="Sensitivity & range"
        description="How loud signals map onto the graph."
        icon={<Waves className="w-4 h-4" />}
      >
        <Slider
          label="Graph sensitivity"
          value={v.sensitivity}
          min={0.5}
          max={2.5}
          step={0.05}
          format={(n) => `${n.toFixed(2)}×`}
          onChange={(sensitivity) => updateVisual({ sensitivity })}
          id="input-sensitivity-slider"
          hint="Visual scale only — doesn't change the audio."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Slider
            label="Floor (min dB)"
            value={v.minDecibels}
            min={-140}
            max={Math.min(-30, v.maxDecibels - 20)}
            step={1}
            format={(n) => `${n} dB`}
            onChange={(minDecibels) => updateVisual({ minDecibels })}
            id="input-min-db"
          />
          <Slider
            label="Ceiling (max dB)"
            value={v.maxDecibels}
            min={Math.max(-60, v.minDecibels + 20)}
            max={0}
            step={1}
            format={(n) => `${n} dB`}
            onChange={(maxDecibels) => updateVisual({ maxDecibels })}
            id="input-max-db"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Range presets">
          {RANGE_PRESETS.map((p) => {
            const active = v.minDecibels === p.min && v.maxDecibels === p.max;
            return (
              <button
                key={p.label}
                type="button"
                title={p.hint}
                onClick={() => updateVisual({ minDecibels: p.min, maxDecibels: p.max })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  active ? 'border-accent-400 bg-accent-400/10 text-accent-300' : 'border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-500'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <Toggle
          label="Auto-range"
          description="Slide the dB window to follow the loudest signal (fast attack, slow release). Window width stays as set above."
          checked={v.autoRange}
          onChange={(autoRange) => updateVisual({ autoRange })}
          id="toggle-autorange"
        />
        <div className="flex items-center gap-2 text-[11px] text-ink-400 font-mono" data-testid="effective-range">
          <Wand2 className="w-3.5 h-3.5 text-accent-400" />
          Effective window: {eff.min.toFixed(0)} … {eff.max.toFixed(0)} dB{v.autoRange ? ' (tracking)' : ''}
        </div>
      </Section>
    </div>
  );
};
