import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, pageGutter, themeBorderStyle, themeBorderWidth, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'

// The preview's own furniture, painted from the theme like any screen of the
// app (styled-components + the theme's helpers): the pieces under test are what
// is built with the design system.

export const Page = styled.main`
  box-sizing: border-box;
  margin: 0 auto;
  padding: ${({ theme }) => `${themeSpace(theme, 'xl')} ${pageGutter(theme)}px calc(${themeSpace(theme, 'xxxl')} * 3)`};
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xxl')};
  max-width: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 20)`};
`

export const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => headingText(theme, 'h1')}
`

export const Section = styled.section`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  padding-top: ${({ theme }) => themeSpace(theme, 'lg')};
  border-top: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} ${themeBorderStyle(theme)} ${themeColor(theme, 'border')}`};
`

export const SectionTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => headingText(theme, 'h3')}
`

export const Note = styled.p`
  margin: 0;
  max-width: 70ch;
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body')}
`

export const Caption = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'caption')}
`

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${themeSpace(theme, 'sm')} ${themeSpace(theme, 'lg')}`};
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 3)`}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

const PendingBox = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'xxs')};
  padding: ${({ theme }) => `${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')}`};
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  border: ${({ theme }) => `${themeBorderWidth(theme, 'thin', { fixed: true })} dashed ${themeColor(theme, 'border_strong')}`};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

/** The place of a piece nobody has built yet: its section file replaces this. */
export const Pending = ({ piece, file }) => (
  <PendingBox>
    <strong>{piece} is not built yet</strong>
    <Caption>Replace this in {file} with the piece in each of its states, in every theme above.</Caption>
  </PendingBox>
)
