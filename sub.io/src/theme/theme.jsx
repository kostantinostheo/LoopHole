import { createContext, useMemo, useState, useEffect } from 'react';

export const light = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  text: '#111111',
  muted: 'rgba(17, 17, 17, 0.55)',
  border: 'rgba(17, 17, 17, 0.1)',
  surface: '#F5F5F5',
  surface2: 'rgba(17, 17, 17, 0.04)',
  accent: '#111111',
  danger: '#E5484D',
  success: 'rgba(34, 197, 94, 1)',
  selected: 'rgba(17, 17, 17, 0.08)',
  keyboard: 'rgba(255, 255, 255, 0)',
};

const CSS_VAR_MAP = {
  bg: '--color-bg',
  card: '--color-card',
  cardElevated: '--color-card-elevated',
  text: '--color-text',
  muted: '--color-muted',
  border: '--color-border',
  surface: '--color-surface',
  surface2: '--color-surface-2',
  accent: '--color-accent',
  danger: '--color-danger',
  success: '--color-success',
  selected: '--color-selected',
  keyboard: '--color-keyboard',
};

function applyThemeVars(theme) {
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    root.style.setProperty(cssVar, theme[key]);
  }
}

export const ThemeContext = createContext({ theme: light });

export function ThemeProvider({ children }) {
  const [theme] = useState(light);

  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

