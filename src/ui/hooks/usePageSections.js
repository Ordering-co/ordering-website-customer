import React, { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { useWindowSize } from './useWindowSize'
import { MOBILE_WEB_MAX_WIDTH } from '../../utils/themeCss'
import { pageSections } from '../../utils/themePages'

/**
 * Sections of a page as the theme orders and hides them (see
 * src/utils/themePages.js).
 *
 * - `isVisible(key)`: whether the section is painted;
 * - `render(renderers, { group })`: the visible sections of `group` (all when
 *   omitted) that have a renderer, in the theme's order. `renderers` maps a
 *   section key to a function returning its node; a section without a
 *   renderer is skipped.
 */
export const usePageSections = (page) => {
  const theme = useTheme()
  const { width } = useWindowSize()
  const mobile = typeof width === 'number' && width < MOBILE_WEB_MAX_WIDTH
  const sections = useMemo(() => pageSections(theme, page, { mobile }), [theme, page, mobile])

  const isVisible = (key) => {
    const section = sections.find((item) => item.key === key)
    return section ? section.visible : true
  }

  const render = (renderers, { group } = {}) => sections
    .filter((section) => section.visible && (group === undefined || section.group === group) && typeof renderers?.[section.key] === 'function')
    .map((section) => <React.Fragment key={section.key}>{renderers[section.key]()}</React.Fragment>)

  return { sections, isVisible, render }
}
