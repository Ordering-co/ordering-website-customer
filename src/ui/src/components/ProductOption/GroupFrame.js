import React, { useLayoutEffect, useRef } from 'react'
import {
  Container,
  WrapHeader,
  TitleContainer,
  Title,
  OptionThumbnail,
  HeaderToggle,
  CollapsibleContent,
  NestingFrame,
  OptionLimit,
  StepEnd,
  StepSummary,
  StepDone
} from './styles'
import { useLanguage } from '~components/contexts/LanguageContext'
import { ComponentScope } from '~ui/src/styles/ComponentScope'
import { ChevronIcon } from '~ui/src/styles/Chevron'
import { Icon } from '~ui/src/design-system/components/Icon'

// The frame of a group: its box, its header (the whole header opens / closes it;
// the button with the group's name is what the keyboard reaches) and its folding
// content. `step` (layout `steps`) is the accordion's: the group is folded by its
// parent (one open at a time) and says at the end of its header what was chosen.
export const GroupFrame = ({ id, contentId, name, image, meta, badge, collapsed, onToggle, headerRef, disabled, error, level, doc, step, children }) => {
  const [, t] = useLanguage()
  const toggleRef = useRef(null)
  const contentRef = useRef(null)
  useLayoutEffect(() => {
    const content = contentRef.current
    if (collapsed && content.contains(document.activeElement)) {
      toggleRef.current?.focus({ preventScroll: true })
    }
    content.toggleAttribute('inert', !!collapsed)
    if (collapsed) content.setAttribute('aria-hidden', 'true')
    else content.removeAttribute('aria-hidden')
  }, [collapsed])
  const endId = `${contentId}_state`
  return (
    <NestingFrame $level={level}>
      <Container id={id} ref={doc.ref} {...doc.attrs} $error={!!error}>
        <ComponentScope group='product_option'>
          <WrapHeader onClick={disabled ? undefined : onToggle}>
            <TitleContainer>
              {image && <OptionThumbnail src={image} />}
              <div className='title-container'>
                <Title>
                  <HeaderToggle
                    ref={(node) => {
                      toggleRef.current = node
                      headerRef?.(node)
                    }}
                    disabled={disabled}
                    aria-expanded={!collapsed}
                    aria-controls={contentId}
                    aria-describedby={step || badge ? endId : undefined}
                  >
                    <span>{name}</span>
                  </HeaderToggle>
                </Title>
                {meta}
              </div>
            </TitleContainer>
            {step && (
              <StepEnd id={endId} data-doc-step-state={step.state}>
                {step.summary
                  ? <StepSummary>{step.summary}</StepSummary>
                  : step.state === 'optional' ? <StepSummary $muted>{t('OPTIONAL', 'Optional')}</StepSummary> : null}
                {step.state === 'pending' && badge}
                {step.excess && <OptionLimit $error={!!error}>{step.excess}</OptionLimit>}
                {step.state === 'done' && <StepDone><Icon name='check' aria-hidden='true' /></StepDone>}
              </StepEnd>
            )}
            {!step && badge && <StepEnd id={endId}>{badge}</StepEnd>}
            <ChevronIcon kind='disclose' open={!collapsed} motion='product_option' />
          </WrapHeader>
        </ComponentScope>
        <CollapsibleContent ref={contentRef} id={contentId} isCollapsed={collapsed} $stepped={!!step}>
          {children}
        </CollapsibleContent>
      </Container>
    </NestingFrame>
  )
}
