import { getThemeComponent } from './themeCss'
import { themeVisible } from './themeVisibility'

/**
 * The rules of the product options (extras → options → sub-options) of the
 * theme (`components.product_option`).
 */

// An option nested deeper than this stays at this level
export const MAX_NESTING_LEVEL = 2

/** `components.product_option.base`. */
export const productOptionBase = (theme) => getThemeComponent(theme, 'product_option').base

/** How a nested option is drawn: line | indent | none. */
export const nestingMode = (theme) => productOptionBase(theme).nesting

/** Which groups start collapsed: none | optional | all. */
export const collapsedMode = (theme) => productOptionBase(theme).collapsed

/**
 * Whether a group starts collapsed: `collapsed` (none: every group open,
 * optional: the groups with min 0, all: every group).
 */
export const optionStartsCollapsed = (theme, option) => {
  const optional = !(option?.min > 0)
  const mode = collapsedMode(theme)
  if (mode === 'all') return true
  if (mode === 'optional') return optional
  return false
}

/**
 * How deep each option of the product is nested (`{ [optionId]: level }`):
 * an option shown because a sub-option was chosen (`respect_to`) is one level
 * below the option of that sub-option; at most MAX_NESTING_LEVEL.
 */
export const optionNestingLevels = (extras) => {
  const options = (Array.isArray(extras) ? extras : []).flatMap((extra) => (Array.isArray(extra?.options) ? extra.options : []))
  const owner = {}
  options.forEach((option) => {
    (Array.isArray(option?.suboptions) ? option.suboptions : []).forEach((suboption) => {
      if (suboption?.id != null) owner[suboption.id] = option
    })
  })
  const levelOf = (option, seen) => {
    if (option?.respect_to == null || seen.has(option.id)) return 0
    const parent = owner[option.respect_to]
    if (!parent) return 0
    seen.add(option.id)
    return 1 + levelOf(parent, seen)
  }
  const levels = {}
  options.forEach((option) => {
    if (option?.id != null) levels[option.id] = Math.min(levelOf(option, new Set()), MAX_NESTING_LEVEL)
  })
  return levels
}

/** An image the API really has (`-` is none). */
export const hasImage = (image) => typeof image === 'string' && !!image.trim() && image !== '-'

/** Whether the options show images (visibility `product.options.image`). */
export const imagesVisible = (theme) => themeVisible(theme, 'product.options.image')

/** Whether any shown sub-option of a group has an image. */
export const groupHasImages = (option) =>
  (Array.isArray(option?.suboptions) ? option.suboptions : []).some((suboption) => suboption?.enabled !== false && hasImage(suboption?.image))

/**
 * Whether every row of a group reserves the image box (images
 * visible and any sub-option of the group has one). False otherwise.
 */
export const reservesImageBox = (theme, option) => imagesVisible(theme) && groupHasImages(option)

/** Whether the group shows its own image. */
export const showsOptionImage = (theme, option) => imagesVisible(theme) && hasImage(option?.image)

/** The "Required" badge: only when at least one sub-option must be chosen. */
export const showsRequiredBadge = (option) => (option?.min ?? 0) >= 1

// An abbreviation with one dot: some translations already end in it ("máx.")
const abbr = (word) => (String(word).endsWith('.') ? word : `${word}.`)

/**
 * The group's limits as neutral text ("Choose 2", "Max. 3",
 * "Min. 1", "Min. 1 - Max. 3"); the required state is the badge's.
 */
export const optionMaximumText = (t, max) => `${abbr(t('MAX', 'Max'))} ${max}`

export const optionLimitText = (t, option) => {
  const min = option?.min ?? 0
  const max = option?.max ?? 0
  if (min > 0 && max > 0 && min === max) return `${t('CHOOSE', 'Choose')} ${min}`
  if (min === 0 && max > 0) return optionMaximumText(t, max)
  if (min > 0 && max === 0) return `${abbr(t('MIN', 'Min'))} ${min}`
  if (min > 0 && max > 0) return `${abbr(t('MIN', 'Min'))} ${min} - ${abbr(t('MAX', 'Max'))} ${max}`
  return ''
}

/** A price worth showing (0 shows nothing). */
export const showsPrice = (price) => Number(price) > 0

/**
 * Whether a group is a single choice (today's radio icons): one sub-option
 * that must be chosen. The rest are multiple choices (today's check icons).
 */
export const isSingleChoice = (option) =>
  !((option?.min === 0 && option?.max === 1) || option?.max > 1 || option?.max == null)

/**
 * Whether a sub-option that is not chosen cannot be chosen because its group
 * reached its max: the same test that opens today's "Maximum options to
 * choose" alert.
 */
export const suboptionMaxReached = ({ option, state, balance, usePizzaValidation }) => {
  if (state?.selected) return false
  if (option?.with_half_option) return !!usePizzaValidation
  return balance === option?.max &&
    (option?.suboptions?.length ?? 0) > balance &&
    !(option?.min === 1 && option?.max === 1)
}

/**
 * The error a group shows: only after the first "Add" attempt.
 */
export const shownOptionError = (_theme, error, addAttempted) => addAttempted ? error : false

/** The count used by ProductForm's controller when it validates a group's limits. */
export const optionSelectionCount = (option, cart, pizzaState) => {
  const suboptions = cart?.options?.[`id:${option.id}`]?.suboptions
  if (!suboptions) return 0
  if (option.with_half_option) return pizzaState?.[`option:${option.id}`]?.value
  if (option.limit_suboptions_by_max) {
    return Object.values(suboptions).reduce((count, suboption) => count + suboption.quantity, 0)
  }
  return Object.keys(suboptions).length
}
