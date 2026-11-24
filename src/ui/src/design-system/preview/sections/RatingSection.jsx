import React, { useState } from 'react'
import styled from 'styled-components'
import { themeSpace } from '~/utils/themeTokens'
import { Rating, RatingScale } from '../../components/Rating'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture; the stars and the scale are the design system's.
const SIZES = ['sm', 'md', 'lg']
const OPTIONS = [
  { value: 1, label: 'Terrible' },
  { value: 2, label: 'Bad' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' }
]
const stars = (value) => `${value} of 5 stars`

const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
  max-width: ${({ theme }) => `calc(${themeSpace(theme, 'xxxl')} * 8)`};
`

const Vote = ({ size }) => {
  const [value, setValue] = useState(0)
  return (
    <Row>
      <Rating data-testid={`rating-vote-${size}`} value={value} onChange={setValue} size={size} label={`Rate your order (${size})`} optionLabel={stars} />
      <output data-testid={`rating-vote-${size}-value`}>{value}</output>
    </Row>
  )
}

const Scale = () => {
  const [value, setValue] = useState(0)
  return <RatingScale data-testid='rating-scale' value={value} options={OPTIONS} onChange={setValue} label='How was your order?' />
}

export const RatingSection = () => (
  <Section aria-labelledby='rating-title'>
    <SectionTitle id='rating-title'>Rating</SectionTitle>
    <Note>
      Stars of the theme&apos;s rating, shown (one image with the average, halves included) or to vote (a radio group, one radio per star, the arrows choose), and the scale of five points. Voting stars reach 44 px to touch.
    </Note>
    <Caption>Shown, by size</Caption>
    {SIZES.map((size) => (
      <Row key={size}>
        {[0, 2.5, 3.5, 5].map((value) => (
          <Rating key={value} data-testid={`rating-shown-${size}-${value}`} value={value} size={size} label={stars(value)} />
        ))}
      </Row>
    ))}
    <Caption>To vote, by size</Caption>
    {SIZES.map((size) => <Vote key={size} size={size} />)}
    <Caption>Disabled</Caption>
    <Rating data-testid='rating-disabled' value={3} onChange={() => {}} disabled label='Rate your order (disabled)' optionLabel={stars} />
    <Caption>Scale of five points</Caption>
    <Block><Scale /></Block>
  </Section>
)
