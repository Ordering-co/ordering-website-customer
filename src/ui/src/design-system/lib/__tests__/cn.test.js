import { describe, expect, it } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  it('keeps a size and a color of text that merge would take for one (the case that failed in the spike)', () => {
    expect(cn('ui:text-button ui:text-primary-foreground')).toBe('ui:text-button ui:text-primary-foreground')
    expect(cn('ui:text-button', 'ui:text-on-primary')).toBe('ui:text-button ui:text-on-primary')
    expect(cn('ui:text-h2 ui:text-text-muted')).toBe('ui:text-h2 ui:text-text-muted')
    // a text style's weight is not its size
    expect(cn('ui:text-body ui:font-label')).toBe('ui:text-body ui:font-label')
  })

  it('the class a caller passes wins over the piece\'s own, within one group', () => {
    expect(cn('ui:bg-primary ui:text-on-primary', 'ui:bg-surface')).toBe('ui:text-on-primary ui:bg-surface')
    expect(cn('ui:rounded-md', 'ui:rounded-full')).toBe('ui:rounded-full')
    expect(cn('ui:p-sm ui:px-lg', 'ui:p-md')).toBe('ui:p-md')
    expect(cn('ui:shadow-sm', 'ui:shadow-lg')).toBe('ui:shadow-lg')
    expect(cn('ui:text-body', 'ui:text-h1')).toBe('ui:text-h1')
    expect(cn('ui:h-size-md', 'ui:h-(--ui-button-height)')).toBe('ui:h-(--ui-button-height)')
  })

  it('knows the aliases and the web\'s own names: the canvas, the brand secondary and its text', () => {
    expect(cn('ui:bg-canvas', 'ui:bg-card')).toBe('ui:bg-card')
    expect(cn('ui:bg-brand-secondary ui:text-on-brand-secondary')).toBe('ui:bg-brand-secondary ui:text-on-brand-secondary')
    expect(cn('ui:bg-secondary ui:text-secondary-foreground')).toBe('ui:bg-secondary ui:text-secondary-foreground')
    expect(cn('ui:border-input', 'ui:border-border')).toBe('ui:border-border')
  })

  it('conditions go through clsx', () => {
    expect(cn('ui:flex', false && 'ui:hidden', { 'ui:p-sm': true, 'ui:p-lg': false }, ['ui:gap-xs'])).toBe('ui:flex ui:p-sm ui:gap-xs')
  })
})
