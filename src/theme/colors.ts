export const brand = {
  50: '#ECFEFF',
  100: '#CFFAFE',
  200: '#A5F3FC',
  300: '#67E8F9',
  400: '#22D3EE',
  500: '#06B6D4',
  600: '#0891B2',
  700: '#0E7490',
  800: '#155E75',
  900: '#164E63',
  950: '#083344',
} as const;

export type BrandTone = keyof typeof brand;

export const palette = {
  light: {
    background: '#F7F9FB',
    surface: '#FFFFFF',
    foreground: '#0F172A',
    muted: '#EEF2F5',
    mutedForeground: '#5B6B73',
    primary: brand[700],
    primaryForeground: '#FFFFFF',
    secondary: brand[100],
    secondaryForeground: brand[900],
    accent: brand[500],
    border: '#E1E7EB',
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',
    ring: brand[600],
  },
  dark: {
    background: '#0A0F12',
    surface: '#121B21',
    foreground: '#E6F1F5',
    muted: '#16232B',
    mutedForeground: '#9BB0BA',
    primary: brand[400],
    primaryForeground: '#083344',
    secondary: brand[900],
    secondaryForeground: brand[100],
    accent: brand[500],
    border: '#22303A',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    ring: brand[400],
  },
} as const;

export type Theme = 'light' | 'dark';
export type SemanticColor = keyof typeof palette.light;
