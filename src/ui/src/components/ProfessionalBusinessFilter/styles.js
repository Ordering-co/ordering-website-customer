import styled from 'styled-components'
import { themeSpace, themeText, themeSize } from '~/utils/themeTokens'
import { dividerRules } from '~ui/src/styles/Divider'
import { controlMeasureCss } from '~ui/src/design-system/lib/controlMeasure'

export const Container = styled.div`
  margin-bottom: ${props => themeSpace(props.theme, 'xxl')};
  display: flex;
  align-items: center;

  /* the select is a field of components.input */
`

export const FilterWrapper = styled.div`
  display: flex;
  align-items: center;
`

export const FilterItem = styled.div`
  /* the label beside its field (the base Input is a block) */
  display: flex;
  align-items: center;
  span, label {
    ${props => themeText(props.theme, 'body', { props: ['size', 'weight'], weight: 400 })}
    ${props => `margin-${props.theme.rtl ? 'left' : 'right'}: ${themeSpace(props.theme, 'sm')};`}
  }
  /* the fields lg apart (tokens.space) */
  && {
    ${props => `margin-${props.theme.rtl ? 'left' : 'right'}: ${themeSpace(props.theme, 'lg')};`}
  }
`

/* The slot of a price field: its width, the base Input fills it */
export const PriceFieldSlot = styled.div`
  /* the 11ch are the field's own characters */
  ${props => controlMeasureCss(props.theme, 'input')}
  width: ${props => themeSize(props.theme, 'lg')};
  box-sizing: border-box;

  @media (min-width: 500px) {
    width: 11ch; /* ~100px: a price field wider than size.xl, in characters of the text */
  }
`

export const Divider = styled.div`
  /* components.divider vertical */
  ${props => dividerRules(props.theme, 'vertical')}
`

export const SearchWrapper = styled.div`
  width: 100%;
  margin-bottom: ${props => themeSpace(props.theme, 'xl')};
`
