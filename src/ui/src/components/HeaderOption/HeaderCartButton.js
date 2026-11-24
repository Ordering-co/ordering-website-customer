import React from 'react'
import styled, { css, keyframes, useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { Button } from '~ui/src/design-system/components/Button'
import { HeaderIcon } from '~ui/src/components/Icon/headerGlyphs'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { Badge } from '~ui/src/styles/Badge'
import { slotButtonOptions } from '~/utils/themeGroups'
import { themeSpace } from '~/utils/themeTokens'
import { motionEasing, themeMotionEnabled } from '~/utils/themeMotion'

// The count is a count badge of the theme (components.badge: primary, sm) over the
// icon's top corner on the end side (the other one in RTL). It is a child of the
// button, out of the flow: the button keeps its icon square with or without it.
// It does not take the pointer: the whole button is the target.
// It hangs above the button but never past its end edge: the cart's
// end edge, badge included, is the page's side, as the menu's start edge is.
// TOKEN-GAP(implementation notes): the badge has no offset token; its overhang above is the space `xs`.
// A product add answers on the badge (implementation notesthe store page's cart is this icon's drawer): it swells and
// settles. Two identical keyframes, taken in turn by `data-count-pulse` 0 / 1, so each add restarts it without
// remounting the button. Movement only when the system allows it and the identity has motion on; with reduced
// motion the count just changes.
// TOKEN-GAP(implementation notes): the swell's scale is not a token; it is a factor of the badge, not a length.
// (They must differ in text: styled-components names a keyframes by its content, and one name twice would not restart.)
const countPulseA = keyframes`
  0% { transform: scale(1.4); }
`
const countPulseB = keyframes`
  from { transform: scale(1.4); }
`

const CartCount = styled(Badge)`
  position: absolute;
  top: calc(-1 * ${({ theme }) => themeSpace(theme, 'xs')});
  inset-inline-end: 0;
  pointer-events: none;
  ${({ theme }) => themeMotionEnabled(theme) && css`
    @media (prefers-reduced-motion: no-preference) {
      &[data-count-pulse='0'] {
        animation: ${countPulseA} ${theme.values.tokens.motion.slow}ms ${motionEasing(theme)} 1;
      }
      &[data-count-pulse='1'] {
        animation: ${countPulseB} ${theme.values.tokens.motion.slow}ms ${motionEasing(theme)} 1;
      }
    }
  `}
`

// From this many units the badge reads "99+" (its width stays small)
const MAX_SHOWN = 99

// What the header's cart looks like without a slot (header.slots.cart): the
// neutral ghost md icon button it always was
const DEFAULT_LOOK = { color: 'neutral', appearance: 'ghost', size: 'md' }

/**
 * The header's cart button (narrow: HeaderOption, wide: CartPopover): a base
 * `Button` of the header group with the look of `header.slots.cart`, the
 * basket and, when `count` is given (null hides it), the count as a badge on
 * the icon (hidden from assistive technology: the button's name carries the
 * count; `pulse`, a counter that grows with each add, restarts the badge's short animation). The button is always the icon square. Everything else (`id`,
 * `aria-label`, handlers, `ref`) goes to the button.
 */
export const HeaderCartButton = React.forwardRef(({ count = null, pulse = 0, ...props }, ref) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const label = count > 0 ? t('MY_CART_WITH_ITEMS', 'My cart (_count_)').replace('_count_', count) : t('MY_CART', 'My cart')
  return (
    <ComponentScope group='header'>
      <Button
        {...slotButtonOptions(theme, 'header', 'cart', DEFAULT_LOOK)}
        shape='icon'
        ref={ref}
        aria-label={label}
        {...props}
      >
        <HeaderIcon name='basketFilled' />
        {count > 0 && <CartCount aria-hidden='true' $variant='primary' $size='sm' $count data-count-pulse={pulse > 0 ? pulse % 2 : undefined}>{count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}</CartCount>}
      </Button>
    </ComponentScope>
  )
})
HeaderCartButton.displayName = 'HeaderCartButton'
