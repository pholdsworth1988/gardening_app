// Hedge colours and type. A proper brand comes later; these are working values.

export const colors = {
  bg: '#f6f7f3',
  surface: '#ffffff',
  ink: '#1d2420',
  muted: '#5b625d',
  line: '#dde2da',
  hedge: '#2f5d3a',      // primary: deep hedge green
  hedgeSoft: '#e4ede1',
  soil: '#efe4d2',
  danger: '#a33a2b',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 6, md: 10, lg: 14 };

export const type = {
  title: { fontSize: 26, fontWeight: '700' as const, color: colors.ink, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  small: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600' as const, color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' as const },
};
