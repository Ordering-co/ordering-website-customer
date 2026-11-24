import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { cssFor, injectedCss, themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { LanguageSelectorList } from '../index'

const handleChangeLanguage = vi.hoisted(() => vi.fn())

vi.mock('~components/components/LanguageSelector', () => ({
  LanguageSelector: ({ UIComponent, ...rest }) => (
    <UIComponent
      languagesState={{
        loading: false,
        languages: [
          { code: 'en', name: 'English', image: 'https://flags.test/en.png' },
          { code: 'es', name: 'Spanish' }
        ]
      }}
      currentLanguage='es'
      handleChangeLanguage={handleChangeLanguage}
      {...rest}
    />
  )
}))

const theme = (mutate = () => {}) => themeWithValues((values) => {
  const choice = values.components.choice
  choice.base.background = '#FFFFFF'
  choice.variants.default.states.selected = { background: '#FFEBE0', border: { width: 1, color: '#FF5500', style: 'solid' }, color: '#111111' }
  mutate(choice)
  return values
})

// CSS of every class of the element (the option also carries `language-choice`)
const cssOf = (el) => {
  const rules = injectedCss().split('}')
  return Array.from(el.classList).map((cls) => rules.filter((rule) => rule.includes(`.${cls}`)).join('}')).join('}')
}

describe('LanguageSelectorList (components.choice)', () => {
  it('theme: the languages are a group of action rows 10px apart, the current one pressed', () => {
    const { getAllByRole, getByRole, queryByTestId } = renderWithProviders(<LanguageSelectorList />, { theme: theme() })
    expect(cssFor(getByRole('group'))).toContain('gap:10px')
    const [english, spanish] = getAllByRole('button')
    expect(english).toHaveTextContent('English')
    expect(english).toHaveAttribute('data-slot', 'choice')
    expect(english).toHaveAttribute('aria-pressed', 'false')
    expect(spanish).toHaveAttribute('aria-pressed', 'true')
    expect(spanish).toHaveAttribute('data-checked')
    expect(spanish.style.getPropertyValue('--ui-choice-selected-background')).toBe('#FFEBE0')
    // the flag is decorative: the name of the row is the language
    expect(english.querySelector('img')).toHaveAttribute('alt', '')
    expect(english).toHaveAccessibleName('English')
    expect(spanish.querySelector('[data-slot="choice-indicator"]')).not.toBeNull()
    expect(queryByTestId('icon-radioChecked')).toBeNull()
  })

  it('theme: picking a language calls the controller (also the current one); the arrows select nothing; no indicator without show_indicator', () => {
    handleChangeLanguage.mockClear()
    const { getAllByRole } = renderWithProviders(<LanguageSelectorList />, { theme: theme((choice) => { choice.base.show_indicator = false }) })
    const [english, spanish] = getAllByRole('button')
    fireEvent.click(english)
    expect(handleChangeLanguage).toHaveBeenLastCalledWith('en')
    fireEvent.click(spanish)
    expect(handleChangeLanguage).toHaveBeenLastCalledWith('es')
    // changing the language reloads the page: a key that is not a press picks nothing
    handleChangeLanguage.mockClear()
    fireEvent.keyDown(english, { key: 'ArrowDown' })
    fireEvent.keyDown(spanish, { key: 'ArrowUp' })
    expect(handleChangeLanguage).not.toHaveBeenCalled()
    expect(spanish.querySelector('[data-slot="choice-indicator"]')).toBeNull()
  })

  it('theme: the flag is an icon of the theme (tokens.icon.lg)', () => {
    const { getAllByRole } = renderWithProviders(<LanguageSelectorList />, { theme: themeWithValues((values) => { values.tokens.icon.lg = 30; return values }) })
    const flag = getAllByRole('button')[0].querySelector('img').parentElement
    expect(cssOf(flag).replace(/\s/g, '')).toMatch(/width:30px;height:30px;/)
  })
})
