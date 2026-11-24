import { expect } from '@playwright/test'

// The phone sheet renders outside the calling section. Follow the trigger's
// relationship to its list instead of searching either the trigger or the page text.
export const openSelectList = async (section) => {
  const trigger = section.getByRole('button', { includeHidden: true })
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-controls', /.+/)
  const id = await trigger.getAttribute('aria-controls')
  return section.page().getByRole('listbox').and(section.page().locator(`[id=${JSON.stringify(id)}]`))
}
