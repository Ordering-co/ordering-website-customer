import { createContext } from 'react'

// True under a Dialog or a Sheet: what they hold that opens its own layer (a Tooltip) goes over their
// viewport, not over the page. Its own file so a Tooltip of the entry chunk does not pull the Dialog in.
export const ModalHostContext = createContext(false)
