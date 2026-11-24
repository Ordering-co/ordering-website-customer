// The dashboard's semantic names (its OrderingUi/tailwind.css), plus the shadcn
// standard ones it lacks (marked «shadcn»), → the theme's tokens (docs/design-system/fase-0.md §1.3),
// as `name: '<runtime variable>'`. Each is written `--ds-<name>` by the
// generator, so `color: var(--ds-primary-foreground)` works in a styled-component
// and in Tailwind alike. Only names: values come from the theme.
export const ALIASES = {
  primary: '--ot-color-primary',
  'primary-foreground': '--ot-color-on-primary',
  'action-foreground': '--ot-color-primary-text', // link text
  // the dashboard's `background` is the controls' surface; in the web `color.background` is only the canvas
  background: '--ot-color-surface',
  foreground: '--ot-color-text',
  // the dashboard's neutral `secondary`, not the web's editable brand `color.secondary`
  secondary: '--ot-color-surface-alt',
  'secondary-foreground': '--ot-color-text',
  muted: '--ot-color-surface-alt',
  'muted-foreground': // shadcn
    '--ot-color-text-muted',
  border: '--ot-color-border',
  input: '--ot-color-border-strong', // controls draw the strong border
  ring: '--ot-focus-ring-color',
  destructive: '--ot-color-danger',
  'destructive-foreground': // shadcn
    '--ot-color-on-danger',
  // shadcn: what floats is `surface`
  card: '--ot-color-surface',
  'card-foreground': '--ot-color-text',
  popover: '--ot-color-surface',
  'popover-foreground': '--ot-color-text',
  // shadcn: the selected state
  accent: '--ot-color-primary-subtle',
  'accent-foreground': '--ot-color-primary-text',
  'radius-md': '--ot-radius-md',
  'radius-sm': '--ot-radius-sm'
}

export const aliasVar = (name) => `--ds-${name}`

// In Tailwind's vocabulary the shadcn/dashboard names above rule: `bg-background`
// is the controls' surface and `bg-secondary` the neutral fill. The web's own
// colors that share those names keep their runtime variable (`--ot-color-*`, a
// theme never changes name or value) and are exposed under their own name:
// token key → Tailwind color name. The pair stays coherent: `brand-secondary`
// goes with `on-brand-secondary`, never with `secondary-foreground`.
export const BRAND_COLORS = {
  background: 'canvas', // the page's canvas (body, home, listings)
  secondary: 'brand-secondary', // the editable brand color
  on_secondary: 'on-brand-secondary',
  secondary_subtle: 'brand-secondary-subtle',
  secondary_pressed: 'brand-secondary-pressed'
}
