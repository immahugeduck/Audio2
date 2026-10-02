import { ColorGradientPreset, CustomGradient } from '../types';

export const DEFAULT_PRESET_ID = 'ember';

// Auralis palettes. Colors run bottom → top of the graph (quiet → loud).
export const COLOR_PRESETS: ColorGradientPreset[] = [
  {
    id: 'ember',
    name: 'Ember',
    colors: ['#5c1b3d', '#ef6f5e', '#f8cf85'],
    peakColor: '#fff1d0',
    glowColor: 'rgba(239, 111, 94, 0.35)',
  },
  {
    id: 'saffron',
    name: 'Saffron',
    colors: ['#7a3a0a', '#f2b04a', '#fff0c2'],
    peakColor: '#ffffff',
    glowColor: 'rgba(242, 176, 74, 0.35)',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    colors: ['#2a2f6b', '#b2557f', '#f2a65e'],
    peakColor: '#ffe3c2',
    glowColor: 'rgba(178, 85, 127, 0.35)',
  },
  {
    id: 'verdigris',
    name: 'Verdigris',
    colors: ['#0e4a3e', '#4cb58a', '#d7f2a6'],
    peakColor: '#f4ffd6',
    glowColor: 'rgba(76, 181, 138, 0.35)',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    colors: ['#22406b', '#6f9fd1', '#eaf3fb'],
    peakColor: '#ffffff',
    glowColor: 'rgba(111, 159, 209, 0.3)',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    colors: ['#3a1d5c', '#a96bc4', '#f4c1de'],
    peakColor: '#fff0f8',
    glowColor: 'rgba(169, 107, 196, 0.35)',
  },
  {
    id: 'copper',
    name: 'Copper',
    colors: ['#3b1f17', '#b8643c', '#f0c9a0'],
    peakColor: '#fff4e6',
    glowColor: 'rgba(184, 100, 60, 0.35)',
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    colors: ['#4a1426', '#d4658b', '#ffd2dc'],
    peakColor: '#ffffff',
    glowColor: 'rgba(212, 101, 139, 0.35)',
  },
  {
    id: 'moss',
    name: 'Moss',
    colors: ['#233a1d', '#7fa84a', '#e9f0a8'],
    peakColor: '#fbffe0',
    glowColor: 'rgba(127, 168, 74, 0.32)',
  },
  {
    id: 'ivory',
    name: 'Ivory Mono',
    colors: ['#3a3742', '#9a95a5', '#f7f5f8'],
    peakColor: '#f2b04a',
    glowColor: 'rgba(214, 210, 220, 0.22)',
  },
];

export function getPresetById(id: string): ColorGradientPreset {
  return COLOR_PRESETS.find((p) => p.id === id) || COLOR_PRESETS[0];
}

export function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: ColorGradientPreset,
  custom?: CustomGradient,
  useCustom: boolean = false
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, height, 0, 0);

  if (useCustom && custom) {
    gradient.addColorStop(0, custom.start);
    gradient.addColorStop(0.5, custom.middle);
    gradient.addColorStop(1, custom.end);
    return gradient;
  }

  const colors = preset.colors;
  if (colors.length === 2) {
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
  } else if (colors.length >= 3) {
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);
  } else {
    gradient.addColorStop(0, colors[0] || '#f2b04a');
    gradient.addColorStop(1, '#ef6f5e');
  }

  return gradient;
}

export function getPeakColor(
  preset: ColorGradientPreset,
  custom?: CustomGradient,
  useCustom: boolean = false
): string {
  if (useCustom && custom) {
    return custom.peak;
  }
  return preset.peakColor;
}

/** Linear blend between two #rrggbb colors, returned as rgb(). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * k)}, ${Math.round(pa[1] + (pb[1] - pa[1]) * k)}, ${Math.round(pa[2] + (pb[2] - pa[2]) * k)})`;
}

export function parseHex(hex: string): [number, number, number] {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = parseInt(full.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Resolve the active 3-stop palette (custom or preset) as plain hex strings. */
export function resolveStops(
  preset: ColorGradientPreset,
  custom?: CustomGradient,
  useCustom: boolean = false
): [string, string, string] {
  if (useCustom && custom) return [custom.start, custom.middle, custom.end];
  const c = preset.colors;
  return [c[0] || '#5c1b3d', c[1] || c[0] || '#ef6f5e', c[2] || c[c.length - 1] || '#f8cf85'];
}

/** Sample the palette at 0..1 (quiet → loud) as an rgb() string. */
export function samplePalette(stops: [string, string, string], t: number): string {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? mixHex(stops[0], stops[1], k * 2) : mixHex(stops[1], stops[2], (k - 0.5) * 2);
}
