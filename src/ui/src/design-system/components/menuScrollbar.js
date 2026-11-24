import { themeColor } from '~/utils/themeColors'
import { themeScrollbar } from '~/utils/themeTokens'

export const MENU_SCROLLBAR = [
  'ui:[&::-webkit-scrollbar]:w-(--ui-select-scrollbar-size) ui:[&::-webkit-scrollbar]:h-(--ui-select-scrollbar-size)',
  'ui:[&::-webkit-scrollbar-track]:bg-transparent ui:[&::-webkit-scrollbar-thumb]:bg-(--ui-select-scrollbar-thumb) ui:[&::-webkit-scrollbar-thumb]:rounded-(--ui-select-scrollbar-radius)',
  'ui:supports-[not(selector(::-webkit-scrollbar))]:[scrollbar-width:thin] ui:supports-[not(selector(::-webkit-scrollbar))]:[scrollbar-color:var(--ui-select-scrollbar-thumb)_transparent]'
]

export const menuScrollbarVars = (theme, radius) => {
  const bar = themeScrollbar(theme)
  return {
    '--ui-select-scrollbar-size': bar.size,
    '--ui-select-scrollbar-thumb': themeColor(theme, 'border_strong'),
    '--ui-select-scrollbar-radius': Number.parseFloat(radius) > 0 ? bar.radius : '0'
  }
}
