import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSize, themeSpace, themeText, themeFontFamily } from '~/utils/themeTokens'
import { Caption, Grid, Note, Row, Section, SectionTitle } from '../ui'

// The names a piece writes (`ui:bg-canvas`) → the token it paints and the
// token its text sits on. The fill is read from the runtime variable, not a
// helper: this section shows that the variables on :root follow the theme.
const SWATCHES = [
  ['primary', 'primary', 'on_primary'],
  ['primary-subtle', 'primary_subtle', 'primary_text'],
  ['canvas', 'background', 'text'],
  ['surface (background)', 'surface', 'text'],
  ['surface-alt (secondary, muted)', 'surface_alt', 'text'],
  ['brand-secondary', 'secondary', 'on_secondary'],
  ['inverse-surface', 'inverse_surface', 'on_inverse'],
  ['danger', 'danger', 'on_danger'],
  ['success', 'success', 'on_success']
]
const RADII = ['none', 'sm', 'md', 'lg', 'full']

const Swatch = styled.div`
  display: grid;
  align-content: end;
  box-sizing: border-box;
  min-height: ${({ theme }) => themeSize(theme, 'xl')};
  padding: ${({ theme }) => themeSpace(theme, 'sm')};
  border-radius: var(--ot-radius-md);
  border: var(--ot-border-fixed-thin) solid var(--ot-color-border);
  background: var(--ot-color-${({ $fill }) => $fill});
  color: var(--ot-color-${({ $on }) => $on});
  ${({ theme }) => themeText(theme, 'caption')}
`

const Radius = styled.div`
  width: ${({ theme }) => themeSize(theme, 'xl')};
  height: ${({ theme }) => themeSize(theme, 'lg')};
  border-radius: var(--ot-radius-${({ $level }) => $level});
  background: var(--ot-color-primary-subtle);
  border: var(--ot-border-fixed-thin) solid var(--ot-color-primary);
`

const Heading = styled.p`
  margin: 0;
  font-family: var(--ot-font-heading);
  font-size: var(--ot-text-h2-size);
  line-height: var(--ot-text-h2-line);
  font-weight: var(--ot-text-h2-weight);
  color: var(--ot-color-text);
`
const Body = styled.p`
  margin: 0;
  font-family: var(--ot-font-body);
  font-size: var(--ot-text-body-size);
  line-height: var(--ot-text-body-line);
  font-weight: var(--ot-text-body-weight);
  color: var(--ot-color-text-muted);
`

export const TokensSection = ({ theme }) => (
  <Section aria-labelledby='tokens-title'>
    <SectionTitle id='tokens-title'>Tokens</SectionTitle>
    <Note>
      Painted from the <code>--ot-*</code> variables on <code>:root</code>, the ones every piece reads. Change the
      theme above and each block follows.
    </Note>
    <Grid>
      {SWATCHES.map(([name, fill, on]) => (
        <Swatch key={name} $fill={fill.replace(/_/g, '-')} $on={on.replace(/_/g, '-')}>
          <strong>{name}</strong>
          <span>{themeColor(theme, fill)}</span>
        </Swatch>
      ))}
    </Grid>
    <Row>
      {RADII.map((level) => (
        <Row key={level} style={{ gap: themeSpace(theme, 'xs') }}>
          <Radius $level={level} />
          <Caption>rounded-{level}</Caption>
        </Row>
      ))}
    </Row>
    <div>
      <Heading>Heading in {themeFontFamily(theme, 'heading').split(',')[0]}</Heading>
      <Body>Body text in {themeFontFamily(theme, 'body').split(',')[0]}, sized by the theme&apos;s body style.</Body>
    </div>
  </Section>
)
