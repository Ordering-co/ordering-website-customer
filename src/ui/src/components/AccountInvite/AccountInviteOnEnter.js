import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'styled-components'
import { useLocation } from 'react-router-dom'
import { useCustomer } from '~components/contexts/CustomerContext'
import { useSession } from '~components/contexts/SessionContext'
import { isTrackingOnly } from '~/utils/siteSettings'
import settings from '~/config'
import { AccountInvite } from './AccountInvite'

/**
 * The invitation a page opens on its own for a guest, each time the page is entered (the route's
 * `location.key` changes, also to the same route). It never opens in the kiosk, in the call center's
 * customer mode or on a tracking-only site, and never for a user with an account. Nothing remembers a
 * previous opening. The decision is taken on entering: the account created in it changes the session,
 * and the invitation must not close because of that.
 */
export const AccountInviteOnEnter = ({ entry }) => {
  const location = useLocation()
  const theme = useTheme()
  const [{ user }] = useSession()
  const [customerState] = useCustomer()
  const [open, setOpen] = useState(false)
  const eligible = !!user?.guest_id && !settings?.use_kiosk && !customerState?.user?.id && !isTrackingOnly(theme)
  const latest = useRef(eligible)
  latest.current = eligible

  useEffect(() => { setOpen(latest.current) }, [location.key])

  return <AccountInvite entry={entry} open={open} onClose={() => setOpen(false)} />
}
