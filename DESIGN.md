# Rally — Design System

Premium sport app aesthetic. Strava's energy + Apple Fitness's calm + muted, confident accent palette.

The app should feel like it belongs on a serious athlete's home screen. Confident. Quiet. Fast.

---

## Design philosophy

1. **Bold without shouting.** Type does the heavy lifting. Color is restrained.
2. **One job per screen.** Every screen has a single primary action.
3. **Two taps to schedule.** Scheduling friction defeats the entire product.
4. **Trust the calendar.** Never display event titles or details. Free/busy only.
5. **Native feel.** SF Pro, iOS spacing rhythms, native modals and transitions.
6. **Athletic restraint.** Negative space, decisive typography, no decoration for decoration's sake.

---

## Color tokens

### Light mode (default)

```typescript
export const colors = {
  // Surfaces
  background: {
    primary: '#FAFAF7', // Warm off-white, softer than pure white
    secondary: '#F2F1EC', // Card / section background
    tertiary: '#E8E7E1', // Subtle dividers
    elevated: '#FFFFFF', // Sheets, modals
  },
  // Text
  text: {
    primary: '#0A0A0A', // Near-black, never pure
    secondary: '#525252', // Body secondary
    tertiary: '#8C8B85', // Meta, captions
    inverse: '#FAFAF7', // Text on dark
  },
  // Borders
  border: {
    primary: 'rgba(10,10,10,0.08)', // Hairline 0.5px
    secondary: 'rgba(10,10,10,0.16)',
  },
  // Accent — muted forest green (premium, athletic, not Strava orange)
  accent: {
    primary: '#1F5D4C', // Deep muted green for primary actions
    secondary: '#2D7A65', // Hover / pressed
    soft: '#E8F0EC', // Accent background (e.g. calendar event preview)
    text: '#1F5D4C', // Accent text on light bg
  },
  // Semantic — court traffic
  status: {
    open: '#3D8B5D', // Green — courts available
    filling: '#C58940', // Amber — getting busy
    full: '#B23A48', // Muted red — fully booked
    success: '#3D8B5D',
    warning: '#C58940',
    error: '#B23A48',
    info: '#3A6EA5',
  },
  // System
  shadow: 'rgba(10,10,10,0.06)', // Used sparingly
};
```

**Color usage rules:**

- Accent green is for primary CTAs, active tab, synced badge, and selected slot only. Nowhere else.
- Court traffic colors are for court pins and status pills only.
- Errors use muted red, never the bright system red.
- Backgrounds are warm off-white, not pure white. This is the Apple Fitness calm.
- Text is near-black, never pure black. Pure black is harsh on iOS.

---

## Typography

System font: **SF Pro Display** (titles), **SF Pro Text** (body). Both from iOS.

```typescript
export const typography = {
  // Display — used for hero numbers and stats
  displayLarge: {
    fontFamily: 'SF Pro Display',
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: -1.0,
    lineHeight: 48,
  },
  displayMedium: {
    fontFamily: 'SF Pro Display',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  // Headings
  headline: {
    fontFamily: 'SF Pro Display',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  title: {
    fontFamily: 'SF Pro Display',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  // Body
  bodyLarge: {
    fontFamily: 'SF Pro Text',
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'SF Pro Text',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: 'SF Pro Text',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  // Labels
  labelLarge: {
    fontFamily: 'SF Pro Text',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  labelMedium: {
    fontFamily: 'SF Pro Text',
    fontSize: 13,
    fontWeight: '600',
  },
  labelSmall: {
    fontFamily: 'SF Pro Text',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // Caption
  caption: {
    fontFamily: 'SF Pro Text',
    fontSize: 12,
    fontWeight: '400',
    color: 'tertiary',
  },
  // Numeric — for stats, UTR, distances (tabular figures)
  numeric: {
    fontFamily: 'SF Pro Display',
    fontVariant: ['tabular-nums'],
  },
};
```

**Typography rules:**

- Use Display weights (600/700) for hero moments. Stats, big numbers, screen titles.
- Use Text weights (400/600) for everything else.
- Tabular numbers for any aligned numeric data (stats, distances, UTR).
- Negative letter-spacing on Display sizes only. Body text is letter-spacing 0.
- Sentence case everywhere. No Title Case in UI.
- Never use 3+ weights on a single screen.

---

## Spacing (4-point grid)

```typescript
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // Standard edge padding
  xl: 20, // Section gaps
  xxl: 24, // Block gaps
  xxxl: 32, // Major sections
  hero: 48, // Hero padding
};
```

**Spacing rules:**

- Screen edge padding: `lg` (16px)
- Card internal padding: `md` to `lg` (12–16px)
- Section gaps: `xl` (20px)
- Block gaps: `xxl` (24px)
- Vertical rhythm: stack content with `md` between related items, `xl` between sections

---

## Radii

```typescript
export const radii = {
  none: 0,
  sm: 6, // Pills, chips
  md: 10, // Buttons
  lg: 14, // Cards
  xl: 20, // Sheets (top corners)
  full: 9999, // Avatars, fully rounded pills
};
```

---

## Components

### Button (primary)

- Background: `accent.primary` (#1F5D4C)
- Text: `text.inverse` weight 600 size 17
- Padding: 16px vertical, 24px horizontal
- Border radius: `md` (10)
- Pressed: scale 0.98, opacity 0.92, 150ms ease-out
- Full width on screen-level CTAs

### Button (secondary)

- Background: transparent
- Border: 1px `border.secondary`
- Text: `text.primary` weight 600 size 17
- Same dimensions and feedback

### Button (tertiary / link)

- No background, no border
- Text: `accent.primary` weight 600 size 15
- Used for navigation actions ("Edit", "View all")

### Card

- Background: `background.elevated` (#FFFFFF)
- Border: 0.5px `border.primary`
- Radius: `lg` (14)
- Padding: `lg` (16)
- No shadow by default. Shadow only on elevated sheets.

### Pill / chip

- Background: `background.secondary`
- Text: `labelMedium`
- Padding: 6px vertical, 12px horizontal
- Radius: `full`
- Active state: `accent.primary` background, white text

### Avatar

- Sizes: 32 (small), 40 (medium), 56 (large), 80 (profile)
- Always `full` radius
- Initial fallback: `accent.soft` background, `accent.text` initials

### Bottom sheet

- Background: `background.elevated`
- Top corners: `xl` (20)
- Drag handle: 36×4 pill, top center, `border.secondary`
- Backdrop: rgba(10,10,10,0.4)
- Native iOS sheet motion

### Tab bar

- Background: `background.elevated` with 0.5px top border
- Icon: 24px, line weight 1.5 (use `lucide-react-native`)
- Active: `accent.primary`, label visible
- Inactive: `text.tertiary`
- Safe area aware

### Calendar event preview

- Background: `accent.soft` (#E8F0EC)
- Left border: 3px solid `accent.primary`
- Padding: 12px
- Radius: `sm` (6) on right, 0 on left
- Text: `accent.text` for title, slightly muted for time
- Mimics native iOS Calendar event styling so users instantly recognize it as a real event

### Slot picker row

- Background: `background.elevated`
- Border: 0.5px `border.primary`
- Radius: `md` (10)
- Selected state: 1px `accent.primary` border, `accent.soft` background
- Tap target: minimum 56px tall

---

## Motion

```typescript
export const motion = {
  duration: {
    fast: 150, // Tap feedback
    base: 220, // Most transitions
    slow: 300, // Sheet appearance
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)', // Material standard
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  },
};
```

**Motion rules:**

- Screen transitions: native iOS push (slide left/right, system default)
- Modals: native iOS sheet (slide up, swipe to dismiss)
- Tap feedback: scale 0.98 + opacity 0.92 for 150ms
- Skeleton loaders pulse subtly (opacity 0.6 → 1.0, 1.2s loop)
- No bouncy spring animations. No long animations. No decorative motion.
- Reduce Motion respected — fall back to opacity fade.

---

## Iconography

- Library: `lucide-react-native`
- Stroke width: 1.5 for most contexts, 2 for tab bar
- Sizes: 16 (inline), 20 (buttons), 24 (tab bar), 32 (empty states)
- Color matches surrounding text by default

---

## Imagery

- Avatars: square crop, served as circles
- Court photos (future): 16:9 ratio, subtle radius `md`
- No stock photos in onboarding. Use confident type instead.

---

## Empty states

Pattern: large icon, one-line headline (`title`), one-line description (`bodyMedium tertiary`), single CTA.

Tone: never blame the user. Always offer a clear next action.

Examples:

- "No mutual times yet" + "Try expanding to 14 days" CTA
- "No matches yet" + "Find a player" CTA
- "Connect your calendar" + "Get started" CTA

---

## Error states

Tone: calm, factual, with a clear action.

```
Could not sync calendar. → Tap to try again.
That slot is no longer free. → Pick a different time.
We could not find any nearby players. → Try expanding your search.
```

Never use exclamation marks. Never say "Oops" or "Sorry."

---

## Accessibility

- All interactive elements: `accessibilityLabel` and `accessibilityRole`
- Touch targets: minimum 44×44 pt
- Color contrast: AA minimum (4.5:1 text, 3:1 UI)
- Dynamic Type respected
- VoiceOver tested on every release

---

## What this design system rejects

- Gradients. Anywhere.
- Drop shadows on cards. (Sheets only.)
- Skeuomorphism.
- Glass / blur effects beyond native iOS modals.
- Bouncy springs and decorative motion.
- Multiple accent colors competing for attention.
- All caps body text.
- Title Case in buttons.
- Stock illustrations or marketing photos in product UI.
- Three+ font weights on a single screen.
