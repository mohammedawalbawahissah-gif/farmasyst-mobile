export const Colors = {
  // Brand palette
  earth: '#2D4A1E',
  leaf: '#4A7C2F',
  sprout: '#7BB84A',
  soil: '#8B5E3C',
  harvest: '#E8A020',
  sky: '#E8F4F0',
  chalk: '#F7F4EE',
  ink: '#1A2410',
  muted: '#6B7660',
  border: '#D4DCC8',
  white: '#FFFFFF',

  // Role colours
  farmer: '#4A7C2F',
  investor: '#1A4A6B',
  admin: '#5C2D8B',
  consumer: '#8B3A2F',

  // Semantic
  success: '#2E7D32',
  warning: '#E8A020',
  danger: '#C0392B',
  info: '#1565C0',

  // Aliases
  primary: '#4A7C2F',
  primaryDark: '#2D4A1E',
  bg: '#F7F4EE',
  surface: '#FFFFFF',
  text: '#1A2410',
  textMuted: '#6B7660',
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64,
};

export const Radius = {
  sm: 6, md: 12, lg: 20, pill: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#1A2410',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A2410',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Typography = {
  // Fraunces is unavailable in RN without custom fonts; use serif fallback and mark for loading
  heading1: { fontSize: 28, fontWeight: '700' as const, color: Colors.ink, letterSpacing: -0.5 },
  heading2: { fontSize: 22, fontWeight: '600' as const, color: Colors.ink, letterSpacing: -0.3 },
  heading3: { fontSize: 18, fontWeight: '600' as const, color: Colors.ink },
  body:     { fontSize: 14, fontWeight: '400' as const, color: Colors.ink },
  bodyMd:   { fontSize: 15, fontWeight: '400' as const, color: Colors.ink },
  bodySm:   { fontSize: 12, fontWeight: '400' as const, color: Colors.muted },
  label:    { fontSize: 12, fontWeight: '600' as const, color: Colors.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  caption:  { fontSize: 11, fontWeight: '400' as const, color: Colors.muted },
  btnPrimary: { fontSize: 14, fontWeight: '600' as const, color: Colors.white },
  btnSecondary: { fontSize: 14, fontWeight: '600' as const, color: Colors.leaf },
};
