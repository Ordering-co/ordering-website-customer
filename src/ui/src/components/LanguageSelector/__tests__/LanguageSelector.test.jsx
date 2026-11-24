import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../../../__tests__/helpers/testUtils'
import { themeWithValues } from '../../../styles/__tests__/themeTestUtils'
import { componentVars } from '~ui/src/design-system/lib/componentVars'
import { LanguageSelector } from '../index'

const order = vi.hoisted(() => ({ loading: false }))
vi.mock('~components/contexts/OrderContext', () => ({ useOrder: () => [{ loading: order.loading }] }))

vi.mock('~components/components/LanguageSelector', () => ({
  LanguageSelector: ({ UIComponent, ...rest }) => (
    <UIComponent
      languagesState={{
        loading: false,
        languages: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' }
        ]
      }}
      currentLanguage='en'
      handleChangeLanguage={vi.fn()}
      {...rest}
    />
  )
}))

// implementation notesthe header's language select is the base Select, sized by header.slots.language
describe('LanguageSelector', () => {
  it('is the base Select: named Language, the code closed, the size of the header slot', () => {
    order.loading = false
    const theme = themeWithValues((values) => {
      values.components.header.slots = { ...values.components.header.slots, language: { size: 'lg' } }
      return values
    })
    const { getByRole } = renderWithProviders(<LanguageSelector />, { theme })
    const trigger = getByRole('combobox', { name: 'Language' })
    expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
    expect(trigger).toHaveTextContent('EN')
    expect(trigger.style.getPropertyValue('--ui-input-height')).toBe(componentVars(theme, 'input', { variant: 'default', radius: 'md', size: 'lg' })['--ui-input-height'])
  })

  it('is disabled while the order loads, unless notReload', () => {
    order.loading = true
    const view = renderWithProviders(<LanguageSelector />, { theme: themeWithValues() })
    expect(view.getByRole('combobox', { name: 'Language' })).toBeDisabled()
    view.unmount()
    const again = renderWithProviders(<LanguageSelector notReload />, { theme: themeWithValues() })
    expect(again.getByRole('combobox', { name: 'Language' })).not.toBeDisabled()
    order.loading = false
  })
})
