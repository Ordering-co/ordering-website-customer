import React from 'react'
import { CategoryTab, CategoryLabel, CategoryChevron } from './styles'
import { ChevronIcon } from '~ui/src/styles/Chevron'

import { useWindowSize } from '~ui/hooks/useWindowSize'
import { useLanguage } from '~components/contexts/LanguageContext'

export const AccordionDropdown = (props) => {
  const {
    item,
    spaceTab,
    isOpen,
    isSelected,
    handleClickItem,
    IterateCategories
  } = props

  const handleClick = (e, isSelectCategory) => {
    e.stopPropagation()
    handleClickItem(isSelectCategory)
  }
  const windowSize = useWindowSize()
  const [, t] = useLanguage()
  return (
    <div className='accordion-item'>
      <CategoryTab
        active={isSelected}
        className='accordion-title'
        categorySpace={spaceTab}
        onClick={(e) => handleClick(e, false)}
        aria-expanded={!!isOpen}
      >
        <CategoryLabel>{item.name}</CategoryLabel>
        <CategoryChevron className='accordion-chevron'>
          <ChevronIcon kind='disclose' open={!!isOpen} />
        </CategoryChevron>
      </CategoryTab>
      {isOpen && (
        <div className='accordion-content'>
          {/* on small screens the list is alone: "All" opens the products of
              the whole category (the title only opens its subcategories) */}
          {windowSize.width < 993 && (
            <CategoryTab
              className='accordion-all'
              categorySpace={spaceTab}
              onClick={(e) => handleClick(e, true)}
                  >
              <CategoryLabel>{t('ALL', 'All')}</CategoryLabel>
            </CategoryTab>
          )}
          <IterateCategories
            list={item.subcategories}
            isSub
            currentCat={item}
          />
        </div>
      )}
    </div>
  )
}
