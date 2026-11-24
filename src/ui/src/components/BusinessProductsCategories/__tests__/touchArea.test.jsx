import React from 'react'
import { describe, expect, it } from 'vitest'
import { injectedCss, renderWith, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { TabsAction, TabsNavigation } from '~ui/src/design-system/components/Tabs'
import { CategoriesContainer } from '../styles'

// implementation notesthe tabs of the categories' bar (and the menu one) answer to at
// least 44 px with a coarse pointer (a phone), without changing their box.
// jsdom applies no @media, so the rule is read from the stylesheet.

const barCss = () => {
  const { getByTestId, unmount } = renderWith(themeWithValues(), <CategoriesContainer data-testid='bar' />)
  const cls = [...getByTestId('bar').classList].find((c) => injectedCss().includes(`.${c}{`))
  unmount()
  return injectedCss().split('}').filter((rule) => rule.includes(`.${cls}`)).join('}') + '}'
}

describe('categories bar: the touch area of its tabs (44 px)', () => {
  it('with a coarse pointer the tab has a centered touch target over its unchanged box', () => {
    const { getByRole } = renderWith(themeWithValues(), (
      <TabsNavigation mode='section'>
        <TabsAction onClick={() => {}}>Drinks</TabsAction>
      </TabsNavigation>
    ))
    const { className } = getByRole('button', { name: 'Drinks' })
    expect(className).toContain('ui:before:-translate-y-1/2')
    expect(className).toContain('ui:pointer-coarse:before:min-w-[44px]')
    expect(className).toContain('ui:pointer-coarse:before:min-h-[44px]')
  })

  it('the active tab\'s indicator keeps ::after', () => {
    expect(barCss()).not.toContain('::after')
  })

  it('the bar itself is 44 px tall at least with a coarse pointer, its tabs centered, so the area reaches 44', () => {
    expect(barCss()).toMatch(/@media \(pointer:coarse\)\{ ?\.[\w-]+\{min-height:44px;[^}]*align-items:center;/)
  })
})
