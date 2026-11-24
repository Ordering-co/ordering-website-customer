import React from 'react'
import styled from 'styled-components'
import { Button } from '~ui/src/design-system/components/Button'
import { themeRadius, blockStill } from '~/utils/themeTokens'
import { sectionTitleGap } from '~ui/src/styles/DetailsSection'
import { checkoutGap } from '~ui/src/components/Checkout/checkoutTheme'

export const AddressContainer = styled.div`
  display: flex;
  flex-direction: column;

  /* a section of the checkout, section_gap (components.checkout, its multi
     variant on the multi-checkout) apart from the sections around it,
     whichever they are */
  margin: ${({ $multi, theme }) => checkoutGap(theme, { multi: $multi })} 0;
`

// "Show map": a button of components.link (md) at the start of the section's column
export const ShowMapLink = (props) => (
  <Button {...props} appearance='link' type='button' style={{ alignSelf: 'flex-start' }} />
)

export const WrappMap = styled.div`
  width: 100%;
  height: auto;
  /* one gap below the address line */
  margin: ${({ theme }) => sectionTitleGap(theme)} 0 0;
`

export const Map = styled.div`
  font-size: 100%;

  img {
    width: 100%;
    height: auto;
    display: block;
    /* the radius of a content container (components.card) */
    border-radius: ${props => themeRadius(props.theme, 'lg', 'card')};
    -webkit-user-drag: none;
    /* a photo's box is fluid: its width and a 16:9 shape, reserved before the lazy load */
    aspect-ratio: 16 / 9;

    &:hover {
      transform: scale(1.02);
    }
    ${props => blockStill(props.theme)}
  }
`
