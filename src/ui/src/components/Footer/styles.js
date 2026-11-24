import styled from 'styled-components'
import { getThemeCss } from '~/utils/themeCss'
import { themePart } from '~/utils/themeTokens'

/* components.footer (its background, text color and text) on the
   footer, its links (the page's content) in its link color */
const footerLinkColor = (theme) => themePart(theme, 'footer', { color: 'base.link' })

// The footer's padding, its line on top and the space over it
// (components.footer; none over it on the home)
const footerBoxCss = (theme, isHome) => {
  const base = getThemeCss(theme, 'footer').base
  return [
    `padding: ${base.padding_y} ${base.padding_x};`,
    !isHome && `margin-top: ${base.margin_top};`,
    themePart(theme, 'footer', { 'border-top': 'base.border_top' })
  ].filter(Boolean).join('\n')
}

export const Container = styled.footer`
  position: relative;
  ${props => themePart(props.theme, 'footer', { background: 'base.background', color: 'base.color', text: 'base.text' })}
  a, a:visited {
    ${props => footerLinkColor(props.theme)}
  }
  /* its padding, its line on top and the space over it (none on the home) */
  ${props => footerBoxCss(props.theme, props.$isHome)}
`

// The footer's content (the page's HTML): it breaks words only when they do
// not fit
export const FooterContent = styled.div`
  padding: 0px;
  word-break: normal;
  overflow-wrap: anywhere;
`
