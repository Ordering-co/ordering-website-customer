import React from 'react'
import PropTypes from 'prop-types'
import { Icon as BaseIcon } from '~ui/src/design-system/components/Icon'

// The legacy `<Icon>` API (`~ui-icon`) on the base Icon (Lucide): the screens that still import it keep
// their names, and the glyph is the registry's. `title` becomes the accessible name; `color` is the text color.
export const Icon = ({ name, color, style, title, ...rest }) => (
  <BaseIcon name={name} label={title} style={color ? { color, ...style } : style} {...rest} />
)

Icon.propTypes = {
  name: PropTypes.string.isRequired,
  size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  color: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.string
}
