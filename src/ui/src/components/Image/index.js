import React, { useRef, useEffect, useState } from 'react'
import { useTheme } from 'styled-components'
import { THEME_DEFAULTS } from '~/utils/appTheme'

// The image says nothing by default (alt ''): every caller shows the person's or
// business's name beside it. A caller where the image carries meaning passes `alt`.
export const Image = React.forwardRef((props, ref) => {
  const localRef = useRef()
  const imageRef = ref || localRef
  const theme = useTheme()
  const thumbnailSize = theme?.values?.tokens?.size?.sm ?? THEME_DEFAULTS.tokens.size.sm
  const [error, setError] = useState(false)
  const [remove, setRemove] = useState(false)

  const onError = (e) => {
    if (!error) {
      setError(true)
    } else {
      setRemove(true)
    }
  }

  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.onerror = onError
    }
  }, [imageRef, error])

  return (
    <>
      {
        !error && props.src && <img className={props.className} style={props.style} src={props.src} ref={imageRef} alt={props.alt ?? ''} width={thumbnailSize} height={thumbnailSize} loading='lazy' />
      }
      {
        !error && !props.src && props.fallback && props.fallback
      }
      {
        error && !remove && typeof props.fallback === 'string' && <img className={props.className} style={props.style} src={props.fallback} ref={imageRef} alt={props.alt ?? ''} loading='lazy' />
      }
      {
        error && remove && typeof props.fallback === 'string' && <div className={props.className} style={props.style} ref={imageRef} />
      }
      {
        error && typeof props.fallback !== 'string' && <div className={props.className} style={props.style} ref={imageRef}>{props.fallback}</div>
      }
    </>
  )
})
