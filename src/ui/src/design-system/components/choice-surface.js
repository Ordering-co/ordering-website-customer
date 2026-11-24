import { getThemeCss } from '~/utils/themeCss'
import { themeBorderWidth } from '~/utils/themeTokens'
import { componentVars } from '../lib/componentVars'

export const choicePaint = [
  // at least the height of its size: a row may wrap
  'ui:min-h-(--ui-choice-height) ui:rounded-(--ui-choice-radius) ui:[box-shadow:var(--ui-choice-shadow)]',
  'ui:bg-(--ui-choice-background) ui:text-(--ui-choice-color) ui:[border:var(--ui-choice-rest-border)]',
  'ui:font-(family-name:--ui-choice-text-family) ui:text-(length:--ui-choice-text-size) ui:leading-(--ui-choice-text-line) ui:font-(weight:--ui-choice-text-weight)',
  'ui:[letter-spacing:var(--ui-choice-text-letter-spacing,normal)] ui:[text-transform:var(--ui-choice-text-transform,none)]',
  'ui:cursor-pointer ui:data-disabled:cursor-not-allowed',
  // the colors of a state move (at once, or as the theme says), never the box
  'ui:motion-safe:transition-[color,background-color,border-color,box-shadow,opacity] ui:motion-safe:duration-(--ui-choice-motion-duration) ui:motion-safe:ease-(--ui-choice-motion-easing)',
  // the theme's hover answers an enabled, unselected option
  // (`data-hovered`: the pointer is on something of the row's that is out of it, as a card's actions)
  'ui:not-data-checked:not-data-disabled:not-data-readonly:hover:bg-[color:var(--ui-choice-hover,var(--ui-choice-background))]',
  'ui:fine-hover:not-data-checked:not-data-disabled:not-data-readonly:data-hovered:bg-[color:var(--ui-choice-hover,var(--ui-choice-background))]',
  // selected: its background, border (the resting border's width, so the row never resizes) and color
  'ui:data-checked:bg-[color:var(--ui-choice-selected-background,var(--ui-choice-background))]',
  'ui:data-checked:[border:var(--ui-choice-chosen-border)]',
  'ui:data-checked:text-[color:var(--ui-choice-selected-color,var(--ui-choice-color))]'
]

export const choiceIconClass = 'ui:inline-flex ui:justify-center ui:px-md ui:py-sm ui:[line-height:1]! ui:text-[length:var(--ot-icon-lg)]'

// The border keeps its width in every state, so choosing an option does not
// resize it: the resting border's, else the selected one's (else the thin one);
// with no resting border that width is reserved, transparent; the selected
// state changes style and color only. (A border is `<width> <style> <color>`.)
export const choiceVars = (theme, size) => {
  const { base, variants } = getThemeCss(theme, 'choice')
  const own = (border) => (border && border !== 'none' ? border : null)
  const resting = own(base.border)
  const chosen = own(variants.default.states.selected?.border)
  const width = (resting ?? chosen)?.split(' ')[0] ?? themeBorderWidth(theme, 'thin', { fixed: true })
  return {
    ...componentVars(theme, 'choice', { size, variant: 'default', radius: 'md' }),
    '--ui-choice-border-width': width,
    '--ui-choice-rest-border': resting ?? `${width} solid transparent`,
    '--ui-choice-chosen-border': chosen ? `${width} ${chosen.slice(chosen.indexOf(' ') + 1)}` : (resting ?? `${width} solid transparent`)
  }
}
