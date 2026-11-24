import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeSpace, themeText, themeScrollbar } from '~/utils/themeTokens'
import { productSectionPx } from '~ui/src/components/BusinessProductsList/styles'
import { sectionTitleTextCss } from '~ui/src/styles/SectionHeader'

export const Container = styled.div`
  margin: 0px;
  ${props => props.theme.rtl && css`
    margin-left: ${props => themeSpace(props.theme, 'xxl')};
    margin-right: 0px;
  `}
  ${({ isGroceries }) => isGroceries && css`
    padding-top: 0px;
    margin-right: 0px;
    margin-left: 0px;
  `}

  @media (min-width: 993px) {
    margin-right: ${props => themeSpace(props.theme, 'xxl')};
  }
`

export const ContentHeader = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};

  > h2 {
    ${props => headingText(props.theme, 'h2')}
    margin: 0px;
    /* a section title (section_header: its text and color) */
    ${props => sectionTitleTextCss(props.theme, { level: 'h2' })}
  }
  p {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight', 'line'], weight: 400 })}
    margin: 0px;
    color: ${props => themeColor(props.theme, 'text_muted')};
  }
  ${({ isGroceries }) => isGroceries && css`
    ${props => props.theme.rtl
? css`
      margin-right: ${props => themeSpace(props.theme, 'md')};
    `
: css`
      margin-left: ${props => themeSpace(props.theme, 'md')};
    `}
  `}
`

export const ProductListWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;
  ::-webkit-scrollbar {
    width: ${props => themeScrollbar(props.theme).size};
    height: ${props => themeScrollbar(props.theme).size};
  }
`

export const ProductList = styled.div`
  display: flex;
  flex-direction: row;
  box-sizing: border-box;
  align-items: center;

  #orderItAgain > div {
    @media (min-width: 768px) {
      /* product_section.base.carousel_item_width */
      width: ${({ theme }) => productSectionPx(theme, 'carousel_item_width')};
    }
  }
`
