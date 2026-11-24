import { useLanguage } from '~components/contexts/LanguageContext'
import React from 'react'
import { ContainerButton, SubCategoriesContainer, SubCategoriesInnerContainer } from '../styles'

import { AutoScroll } from '~ui/src/components/AutoScroll'
import { Chip } from '~ui/src/design-system/components/Chip'

import { Icon } from '~ui/src/design-system/components/Icon'

const subcategoriesComponentPropsAreEqual = (prevProps, nextProps) => {
  return JSON.stringify(prevProps.category) === JSON.stringify(nextProps.category) &&
    JSON.stringify(prevProps.subcategoriesSelected) === JSON.stringify(nextProps.subcategoriesSelected)
}

export const SubcategoriesComponent = React.memo((props) => {
  const {
    category,
    subcategoriesSelected,
    onClickSubcategory
  } = props

  const [, t] = useLanguage()
  const allsubcategorySelected = !subcategoriesSelected?.some(subcategory => category?.id === subcategory?.parent_category_id)
  return (
    <SubCategoriesContainer data-doc-section='business-subcategory-filters' data-doc-parent-category-id={category?.id}>
      <SubCategoriesInnerContainer>
        <AutoScroll scrollId={`scroll_${category?.id}`}>
          <ContainerButton>
            <Chip
              data-doc-control='business-subcategory-all'
              onClick={() => onClickSubcategory(null, category)}
              selected={!!allsubcategorySelected}
            >
              {t('ALL', 'All')}
            </Chip>
          </ContainerButton>
          {category?.subcategories?.map(subcategory => {
            const isSubcategorySelected = subcategoriesSelected?.find(_subcategory => _subcategory?.id === subcategory?.id)
            return (
              <ContainerButton key={subcategory?.id}>
                <Chip
                  data-doc-control='business-subcategory-filter'
                  data-doc-subcategory-id={subcategory?.id}
                  data-doc-active={String(!!isSubcategorySelected)}
                  onClick={() => onClickSubcategory(subcategory, category)}
                  selected={!!isSubcategorySelected}
                >
                  {subcategory?.name} {isSubcategorySelected && <Icon name="closeX" />}
                </Chip>
              </ContainerButton>
            )
          }
          )}
        </AutoScroll>
      </SubCategoriesInnerContainer>
    </SubCategoriesContainer>
  )
}, subcategoriesComponentPropsAreEqual)
