import styled from 'styled-components'

/* A group of gift cards (Pending, Sent, Redeemed); its rhythm is the
   gift card tab's (GiftCardOrdersList) */
export const ProductsListContainer = styled.div``

export const SingleGiftCardWrapper = styled.div``

/* The "load more" under the cards */
export const WrappButton = styled.div`
  width: 80%;
  display: flex;
  justify-content: center;
`

/* The button's width: all of the "load more" row, 60% of it from 768px (layout
   only; the button is full width inside) */
export const LoadMoreWidth = styled.div`
  width: 100%;

  @media (min-width: 768px) {
    width: 60%;
  }
`
