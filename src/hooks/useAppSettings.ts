import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppSettings,
  VisualizerSettings,
  InputSettings,
  GainSettings,
  AppearanceSettings,
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_VISUAL,
  DEFAULT_INPUT,
  DEFAULT_GAIN,
  DEFAULT_APPEARANCE,
  loadSettings,
  saveSettings,
  sanitizeSettings,
  SETTINGS_STORAGE_KEY,
} from '../utils/settingsStore';
import { applyAccentTheme } from '../utils/theme';

export type SettingsSection = 'visual' | 'input' | 'gain' | 'appearance';

/** Persisted app settings: instant-apply, debounced localStorage writes, cross-tab sync. */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const skipNextSave = useRef(true);

  const updateVisual = useCallback((p: Partial<VisualizerSettings>) => {
    setSettings((s) => sanitizeSettings({ ...s, visual: { ...s.visual, ...p } }));
  }, []);
  const updateInput = useCallback((p: Partial<InputSettings>) => {
    setSettings((s) => sanitizeSettings({ ...s, input: { ...s.input, ...p } }));
  }, []);
  const updateGain = useCallback((p: Partial<GainSettings>) => {
    setSettings((s) => sanitizeSettings({ ...s, gain: { ...s.gain, ...p } }));
  }, []);
  const updateAppearance = useCallback((p: Partial<AppearanceSettings>) => {
    setSettings((s) => sanitizeSettings({ ...s, appearance: { ...s.appearance, ...p } }));
  }, []);

  const resetSection = useCallback((section: SettingsSection) => {
    setSettings((s) => {
      switch (section) {
        case 'visual':
          return { ...s, visual: DEFAULT_VISUAL };
        case 'input':
          return { ...s, input: DEFAULT_INPUT };
        case 'gain':
          return { ...s, gain: DEFAULT_GAIN };
        case 'appearance':
          return { ...s, appearance: DEFAULT_APPEARANCE };
      }
    });
  }, []);

  const resetAll = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  // Apply accent theme immediately (and on load)
  useEffect(() => {
    applyAccentTheme(settings.appearance.accentId);
  }, [settings.appearance.accentId]);

  // Debounced persistence
  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = window.setTimeout(() => saveSettings(settings), 120);
    return () => window.clearTimeout(t);
  }, [settings]);

  // Keep other open tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        skipNextSave.current = true;
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { settings, updateVisual, updateInput, updateGain, updateAppearance, resetSection, resetAll };
}
