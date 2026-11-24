import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { themeMedia, themeSpace } from '~/utils/themeTokens'

export const HomeContainer = styled.div`
  background-color: ${props => themeColor(props.theme, 'background')};
  display: flex;
  flex-direction: column;
`
export const SkeletonContainer = styled.div`
  display: flex;
  flex-direction: column
`

export const SkeletonHeader = styled.div`
  width: 100%;
  height: ${props => themeMedia(props.theme, 'xs')};
  margin: ${props => themeSpace(props.theme, 'xl')} auto;
`

export const SkeletonContent = styled.div`
  width: 100%;
  /* the room of the text it will hold: a share of the screen's height */
  min-height: 60dvh;
  display: flex;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};
`

export const SkeletonInformation = styled.div`
  width: 70%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: ${props => themeSpace(props.theme, 'md')};
  ${props => props.theme?.rtl && css`
    margin-left: ${props => themeSpace(props.theme, 'md')};
    margin-right: 0;
  `}
`

export const SkeletonSide = styled.div`
  width: 30%;
  height: 100%;
  margin-left: ${props => themeSpace(props.theme, 'md')};
  ${props => props.theme?.rtl && css`
    margin-right: ${props => themeSpace(props.theme, 'md')};
    margin-left: 0;
  `}
`
