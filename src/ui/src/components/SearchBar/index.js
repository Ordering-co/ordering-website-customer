import React, { useRef, useEffect, useCallback, useImperativeHandle, useState } from 'react'

import { BusinessSearch, SearchFieldWidth } from './styles'

import { useLanguage } from '~components/contexts/LanguageContext'
import { Input } from '~ui/src/design-system/components/Input'
import { Icon as BaseIcon } from '~ui/src/design-system/components/Icon'

export const SearchBar = (props) => {
  const {
    onSearch,
    search,
    placeholder,
    lazyLoad,
    isCustomLayout,
    handleCustomEnter,
    forwardRef,
    clearActionRef,
    baseInput,
    restoreFocusOnClear,
    clearAnchor,
    starbucksStyle
  } = props
  const [, t] = useLanguage()
  const el = useRef()
  const [draft, setDraft] = useState(search ?? '')
  const composing = useRef(false)
  const timeoutRef = useRef(null)
  const previousSearchRef = useRef(undefined)
  const onSearchRef = useRef(onSearch)
  const onSearchStartRef = useRef(props?.onSearchStart)
  const handleCustomEnterRef = useRef(handleCustomEnter)
  const lazyLoadRef = useRef(lazyLoad)

  useEffect(() => {
    onSearchRef.current = onSearch
    onSearchStartRef.current = props?.onSearchStart
    handleCustomEnterRef.current = handleCustomEnter
    lazyLoadRef.current = lazyLoad
  }, [onSearch, props?.onSearchStart, handleCustomEnter, lazyLoad])

  const scheduleSearch = useCallback((value) => {
    if (previousSearchRef.current === value) return
    previousSearchRef.current = value
    clearTimeout(timeoutRef.current)
    if (!lazyLoadRef.current) {
      onSearchRef.current?.(value)
      return
    }
    onSearchStartRef.current?.(value)
    timeoutRef.current = setTimeout(() => onSearchRef.current?.(value), 750)
  }, [])

  const onLegacyKeyUp = useCallback((event) => {
    if (event.keyCode === 13) {
      handleCustomEnterRef.current?.(event.target.value)
      return
    }
    scheduleSearch(event.target.value)
  }, [scheduleSearch])

  const handleClear = () => {
    clearTimeout(timeoutRef.current)
    previousSearchRef.current = ''
    onSearchRef.current?.('')
    if (baseInput) setDraft('')
    else if (el.current) el.current.value = ''
    if (restoreFocusOnClear) el.current?.focus()
  }

  useImperativeHandle(clearActionRef, () => handleClear)
  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  useEffect(() => {
    if (search) return
    if (baseInput) setDraft('')
    else if (el.current) el.current.value = ''
  }, [search, baseInput])

  useEffect(() => {
    if (props.forceFocus && el.current) {
      el.current.focus()
    }
  }, [props.forceFocus])

  const fieldProps = {
    ref: (ref) => {
      el.current = ref
      if (forwardRef) forwardRef.current = ref
      if (ref) ref.onkeyup = baseInput ? null : onLegacyKeyUp
    },
    name: 'search',
    'aria-label': placeholder || t('SEARCH', 'Search'),
    placeholder,
    autoComplete: 'off',
    maxLength: '500',
    onClick: (event) => handleCustomEnterRef.current?.(event)
  }

  if (baseInput) {
    return (
      <Input
        {...fieldProps}
        component='search_bar'
        value={draft}
        onChange={(event) => {
          const value = event.currentTarget.value
          setDraft(value)
          if (!composing.current && !event.nativeEvent.isComposing) scheduleSearch(value)
        }}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={(event) => {
          composing.current = false
          const value = event.currentTarget.value
          setDraft(value)
          scheduleSearch(value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            handleCustomEnterRef.current?.(event.currentTarget.value)
          }
        }}
        suffix={<BaseIcon name='search' />}
        clear={draft ? { label: t('CLEAR', 'Clear'), onClick: handleClear, icon: <BaseIcon name='close' /> } : undefined}
      />
    )
  }

  return (
    <BusinessSearch className={(!isCustomLayout && 'search-bar') + ' search-bar-business-listing'}>
      <SearchFieldWidth className='search-field' $wide={isCustomLayout || starbucksStyle}>
        <Input
          {...fieldProps}
          variant='clear-textual'
          defaultValue={search}
          clear={el.current?.value ? { label: t('CLEAR', 'Clear'), onClick: handleClear, anchor: clearAnchor } : undefined}
        />
      </SearchFieldWidth>
    </BusinessSearch>
  )
}
