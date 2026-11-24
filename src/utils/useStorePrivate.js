import { useSyncExternalStore } from 'react'
import { isStorePrivate, subscribeStorePrivate } from './storePreview'

/** True once the API answered 403 STORE_PRIVATE: the store is private and this visit has no valid token. */
export const useStorePrivate = () => useSyncExternalStore(subscribeStorePrivate, isStorePrivate)
