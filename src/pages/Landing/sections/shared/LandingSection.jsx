import React from 'react'
import { SectionDescription, SectionHead, SectionInner, SectionRoot, SectionTitle, SkeletonBlock, SkeletonGrid } from './styles'

/**
 * The frame of a section of the home page: `<section id="landing-<name>">` named by its
 * h2 (`title`), with `action` (a link) beside it and, when given, a `description` under it
 * (the theme's section header description). A section with nothing to show does not
 * render this at all: no title, no gap.
 */
export const LandingSection = ({ name, title, description, tone = 'plain', action, children }) => {
  const titleId = `landing-${name}-title`
  return (
    <SectionRoot id={`landing-${name}`} data-landing-section={name} aria-labelledby={titleId} $tone={tone}>
      <SectionInner>
        <SectionHead $attached={!!description}>
          <SectionTitle id={titleId}>{title}</SectionTitle>
          {action}
        </SectionHead>
        {description && <SectionDescription>{description}</SectionDescription>}
        {children}
      </SectionInner>
    </SectionRoot>
  )
}

/**
 * What a section shows while it loads: a title bar and `items` blocks in the final layout
 * (the grid's minimum column, `min`, and the block's aspect ratio).
 */
export const LandingSkeleton = ({ name, tone = 'plain', items = 3, min, ratio = '4 / 3' }) => (
  <SectionRoot id={`landing-${name}`} data-landing-section={name} aria-busy='true' $tone={tone}>
    <SectionInner aria-hidden='true'>
      <SectionHead>
        <SkeletonBlock $tone={tone} $width='30%' />
      </SectionHead>
      <SkeletonGrid $min={min}>
        {Array.from({ length: items }, (_, index) => <SkeletonBlock key={index} $tone={tone} $ratio={ratio} />)}
      </SkeletonGrid>
    </SectionInner>
  </SectionRoot>
)
