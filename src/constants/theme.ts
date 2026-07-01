// FarmAsyst North — Brand Theme (mirrors frontend CSS vars)
export const Colors = {
  primary:    '#2D4A1E',
  leaf:       '#4A7C2F',
  earth:      '#5D4037',
  harvest:    '#E8A020',
  wattle:     '#C0392B',
  ink:        '#1A1A1A',
  muted:      '#6B7280',
  bg:         '#F5F5F0',
  surface:    '#FAFAF7',
  white:      '#FFFFFF',
  border:     '#E0E0E0',
  success:    '#388E3C',
  warning:    '#F57C00',
  danger:     '#C0392B',
  info:       '#1565C0',
  successBg:  '#F0FDF4',
  warningBg:  '#FFFBEB',
  dangerBg:   '#FEF2F2',
  infoBg:     '#EFF6FF',
  pill: {
    success: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
    warning: { bg: '#FFF8E1', text: '#F57C00', border: '#FFE082' },
    danger:  { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
    info:    { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
    neutral: { bg: '#F5F5F5', text: '#6B7280', border: '#E0E0E0' },
  },
};
export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 };
export const Radius  = { sm: 6, md: 10, lg: 14, xl: 20, pill: 100 };
export const Typography = {
  h1:   { fontSize: 26, fontWeight: '800' as const },
  h2:   { fontSize: 20, fontWeight: '700' as const },
  h3:   { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14 },
  sm:   { fontSize: 12 },
  xs:   { fontSize: 11 },
};
