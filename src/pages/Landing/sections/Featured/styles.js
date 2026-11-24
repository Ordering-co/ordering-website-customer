import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeRadius, themeSpace, themeText } from '~/utils/themeTokens'

export const Dishes = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ theme }) => themeMedia(theme, '3xl')}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'lg')};
`

export const Dish = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => themeSpace(theme, 'xs')};
  min-width: 0;
`

export const DishPhoto = styled.div`
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface_alt')};
  margin-bottom: ${({ theme }) => themeSpace(theme, 'xs')};

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const DishName = styled.h3`
  margin: 0;
  ${({ theme }) => themeText(theme, 'label')}
`

export const DishPrice = styled.span`
  color: ${({ theme }) => themeColor(theme, 'text_muted')};
  ${({ theme }) => themeText(theme, 'body')}
`
