import React, { useState } from 'react';
import { BarChart3, Palette, Mic, Sliders, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAnalyzer } from '../context/AnalyzerContext';
import { Stage } from '../components/Stage';
import { PageHeader, Button } from '../components/ui';
import { GraphSettings } from './settings/GraphSettings';
import { ColorSettings } from './settings/ColorSettings';
import { InputSettings } from './settings/InputSettings';
import { GainSettings } from './settings/GainSettings';
import { MODES } from '../components/GraphModeSwitcher';
import { getPresetById } from '../utils/colorGradients';
import { DEFAULT_VISUAL, DEFAULT_GAIN, DEFAULT_APPEARANCE } from '../utils/settingsStore';
import { hrefFor } from '../utils/routes';
import type { SettingsSection } from '../hooks/useAppSettings';

type TabId = 'graph' | 'color' | 'input' | 'gain';

const TABS: { id: TabId; label: string; icon: React.ReactNode; section: SettingsSection | 'color' }[] = [
  { id: 'graph', label: 'Graph', icon: <BarChart3 className="w-4 h-4" />, section: 'visual' },
  { id: 'color', label: 'Color', icon: <Palette className="w-4 h-4" />, section: 'color' },
  { id: 'input', label: 'Input', icon: <Mic className="w-4 h-4" />, section: 'input' },
  { id: 'gain', label: 'Gain', icon: <Sliders className="w-4 h-4" />, section: 'gain' },
];

export const SettingsView: React.FC<{ sub: string | null }> = ({ sub }) => {
  const { visual, resetSection, resetAll, updateVisual, updateAppearance, setVolume } = useAnalyzer();
  const tab: TabId = (TABS.find((t) => t.id === sub)?.id ?? 'graph') as TabId;
  const [confirmAll, setConfirmAll] = useState(false);

  const mode = MODES.find((m) => m.id === visual.mode);
  const preset = getPresetById(visual.colorPresetId);

  // Each tab resets only the settings it owns
  const resetCurrent = () => {
    const D = DEFAULT_VISUAL;
    if (tab === 'color') {
      updateVisual({ colorPresetId: D.colorPresetId, useCustomGradient: D.useCustomGradient, customGradient: D.customGradient });
      updateAppearance({ accentId: DEFAULT_APPEARANCE.accentId });
    } else if (tab === 'graph') {
      updateVisual({
        mode: D.mode, fftSize: D.fftSize, smoothing: D.smoothing, logScale: D.logScale,
        barSpacing: D.barSpacing, barWidthMultiplier: D.barWidthMultiplier, fillOpacity: D.fillOpacity,
        showPeaks: D.showPeaks, beatPulseAnimation: D.beatPulseAnimation, reactiveColors: D.reactiveColors,
        showHzScale: D.showHzScale, showDbGrid: D.showDbGrid,
      });
    } else if (tab === 'gain') {
      resetSection('gain');
      setVolume(DEFAULT_GAIN.outputVolume);
      updateVisual({ sensitivity: D.sensitivity, minDecibels: D.minDecibels, maxDecibels: D.maxDecibels, autoRange: D.autoRange });
    } else {
      resetSection('input');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <PageHeader
        eyebrow="Settings"
        title="Make it yours."
        subtitle="Every change applies instantly and is saved to this browser."
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-sage-300 mr-1" data-testid="autosave-note">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto-saved
            </span>
            <Button variant="secondary" size="sm" onClick={resetCurrent} id="btn-reset-section">
              <RotateCcw className="w-3.5 h-3.5" /> Reset {TABS.find((t) => t.id === tab)!.label}
            </Button>
            {confirmAll ? (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  id="btn-reset-all-confirm"
                  onClick={() => {
                    resetAll();
                    setConfirmAll(false);
                  }}
                >
                  Confirm reset all
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmAll(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmAll(true)} id="btn-reset-all">
                Reset all to defaults
              </Button>
            )}
          </>
        }
      />

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 p-1 rounded-2xl bg-ink-900/70 border border-ink-800 self-start max-w-full overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={hrefFor('settings', t.id)}
            role="tab"
            id={`settings-tab-${t.id}`}
            aria-selected={tab === t.id}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-accent-400 text-ink-950' : 'text-ink-300 hover:text-ink-50 hover:bg-ink-800'
            }`}
          >
            {t.icon}
            {t.label}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
        <div className="xl:order-1 order-2 min-w-0" role="tabpanel" aria-labelledby={`settings-tab-${tab}`}>
          {tab === 'graph' && <GraphSettings />}
          {tab === 'color' && <ColorSettings />}
          {tab === 'input' && <InputSettings />}
          {tab === 'gain' && <GainSettings />}
        </div>

        {/* Live preview — always visible while you tweak */}
        <aside className="xl:order-2 order-1 xl:sticky xl:top-24 flex flex-col gap-3" aria-label="Live preview">
          <div className="flex items-center justify-between px-1">
            <span className="eyebrow">Live preview</span>
            <span className="text-[11px] text-ink-400">
              {mode?.label} · {visual.useCustomGradient ? 'Custom' : preset.name}
            </span>
          </div>
          <Stage variant="compact" />
        </aside>
      </div>
    </div>
  );
};
