import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useOrder } from '~components/contexts/OrderContext'
import { parseSearchQueryLocation, resolveSearchQuery } from '~/utils/searchQueryLocation'

/**
 * What the home hero (HomeHero) needs to take the customer to the stores: the
 * location of the URL (`?lat=&lng=`) and the action of its search, which opens
 * the listing (`/search`) with the order's address, else the URL's location.
 * Shared by the home of the menu and the marketing page of a full website.
 */
export const useFindBusiness = () => {
  const history = useHistory()
  const { search } = useLocation()
  const [orderState] = useOrder()
  const urlLocation = useMemo(() => parseSearchQueryLocation(search), [search])

  const onFindBusiness = () => {
    const orderLocation = orderState?.options?.address?.location
    history.push(`/search${resolveSearchQuery('', orderLocation, urlLocation)}`)
  }

  return { urlLocation, onFindBusiness }
}
