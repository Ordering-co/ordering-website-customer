import React, { useState, useEffect } from 'react'
import { useLanguage } from '~components/contexts/LanguageContext'
import { SPINNER_SIZES } from '~ui/src/styles/Spinner'
import {
  Container,
  Logo,
  Content,
  Spinner
} from './styles'

export const SpinnerLoader = (props) => {
  const {
    logotype,
    content,
    style,
    iconStyle,
    delayMs,
    size: sizeProp
  } = props

  // lg is a whole screen (boot, a gate, a page); sm and md are a spinner
  // inside a block, which takes its height from the spinner
  const size = SPINNER_SIZES.includes(sizeProp) ? sizeProp : 'lg'

  // With delayMs the spinner only appears if loading genuinely takes longer
  // than the delay — fast loads render nothing instead of a spinner flash.
  const [visible, setVisible] = useState(!delayMs)
  // outside the language provider (boot) it is the English fallback
  const [, t] = useLanguage()

  useEffect(() => {
    if (!delayMs) return
    const timer = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <Container style={style} $size={size}>
      {logotype && (
        <Logo>
          <img src={logotype} alt={t('LOGO', 'Logo')} loading='lazy' />
        </Logo>
      )}
      {content && (
        <Content>
          {content}
        </Content>
      )}
      <Spinner className='spinner' style={iconStyle} {...props} size={undefined} $size={size}>
        <div className='spinner-content'>
          <div />
        </div>
      </Spinner>
    </Container>
  )
}
