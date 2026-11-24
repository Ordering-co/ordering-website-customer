import React from 'react'
import { GroupFrame } from './GroupFrame'

/**
 * A group of the accordion that is not an option (the ingredients, the
 * instructions) with the same header and folding as the options' (layout `steps`).
 * `step`: `{ open, onToggle, headerRef, summary }`.
 */
export const ProductStepGroup = ({ id, name, step, children }) => (
  <GroupFrame
    id={id}
    contentId={`content_${id}`}
    name={name}
    collapsed={!step.open}
    onToggle={step.onToggle}
    headerRef={step.headerRef}
    disabled={step.disabled}
    doc={{ attrs: { 'data-doc-section': 'product-step', 'data-doc-step': id } }}
    step={{ summary: step.summary, state: 'optional' }}
  >
    {children}
  </GroupFrame>
)
