import styled from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeRadius, themeSpace } from '~/utils/themeTokens'

export const Photos = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ theme }) => themeMedia(theme, '5xl')}, 1fr));
  gap: ${({ theme }) => themeSpace(theme, 'md')};
`

export const Photo = styled.li`
  min-width: 0;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: ${({ theme }) => themeRadius(theme, 'md')};
  background: ${({ theme }) => themeColor(theme, 'surface')};

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`
