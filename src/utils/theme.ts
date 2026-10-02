// App accent themes. The accent drives buttons, focus rings, sliders, the live
// indicator and the brand wordmark. It is applied by writing CSS variables onto
// <html>, which the Tailwind `accent-*` tokens (see index.css) read from.

export interface AccentTheme {
  id: string;
  name: string;
  /** shades 200 / 300 / 400 / 500 / 600 / 950 */
  shades: [string, string, string, string, string, string];
}

export const ACCENT_THEMES: AccentTheme[] = [
  { id: 'ember', name: 'Ember Gold', shades: ['#fbe3b8', '#f8cf85', '#f2b04a', '#e89a2b', '#c27a18', '#2a1c08'] },
  { id: 'coral', name: 'Coral', shades: ['#fbd3cb', '#f5a191', '#ef6f5e', '#e0523f', '#b83c2c', '#2b0f0b'] },
  { id: 'rose', name: 'Rosewood', shades: ['#f7d3df', '#eea6bf', '#e58aa8', '#d4658b', '#aa456a', '#2a0e18'] },
  { id: 'sage', name: 'Sage', shades: ['#d4efdc', '#b0dfbe', '#8fd0a4', '#5fb87e', '#468f61', '#0f2217'] },
  { id: 'iris', name: 'Iris', shades: ['#dcd7fb', '#bdb4f8', '#9a8cf5', '#7b69ea', '#5d4bc4', '#16113a'] },
  { id: 'ivory', name: 'Ivory', shades: ['#ffffff', '#f7f5f8', '#ece9ef', '#d6d2dc', '#b5b0bf', '#1a191f'] },
];

export const DEFAULT_ACCENT_ID = 'ember';

export function getAccentTheme(id: string): AccentTheme {
  return ACCENT_THEMES.find((t) => t.id === id) ?? ACCENT_THEMES[0];
}

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

export function applyAccentTheme(id: string): void {
  if (typeof document === 'undefined') return;
  const t = getAccentTheme(id);
  const root = document.documentElement;
  const [s200, s300, s400, s500, s600, s950] = t.shades;
  root.style.setProperty('--accent-200', s200);
  root.style.setProperty('--accent-300', s300);
  root.style.setProperty('--accent-400', s400);
  root.style.setProperty('--accent-500', s500);
  root.style.setProperty('--accent-600', s600);
  root.style.setProperty('--accent-950', s950);
  root.style.setProperty('--accent-rgb', hexToRgbTriplet(s400));
  root.dataset.accent = t.id;
}
