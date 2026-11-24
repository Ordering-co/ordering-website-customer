import styled from 'styled-components'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { linkThemeRules } from '~ui/src/styles/Link'
import { sectionTitleCss } from '~ui/src/styles/SectionHeader'
import { fieldActionsGap } from '~ui/src/styles/Field'

export const Container = styled.div`
  text-align: center;
  box-sizing: border-box;
  * {
    box-sizing: border-box;
  }
`
export const HeaderSection = styled.div`
`
/* a heading of the content (the level under the modal's
   title) with the title of components.section_header and its space under
   it, centered with the rest */
export const Title = styled.p`
  margin: 0;
  ${props => sectionTitleCss(props.theme, { level: 'h2', aligned: false })}
`
export const LogoImage = styled.img`
  width: 100%;
  object-fit: cover;

  /* the four approval images in one box (§2.3): up to 68ch wide,
     3:2, filled */
  display: block;
  max-width: min(100%, 68ch);
  height: auto;
  aspect-ratio: 3 / 2;
  margin: 0 auto;
`
// xl under the image
export const BodySection = styled.div`
  margin-top: ${({ theme }) => themeSpace(theme, 'xl')};
`
export const DescriptionContainer = styled.div`
`
/* a paragraph of the body_lg text, xs between paragraphs; a long word (the
   project, an email) breaks only where it must */
export const Description = styled.p`
  ${props => themeText(props.theme, 'body_lg')}
  margin-top: 0;
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};
  overflow-wrap: anywhere;
  /* the emphasis has no weight of the theme (exception) */
  > .bigger {
    font-weight: 600;
  }
  > .italic {
    font-style: italic;
  }
  /* the contact link of components.link (lg, in the sentence) */
  ${({ theme }) => `&& > a { ${linkThemeRules(theme, { size: 'lg' })} }`}
`
/* the project and the dashboard: each name (end-aligned) and its value
   (start-aligned) side by side, lg apart, xxl under the description */
export const ProjectInfo = styled.dl`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: baseline;
  width: 100%;
  margin: ${({ theme }) => themeSpace(theme, 'xxl')} 0 0;
  column-gap: ${({ theme }) => themeSpace(theme, 'lg')};
  row-gap: ${({ theme }) => themeSpace(theme, 'xs')};
  dt {
    text-align: end;
    /* the emphasis has no weight of the theme (exception) */
    font-weight: 600;
  }
  dd {
    margin: 0;
    text-align: start;
    overflow-wrap: anywhere;
  }
  /* the dashboard link of components.link */
  ${({ theme }) => `&& dd > a { ${linkThemeRules(theme)} }`}
`
/* the actions, the form's actions_gap under the content, xl under them */
export const FooterSection = styled.div`
  margin: ${({ theme }) => `${fieldActionsGap(theme)} 0 ${themeSpace(theme, 'xl')}`};
`
/* the one action, centered (its whole width when the theme makes main
   actions full width) */
export const ActionGroup = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`
export const ContactSection = styled.div`
  margin: ${({ theme }) => themeSpace(theme, 'xl')} 0 0;
  font-style: italic;

  /* the contact link of components.link */
  ${({ theme }) => `&& > a { ${linkThemeRules(theme)} }`}
`
