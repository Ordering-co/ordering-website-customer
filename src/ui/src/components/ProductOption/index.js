import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from 'styled-components'
import {
  OptionMeta,
  RequiredBadge,
  OptionLimit
} from './styles'

import { ProductOption as ProductOptionController } from '~components/components/ProductOption'
import { useLanguage } from '~components/contexts/LanguageContext'
import { GroupFrame } from './GroupFrame'

import { scrollBehavior } from '~/utils/themeMotion'
import { containerTop, scrollParent, stickyTopBottom } from '~/utils/scrollContainer'
import { themeSlot } from '~/utils/themeGroups'
import { themeVisible } from '~/utils/themeVisibility'
import { optionLimitText, optionMaximumText, optionStartsCollapsed, showsOptionImage, showsRequiredBadge } from '~/utils/productOptionTheme'

const ProductOptionUI = (props) => {
  const { children, option, error, nestingLevel, step, requiredInvalid } = props
  const containerRef = useRef(null)

  const [, t] = useLanguage()
  const theme = useTheme()
  // the groups start collapsed as components.product_option `collapsed` says; in
  // the accordion (`step`) the parent folds them and `collapsed` is not read
  const [isCollapsed, setIsCollapsed] = useState(() => optionStartsCollapsed(theme, option))

  useEffect(() => {
    if (!step && error && isCollapsed) setIsCollapsed(false)
  }, [error])

  const handleToggleCollapse = () => {
    if (step) return step.onToggle()
    const newCollapsedState = !isCollapsed
    setIsCollapsed(newCollapsedState)

    if (!newCollapsedState) {
      setTimeout(() => {
        // the option's top lands under what covers its scroll container's
        // top (the pinned close row, the sticky option navigation), the same
        // line as the navigation's tabs
        const element = containerRef.current
        if (!element) return
        const container = scrollParent(element)
        const top = container.scrollTop + element.getBoundingClientRect().top - containerTop(container) - stickyTopBottom(container)
        container.scrollTo({ top: Math.max(top, 0), behavior: scrollBehavior(theme) })
      }, 100)
    }
  }

  // components.product_option (its box, title, the required
  // badge and the limits apart, its nesting and image); the header's controls
  // take the group's components (scope)
  const requiredSlot = themeSlot(theme, 'product_option', 'required')
  // the "Required" badge and the limits beside it, unless the theme hides
  // them (visibility product.options.required_badge)
  const showMeta = themeVisible(theme, 'product.options.required_badge')
  const limitText = showMeta && optionLimitText(t, option)
  const required = showMeta && showsRequiredBadge(option)
  const badgeVariant = requiredInvalid ? 'danger' : requiredSlot?.variant || 'neutral'
  // TOKEN-GAP(implementation notes): the legacy badge already reads components.badge.
  const badge = required && (
    <RequiredBadge $variant={badgeVariant} data-doc-variant={badgeVariant}>
      {t('REQUIRED', 'Required')}
    </RequiredBadge>
  )
  // done: a required group chosen; pending: one still to choose; optional: the rest
  const excess = step?.excessMaximum != null && optionMaximumText(t, step.excessMaximum)
  const stepState = excess ? 'excess' : !step || !(option?.min > 0) ? 'optional' : step.done ? 'done' : 'pending'

  return (
    <GroupFrame
      id={`id_${option?.id}`}
      contentId={`content_${option?.id}`}
      name={option.name}
      image={showsOptionImage(theme, option) ? option.image : null}
      badge={badge}
      meta={!excess && limitText && (
        <OptionMeta>
          {limitText && <OptionLimit $error={!!error}>{limitText}</OptionLimit>}
        </OptionMeta>
      )}
      collapsed={step ? !step.open : isCollapsed}
      onToggle={handleToggleCollapse}
      headerRef={step?.headerRef}
      error={error}
      level={nestingLevel}
      doc={{
        ref: containerRef,
        attrs: {
          'data-doc-section': 'product-option',
          'data-doc-option-id': option?.id,
          'data-doc-required': option?.min > 0 ? 'true' : 'false',
          'data-doc-state': error ? 'invalid' : 'valid'
        }
      }}
      step={step && { summary: step.summary, state: stepState, excess }}
    >
      {children}
    </GroupFrame>
  )
}

export const ProductOption = (props) => {
  const productOptionProps = {
    ...props,
    UIComponent: ProductOptionUI
  }

  return (
    <ProductOptionController {...productOptionProps} />
  )
}
