import { getThemeComponent } from '~/utils/themeCss'

const LEVELS = ['h1', 'h2', 'h3', 'h4']

/**
 * The heading tag of a modal title: the level whose size in the theme's
 * typography is the nearest to the size of the title
 * (`components.modal.base.title`).
 */
export const modalTitleLevel = (theme) => {
  const { size } = getThemeComponent(theme, 'modal').base.title
  const { typography } = theme.values.tokens
  let best = 'h2'
  let distance = Infinity
  LEVELS.forEach(level => {
    const d = Math.abs(typography[level].size - size)
    if (d < distance) {
      best = level
      distance = d
    }
  })
  return best
}

/**
 * The heading tag of a section title inside a modal that has a title (the
 * modal title is the dialog's heading): the level below it, h4 at most.
 */
export const modalSectionLevel = (theme) => {
  const index = LEVELS.indexOf(modalTitleLevel(theme))
  return LEVELS[Math.min(index + 1, LEVELS.length - 1)]
}
