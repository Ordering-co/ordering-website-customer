import { MenuItemButton } from '~ui/src/design-system/components/ButtonAppearances'
import React from 'react'
import styled from 'styled-components'

export const CategoryLabel = styled.span`
  width: 90%;
`

export const CategoryChevron = styled.span`
  display: flex;
  align-items: center;
`

/* The indentation belongs to the category tree. It applies equally when
   the row opens its subcategories and when All selects the category. */
export const CategoryTab = ({ categorySpace = 0, active, ...props }) => (
  <MenuItemButton
    {...props}
    menuSelected={active}
    style={{ width: `calc(100% - ${categorySpace}px)`, marginLeft: categorySpace }}
  />
)
