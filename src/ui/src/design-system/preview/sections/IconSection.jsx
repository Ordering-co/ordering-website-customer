import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { Icon } from '../../components/Icon'
import { Caption, Grid, Note, Row, Section, SectionTitle } from '../ui'

const NAMES = ['bag', 'bell', 'calendar', 'clock', 'user', 'search', 'truckDelivery', 'arrowRight', 'warning', 'heartOutline', 'heartFilled', 'starFilled', 'facebook', 'whatsapp', 'google']

const Cell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'caption')}
`
const Accent = styled.span`
  color: ${({ theme }) => themeColor(theme, 'primary_text')};
  ${({ theme }) => themeText(theme, 'label')}
`
const InText = styled.p`
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'h4')}
`

export const IconSection = () => (
  <Section aria-labelledby='icon-title'>
    <SectionTitle id='icon-title'>Icon</SectionTitle>
    <Note>
      Lucide and the brand glyphs through one registry. A level (<code>sm</code>, <code>md</code>, <code>lg</code>) is the
      theme&apos;s icon size; the default <code>1em</code> follows the text.
    </Note>
    <Row>
      {['sm', 'md', 'lg'].map((size) => (
        <Cell key={size}><Icon name='bag' size={size} /> {size}</Cell>
      ))}
      <InText><Icon name='truckDelivery' /> Delivery in 25 minutes</InText>
      <Cell><Icon name='warning' label='Warning' size='md' /><Accent>with a label, it is an image</Accent></Cell>
    </Row>
    <Grid>
      {NAMES.map((name) => (
        <Cell key={name}><Icon name={name} size='md' /> {name}</Cell>
      ))}
    </Grid>
    <Caption>The solid glyphs (favorite heart, rating star) fill with the text color.</Caption>
  </Section>
)
