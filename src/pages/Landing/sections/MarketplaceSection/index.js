import React from 'react'
import Skeleton from 'react-loading-skeleton'
import { Band, Column, Head, Title, TitleSkeleton } from './styles'

/**
 * The frame of a section of the marketing page: its anchor (`id`, which the
 * page's header links to), its h2 and, beside it, an optional `action`.
 * While `loading` the title is a placeholder, not a heading, so a section that
 * ends up empty never leaves one behind.
 */
export const MarketplaceSection = ({ id, title, action, loading = false, children }) => (
  <Band id={id} aria-labelledby={loading ? undefined : `${id}-title`} aria-busy={loading || undefined}>
    <Column>
      <Head>
        {loading
          ? <TitleSkeleton aria-hidden='true'><Skeleton height='1.5em' /></TitleSkeleton>
          : <Title id={`${id}-title`}>{title}</Title>}
        {action}
      </Head>
      {children}
    </Column>
  </Band>
)
