import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Music,
  SlidersHorizontal,
  AudioLines,
  Ear,
  Sparkles,
  BookOpen,
  Settings as SettingsIcon,
} from 'lucide-react';

export type RouteId = 'live' | 'media' | 'equalizer' | 'tuner' | 'noise' | 'ai' | 'guide' | 'settings';

export interface RouteDef {
  id: RouteId;
  label: string;
  description: string;
  icon: LucideIcon;
  group: 'analyze' | 'tools' | 'app';
}

export const ROUTES: RouteDef[] = [
  { id: 'live', label: 'Live Analyzer', description: 'Real-time spectrum from your microphone', icon: Activity, group: 'analyze' },
  { id: 'media', label: 'Media', description: 'Files, URLs, samples & playback', icon: Music, group: 'analyze' },
  { id: 'equalizer', label: 'Equalizer', description: '3-band EQ, speed and stereo pan', icon: SlidersHorizontal, group: 'tools' },
  { id: 'tuner', label: 'Tuner & Harmonics', description: 'Pitch, note and harmonic series', icon: AudioLines, group: 'tools' },
  { id: 'noise', label: 'Noise & Room', description: 'Baseline, RT60, timeline & events', icon: Ear, group: 'tools' },
  { id: 'ai', label: 'AI & Reports', description: 'Sound classifier, transcription, export', icon: Sparkles, group: 'tools' },
  { id: 'guide', label: 'Guide', description: 'Acoustic reference & troubleshooting', icon: BookOpen, group: 'app' },
  { id: 'settings', label: 'Settings', description: 'Graph, color, input & gain', icon: SettingsIcon, group: 'app' },
];

export const DEFAULT_ROUTE: RouteId = 'live';

export interface ParsedRoute {
  id: RouteId;
  sub: string | null;
}

/** Parse `#/settings/gain` → { id: 'settings', sub: 'gain' } (unknown → live). */
export function parseHash(hash: string): ParsedRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const id = ROUTES.find((r) => r.id === parts[0])?.id ?? DEFAULT_ROUTE;
  return { id, sub: parts[1] ?? null };
}

export function hrefFor(id: RouteId, sub?: string): string {
  return `#/${id}${sub ? `/${sub}` : ''}`;
}
