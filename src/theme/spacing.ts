export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 48,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const motion = {
  duration: {
    fast: 150,
    base: 220,
    slow: 300,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
} as const;
