import React from 'react'
import { useTheme } from 'styled-components'
import { hasOwnFocusBorder } from '~/utils/themeCss'
import { useLanguage } from '~components/contexts/LanguageContext'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import { inputVariants } from './Input'
import '../styles.css'

const digitsOf = (text) => String(text ?? '').replace(/\D/g, '')

// The boxes keep the theme's gap while there is room; below it the gap gives way first so each box can stay
// at the 44px touch floor, and only then do the boxes narrow (a row of six fits a 320px phone, never scrolls sideways).
const ROW = [
  'ui:flex ui:justify-center',
  /* touch-target */ 'ui:[--ui-code-target:44px]',
  'ui:gap-x-[clamp(0px,calc((100%-var(--ui-code-length)*var(--ui-code-target))/var(--ui-code-gaps)),var(--ui-input-gap))]'
]

/**
 * A verification code: one box per digit, each a `components.input` field in
 * its `code` size (width, height, text and the gap between the boxes), the
 * same in every screen. It replaces `react-otp-input`.
 *
 * - `value` / `onChange(code)`: the digits as one string with no gaps
 *   (`'12'` fills the first two of four boxes). Without `value` it keeps its
 *   own (`defaultValue`) and still calls `onChange`. The caller decides when
 *   the code is complete (`code.length === length`).
 * - Typing a digit writes it and moves on; typing over a box replaces its digit.
 *   Pasting a code (or a phone's one-time-code autofill, which writes it all in
 *   the first box) fills the boxes: a whole code replaces everything, a short one
 *   fills from the box it landed in. Anything that is not a digit is dropped.
 * - Backspace clears the box (on an empty one it goes back and clears the
 *   previous), the arrows, Home and End move between boxes (the arrows follow
 *   what is seen in a right-to-left page). Every box stays tabbable
 *   (Tab and Shift+Tab never get trapped); typing in a box past the first empty
 *   one still fills from that one: a code has no gaps.
 * - `label` names the group (`Verification Code` by default); each box is
 *   `<label> n/length`. `invalid` marks every box (`aria-invalid`, the theme's
 *   error border): name the message with `aria-describedby`.
 * - `autoFocus` focuses the first empty box. `placeholder='0000'` shows one
 *   character per box. `disabled` is the native one.
 * - `ref` is the group's element.
 */
export const InputCode = React.forwardRef(({
  length = 6, value, defaultValue = '', onChange, invalid, disabled, autoFocus, label, placeholder,
  className, style, 'aria-describedby': describedBy, ...props
}, ref) => {
  const theme = useTheme()
  const [, t] = useLanguage()
  const [own, setOwn] = React.useState(() => digitsOf(defaultValue))
  const code = digitsOf(value ?? own).slice(0, length)
  const refs = React.useRef([])
  // where the focus goes once the new code is drawn
  const goto = React.useRef(null)
  const name = label ?? t('VERIFICATION_CODE', 'Verification Code')

  const vars = componentVars(theme, 'input', { variant: 'default', size: 'code', radius: 'md' })
  const sides = vars['--ui-input-border-sides'] === 'bottom' ? 'bottom' : 'all'
  const boxClasses = inputVariants({ sides, ownFocus: hasOwnFocusBorder(vars['--ui-input-border'], vars['--ui-input-focus-border']) })

  const focusBox = (index) => {
    const box = refs.current[Math.max(0, Math.min(length - 1, index))]
    box?.focus()
    box?.select()
  }
  const write = (next) => {
    if (value === undefined) setOwn(next)
    onChange?.(next)
  }
  // `digits` land from box `index`; a whole code replaces everything
  const put = (index, digits) => {
    if (!digits) return
    const from = digits.length >= length ? 0 : Math.min(index, code.length)
    const next = (code.slice(0, from) + digits + code.slice(from + digits.length)).slice(0, length)
    write(next)
    goto.current = from + digits.length
  }
  const remove = (index) => write(code.slice(0, index) + code.slice(index + 1))

  React.useEffect(() => { if (autoFocus) focusBox(code.length) }, [])
  React.useLayoutEffect(() => {
    if (goto.current === null) return
    focusBox(goto.current)
    goto.current = null
  })

  const onKeyDown = (index) => (event) => {
    const rtl = theme.rtl || event.currentTarget.closest('[dir]')?.getAttribute('dir') === 'rtl'
    const go = { ArrowLeft: rtl ? index + 1 : index - 1, ArrowRight: rtl ? index - 1 : index + 1, Home: 0, End: length - 1 }[event.key]
    if (go !== undefined) {
      event.preventDefault()
      focusBox(go)
    } else if (event.key === 'Backspace') {
      event.preventDefault()
      if (code[index] !== undefined) remove(index)
      else if (index > 0) {
        remove(index - 1)
        goto.current = index - 1
      }
    } else if (event.key === 'Delete') {
      event.preventDefault()
      remove(index)
    }
  }
  const onChangeAt = (index) => (event) => {
    const raw = event.target.value
    const old = code[index]
    // a digit typed beside the one the box has (the cursor was not over it): only the new one counts
    const typed = raw.length === 2 && old !== undefined ? (raw[0] === old ? raw[1] : raw[0]) : raw
    put(index, digitsOf(typed))
  }
  const onPaste = (index) => (event) => {
    event.preventDefault()
    put(index, digitsOf(event.clipboardData.getData('text')))
  }
  const onFocus = (event) => event.target.select()

  return (
    <div
      {...props}
      ref={ref}
      role='group'
      aria-label={name}
      data-slot='input-code'
      style={{ ...vars, '--ui-code-length': length, '--ui-code-gaps': Math.max(1, length - 1), ...style }}
      className={cn(ROW, className)}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(box) => { refs.current[index] = box }}
          data-slot='input'
          type='text'
          inputMode='numeric'
          pattern='[0-9]*'
          autoComplete='one-time-code'
          aria-label={`${name} ${index + 1}/${length}`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          placeholder={placeholder?.[index]}
          value={code[index] ?? ''}
          onChange={onChangeAt(index)}
          onKeyDown={onKeyDown(index)}
          onPaste={onPaste(index)}
          onFocus={onFocus}
          className={cn(boxClasses, 'ui:w-(--ui-input-width) ui:min-w-[0] ui:shrink ui:px-none ui:text-center')}
        />
      ))}
    </div>
  )
})
InputCode.displayName = 'InputCode'
