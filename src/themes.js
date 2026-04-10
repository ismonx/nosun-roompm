/**
 * PMS V6.0 — 三主題 Design Token 系統
 * Midnight Forest / Nanwan Surf / Sunset Vibe
 */

export const THEMES = {
  forest: {
    name: 'Midnight Forest',
    nameZh: '深夜森林',
    font: 'serif',
    density: 'compact',
    light: {
      bg: '#F4F1EA',
      bgCard: '#EBE8E0',
      text: '#2C3632',
      textMuted: '#5A6B60',
      accent: '#8A9A5B',
      accentHover: '#7A8A4B',
      border: '#C8C3B8',
      borderLight: '#DDD9D0',
    },
    dark: {
      bg: '#1B2420',
      bgCard: '#232F2A',
      text: '#D1D7C4',
      textMuted: '#8A9A7B',
      accent: '#C2D5A8',
      accentHover: '#D2E5B8',
      border: '#3A4A3A',
      borderLight: '#2E3E2E',
    }
  },
  surf: {
    name: 'Nanwan Surf',
    nameZh: '南灣浪花',
    font: 'sans',
    density: 'relaxed',
    light: {
      bg: '#F0F4F8',
      bgCard: '#E6ECF2',
      text: '#334155',
      textMuted: '#64748B',
      accent: '#5B8FB9',
      accentHover: '#4B7FA9',
      border: '#CBD5E1',
      borderLight: '#E2E8F0',
    },
    dark: {
      bg: '#1A2332',
      bgCard: '#1E2A3A',
      text: '#CBD5E1',
      textMuted: '#7B8FA3',
      accent: '#7CB3D8',
      accentHover: '#8CC3E8',
      border: '#2D3F52',
      borderLight: '#253545',
    }
  },
  sunset: {
    name: 'Sunset Vibe',
    nameZh: '恆春落日',
    font: 'serif',
    density: 'standard',
    light: {
      bg: '#FFF8F0',
      bgCard: '#F5EDE4',
      text: '#3D2E1F',
      textMuted: '#7A6B5A',
      accent: '#C87941',
      accentHover: '#B86931',
      border: '#D4C4B0',
      borderLight: '#E8DDD0',
    },
    dark: {
      bg: '#2A1F18',
      bgCard: '#332820',
      text: '#D4C4B0',
      textMuted: '#9A8A7A',
      accent: '#E8A66A',
      accentHover: '#F0B67A',
      border: '#4A3A2A',
      borderLight: '#3D2F22',
    }
  }
};

/**
 * 將主題 token 注入為 CSS Variables
 */
export function applyTheme(themeId, isDark) {
  const theme = THEMES[themeId] || THEMES.forest;
  const mode = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  root.style.setProperty('--pms-bg', mode.bg);
  root.style.setProperty('--pms-bg-card', mode.bgCard);
  root.style.setProperty('--pms-text', mode.text);
  root.style.setProperty('--pms-text-muted', mode.textMuted);
  root.style.setProperty('--pms-accent', mode.accent);
  root.style.setProperty('--pms-accent-hover', mode.accentHover);
  root.style.setProperty('--pms-border', mode.border);
  root.style.setProperty('--pms-border-light', mode.borderLight);

  // Font family
  const fontMap = {
    serif: '"Noto Serif TC", "Songti SC", serif',
    sans: '"Inter", "Noto Sans TC", sans-serif',
  };
  root.style.setProperty('--pms-font-heading', fontMap[theme.font] || fontMap.serif);
  root.style.setProperty('--pms-font-body', '"Noto Sans TC", "Inter", sans-serif');

  // Density spacing
  const densityMap = {
    compact: { gap: '0.5rem', padding: '0.75rem', cellH: '3.5rem' },
    standard: { gap: '0.75rem', padding: '1rem', cellH: '4rem' },
    relaxed: { gap: '1rem', padding: '1.25rem', cellH: '4.5rem' },
  };
  const d = densityMap[theme.density] || densityMap.standard;
  root.style.setProperty('--pms-gap', d.gap);
  root.style.setProperty('--pms-padding', d.padding);
  root.style.setProperty('--pms-cell-h', d.cellH);
}

export default THEMES;
