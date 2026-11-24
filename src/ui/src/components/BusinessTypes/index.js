import React, { useLayoutEffect, useRef, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import { useTheme } from 'styled-components'
import { BusinessTypeFilter as BusinessTypeFilterController } from '~components/components/BusinessTypeFilter'
import { useLanguage } from '~components/contexts/LanguageContext'

import { Chip } from '~ui/src/design-system/components/Chip'
import {
  TypeContainer,
  PillCategoriesRow,
  PillSkeletonRow,
  PillImage,
  TileBox,
  TileBody,
  TileImage,
  TileSkeleton,
  businessTypesGap,
  businessTypesImageSize,
  businessTypesLayout,
  businessTypesTileWidth
} from './styles'
import { AutoScroll } from '../AutoScroll'
import { Icon } from '~ui/src/design-system/components/Icon'
import { BusinessTypeTileButton } from '~ui/src/design-system/components/ButtonAppearances'
import { BUNDLED_IMAGES } from '~/utils/bundledImages'
import { themeHidden } from '~/utils/themeVisibility'
import { themeSlot } from '~/utils/themeGroups'

// A type's image: its own (the API's `image`), else the bundle's of its name
// (food, groceries, alcohol, laundry; not a theme image), else none
export const businessTypeImage = (type) =>
  (typeof type?.image === 'string' && type.image.trim()) ||
  BUNDLED_IMAGES.categories[String(type?.name || '').toLowerCase()] ||
  null

/**
 * A type's image in its box, decorative (the name says it). Without one, or
 * when it fails to load, never a broken image: "All" (the type without id)
 * shows the grid icon, any other type the initial of its name.
 */
const TypeImage = ({ type, label, Box }) => {
  const src = businessTypeImage(type)
  const [failed, setFailed] = useState(null)
  if (src && failed !== src) {
    return (
      <Box className='type-image' aria-hidden='true'>
        <img src={src} alt='' loading='lazy' decoding='async' onError={() => setFailed(src)} />
      </Box>
    )
  }
  return (
    <Box className='type-image' aria-hidden='true' $placeholder>
      {type?.id === null || type?.id === undefined
        ? <Icon name='grid' />
        : String(label || '').trim().charAt(0).toUpperCase()}
    </Box>
  )
}

// exported for the pages that frame it (they decide what an empty list shows)
export const BusinessTypesUI = (props) => {
  const {
    typesState,
    currentTypeSelected,
    handleChangeBusinessType,
    hideAllCategory,
    defaultLayout
  } = props
  const { loading, error, types } = typesState
  const [, t] = useLanguage()
  const theme = useTheme()

  // components.business_types: pills, pills with the type's image, or tiles
  // (image on top, name below); its sizes and the pills' slot
  const layout = businessTypesLayout(theme, defaultLayout)
  const hasTypes = !loading && !error && types?.length > 0
  const gap = businessTypesGap(theme)
  const pillSlot = themeSlot(theme, 'business_types', 'pill')

  const rowRef = useRef(null)
  const [edgeWidth, setEdgeWidth] = useState(null)
  const hasPills = hasTypes && layout !== 'tiles'

  useLayoutEffect(() => {
    const pills = hasPills ? rowRef.current?.querySelectorAll('button[data-slot="chip"]') : null
    if (!pills?.length) {
      setEdgeWidth(null)
      return
    }

    // The arrows are separate controls. Only the first and last pills need
    // space past the inline edges of the scrollport.
    const first = pills[0]
    const last = pills[pills.length - 1]
    const measure = () => setEdgeWidth(Math.min(first.getBoundingClientRect().width, last.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(first)
    if (last !== first) observer.observe(last)
    return () => observer.disconnect()
  }, [hasPills, types])

  const handleChangeCategory = (category) => {
    // without the "All" type (hideAllCategory), the selected type is a
    // toggle: picking it again shows all the businesses
    if (hideAllCategory && category === currentTypeSelected) {
      handleChangeBusinessType && handleChangeBusinessType(null)
      return
    }
    handleChangeBusinessType && handleChangeBusinessType(category)
  }

  const getCategoryLabel = (type) =>
    t(`BUSINESS_TYPE_${type.name.replace(/\s/g, '_').toUpperCase()}`, type.name)

  const enabledTypes = hasTypes ? types.filter((type) => type.enabled) : []

  const renderPill = (type) => {
    const label = getCategoryLabel(type)
    const selected = type.id === currentTypeSelected
    return (
      <Chip
        key={type.id}
        variant='content'
        size={pillSlot?.size}
        edgeImage={layout === 'pills_image' ? <TypeImage type={type} label={label} Box={PillImage} /> : undefined}
        selected={selected}
        onClick={() => handleChangeCategory(type.id)}
      >
        {label}
      </Chip>
    )
  }

  const renderTile = (type) => {
    const label = getCategoryLabel(type)
    const selected = type.id === currentTypeSelected
    return (
      <TileBox key={type.id}>
        <BusinessTypeTileButton
          aria-pressed={selected}
          onClick={() => handleChangeCategory(type.id)}
        >
          <TileBody $selected={selected}>
            <TypeImage type={type} label={label} Box={TileImage} />
            <span className='type-name'>{label}</span>
          </TileBody>
        </BusinessTypeTileButton>
      </TileBox>
    )
  }

  const tileImageSize = businessTypesImageSize(theme)

  return (
    <>
      <TypeContainer
        id='container'
        data-layout={layout}
        $pillSize={hasPills ? (pillSlot?.size ?? 'md') : undefined}
        style={hasPills && edgeWidth != null ? { '--business-types-edge-width': `${edgeWidth}px` } : undefined}
      >
        {loading && (
          <PillSkeletonRow style={styles.wrapperSkeleton}>
            {[...Array(6)].map((_, i) => layout === 'tiles'
              ? (
                <TileSkeleton key={i}>
                  <Skeleton id='skeleton' height={tileImageSize} width={tileImageSize} />
                  <Skeleton height={12} width={Math.round(businessTypesTileWidth(theme) * 0.7)} />
                </TileSkeleton>
                )
              : <Skeleton id='skeleton' key={i} height={36} width={90} borderRadius={50} />
            )}
          </PillSkeletonRow>
        )}
        {hasTypes && (
          <PillCategoriesRow ref={rowRef} $tiles={layout === 'tiles'}>
            <AutoScroll
              scrollId={layout === 'tiles' ? 'businessTypesTiles' : 'businessTypesPills'}
              gap={gap}
            >
              {enabledTypes.map(layout === 'tiles' ? renderTile : renderPill)}
            </AutoScroll>
          </PillCategoriesRow>
        )}
      </TypeContainer>
    </>
  )
}

const styles = {
  wrapperSkeleton: {
    display: 'flex',
    justifyContent: 'flex-start',
    flexDirection: 'row'
  }
}

export const BusinessTypes = (props) => {
  const theme = useTheme()
  const businessTypeFilterProps = {
    ...props,
    // visibility.business_listing.categories.all hides the "All" type of the
    // listing's categories
    hideAllCategory: themeHidden(theme, 'business_listing.categories.all'),
    UIComponent: BusinessTypesUI,
    defaultBusinessType: props.defaultBusinessType || null,
    onChangeBusinessType: props.handleChangeBusinessType
  }

  return (
    <BusinessTypeFilterController {...businessTypeFilterProps} />
  )
}
