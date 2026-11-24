import React from 'react'
import Linkify from 'react-linkify'
import styled from 'styled-components'
import { linkThemeRules } from '~ui/src/styles/Link'

// A URL in the text: a link of components.link.
const TextAnchor = styled.a`
  ${({ theme }) => `&& { ${linkThemeRules(theme)} }`}
`

export const LinkableText = (props) => {
  const { text } = props
  return (
    <Linkify
      componentDecorator={(decoratedHref, decoratedText, key) => (
        <TextAnchor target='blank' href={decoratedHref} key={key}>
          {decoratedText}
        </TextAnchor>
      )}
    >
      {text}
    </Linkify>
  )
}
