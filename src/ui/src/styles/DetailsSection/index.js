import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { headingText, themeSpace, themeText } from '~/utils/themeTokens'

/* The detail sections of the checkouts (Customer Details, Delivery Address)
   share one look, so they read as a list: the title (an h2 of the page in the
   h4 of the theme; the checkouts give it their section_title) in a row with its
   action (a base Button at the end), one gap above the lines, the
   lines in the body text of the theme, one space between the sections. Only
   rendered. The gaps are the theme's spaces (sm under the title, xl between
   sections). */
export const sectionTitleGap = (theme) => themeSpace(theme, 'sm')

// A line of a section (a name, an email, an address): the body text.
export const sectionLineRules = (theme) => `
  ${themeText(theme, 'body')}
  color: ${themeColor(theme, 'text')};
  margin: 0;
`

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  margin-bottom: ${({ theme }) => sectionTitleGap(theme)};

  h2, h4 {
    margin: 0;
    ${({ theme }) => headingText(theme, 'h4')}
    color: ${({ theme }) => themeColor(theme, 'text')};
  }
`

export const SectionLine = styled.p`
  ${({ theme }) => sectionLineRules(theme)}
  overflow-wrap: anywhere;
`
