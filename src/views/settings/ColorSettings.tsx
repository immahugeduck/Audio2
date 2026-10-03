import React from 'react';
import { Check, Palette, Pipette, Droplets } from 'lucide-react';
import { useAnalyzer } from '../../context/AnalyzerContext';
import { COLOR_PRESETS, getPresetById } from '../../utils/colorGradients';
import { ACCENT_THEMES } from '../../utils/theme';
import { Section, Toggle, Button } from '../../components/ui';
import { CustomGradient } from '../../types';

const gradientCss = (colors: string[]) => `linear-gradient(90deg, ${colors.join(', ')})`;

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void; id: string }> = ({
  label,
  value,
  onChange,
  id,
}) => {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-ink-950/60 border border-ink-800">
      <label
        className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-ink-600 shrink-0 cursor-pointer"
        style={{ backgroundColor: value }}
      >
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} color`}
          className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 opacity-0 cursor-pointer"
        />
      </label>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-ink-300">{label}</div>
        <input
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toLowerCase());
          }}
          onBlur={() => setDraft(value)}
          className="w-full bg-transparent font-mono text-xs text-ink-100 outline-none focus:text-accent-300 uppercase"
        />
      </div>
    </div>
  );
};

export const ColorSettings: React.FC = () => {
  const { visual: v, updateVisual, settings, updateAppearance } = useAnalyzer();
  const preset = getPresetById(v.colorPresetId);
  const activeColors = v.useCustomGradient
    ? [v.customGradient.start, v.customGradient.middle, v.customGradient.end]
    : preset.colors;

  const setCustom = (key: keyof CustomGradient, value: string) =>
    updateVisual({ useCustomGradient: true, customGradient: { ...v.customGradient, [key]: value } });

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Graph themes"
        description="Palettes run from quiet (bottom) to loud (top)."
        icon={<Palette className="w-4 h-4" />}
      >
        <div role="radiogroup" aria-label="Graph theme" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {COLOR_PRESETS.map((p) => {
            const active = !v.useCustomGradient && v.colorPresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                id={`preset-${p.id}`}
                onClick={() => updateVisual({ colorPresetId: p.id, useCustomGradient: false })}
                className={`group relative text-left rounded-xl border p-2 transition-all ${
                  active
                    ? 'border-accent-400 bg-accent-400/[0.08] shadow-[0_0_0_1px_var(--accent-400)]'
                    : 'border-ink-700 bg-ink-850 hover:border-ink-500'
                }`}
              >
                <div className="h-11 rounded-lg relative overflow-hidden" style={{ background: gradientCss([...p.colors].reverse()) }}>
                  <span
                    className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: p.peakColor, boxShadow: `0 0 8px ${p.peakColor}` }}
                    title="Peak color"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 px-0.5">
                  <span className="text-xs font-semibold text-ink-100">{p.name}</span>
                  {active && <Check className="w-3.5 h-3.5 text-accent-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Custom gradient"
        description="Pick your own three stops and a peak color. Applies to every graph type."
        icon={<Pipette className="w-4 h-4" />}
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              updateVisual({
                customGradient: {
                  start: preset.colors[0],
                  middle: preset.colors[1],
                  end: preset.colors[2] ?? preset.colors[1],
                  peak: preset.peakColor,
                },
              })
            }
          >
            Copy from theme
          </Button>
        }
      >
        <Toggle
          label="Use custom gradient"
          description="Overrides the selected theme."
          checked={v.useCustomGradient}
          onChange={(useCustomGradient) => updateVisual({ useCustomGradient })}
          id="btn-toggle-custom-gradient"
        />
        <div
          className="h-4 rounded-full border border-ink-700"
          style={{ background: gradientCss([v.customGradient.start, v.customGradient.middle, v.customGradient.end]) }}
          aria-hidden="true"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ColorField id="color-start" label="Low level" value={v.customGradient.start} onChange={(c) => setCustom('start', c)} />
          <ColorField id="color-middle" label="Mid level" value={v.customGradient.middle} onChange={(c) => setCustom('middle', c)} />
          <ColorField id="color-end" label="High level" value={v.customGradient.end} onChange={(c) => setCustom('end', c)} />
          <ColorField id="color-peak" label="Peak caps" value={v.customGradient.peak} onChange={(c) => setCustom('peak', c)} />
        </div>
        <div className="text-[11px] text-ink-500">
          Now showing: <span className="text-ink-300">{v.useCustomGradient ? 'Custom gradient' : preset.name}</span>
          <span className="ml-2 inline-block align-middle h-2 w-16 rounded-full" style={{ background: gradientCss([...activeColors].reverse()) }} />
        </div>
      </Section>

      <Section
        title="App accent"
        description="Buttons, focus rings, sliders and the live indicator."
        icon={<Droplets className="w-4 h-4" />}
      >
        <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-3">
          {ACCENT_THEMES.map((t) => {
            const active = settings.appearance.accentId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={t.name}
                id={`accent-${t.id}`}
                onClick={() => updateAppearance({ accentId: t.id })}
                className={`flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-full border transition-all ${
                  active ? 'border-accent-400 bg-accent-400/[0.08]' : 'border-ink-700 bg-ink-850 hover:border-ink-500'
                }`}
              >
                <span className="w-6 h-6 rounded-full border-2 border-ink-950 ring-1 ring-ink-600" style={{ backgroundColor: t.shades[2] }} />
                <span className="text-xs font-semibold text-ink-100">{t.name}</span>
                {active && <Check className="w-3.5 h-3.5 text-accent-400" />}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
};
