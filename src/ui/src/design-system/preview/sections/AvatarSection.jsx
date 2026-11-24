import React from 'react'
import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeSpace, themeText } from '~/utils/themeTokens'
import { Avatar } from '../../components/Avatar'
import { Caption, Note, Row, Section, SectionTitle } from '../ui'

// The preview's own furniture (styled-components, painted from the theme); the
// avatars are the design system's.
const SIZES = ['sm', 'md', 'lg', 'xl']
// a photo of the project's own (public/), the one a store would give
const PHOTO = '/icon-192x192.png'

const Block = styled.div`
  display: grid;
  gap: ${({ theme }) => themeSpace(theme, 'sm')};
`

// How a row uses it: the avatar beside a name, in a flex row where it must not shrink
const Person = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => themeSpace(theme, 'md')};
  max-width: calc(${({ theme }) => themeSpace(theme, 'xxxl')} * 4);
  color: ${({ theme }) => themeColor(theme, 'text')};
  ${({ theme }) => themeText(theme, 'body')}
`

export const AvatarSection = () => (
  <Section aria-labelledby='avatar-title'>
    <SectionTitle id='avatar-title'>Avatar</SectionTitle>
    <Note>
      The photo of a person in the theme&apos;s sizes. Without a photo, or when it does not load, the user icon or the initials the caller gives.
    </Note>
    {[
      ['With a photo', { src: PHOTO, alt: 'Ana, your driver' }, 'photo'],
      ['Without a photo: the user icon', { alt: 'Ana, your driver' }, 'icon'],
      ['Without a photo: the initials', { alt: 'Ana Díaz', fallback: 'AD' }, 'initials'],
      ['A photo that does not load', { src: '/missing-avatar.png', alt: 'Ana, your driver' }, 'broken']
    ].map(([title, props, id]) => (
      <Block key={id}>
        <Caption>{title}</Caption>
        <Row data-testid={`avatar-${id}`}>
          {SIZES.map((size) => <Avatar key={size} size={size} data-testid={`avatar-${id}-${size}`} {...props} />)}
        </Row>
      </Block>
    ))}
    <Caption>Beside a name, in a row (a decoration: the name says who it is)</Caption>
    <Person data-testid='avatar-person'>
      <Avatar src={PHOTO} size='md' />
      <span>Ana Díaz is on her way with your order</span>
    </Person>
  </Section>
)
