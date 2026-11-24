import styled from 'styled-components'
import { pageGutter, themeSpace, themeValue } from '~/utils/themeTokens'
import { ContainerCard, businessCardSideSpace } from '~ui/src/components/BusinessController/styles'
import { sectionDescriptionCss, sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { alertAttrs, alertRules } from '~ui/src/styles/Alert'

/* tokens.space.xxl under the section */
export const HighestRatedContainer = styled.div`
  padding-bottom: ${props => themeSpace(props.theme, 'xxl')};
`

/* a danger alert of the theme */
export const ErrorMessage = styled.span.attrs(alertAttrs('danger'))`
  margin: 0px ${props => themeSpace(props.theme, 'lg')};
  ${props => alertRules(props.theme, 'danger')}
`

/* The width of a card of the carousel: the share of the row a card of the
   listing's grid takes (its rows of business_listing_page.base.rows), of the
   track's width (BusinessListWrapper), its side spaces out; on a phone most
   of the row, the next one peeking */
const cardWidth = (theme, share) => `calc(${share}cqw - 2 * ${businessCardSideSpace(theme)})`

export const BusinessList = styled.div`
  display: flex;
  box-sizing: border-box;

  ${ContainerCard} {
    flex-shrink: 0;
    width: ${({ theme }) => cardWidth(theme, 85)};
    @media (min-width: 681px) {
      width: ${({ theme }) => cardWidth(theme, 50)};
    }
    @media (min-width: 993px) {
      width: ${({ theme }) => cardWidth(theme, 33.33)};
    }
    @media (min-width: 1400px) {
      width: ${({ theme }) => cardWidth(theme, themeValue(theme, 'business_listing_page', 'base.rows') === 3 ? 33.33 : 25)};
    }
  }
  /* its cards keep the grid's spaces around them (their own margin); the
     first starts where the title does and the last ends as far from the
     edge (tokens.layout.page_gutter) */
  ${ContainerCard}:first-of-type {
    margin-left: ${props => pageGutter(props.theme)}px;
  }
  ${ContainerCard}:last-of-type {
    margin-right: ${props => pageGutter(props.theme)}px;
  }
`

export const Title = styled.h2`
  /* its sides: the page's side space it undoes (tokens.layout.page_gutter) */
  margin: ${props => themeSpace(props.theme, 'md')} ${props => pageGutter(props.theme)}px 0px ${props => pageGutter(props.theme)}px;
  /* the header of a block (components.section_header): its text, color,
     alignment and the space under it */
  ${props => sectionTitleCss(props.theme, { level: props.$level || 'h2', alone: !props.$withDescription })}
`

export const Description = styled.p`
  margin: 0px ${props => pageGutter(props.theme)}px;
  /* its text, color and spaces (components.section_header) */
  ${props => sectionDescriptionCss(props.theme, { level: props.$level || 'h2' })}
`

export const BusinessListWrapper = styled.div`
  overflow: auto hidden;
  width: 100%;
  /* the cards' widths are shares of it (cqw) */
  container-type: inline-size;
`
