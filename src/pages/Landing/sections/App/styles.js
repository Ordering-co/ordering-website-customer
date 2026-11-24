import styled, { css } from 'styled-components'
import { pageGutter, themeSpace, themeText } from '~/utils/themeTokens'
import { contentColumn } from '../shared/styles'

// A band under the menu's sections: the title and its line, the store buttons beside them
export const Band = styled.section`
  box-sizing: border-box;
  background: var(--ot-color-surface-alt);
  color: var(--ot-color-text);
  padding: ${({ theme }) => themeSpace(theme, 'xxxl')} ${({ theme }) => pageGutter(theme)}px;
`

// in the page's content column, so its title lines up with the other sections'
export const Inner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  ${({ theme }) => contentColumn(theme)}
  gap: ${({ theme }) => themeSpace(theme, 'xl')};
`

export const Copy = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'xs')};`}
`

export const Title = styled.h2`
  margin: 0;
  ${({ theme }) => themeText(theme, 'h2', { props: ['size', 'weight', 'line', 'family'] })}
`

export const Text = styled.p`
  margin: 0;
  color: var(--ot-color-text-muted);
  ${({ theme }) => themeText(theme, 'body', { props: ['size', 'weight', 'line', 'family'] })}
`

export const Stores = styled.div`
  display: flex;
  flex-wrap: wrap;
  ${({ theme }) => css`gap: ${themeSpace(theme, 'sm')};`}
`
