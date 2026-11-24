import styled, { css } from 'styled-components'
import { themeColor } from '~/utils/themeColors'
import { getThemeCss } from '~/utils/themeCss'
import { buttonStill, themeBorderWidth, themeFontFamily, themeIconSize, themePart, themeRadius, themeShadow, themeShadowParts, themeSize, themeSpace, themeText, headingText, blockStill } from '~/utils/themeTokens'
import { dividerLineCss } from '~ui/src/styles/Divider'

/* The text of a chat bubble over its background
   (components.chat_bubble): its mine_color / theirs_color. */
export const bubbleTextColor = (theme, side) => getThemeCss(theme, 'chat_bubble').base[`${side}_color`]

/* The corners of a bubble of components.chat_bubble: its
   radius, and with `tail` the corner under its sender (bottom end for mine,
   bottom start for theirs; mirrored in RTL) squared to the xs radius. */
export const bubbleCornersCss = (theme, side) => {
  const bubble = getThemeCss(theme, 'chat_bubble').base
  const radius = bubble.radius
  if (bubble.tail !== true) return `&&, &&[name=image] { border-radius: ${radius}; }`
  // the tokens' xs, not the identity's rounding: the corner stays small
  const tail = theme.css.tokens.radius.xs
  const end = (side === 'mine') !== !!theme?.rtl
  // top-left, top-right, bottom-right, bottom-left
  return `&&, &&[name=image] { border-radius: ${radius} ${radius} ${end ? tail : radius} ${end ? radius : tail}; }`
}

/* A bubble of the chat is a block, not a control: the shadow
   of components.chat_bubble (shadow) does not change on hover; its border,
   its padding (padding_y above and below, padding_x on its sides), sm under
   it, its text the body of the theme in its side's color; with a tail the
   corner under its sender squared. `tail` false for a bubble without a
   sender (the console's notices). */
const bubbleCss = (theme, side, { tail = true } = {}) => {
  const bubble = getThemeCss(theme, 'chat_bubble').base
  return css`
    padding: ${bubble.padding_y} ${bubble.padding_x};
    margin-bottom: ${themeSpace(theme, 'sm')};
    ${themeText(theme, 'body', { props: ['size', 'line', 'family'] })}
    color: ${bubbleTextColor(theme, side)};
    border: ${bubble.border};
    &, &:hover {
      box-shadow: ${bubble.shadow.css};
    }
    ${tail && bubbleCornersCss(theme, side)}
  `
}

export const MessagesContainer = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0 ${props => themeSpace(props.theme, 'lg')};

  @media (min-width: 769px) {
    padding: 0 ${props => themeSpace(props.theme, 'xxl')};
  }

  ${({ profileMessages }) => profileMessages && css`
    padding: 0 !important;
  `};
  ${props => blockStill(props.theme)}
`

// A selectable row of the chat (the participant's, the pane's title): the avatar, two lines and
// their md padding, 1.25 of the theme's xl control size (70px with the default one).
const rowHeight = (theme) => `calc(1.25 * ${themeSize(theme, 'xl')})`

export const HeaderProfile = styled.div`
  display: flex;
  align-items: center;
  ${({ theme, $conversation }) => !$conversation && dividerLineCss(theme, 'item')}
  height: ${({ theme }) => rowHeight(theme)};
  box-sizing: border-box;

  /* The read-only header has the same insets as the conversation choice. */
  ${({ theme, $conversation }) => !$conversation && css`
    ${blockStill(theme)}
    padding: ${themeSpace(theme, 'md')} ${themeSpace(theme, 'lg')};
  `}

  div {

    p {
      margin-left: 0;
      ${props => props.theme?.rtl && css`
        margin-right: ${props => themeSpace(props.theme, 'md')};
        margin-left: 0px;
      `}
      ${props => blockStill(props.theme)}
    }

    strong {
      p{
        margin-block-end: 0.1em;
        ${props => blockStill(props.theme)}
      }
    }

    p {
      margin-block-start: 0.1em;
      /* the text of HeaderOnline is the theme's (label) */
      ${props => blockStill(props.theme)}
    }
    ${props => blockStill(props.theme)}
  }
`

export const HeaderName = styled.p`
  font-size: 1.1em;
  margin-block-end: 0.1em;
  margin-block-start: 0.1em;
  ${props => blockStill(props.theme)}
`

export const Status = styled.p`
  margin-block-start: 0.1em;
  margin-block-end: 0.1em;
  font-size: 0.7em;
  ${props => blockStill(props.theme)}
`

export const Image = styled.div`
  width: ${props => themeSize(props.theme, 'md')};
  height: ${props => themeSize(props.theme, 'md')};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${props => themeRadius(props.theme, 'sm')};
  padding: ${props => themeSpace(props.theme, 'xs')};
  box-sizing: border-box;
  overflow: hidden;
  /* a logo, not a control: its shadow stays on hover */
  &, &:hover {
    box-shadow: ${props => themeShadow(props.theme, 'sm')};
  }

  img {
    width: 100%;
    height: auto;
    border-radius: ${props => themeRadius(props.theme, 'full')};
    object-fit: cover;
    border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'border')};
    ${props => blockStill(props.theme)}
  }

  img[name]{
    border: ${props => themeBorderWidth(props.theme, 'thin', { fixed: true })} solid ${props => themeColor(props.theme, 'danger')};
    border-radius: ${props => themeRadius(props.theme, 'full')};
  }

  svg {
    width: ${props => themeSize(props.theme, 'md')};
    height: ${props => themeSize(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const HeaderOnline = styled.div`
  display: flex;
  flex-direction: column;
  height: ${props => themeSize(props.theme, 'md')};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  text-align: left;

  ${props => props.theme?.rtl && css`
    text-align: right;
  `}
  /* md after the picture */
  margin-inline-start: ${props => themeSpace(props.theme, 'md')};
  margin-inline-end: 0;

  p,
  span {
    margin: 0px;
    ${props => blockStill(props.theme)}
  }

  /* the name: a line of text, not a heading */
  p {
    ${props => themeText(props.theme, 'label', { props: ['size', 'weight'], weight: 600 })}
  }

  span {
    ${props => themeText(props.theme, 'caption', { props: ['size', 'weight'], weight: 300 })}
  }
  ${props => blockStill(props.theme)}
`

export const Chat = styled.div`
  display: flex;
  overflow-y: auto;
  overflow-x: hidden;
  height: 50dvh;
  min-height: 50ch;
  flex-direction: column;
  /* lg at the sides, md over the first message; that md is
     outside the scroll (a padding or a margin inside it scrolls away with
     the messages), so a scrolled message is clipped md under the header's
     line, never against it */
  padding: 0 ${props => themeSpace(props.theme, 'lg')};
  margin-top: ${props => themeSpace(props.theme, 'md')};
  > :first-child {
    margin-top: 0;
  }

  @media (min-width: 769px){
    min-height: 20ch;
    height: 50dvh;
  }
  /* The inbox and a standalone conversation fill their available pane. */
  ${({ profileMessages, $fill }) => (profileMessages || $fill) && css`
    &&& {
      flex: 1 1 auto;
      height: auto;
      min-height: 0;
    }
  `}
  ${props => blockStill(props.theme)}
`

export const MessageConsole = styled.div`
  width: 100%;
  display: inline-flex;
  justify-content: center;
  font-size: 0.8em;
  border-radius: ${props => themeRadius(props.theme, 'full')};
  ${props => blockStill(props.theme)}
`

export const MessageBusiness = styled.div`
  display: flex;
  flex-wrap: wrap;
  font-size: 0.8em;
  ${props => blockStill(props.theme)}
`

export const MessageCustomer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-wrap: wrap;
  font-size: 0.8em;
  ${props => blockStill(props.theme)}
`

export const BubbleConsole = styled.div`
  max-width: 40%;
  text-align: center;
  height: auto;
  overflow: hidden;
  overflow-wrap: break-word;

  @media (min-width: 1024px){
    max-width: 30%
  }
  ${props => themePart(props.theme, 'chat_bubble', { background: 'base.theirs_background', 'border-radius': 'base.radius' })}
  /* a bubble (see bubbleCss) without a sender (no tail), lg
     under it as a notice */
  ${props => bubbleCss(props.theme, 'theirs', { tail: false })}
  margin-bottom: ${props => themeSpace(props.theme, 'lg')};
  ${props => blockStill(props.theme)}
`

/* The corners, padding, colors and shadow of the bubbles are
   components.chat_bubble's (bubbleCss). */
export const BubbleBusines = styled.div`
  max-width: 60%;
  min-width: 10ch;
  overflow: hidden;
  overflow-wrap: break-word;

  &[name=image]{
    width: 100%;
  }

  @media (min-width: 1024px){
    max-width: 40%;
  }
  /* components.chat_bubble (theirs) */
  ${props => themePart(props.theme, 'chat_bubble', { background: 'base.theirs_background' })}
  ${props => bubbleCss(props.theme, 'theirs')}
  ${props => blockStill(props.theme)}
`

export const BubbleCustomer = styled.div`
  max-width: 60%;
  min-width: 10ch;
  height: auto;
  overflow-wrap: break-word;
  overflow: hidden;

  p:last-child {
    left: ${props => themeSpace(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }

  &[name=image]{
    width: 100%;
  }

  ${props => props.theme?.rtl && css`
    p:last-child {
      left: initial;
      right: ${props => themeSpace(props.theme, 'md')};
    }
  `}

  @media (min-width: 1024px){
    max-width: 40%
  }
  /* components.chat_bubble (mine) */
  ${props => themePart(props.theme, 'chat_bubble', { background: 'base.mine_background' })}
  ${props => bubbleCss(props.theme, 'mine')}
  ${props => blockStill(props.theme)}
`

export const SkeletonBubbleCustomer = styled.div`

  span{
    border-radius: ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} 0px ${props => themeRadius(props.theme, 'sm')};
    ${props => props.theme?.rtl && css`
    border-radius: ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} 0px;
    `}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const SkeletonBubbleBusiness = styled.div`

  span{
    border-radius: ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} 0px;
    ${props => props.theme?.rtl && css`
    border-radius: ${props => themeRadius(props.theme, 'sm')} ${props => themeRadius(props.theme, 'sm')} 0px ${props => themeRadius(props.theme, 'sm')};
    `}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ChatImage = styled.div`
  width: 100%;
  height: auto;

  img{
    width: 100%;
    height: auto;
    max-height: 40dvh;
    aspect-ratio: auto 16 / 9;
    vertical-align: middle;
    object-fit: contain;
    cursor: pointer;
    border-radius: ${props => themeRadius(props.theme, 'sm')};
    ${props => blockStill(props.theme)}
  }
  /* the picture opens on click (a button's job) but keeps
     still, sm under it */
  margin-bottom: ${props => themeSpace(props.theme, 'sm')};
  ${props => blockStill(props.theme)}
`

export const PartnerName = styled.p`
  margin-block-start: 0;
  /* the label of the theme, xs over the message */
  ${props => themeText(props.theme, 'label')}
  margin-block-end: ${props => themeSpace(props.theme, 'xs')};
  ${props => blockStill(props.theme)}
`

export const MyName = styled.p`
  margin-block-start: 0;
  text-align: right;
  /* the label of the theme, xs over the message */
  ${props => themeText(props.theme, 'label')}
  margin-block-end: ${props => themeSpace(props.theme, 'xs')};

  ${props => props.theme?.rtl && css`
    text-align: left;
  `}
  ${props => blockStill(props.theme)}
`

export const TimeofSent = styled.p`
  position: relative;
  /* the caption of the theme (its size, not a part of it), xs under the
     message */
  ${props => css`
    ${themeText(props.theme, 'caption')}
    margin-block-start: ${themeSpace(props.theme, 'xs')};
  `}
  text-align: right;
  margin-block-end: initial;

  ${props => props.theme?.rtl && css`
    text-align: left;
  `}
  ${props => blockStill(props.theme)}
`

export const TimeofSentByAdmin = styled.p`
  position: relative;
  /* the caption of the theme (its size, not a part of it), xs under the
     message */
  ${props => css`
    ${themeText(props.theme, 'caption')}
    margin-block-start: ${themeSpace(props.theme, 'xs')};
  `}
  text-align: left;
  margin-block-end: initial;

  ${props => props.theme?.rtl && css`
    text-align: right;
  `}
  ${props => blockStill(props.theme)}
`

export const SendForm = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${props => themeSpace(props.theme, 'xs')};
  bottom: 0;
  width: 100%;
  box-sizing: border-box;
  box-shadow: ${props => themeShadow(props.theme, 'sm')};

  @media (min-width: 480px){
    padding: ${props => themeSpace(props.theme, 'xs')} ${props => themeSpace(props.theme, 'lg')};
  }

  @media (min-width: 769px) {
    padding: ${props => themeSpace(props.theme, 'sm')} ${props => themeSpace(props.theme, 'lg')};
    position: sticky;
    width: auto;
  }
  ${props => blockStill(props.theme)}
  /* the composer's background (chat_bubble.base.composer_background) at every width */
  && {
    ${props => themePart(props.theme, 'chat_bubble', { 'background-color': 'base.composer_background' })}
  }
`

export const Send = styled.form`
  align-items: center;
  display: flex;
  height: auto;
  width: 100%;

  /* the input is the piece (components.input, its states); the room for
     the picture's button is the piece's own style (index.js) */
  margin-top: ${props => themeSpace(props.theme, 'sm')};
  gap: ${props => themeSpace(props.theme, 'md')};
  ${props => blockStill(props.theme)}
`

export const WrapperDeleteImage = styled.div`
  width: ${props => themeIconSize(props.theme, 'lg')};
  height: ${props => themeIconSize(props.theme, 'lg')};
  position: absolute;
  top: ${props => themeSpace(props.theme, 'sm')};
  ${props => props.theme?.rtl
    ? css`
      left: ${props => themeSpace(props.theme, 'md')};
    `
    : css`
      right: ${props => themeSpace(props.theme, 'md')};
    `}

  /* the remove button keeps its own size and is centered on this box (the
     picture's thumbnail), covering it, so it stays inside the field and off
     Send; flex centers it even where it is larger than the box */
  display: flex;
  align-items: center;
  justify-content: center;

  /* the box of the button: as wide as it is (a button never shrinks to the
     thumbnail); it is not positioned, so the picture below fills the wrapper */
  > div {
    flex: none;
    width: max-content;

    img{
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      &:disabled {
        cursor: not-allowed;
      }
      border-radius: ${props => themeRadius(props.theme, 'sm')};
      ${props => blockStill(props.theme)}
    }

    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const WrapperSendMessageButton = styled.div`
  white-space: nowrap;
  /* the form's gap separates it */
  margin: 0;
  ${props => blockStill(props.theme)}
`

export const ImageContainer = styled.div`
  position: relative;
  max-height: 60dvh;

  img{
    width: 100%;
    height: auto;
    aspect-ratio: auto 16 / 9;
    border-bottom-left-radius: ${props => themeRadius(props.theme, 'md')};
    border-bottom-right-radius: ${props => themeRadius(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const ModalIcon = styled.span`
  display: flex;
  position: absolute;
  cursor: pointer;
  /* the text over the inverse close (tokens.color.on_inverse, #FFFFFF by default) */
  color: ${props => themeColor(props.theme, 'on_inverse')};
  z-index: 1;
  /* still, like every button */
  ${props => buttonStill(props.theme)}
  /* only the place of the close, a Button of the theme
     (inverse, over the picture) sm off the corner */
  && {
    top: ${props => themeSpace(props.theme, 'sm')};
    inset-inline-end: ${props => themeSpace(props.theme, 'sm')};
    inset-inline-start: auto;
  }
`

export const MessagesLayoutWrapper = styled.div`
  display: flex;
  /* a pane edge, components.divider vertical's line */
  ${props => dividerLineCss(props.theme, 'vertical', { edge: 'left' })}
  position: relative;
  flex-direction: column;

  @media (min-width: 769px) {
    flex-direction: row;
  }
  ${({ profileMessages, $fill }) => (profileMessages || $fill) && css`
    height: 100%;
    min-height: 0;
  `}
  /* alone on a page (an order's messages): no pane edge beside a list */
  ${({ standalone }) => standalone && css`
    && {
      border: none;
    }
  `}
  ${props => blockStill(props.theme)}
`

export const MessagesLeftLayout = styled.div`
  width: 100%;
  min-width: min(100%, 31ch);
  /* a pane edge, components.divider vertical's line */
  ${props => dividerLineCss(props.theme, 'vertical', { edge: 'inline-end' })}

  @media (min-width: 769px) {
    width: 30%;
  }
  ${props => blockStill(props.theme)}
`

export const MessagesRightLayout = styled.div`
  width: 100%;
  /* tokens.space.xxl under the list (small screens) */
  margin-top: ${props => themeSpace(props.theme, 'xxl')};
  ${({ profileMessages }) => profileMessages && css`
    margin-top: 0px;
  `}

  @media (min-width: 769px) {
    width: 70%;
    border: none;
    margin-top: 0;
    ${({ profileMessages }) => profileMessages && css`
      width: 100%;
    `}
  }
  /* The chat takes what its header and composer leave. */
  ${({ profileMessages, $fill }) => (profileMessages || $fill) && css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    > * {
      flex-shrink: 0;
    }
  `}
  ${props => blockStill(props.theme)}
`

export const MessagesTitle = styled.div`
  display: flex;
  align-items: center;
  ${props => dividerLineCss(props.theme, 'item')}
  padding: ${props => themeSpace(props.theme, 'lg')} ${props => themeSpace(props.theme, 'lg')};
  height: ${({ theme }) => rowHeight(theme)};
  box-sizing: border-box;

  h3 {
    ${props => headingText(props.theme, 'h3')}
    color: ${props => themeColor(props.theme, 'text')};
    margin: 0;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const CustomerList = styled.div`
  /* its options sm apart, md from the pane's edges */
  ${props => css`
    display: flex;
    flex-direction: column;
    gap: ${themeSpace(props.theme, 'sm')};
    padding: ${themeSpace(props.theme, 'md')};
  `}

  ${props => blockStill(props.theme)}
`

export const MessagesClose = styled.div`
  position: absolute;
  cursor: pointer;
  /* still, like every button */
  ${props => buttonStill(props.theme)}
  /* only the place of the close, a Button of the theme
     (index.js), sm off the corner */
  top: ${props => themeSpace(props.theme, 'sm')};
  inset-inline-end: ${props => themeSpace(props.theme, 'sm')};
  inset-inline-start: auto;
`

export const InputWrapper = styled.div`
  width: 60%;
  flex: 1;
  position: relative;
  ${props => blockStill(props.theme)}
`

export const MessageContentWrapper = styled.div`
  font-family: ${props => themeFontFamily(props.theme, 'body')};
  ${props => blockStill(props.theme)}
`

export const MessageCreatedDate = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => themeSpace(props.theme, 'md')};

  span {
    ${props => themeText(props.theme, 'caption', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const NotSendMessage = styled(SendForm)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  color: ${props => themeColor(props.theme, 'text_muted')};
  /* a notice in the composer's place, not the composer: a quiet band
     (surface_alt) over the composer's background */
  && {
    background-color: ${props => themeColor(props.theme, 'surface_alt')};
  }

  svg {
    font-size: ${props => themeIconSize(props.theme, 'md')};
    ${props => blockStill(props.theme)}
  }

  p {
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    color: ${props => themeColor(props.theme, 'text_muted')};
    margin: ${props => themeSpace(props.theme, 'xs')} 0;
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

export const QuickMessageWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  /* the chips sm apart */
  gap: ${props => themeSpace(props.theme, 'sm')};
  && button {
    margin: 0;
  }
  ${props => blockStill(props.theme)}
`

export const ProfileMessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${props => themeSpace(props.theme, 'md')};
  padding: ${props => themeSpace(props.theme, 'xl')};
  /* a bar the width of the chat, its shadow falls down only */
  box-shadow: ${({ theme }) => themeShadowParts(theme, 'sm').down};
  box-sizing: border-box;
  ${props => blockStill(props.theme)}
`

export const MessagesTypes = styled.div`
  display: flex;
  margin-inline-start: auto;
  ${props => blockStill(props.theme)}
`

export const OrderData = styled.div`
  display: flex;
  flex-direction: column;

  h1, h2 {
    margin: 0;
    ${props => blockStill(props.theme)}
  }

  p {
    margin: 0;
    ${props => themeText(props.theme, 'body', { props: ['size'] })}
    ${props => blockStill(props.theme)}
  }
  ${props => blockStill(props.theme)}
`

/* The conversation's title (the order): the page's h1 is "Messages", so it
   is an h2 of the theme. */
export const OrderTitle = styled.h2`
  ${props => headingText(props.theme, 'h2')}
`

export const MessageType = styled.div`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  margin-inline-start: ${({ theme }) => themeSpace(theme, 'sm')};

  >div {
    box-shadow: none;
    ${props => blockStill(props.theme)}
  }

  ${({ active }) => active && css`
    >div {
      box-shadow: ${props => themeShadow(props.theme, 'sm', { fixed: true })};
    }
  `}
  > div {
    margin: 0;
    ${props => buttonStill(props.theme)}
  }
`
