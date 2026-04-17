/**
 * FoodOS design tokens — colors, spacing, border radius, typography, and shadows.
 * The Colors export retains light/dark mode support for existing components.
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Legacy tint colors (kept for backward compatibility)
// ---------------------------------------------------------------------------
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
export const BrandColors = {
  /** Primary green — food-focused brand color */
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',

  /** Secondary warm amber */
  secondary: '#F57C00',
  secondaryLight: '#FFB74D',
  secondaryDark: '#E65100',

  /** Backgrounds */
  background: '#F9FAFB',
  surface: '#FFFFFF',

  /** Text */
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textInverse: '#FFFFFF',

  /** Semantic */
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#F9A825',
  muted: '#9E9E9E',
};

// ---------------------------------------------------------------------------
// Spacing scale (in dp)
// ---------------------------------------------------------------------------
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Border radius scale (in dp)
// ---------------------------------------------------------------------------
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography scale
// ---------------------------------------------------------------------------
export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ---------------------------------------------------------------------------
// Shadow presets (cross-platform)
// ---------------------------------------------------------------------------
export const Shadows = {
  sm: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  lg: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
} as const;

// ---------------------------------------------------------------------------
// Font families (unchanged from original)
// ---------------------------------------------------------------------------
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
