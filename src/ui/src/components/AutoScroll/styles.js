import styled, { css } from 'styled-components'

export const AutoscrollContainer = styled.span`
  display: ${props => props.modal ? 'flex' : 'inherit'};
  width: ${props => props.modal ? '300vw' : 'initial'};
  ${({ isColumnMode }) => isColumnMode && css`
    flex-direction: column;
    overflow: hidden;
    align-items: center;
  `}
  ${({ isFlex }) => isFlex && css`
    display: flex;
    flex-wrap: wrap;
  `}
  ${({ gap }) => gap && css`
    gap: ${gap}px;
  `}
  /* the arrows (buttons): over the content, sticky at the sides */
  > .left-autoscroll, > .right-autoscroll {
    align-self: center;
    top: ${props => props.modal ? '35%' : '0'};
    position: sticky;
    flex-shrink: 0;
    z-index: 100;
  }

  .right-autoscroll{
    ${props => props.theme?.rtl
? css`
      left: 91%;
    `
: css`
      right: 1%;
    `}
  }
  .left-autoscroll{
    ${props => props.theme?.rtl
? css`
      right: 91%;
    `
: css`
      left: 1%;
    `}
  }
  && > .hidden.left-autoscroll, && > .hidden.right-autoscroll {
    display: none;
  }

  @media (min-width: 480px){
    .right-autoscroll{
    ${props => props.theme?.rtl && css`
      left: 94%;
    `}
   }
    .left-autoscroll{
      ${props => props.theme?.rtl && css`
        right: 94%;
      `
      }
    }
  }

  @media (min-width: 768px){
    width: ${props => props.modal && '100%'};
    display: inherit;
    ${props => props.modal && css`
      .left-autoscroll{
        opacity: 0;
      }
      .right-autoscroll{
        opacity: 0;
      }
    `}
  }

  @media (min-width: 1024px){
    .right-autoscroll{
      ${props => props.theme?.rtl && css`
        left: 97%;
      `}
    }
      .left-autoscroll{
        ${props => props.theme?.rtl && css`
          right: 97%;
        `
      }
    }
  }
`
