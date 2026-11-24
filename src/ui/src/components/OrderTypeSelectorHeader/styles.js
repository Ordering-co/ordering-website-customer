import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeIconSize, themeSpace, themeText } from '~/utils/themeTokens'

export const HeaderItem = styled.div`
  /* only a header that opens something has the hand */
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  ${props => themeText(props.theme, 'body', { props: ['size'] })}
  color: ${props => themeColor(props.theme, 'text_muted')};
  /* the label's room: 9ch (about 70px) */
  min-width: 9ch;
  text-align: center;
  white-space: nowrap;
`

export const Option = styled.div`
  display: flex;
  align-items: center;

  /* the order type's icon of the theme's sm size, the xs space from its
     name */
  svg, img {
    width: ${({ theme }) => themeIconSize(theme, 'sm')};
    height: ${({ theme }) => themeIconSize(theme, 'sm')};
    margin: 0;
    margin-inline-end: ${({ theme }) => themeSpace(theme, 'xs')};
    flex-shrink: 0;
  }
`

// A header control (one line, "…" when it truly has no room): its only real
// usage (AppointmentsBusinessListing) is a full-width block, so no fixed
// cap below 380px — the 60px one cut "Drive thru"/"Reservation" for nothing.
export const SelectedOption = styled.p.attrs(({ children, title }) => ({
  title: title ?? (typeof children === 'string' ? children : undefined)
}))`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const ContentOption = styled(SelectedOption)`
  max-width: initial;
`
