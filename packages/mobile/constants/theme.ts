/**
 * FoodOS Design System v2.0
 * Modern, minimalistic, aesthetic
 */

// ── Color Palette ────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#6366F1',      // Indigo 500
  primaryDark: '#4F46E5',  // Indigo 600
  primaryLight: '#818CF8', // Indigo 400
  
  // Neutrals (Light Mode)
  background: '#FFFFFF',
  surface: '#F9FAFB',      // Gray 50
  surfaceElevated: '#FFFFFF',
  border: '#E5E7EB',       // Gray 200
  borderLight: '#F3F4F6',  // Gray 100
  
  // Text
  text: '#111827',         // Gray 900
  textSecondary: '#6B7280', // Gray 500
  textTertiary: '#9CA3AF', // Gray 400
  
  // Semantic
  success: '#10B981',      // Green 500
  successLight: '#D1FAE5', // Green 100
  warning: '#F59E0B',      // Amber 500
  warningLight: '#FEF3C7', // Amber 100
  error: '#EF4444',        // Red 500
  errorLight: '#FEE2E2',   // Red 100
  info: '#3B82F6',         // Blue 500
  infoLight: '#DBEAFE',    // Blue 100
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  
  // Glass morphism
  glass: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(0, 0, 0, 0.3)',
} as const;

export const DarkColors = {
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#A5B4FC',
  
  background: '#0F172A',   // Slate 900
  surface: '#1E293B',      // Slate 800
  surfaceElevated: '#334155', // Slate 700
  border: '#334155',
  borderLight: '#1E293B',
  
  text: '#F1F5F9',         // Slate 100
  textSecondary: '#94A3B8', // Slate 400
  textTertiary: '#64748B', // Slate 500
  
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#60A5FA',
  infoLight: '#1E3A8A',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  
  glass: 'rgba(30, 41, 59, 0.7)',
  glassDark: 'rgba(0, 0, 0, 0.5)',
} as const;

// Legacy aliases for backward compatibility
export const BrandColors = Colors;

// ── Typography ───────────────────────────────────────────────────

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ── Spacing ──────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

// ── Border Radius ────────────────────────────────────────────────

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

// ── Shadows ──────────────────────────────────────────────────────

export const Shadow = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── Animation Timings ────────────────────────────────────────────

export const AnimationDuration = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

export const AnimationEasing = {
  easeIn: [0.4, 0, 1, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: [0.68, -0.55, 0.265, 1.55],
} as const;

// ── Layout ───────────────────────────────────────────────────────

export const Layout = {
  screenPadding: Spacing.lg,
  cardPadding: Spacing.md,
  minTouchTarget: 44,
  maxContentWidth: 640,
} as const;

// ── Z-Index ──────────────────────────────────────────────────────

export const ZIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  modal: 30,
  popover: 40,
  toast: 50,
} as const;
