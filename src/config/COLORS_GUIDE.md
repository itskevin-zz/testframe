# Color Configuration Guide

## Overview

TestFrame uses a centralized color configuration system defined in `src/config/colors.ts`. This ensures consistent, maintainable styling across the entire application using a pastel and muted color palette.

## Color Palette

### Primary Colors
- **Stone (400/500)**: Used for primary buttons, focus states, and key actions
  - Background: `bg-stone-400`, Hover: `bg-stone-500`
  - Best for: CTA buttons, form focus, active states

### Secondary Colors
- **Slate (50-900)**: Neutral background and text colors
  - Light: `slate-50` (backgrounds), `slate-100-200` (borders)
  - Medium: `slate-300-600` (text, dividers)
  - Dark: `slate-700-900` (headings, strong text)

### Semantic Colors
- **Emerald (Success)**: `emerald-400` (bg), `emerald-600` (text)
- **Rose (Danger)**: `rose-300` (bg), `rose-600` (text)
- **Amber (Warning)**: `amber-300` (bg), `amber-600` (text)
- **Blue (Info)**: `blue-200-700` (for status indicators)

## Using the Color System

### Method 1: Direct Color References

```tsx
import { colors } from '../config/colors';

// Use direct references
<div className={colors.primary.bg}>
<button className={`${colors.danger.bg} hover:${colors.danger.bgHover}`}>
<input className={`${colors.form.input} ${colors.form.inputFocus}`} />
```

### Method 2: Color Helpers

```tsx
import { colorHelpers } from '../config/colors';

// For status badges
<span className={`px-2 py-1 ${colorHelpers.getStatusBadge('Completed')}`}>
  Completed
</span>

// For test results
<span className={colorHelpers.getTestResultBadge('Pass')}>
  Pass
</span>

// For priorities
<span className={colorHelpers.getPriorityBadge('P0')}>
  P0
</span>

// For pass rate
<span className={colorHelpers.getPassRateColor(85)}>
  85%
</span>
```

## Common Color Combinations

### Buttons

**Primary Button:**
```tsx
className={`${colors.primary.bg} hover:${colors.primary.bgHover} text-white ${colors.primary.ring}`}
```

**Secondary Button:**
```tsx
className={`${colors.secondary.border} text-slate-700 ${colors.background.hover}`}
```

**Danger Button:**
```tsx
className={`${colors.danger.bg} hover:${colors.danger.bgHover} text-white`}
```

**Success Button:**
```tsx
className={`${colors.success.bg} hover:${colors.success.bgHover} text-white`}
```

### Form Elements

**Text Input:**
```tsx
className={`border ${colors.form.input} rounded-md py-2 px-3 ${colors.form.inputFocus}`}
```

**Label:**
```tsx
className={`text-sm font-medium ${colors.form.label}`}
```

### Status Badges

**Test Run Status:**
```tsx
className={colorHelpers.getStatusBadge(run.status)}
```

**Test Execution Result:**
```tsx
className={colorHelpers.getTestResultBadge(execution.status)}
```

### Error Messages

```tsx
className={`${colors.danger.bgLight} border ${colors.danger.border} text-${colors.danger.textDark}`}
```

## Color Organization Structure

```
colors
├── primary          // Main brand color (stone)
├── secondary        // Neutral colors (slate)
├── success          // Positive actions (emerald)
├── danger           // Destructive actions (rose)
├── warning          // Alerts/caution (amber)
├── blocked          // Blocked status (amber)
├── nav              // Navigation bar
├── status           // Test run statuses
├── testResults      // Pass/Fail/Blocked/Skip
├── priority         // P0/P1/P2/P3
├── form             // Form elements
├── progress         // Progress bars
├── background       // Card and page backgrounds
├── text             // Text variants
└── ui               // Shadows, borders, dividers
```

## Changing Colors

To update the color palette:

1. **Edit** `src/config/colors.ts`
2. Update the desired color values
3. All components automatically use the new colors
4. No need to update individual component files

### Example: Change Primary Color from Stone to Blue

```typescript
// Before
primary: {
  bg: 'bg-stone-400',
  bgHover: 'bg-stone-500',
  // ...
}

// After
primary: {
  bg: 'bg-blue-400',
  bgHover: 'bg-blue-500',
  // ...
}
```

All buttons using `colors.primary.bg` instantly update across the app.

## Color Accessibility

All color combinations in this system meet WCAG AA contrast requirements:
- Text contrast ratios are ≥ 4.5:1 for normal text
- Focus states are clearly visible
- Color is never the only indicator of information

## Best Practices

1. **Always use the color config** - Don't hardcode color classes
2. **Use semantic names** - Use `colors.danger` for delete buttons, not arbitrary colors
3. **Leverage color helpers** - Use helper functions for badges and status indicators
4. **Maintain consistency** - Use primary for all primary actions, danger for all destructive actions
5. **Test with colorblind simulation** - Ensure colors aren't the only way to convey information

## Color Reference

| Purpose | Color | Classes | Example |
|---------|-------|---------|---------|
| Primary Action | Stone | `bg-stone-400 hover:bg-stone-500` | Create, Save buttons |
| Success | Emerald | `bg-emerald-400 text-emerald-600` | Pass results, Complete status |
| Danger | Rose | `bg-rose-300 hover:bg-rose-400` | Delete buttons, Failed results |
| Warning | Amber | `bg-amber-300 text-amber-600` | Warnings, Blocked results |
| Neutral BG | Slate | `bg-slate-50` | Page background |
| Text | Slate | `text-slate-900` (dark), `text-slate-500` (muted) | All text |
| Border | Slate | `border-slate-300` | Input borders, dividers |

## TypeScript Definitions

The colors object is fully typed, providing IntelliSense support:

```tsx
import { colors } from '../config/colors';

// ✅ TypeScript knows available properties
colors.primary.bg        // ✅
colors.primary.bgInvalid // ❌ Type error
```

This ensures type-safe color usage throughout the application.
