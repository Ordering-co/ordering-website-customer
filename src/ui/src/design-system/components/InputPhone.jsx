import React from 'react'
import { useTheme } from 'styled-components'
import PhoneInput from 'react-phone-number-input'
import { Globe } from 'lucide-react'
import { hasOwnFocusBorder } from '~/utils/themeCss'
import { CHEVRON_GLYPHS } from '~ui/src/components/Icon/chevronGlyphs'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { createIcon } from './createIcon'
import { Input } from './Input'
import { fieldBoxVariants } from './SdkField'
import '../styles.css'

const Chevron = createIcon(CHEVRON_GLYPHS)
const Glyph = createIcon({ globe: Globe })

// The library's default flag set (the same URL it uses itself), as an image: decoration, the select says the country
const FLAG_URL = 'https://purecatamphetamine.github.io/country-flag-icons/3x2/{XX}.svg'

// The country control: a box of `components.input` beside the number (its hover, focus border and disabled look),
// as tall as the number is painted: the number's own touch box (44px on a phone) is taller when the theme paints it lower
const COUNTRY = 'ui:relative ui:flex ui:h-(--ui-input-height) ui:shrink-0 ui:items-center ui:px-lg'

// The library's country control with the piece's own markup: a native select over the flag (so the list is the
// platform's: the keyboard and the phone's picker), then a chevron. "ZZ" is the library's name for International.
const CountrySelect = ({ value, options, onChange, disabled, readOnly, iconComponent, className, arrowComponent, unicodeFlags, getIconAspectRatio, style, ...rest }) => {
  const theme = useTheme()
  const vars = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  const sides = vars['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  const off = disabled || readOnly
  return (
    <div
      data-slot='input-phone-country'
      data-disabled={off ? '' : undefined}
      className={cn(fieldBoxVariants({ sides, ring: !hasOwnFocusBorder(vars['--ui-input-border'], vars['--ui-input-focus-border']) }), COUNTRY)}
    >
      <select
        {...rest}
        value={value || 'ZZ'}
        disabled={off}
        onChange={(event) => onChange(event.target.value === 'ZZ' ? undefined : event.target.value)}
        className='ui:absolute ui:inset-none ui:z-1 ui:size-full ui:cursor-pointer ui:opacity-0 ui:data-disabled:cursor-not-allowed'
      >
        {options.map(({ value: code, label, divider }) => (
          <option key={divider ? '|' : code || 'ZZ'} value={divider ? '|' : code || 'ZZ'} disabled={divider}>{label}</option>
        ))}
      </select>
      {value
        ? <img src={FLAG_URL.replace('{XX}', value)} alt='' className='ui:size-icon-lg ui:shrink-0 ui:rounded-md ui:object-contain' />
        : <Glyph name='globe' className='ui:size-icon-lg ui:shrink-0 ui:opacity-75' />}
      <Chevron name='chevronDown' className='ui:ms-(--ui-input-icon-gap) ui:size-(--ui-input-icon-size) ui:shrink-0' />
    </div>
  )
}

/**
 * The theme's phone field: a country control and the number, on
 * `react-phone-number-input` (which parses, formats and validates; the number is
 * its `value` in E.164). The number is the base `Input` and the country is a
 * box of `components.input` beside it, so both paint with the theme's field:
 * its height, text, placeholder, borders, hover, focus, error and disabled,
 * and the text never under 16 px on a phone.
 *
 * - Takes the library's props: `value` / `onChange(value)`, `defaultCountry`,
 *   `countries`, `international`, `displayInitialValueAsLocalNumber`, `name`,
 *   `placeholder`, `disabled`, `labels`... (not `flags`, `flagUrl`, `flagComponent`
 *   or `arrowComponent`: the flag and the chevron are the piece's).
 * - `invalid`: the number gets `aria-invalid` and the theme's error border. Name
 *   the message with `aria-describedby`; name the field with `aria-label` or a
 *   `<label htmlFor>` and `id` (both go to the number).
 * - `countryLabel`: the accessible name of the country select (the library's is English).
 * - `align`: `'center'` centers the number (a verification screen that shows it alone); by default it starts at the
 *   start of the line, as every field. A container never aligns the number from outside.
 * - The country list is the platform's select: its options are named by `labels`.
 * - `className` / `style` go to the row (its layout).
 */
export const InputPhone = React.forwardRef(({ className, style, countryLabel, align, ...props }, ref) => {
  const theme = useTheme()
  const vars = componentVars(theme, 'input', { variant: 'default', radius: 'md' })
  return (
    <PhoneInput
      {...props}
      ref={ref}
      inputComponent={Input}
      countrySelectComponent={CountrySelect}
      countrySelectProps={countryLabel ? { 'aria-label': countryLabel } : undefined}
      numberInputProps={{ className: cn('ui:min-w-[0] ui:flex-1', align === 'center' && 'ui:text-center') }}
      containerComponentProps={{ 'data-slot': 'input-phone' }}
      style={{ ...vars, ...style }}
      className={cn('ui:flex ui:w-full ui:min-w-[0] ui:items-center ui:gap-sm', className)}
    />
  )
})
InputPhone.displayName = 'InputPhone'
