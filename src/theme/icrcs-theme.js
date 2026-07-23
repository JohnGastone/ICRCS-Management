/**
 * ICRCS Shared Design Tokens — single source of truth for every ICRCS module
 * (ISDMP, Client/Registration portal, Biometric Capture, etc.).
 *
 * Consumption:
 *   • Tailwind 3 (this module): imported into tailwind.config.js -> theme.extend.
 *   • Tailwind 4 (Client portal): mirror these values in an @theme {} block.
 *     A generated, copy-paste-ready block lives in src/theme/icrcs-theme.css.
 *
 * Keep colour values here in sync with that CSS block. Class names
 * (bg-icrcs-navy, text-primary, border-border, ...) then mean the same
 * thing across all portals.
 */

const colors = {
  // Brand / institutional palette
  primary: {
    DEFAULT: '#005BAC',
    light: '#0A6EC8',
    dark: '#004A8E',
  },
  secondary: {
    DEFAULT: '#0F766E',
    light: '#16918A',
  },
  accent: {
    DEFAULT: '#F59E0B',
    light: '#FBBF24',
  },
  icrcs: {
    navy: '#0B1D3A',
    'navy-light': '#132743',
    'navy-dark': '#060F1E',
    gold: '#D4AF37',
    'gold-light': '#E8C84A',
    cream: '#F5F5F0',
  },

  // Functional / state palette
  success: {
    DEFAULT: '#16A34A',
    light: '#22C55E',
  },
  warning: {
    DEFAULT: '#D97706',
    dark: '#B45309',
  },
  danger: {
    DEFAULT: '#DC2626',
  },

  // Surface / neutral tokens (the layout vocabulary)
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  muted: {
    DEFAULT: '#64748B',
    light: '#94A3B8',
  },
};

const fontFamily = {
  sans: [
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'sans-serif',
  ],
};

// rem-based so every text-* utility scales with the root font-size clamp in
// index.css (big-screen responsiveness). Values mirror the previous px sizes at a
// 16px root (13/14/15/19/22/26px) — line-heights already rem, so they scale too.
const fontSize = {
  xs: ['0.8125rem', { lineHeight: '1.25rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['0.9375rem', { lineHeight: '1.5rem' }],
  lg: ['1.1875rem', { lineHeight: '1.75rem' }],
  xl: ['1.375rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.625rem', { lineHeight: '2rem' }],
};

const boxShadow = {
  card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -2px rgba(0,0,0,0.04)',
};

const animation = {
  'fade-in': 'fadeIn 0.3s ease-out',
  'slide-up': 'slideUp 0.4s ease-out',
};

const keyframes = {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  slideUp: {
    '0%': { opacity: '0', transform: 'translateY(12px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
};

module.exports = {
  colors,
  fontFamily,
  fontSize,
  boxShadow,
  animation,
  keyframes,
};
