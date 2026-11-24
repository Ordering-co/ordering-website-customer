import React from 'react'
import { useTheme } from 'styled-components'
import { cva } from 'class-variance-authority'
import { motionTiming } from '~/utils/themeMotion'
import { cn } from '../lib/cn'
import { componentVars } from '../lib/componentVars'
import '../styles.css'

const trigger = cva('ui:relative ui:flex ui:w-full ui:appearance-none ui:items-center ui:m-none ui:[border:none] ui:[font-family:inherit]', {
  variants: {
    variant: {
      'step-header': [
        'ui:gap-md ui:px-lg ui:py-(--ui-accordion-header-padding) ui:text-left',
        'ui:cursor-pointer ui:disabled:cursor-default',
        'ui:bg-(--ui-accordion-header-background) ui:hover:enabled:bg-(--ui-accordion-header-hover)',
        'ui:aria-expanded:bg-primary-subtle ui:aria-expanded:hover:enabled:bg-primary-subtle',
        'ui:aria-expanded:[border-bottom:var(--ui-accordion-step-divider,none)]',
        'ui:motion-safe:transition-[background-color,color,border-color,box-shadow,opacity] ui:motion-safe:duration-(--ui-accordion-step-duration) ui:motion-safe:ease-(--ui-accordion-step-easing)',
        /* touch-target */ 'ui:pointer-coarse:before:absolute ui:pointer-coarse:before:inset-x-none ui:pointer-coarse:before:top-1/2 ui:pointer-coarse:before:h-full ui:pointer-coarse:before:min-h-[44px] ui:pointer-coarse:before:-translate-y-1/2'
      ]
    }
  }
})

/**
 * A disclosure with a caller-controlled panel.
 * - `variant='step-header'` keeps a badge, title and optional summary on the
 *   step card. The closed header reads components.accordion, and the open one
 *   uses primary_subtle and the item divider.
 * - `expanded`, `aria-controls` and `onClick` describe the caller's panel and toggle.
 */
const AccordionTrigger = React.forwardRef(({ variant = 'step-header', expanded, className, style, ...props }, ref) => {
  const theme = useTheme()
  const motion = motionTiming(theme, 'button')
  return (
    <button
      ref={ref}
      type='button'
      data-slot='accordion-trigger'
      aria-expanded={expanded}
      className={cn(trigger({ variant }), className)}
      style={{
        ...componentVars(theme, 'accordion'),
        '--ui-accordion-step-duration': motion.duration,
        '--ui-accordion-step-easing': motion.easing,
        '--ui-accordion-step-divider': componentVars(theme, 'divider', { variant: 'item' })['--ui-divider-line'],
        ...style
      }}
      {...props}
    />
  )
})
AccordionTrigger.displayName = 'AccordionTrigger'

export { AccordionTrigger }
