import React from 'react'
import { LanguageSelector as LanguageSelectorController } from '~components/components/LanguageSelector'
import { Choice } from '~ui/src/design-system/components/Choice'
import { Flag, LanguageSelectorListContainer } from './styles'

const LanguageSelectorListUI = (props) => {
  const {
    languagesState,
    currentLanguage,
    handleChangeLanguage,
    defaultLanguages
  } = props

  const _languages = languagesState?.languages?.map(language => {
    return {
      value: language?.code,
      content: language?.name,
      showOnSelected: language.code?.toUpperCase(),
      image: language?.image
    }
  })

  _languages && _languages.sort((a, b) =>
    (a.content > b.content) ? 1 : ((b.content > a.content) ? -1 : 0)
  )

  return (
    _languages && _languages.length > 1
      ? (
        <LanguageSelectorListContainer role='group'>
          {/* actions that look like a single choice list of components.choice: picking one reloads the page, so the arrows select nothing */}
          {(languagesState?.loading ? defaultLanguages : _languages).map((language) => (
            <Choice
              key={language.value}
              variant='action'
              selected={currentLanguage === language.value}
              onClick={() => handleChangeLanguage(language.value)}
              title={language.content}
              icon={language.image ? <Flag><img src={language.image} alt='' /></Flag> : undefined}
            />
          ))}
        </LanguageSelectorListContainer>
        )
      : null
  )
}

export const LanguageSelectorList = (props) => {
  const DefaultChangeLanguage = () => {}
  const langProps = {
    ...props,
    UIComponent: LanguageSelectorListUI,
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
