import { componentVars } from './componentVars'

// The states that answer only an enabled control; a native `disabled` or an anchor's `aria-disabled`
const ENABLED = ':not(:disabled, [aria-disabled=true])'
const DISABLED = '&:disabled, &[aria-disabled=true]'

/**
 * The look of the base `Button` for an element React does not render (the smart app banner
 * builds its links in the page, outside the tree): the body of a rule, to put inside the
 * element's selector in a styled-components / stylis block (it nests `&:hover`, `@media`).
 * It writes the `--ui-button-*` variables of `components.button` for the selection, then
 * paints from them as the piece's classes do (`Button.jsx` BASE: the same variables, the same
 * fallbacks hover → pressed → resting, the disabled colors with no opacity), so a theme that
 * changes the button changes it too. A test keeps both lists of variables equal.
 *
 * `size`, `color`, `appearance`, `shape` are the Button's (`icon`: a square of the size's height).
 * The icon's size is not here (a descendant rule of the piece, and these elements have no svg).
 * The text color is `!important`, as the Button's: a link takes the page's link color otherwise.
 * An anchor is not a flex item of a button's box: it is made one (`inline-flex`, centered).
 */
export const buttonSkinCss = (theme, { size = 'md', color = 'primary', appearance = 'solid', shape } = {}) => {
  const vars = componentVars(theme, 'button', { size, shape: shape === 'icon' ? 'icon' : undefined, color, appearance })
  const declared = Object.entries(vars).map(([name, value]) => `${name}: ${value};`).join('\n')
  return `
    ${declared}
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    margin: 0;
    ${shape === 'icon' ? 'width: var(--ui-button-height);\n    padding: 0;' : 'padding: 0 var(--ui-button-padding-x);'}
    height: var(--ui-button-height);
    gap: var(--ui-button-icon-gap);
    border-radius: var(--ui-button-radius);
    background: var(--ui-button-background);
    color: var(--ui-button-color) !important;
    border: var(--ui-button-border);
    box-shadow: var(--ui-button-shadow);
    font-family: var(--ui-button-text-family);
    font-size: var(--ui-button-text-size);
    line-height: var(--ui-button-text-line);
    font-weight: var(--ui-button-text-weight);
    letter-spacing: var(--ui-button-text-letter-spacing, normal);
    text-transform: var(--ui-button-text-transform, none);
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    @media (prefers-reduced-motion: no-preference) {
      transition: color var(--ui-button-motion-duration) var(--ui-button-motion-easing), background-color var(--ui-button-motion-duration) var(--ui-button-motion-easing), border-color var(--ui-button-motion-duration) var(--ui-button-motion-easing), box-shadow var(--ui-button-motion-duration) var(--ui-button-motion-easing);
    }
    &:hover${ENABLED} {
      background: var(--ui-button-hover-background, var(--ui-button-pressed-background, var(--ui-button-background)));
      color: var(--ui-button-hover-color, var(--ui-button-pressed-color, var(--ui-button-color))) !important;
      border: var(--ui-button-hover-border, var(--ui-button-pressed-border, var(--ui-button-border)));
      box-shadow: var(--ui-button-hover-shadow, var(--ui-button-pressed-shadow, var(--ui-button-shadow)));
    }
    &:active${ENABLED} {
      background: var(--ui-button-pressed-background, var(--ui-button-background));
      color: var(--ui-button-pressed-color, var(--ui-button-color)) !important;
      border: var(--ui-button-pressed-border, var(--ui-button-border));
      box-shadow: var(--ui-button-pressed-shadow, var(--ui-button-shadow));
    }
    ${DISABLED} {
      background: var(--ui-button-disabled-background, var(--ui-button-background));
      color: var(--ui-button-disabled-color, var(--ui-button-color)) !important;
      border: var(--ui-button-disabled-border, var(--ui-button-border));
      box-shadow: var(--ui-button-disabled-shadow, var(--ui-button-shadow));
      cursor: not-allowed;
    }
    /* the touch area grows around the painted box, as the Button's */
    @media (pointer: coarse) {
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        /* touch-target */ min-width: 44px;
        /* touch-target */ min-height: 44px;
        transform: translate(-50%, -50%);
      }
    }
  `
}
