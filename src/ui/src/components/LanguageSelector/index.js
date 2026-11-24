import React, { useEffect } from 'react'
import { LanguageSelector as LanguageSelectorController } from '~components/components/LanguageSelector'
import { useTheme } from 'styled-components'
import { useLanguage } from '~components/contexts/LanguageContext'
import { useOrder } from '~components/contexts/OrderContext'
import { Select } from '~ui/src/design-system/components/Select'
import { slotSize } from '~/utils/themeGroups'
import { primeEnabledLanguages } from '../../hooks/useEnabledLanguages'

const LanguageSelectorUI = (props) => {
  const {
    languagesState,
    currentLanguage,
    handleChangeLanguage,
    notReload,
    defaultLanguages,
    defaultCurrentLanguage
  } = props

  const theme = useTheme()
  const [, t] = useLanguage()
  const [orderState] = useOrder()

  // The header selector is always mounted and loads the languages early — seed
  // the shared cache so the profile language page/menu know the count instantly
  // (no extra fetch, no load-then-hide flash). See useEnabledLanguages.
  useEffect(() => {
    if (!languagesState?.loading && languagesState?.languages) {
      primeEnabledLanguages(languagesState.languages)
    }
  }, [languagesState?.loading, languagesState?.languages])

  const _languages = languagesState?.languages?.map(language => {
    return {
      value: language?.code, content: language?.name, showOnSelected: language.code?.toUpperCase()
    }
  })
  _languages && _languages.sort((a, b) =>
    (a.content > b.content) ? 1 : ((b.content > a.content) ? -1 : 0)
  )
  return (
    _languages && _languages.length > 1
      ? (
      <Select
        size={slotSize(theme, 'header', 'language')}
        aria-label={t('LANGUAGE', 'Language')}
        options={languagesState?.loading ? defaultLanguages : _languages}
        value={languagesState?.loading ? defaultCurrentLanguage : currentLanguage}
        onChange={(languageId) => handleChangeLanguage(languageId)}
        disabled={orderState.loading && !notReload}
      />
        )
      : null
  )
}

export const LanguageSelector = (props) => {
  const DefaultChangeLanguage = () => {}
  const langProps = {
    ...props,
    UIComponent: LanguageSelectorUI,
    onChangeLanguage: props.onChangeLanguage || DefaultChangeLanguage,
    defaultLanguages: [{
      content: 'English',
      showOnSelected: 'EN',
      value: 'en'
    }],
    defaultCurrentLanguage: 'en'
  }
  return (
    <LanguageSelectorController {...langProps} />
  )
}
