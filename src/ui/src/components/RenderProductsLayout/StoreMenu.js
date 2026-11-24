import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

import {
  CartAside,
  ChipsBar,
  EmptyMenu,
  FeaturedStrip,
  MenuBar,
  MenuMain,
  MenuResults,
  MenuRoot,
  MoreAction,
  Products,
  ProductPhoto,
  ProductRow,
  ProductTile,
  SearchSlot,
  CoverBar,
  Section,
  SideNav,
  TabsFrame
} from './storeMenuStyles'
import { StoreProductCard, StoreProductRow, StoreProductTile } from './StoreProduct'
import { DESKTOP_MIN_WIDTH } from './storePageTemplate'
import { useActiveCategory, useSearchStick, useStickyBars } from './useMenuBars'

import { useConfig } from '~components/contexts/ConfigContext'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useWindowSize } from '~ui/hooks/useWindowSize'
import { Button } from '~ui/src/design-system/components/Button'
import { Icon } from '~ui/src/design-system/components/Icon'
import { Tabs, TabsIndicator, TabsList, TabsTrigger, slotTabsOptions } from '~ui/src/design-system/components/Tabs'
import { SearchBar } from '~ui/src/components/SearchBar'
import { NotFoundSource } from '~ui/src/components/NotFoundSource'
import { MENU_BAR_ID, scrollToCategory } from '~ui/src/components/BusinessProductsCategories/scrollToCategory'
import { scrollBehavior } from '~/utils/themeMotion'

const FEATURED = 'featured'
// How many products of a category a store that loads its menu by pieces shows before "More"
const LAZY_PRODUCTS = 10

// Scrolls `scroller` sideways, and only it, until `item` is in view (scrollIntoView would also move the page)
const revealInRow = (scroller, item, theme) => {
  if (!scroller || !item || typeof scroller.scrollBy !== 'function') return
  const box = scroller.getBoundingClientRect()
  const rect = item.getBoundingClientRect()
  const left = rect.left < box.left ? rect.left - box.left : Math.max(0, rect.right - box.right)
  if (left) scroller.scrollBy({ left, behavior: scrollBehavior(theme) })
}

/**
 * The categories as tabs of the theme (the `line` layout: a scrolling row of text, a line under the tab that is
 * being read, no arrow: the row fades out where more tabs wait). The tab of the category under the fixed bars is
 * the selected one and the row moves to keep it in view.
 */
const CategoryTabs = ({ tabs, active, onPick, label }) => {
  const theme = useTheme()
  const listRef = useRef(null)
  const [fade, setFade] = useState(false)
  const key = tabs.map(tab => tab.id).join()

  useEffect(() => {
    const list = listRef.current
    const measure = () => {
      if (!list) return
      setFade(list.scrollWidth > list.clientWidth + 1 && Math.abs(list.scrollLeft) + list.clientWidth < list.scrollWidth - 1)
    }
    measure()
    list?.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      list?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [key])

  useEffect(() => {
    revealInRow(listRef.current, listRef.current?.querySelector('[aria-selected="true"]'), theme)
  }, [active])

  const value = String(tabs.some(tab => tab.id === active) ? active : tabs[0]?.id)
  return (
    <TabsFrame data-fade={fade ? '' : undefined} data-doc-section='business-menu-categories'>
      <Tabs group='category_tabs' {...slotTabsOptions(theme, 'category_tabs', 'tabs', { size: 'md' })} variant='underline' layout='line' value={value}>
        <TabsList ref={listRef} activateOnFocus={false} aria-label={label}>
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={String(tab.id)}
              data-doc-control='business-category-tab'
              data-doc-category-id={tab.id}
              onClick={() => onPick(tab)}
            >
              {tab.name}
            </TabsTrigger>
          ))}
          <TabsIndicator />
        </TabsList>
      </Tabs>
    </TabsFrame>
  )
}

// The existing product search (SearchBar over the store's `handleChangeSearch`, which narrows the menu below)
const SearchField = ({ searchValue, onSearch, lazy, autoFocus }) => {
  const [, t] = useLanguage()
  return (
    <SearchBar
      baseInput
      onSearch={onSearch}
      search={searchValue}
      lazyLoad={lazy}
      forceFocus={autoFocus}
      placeholder={t('SEARCH_PRODUCTS', 'Search Products')}
    />
  )
}

// The showcase's chips: the search first (a button that opens into the field), then a chip per category
const CategoryChips = React.forwardRef(({ tabs, active, onPick, searchValue, onSearch, lazy }, ref) => {
  const [, t] = useLanguage()
  const theme = useTheme()
  const [searching, setSearching] = useState(!!searchValue)
  const barRef = useRef(null)
  const setRefs = (node) => {
    barRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  useEffect(() => {
    revealInRow(barRef.current, barRef.current?.querySelector('[data-doc-active=true]'), theme)
  }, [active])

  const closeSearch = () => {
    onSearch('')
    setSearching(false)
  }

  return (
    <ChipsBar ref={setRefs} id={MENU_BAR_ID} data-doc-section='business-menu-categories'>
      {searching
        ? (
          <>
            <div className='search-field' onKeyDown={(event) => event.key === 'Escape' && closeSearch()}>
              <SearchField searchValue={searchValue} onSearch={onSearch} lazy={lazy} autoFocus />
            </div>
            <Button size='sm' shape='icon' appearance='ghost' color='neutral' aria-label={t('CANCEL', 'Cancel')} onClick={closeSearch}>
              <Icon name='close' />
            </Button>
          </>
          )
        : (
          <Button size='sm' shape='icon' appearance='outline' color='neutral' aria-label={t('SEARCH_PRODUCTS', 'Search Products')} data-doc-control='business-product-search-open' onClick={() => setSearching(true)}>
            <Icon name='search' />
          </Button>
          )}
      {tabs.map(tab => (
        <Button
          key={tab.id}
          size='sm'
          appearance={tab.id === active ? 'solid' : 'outline'}
          color={tab.id === active ? 'inverse' : 'neutral'}
          aria-pressed={tab.id === active}
          data-doc-control='business-category-tab'
          data-doc-category-id={tab.id}
          data-doc-active={String(tab.id === active)}
          onClick={() => onPick(tab)}
        >
          {tab.name}
        </Button>
      ))}
    </ChipsBar>
  )
})

const SectionSkeleton = ({ tiles }) => (
  <Section>
    <div className='category-title'><h2><Skeleton width='8em' /></h2></div>
    <Products $tiles={tiles}>
      {[...Array(tiles ? 4 : 3).keys()].map(i => tiles
        ? (
          <ProductTile key={i}><ProductPhoto $tile /><Skeleton width='70%' /><Skeleton width='30%' /></ProductTile>
          )
        : (
          <ProductRow key={i}><div className='info'><Skeleton width='60%' /><Skeleton count={2} /><Skeleton width='25%' /></div><ProductPhoto /></ProductRow>
          ))}
    </Products>
  </Section>
)

/**
 * The store page's menu in the three designs of `components.store_page.base.template` (the header is
 * BusinessBasicInformation's):
 *
 * - `cover` (classic): a bar that sticks under the header with the search and the categories as tabs (on a
 *   phone the search above the tabs; from the desktop cut the search at the start and the tabs on the same row);
 *   every section, the featured one too, is a grid of cards (text at the start, photo and "+" at the end).
 * - `menu` (direct menu): a bar that sticks under the header with the search and the categories as tabs; the
 *   featured products as a row of tiles and the others as rows (photo at the end, "+" in its corner). From the
 *   desktop cut the categories are a list beside the menu (two columns of rows) and the cart is beside it (`cart`; none, and the menu takes its width).
 * - `showcase` (visual showcase): a bar with the search (a chip that opens into the field) and the categories
 *   as chips; the featured as a row (a phone) or three columns (desktop) and the others as a grid of big photos.
 *
 * Choosing a category goes to its section (scrollToCategory, as the tabs always did) and never filters the
 * menu; only a store that loads its products by category (`lazy_load_products_recommended`) filters.
 * The category under the fixed bars is the one marked (scroll-spy). The menu is the store's: the products are
 * `categoryState.products`, which the search narrows; `onProductClick` opens a product's form and
 * `onProductAdd` is the "+".
 */
export const StoreMenu = ({
  variant,
  categories,
  business,
  currentCart,
  featured,
  categoryState,
  categorySelected,
  isLazy,
  isSkeleton,
  isFiltered,
  searchValue,
  handleChangeSearch,
  onClickCategory,
  onProductClick,
  onProductAdd,
  handleUpdateProducts,
  handleSearchRedirect,
  before,
  back,
  cart
}) => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const theme = useTheme()
  const { width } = useWindowSize()
  const showcase = variant === 'showcase'
  const cover = variant === 'cover'
  const desktop = width >= DESKTOP_MIN_WIDTH
  const aside = !showcase && !cover && desktop && !isSkeleton
  // the cart's column (a design without it, `menu_index_no_cart`, gets no `cart`): the grid is the list and the menu
  const cartColumn = aside && !!cart
  const rootRef = useRef(null)
  const barRef = useRef(null)

  const products = categoryState?.products ?? []
  const parentCategory = ['true', '1'].includes(configs?.use_parent_category?.value)
  const productsOf = (category) => products.filter(product => parentCategory
    ? category?.children?.some(child => child.category_id === product?.category_id)
    : product?.category_id === category?.id)
  const featuredProducts = featured ? products.filter(product => product.featured) : []

  // what the menu has to paint: a section per category with products (the store that filters by category has the
  // chosen one's products only)
  const sections = [
    ...(featuredProducts.length ? [{ id: FEATURED, name: t('FEATURED_ITEMS', 'Featured Items'), products: featuredProducts, featured: true }] : []),
    ...(isFiltered
      ? [{ id: categorySelected?.id, name: categorySelected?.name, products }]
      : categories.map(category => ({ id: category.id, name: category.name, products: productsOf(category), category })))
  ].filter(section => section.products.length > 0)
  // its tabs: those with a section; a store that loads by pieces lists every category (a tab loads it)
  const tabs = isFiltered
    ? []
    : [
        ...(featuredProducts.length ? [{ id: FEATURED, name: t('FEATURED_ITEMS', 'Featured Items') }] : []),
        ...(isLazy ? categories : categories.filter(category => productsOf(category).length > 0)).map(({ id, name }) => ({ id, name }))
      ]
  const read = useActiveCategory(tabs.map(tab => tab.id))
  // the first one until the page has reached a section
  const active = tabs.some(tab => tab.id === read) ? read : tabs[0]?.id
  useStickyBars(rootRef, barRef, !isSkeleton)
  const { room, handlers: searchHandlers } = useSearchStick(rootRef, barRef)

  const jump = (tab) => {
    if (business?.lazy_load_products_recommended) {
      onClickCategory(tab)
      return
    }
    // a link to a product of a category keeps the page where it is
    if (window.location.search.includes('category') && window.location.search.includes('product')) return
    const section = document.getElementById(`category${tab?.id}`)
    scrollToCategory(section?.querySelector('.category-title') || section, theme)
  }

  const renderProduct = (product, section) => {
    const own = { product, currentCart, onProductClick, onProductAdd }
    if (cover) return <StoreProductCard key={product.id} {...own} handleUpdateProducts={handleUpdateProducts} />
    return showcase || section.featured
      ? <StoreProductTile key={product.id} {...own} featured={section.featured} />
      : <StoreProductRow key={product.id} {...own} />
  }

  const renderSection = (section) => {
    const shown = isLazy && !section.featured ? section.products.slice(0, LAZY_PRODUCTS) : section.products
    return (
      <Section key={section.id} id={`category${section.id}`} data-doc-section={section.featured ? 'business-featured-products' : 'business-category-products'} data-doc-category-id={section.id}>
        <div className='category-title'><h2>{section.name}</h2></div>
        {section.featured && !cover
          ? <FeaturedStrip $showcase={showcase}>{shown.map(product => renderProduct(product, section))}</FeaturedStrip>
          : <Products $tiles={showcase} $cards={cover}>{shown.map(product => renderProduct(product, section))}</Products>}
        {isLazy && section.category && section.products.length > LAZY_PRODUCTS && (
          <MoreAction><Button appearance='outline' color='neutral' onClick={() => onClickCategory(section.category)}>{t('MORE', 'More')}</Button></MoreAction>
        )}
      </Section>
    )
  }

  const search = (
    <SearchSlot>
      <SearchField searchValue={searchValue} onSearch={handleChangeSearch} lazy={business?.lazy_load_products_recommended} />
    </SearchSlot>
  )
  const empty = !isSkeleton && !categoryState?.loading && products.length === 0 && (
    <EmptyMenu>
      <NotFoundSource
        variant='empty'
        icon='shop'
        content={!searchValue ? t('NO_PRODUCTS_AVAILABLE', 'No products available right now') : t('NO_PRODUCTS_MATCH_FILTERS', 'No products match your filters')}
        subtitle={!searchValue ? t('NO_PRODUCTS_AVAILABLE_DESC', 'This business may update its menu later.') : t('TRY_CLEARING_FILTERS', 'Try clearing your filters or search.')}
        btnTitle={!searchValue ? (handleSearchRedirect ? t('SEARCH_REDIRECT', 'Go to Businesses') : null) : t('CLEAR_FILTERS', 'Clear filters')}
        onClickButton={!searchValue ? handleSearchRedirect : () => handleChangeSearch('')}
      />
    </EmptyMenu>
  )

  return (
    <MenuRoot ref={rootRef} id='wrapper-categories' $aside={aside} $cart={cartColumn} data-doc-section='business-menu' data-doc-variant={variant}>
      {aside && !isFiltered && tabs.length > 0 && (
        <SideNav aria-label={t('CATEGORIES', 'Categories')} data-doc-section='business-menu-index-list'>
          {tabs.map(tab => (
            <Button
              key={tab.id}
              size='sm'
              fullWidth
              align='start'
              color={tab.id === active ? 'primary' : 'neutral'}
              appearance={tab.id === active ? 'tonal' : 'ghost'}
              aria-current={tab.id === active ? 'location' : undefined}
              data-doc-control='business-category-tab'
              data-doc-category-id={tab.id}
              onClick={() => jump(tab)}
            >
              {tab.name}
            </Button>
          ))}
        </SideNav>
      )}
      {/* with no side list (a filtered menu) the grid's first column is the menu's own */}
      {aside && (isFiltered || tabs.length === 0) && <div />}
      <MenuMain id='businessProductList' {...searchHandlers}>
        {before}
        {isFiltered && back}
        {cover && !isSkeleton && (
          <CoverBar ref={barRef} id={MENU_BAR_ID} data-doc-section='business-menu-bar'>
            {search}
            {tabs.length > 0 && <CategoryTabs tabs={tabs} active={active} onPick={jump} label={t('CATEGORIES', 'Categories')} />}
          </CoverBar>
        )}
        {!showcase && !cover && !isSkeleton && (
          <MenuBar ref={barRef} id={MENU_BAR_ID} data-doc-section='business-menu-bar'>
            {search}
            {!desktop && tabs.length > 0 && <CategoryTabs tabs={tabs} active={active} onPick={jump} label={t('CATEGORIES', 'Categories')} />}
          </MenuBar>
        )}
        {showcase && !isSkeleton && (
          <CategoryChips ref={barRef} tabs={tabs} active={active} onPick={jump} searchValue={searchValue} onSearch={handleChangeSearch} lazy={business?.lazy_load_products_recommended} />
        )}
        {isSkeleton && <><Skeleton height='2.5em' /><SectionSkeleton tiles={showcase} /></>}
        <MenuResults $room={room}>
          {sections.map(renderSection)}
          {categoryState?.loading && !isSkeleton && <SectionSkeleton tiles={showcase} />}
          {empty}
        </MenuResults>
      </MenuMain>
      {/* tabIndex -1: the header's cart icon takes the focus here (storeCartInPage) instead of opening the drawer */}
      {cartColumn && <CartAside data-doc-section='business-cart-aside' tabIndex={-1} aria-label={t('YOUR_CART', 'Your cart')}>{cart}</CartAside>}
    </MenuRoot>
  )
}
