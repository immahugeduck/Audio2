import React from 'react';
import { BarChart3, Gauge, Paintbrush, Ruler } from 'lucide-react';
import { useAnalyzer } from '../../context/AnalyzerContext';
import { MODES, ModeGlyph } from '../../components/GraphModeSwitcher';
import { Section, Slider, Toggle, Segmented } from '../../components/ui';
import { FFT_SIZES } from '../../utils/settingsStore';
import { VisualizationMode } from '../../types';

const fftLabel = (n: number) => (n >= 1024 ? `${n / 1024}k` : String(n));

const barLike: VisualizationMode[] = ['bars', 'radial'];

export const GraphSettings: React.FC = () => {
  const { visual: v, updateVisual, sampleRate } = useAnalyzer();
  const binHz = sampleRate / v.fftSize;

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Graph type"
        description="How the spectrum is drawn. Changes apply instantly to every view."
        icon={<BarChart3 className="w-4 h-4" />}
      >
        <div role="radiogroup" aria-label="Graph type" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MODES.map((m) => {
            const active = v.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                id={`setting-mode-${m.id}`}
                onClick={() => updateVisual({ mode: m.id })}
                className={`group text-left rounded-2xl border p-3 transition-all ${
                  active
                    ? 'border-accent-400 bg-accent-400/[0.08] shadow-[0_0_0_1px_var(--accent-400)]'
                    : 'border-ink-700 bg-ink-850 hover:border-ink-500 hover:bg-ink-800'
                }`}
              >
                <div
                  className={`h-16 rounded-xl mb-3 px-3 py-2 flex items-center justify-center bg-ink-950 border border-ink-800 ${
                    active ? 'text-accent-400' : 'text-ink-400 group-hover:text-accent-300'
                  }`}
                >
                  <ModeGlyph mode={m.id} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-50">{m.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />}
                </div>
                <div className="text-[11px] text-ink-400 leading-snug mt-0.5">{m.blurb}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Analysis"
        description="How the Web Audio analyser slices the signal."
        icon={<Gauge className="w-4 h-4" />}
      >
        <Segmented
          label="FFT size"
          value={v.fftSize}
          options={FFT_SIZES.map((n) => ({ value: n, label: fftLabel(n), title: `${n} samples` }))}
          onChange={(fftSize) => updateVisual({ fftSize })}
        />
        <p className="-mt-3 text-[11px] text-ink-500">
          {v.fftSize} samples · {(v.fftSize / 2).toLocaleString()} bins · ≈{binHz.toFixed(1)} Hz per bin. Larger = finer pitch detail, slower response.
        </p>
        <Slider
          label="Smoothing"
          value={v.smoothing}
          min={0}
          max={0.95}
          step={0.01}
          format={(n) => n.toFixed(2)}
          onChange={(smoothing) => updateVisual({ smoothing })}
          hint="Time-averaging between frames. Higher is calmer, lower is snappier."
          id="input-smoothing-slider"
        />
        <Segmented
          label="Frequency scale"
          value={v.logScale ? 'log' : 'linear'}
          options={[
            { value: 'log', label: 'Logarithmic', title: 'Emphasises low frequencies (matches hearing)' },
            { value: 'linear', label: 'Linear', title: 'Evenly spaced in Hz' },
          ]}
          onChange={(s) => updateVisual({ logScale: s === 'log' })}
        />
      </Section>

      <Section
        title="Style"
        description="Geometry and motion of the graph."
        icon={<Paintbrush className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Slider
            label="Bar spacing"
            value={v.barSpacing}
            min={1}
            max={8}
            step={1}
            format={(n) => `${n}px`}
            onChange={(barSpacing) => updateVisual({ barSpacing })}
            hint={`Used by ${barLike.join(' & ')}.`}
            disabled={!['bars', 'radial'].includes(v.mode)}
          />
          <Slider
            label="Bar width"
            value={v.barWidthMultiplier}
            min={0.5}
            max={2}
            step={0.05}
            format={(n) => `${n.toFixed(2)}×`}
            onChange={(barWidthMultiplier) => updateVisual({ barWidthMultiplier })}
            hint={`Used by ${barLike.join(' & ')}.`}
            disabled={!['bars', 'radial'].includes(v.mode)}
          />
          <Slider
            label="Fill opacity"
            value={v.fillOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(n) => `${Math.round(n * 100)}%`}
            onChange={(fillOpacity) => updateVisual({ fillOpacity })}
            hint="Used by Curve and Hybrid."
            disabled={!['curve', 'hybrid'].includes(v.mode)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-1">
          <Toggle
            label="Peak caps"
            description="Hold markers that fall slowly behind the signal."
            checked={v.showPeaks}
            onChange={(showPeaks) => updateVisual({ showPeaks })}
            id="toggle-peaks"
          />
          <Toggle
            label="Beat pulse"
            description="Gently swell the graph on bass hits."
            checked={v.beatPulseAnimation}
            onChange={(beatPulseAnimation) => updateVisual({ beatPulseAnimation })}
            id="toggle-beat"
          />
          <Toggle
            label="Reactive colors"
            description="Ambient glow follows bass energy."
            checked={v.reactiveColors}
            onChange={(reactiveColors) => updateVisual({ reactiveColors })}
            id="toggle-reactive"
          />
        </div>
      </Section>

      <Section title="Overlays" description="Axes and guides drawn on top of the graph." icon={<Ruler className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <Toggle
            label="Hz scale"
            description="Frequency axis (Bars, Curve, Hybrid, Spectrogram)."
            checked={v.showHzScale}
            onChange={(showHzScale) => updateVisual({ showHzScale })}
            id="toggle-hz"
          />
          <Toggle
            label="dB grid"
            description="Level guides (Bars, Curve, Hybrid)."
            checked={v.showDbGrid}
            onChange={(showDbGrid) => updateVisual({ showDbGrid })}
            id="toggle-db"
          />
        </div>
      </Section>
    </div>
  );
};
