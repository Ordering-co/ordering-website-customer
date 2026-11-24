import React, { useLayoutEffect } from 'react'
import loadable from '@loadable/component'
import { Redirect, Route } from 'react-router-dom'
import { lazyRetry } from '../LazyRetry'
import { PostLoginHomeGate } from '~ui/src/components/PostLoginHomeGate'
import { isLandingRequest, removeLandingSsr } from '../../pages/Landing/ssrSwap'

const HomePage = loadable(() => lazyRetry(() => import('../../pages/Home')))
const LandingPage = loadable(() => lazyRetry(() => import('../../pages/Landing')))
const QueryLoginSpoonity = loadable(() => import('~ui/src/components/QueryLoginSpoonity').then((m) => m.QueryLoginSpoonity))

const spoonityLogin = (p) => (
  <QueryLoginSpoonity
    token={p.queryIntegrationToken}
    notificationState={p.notificationState}
    // a full website's menu is '/order': after the login (or closing it) the visitor goes there, not back to '/'
    destination={p.fullWebsite ? '/order' : undefined}
  />
)

/**
 * What the menu home renders (the ordering home: the store, the franchise's
 * store selector or the marketplace's home) on a route that `has` the
 * Spoonity login and/or the custom order (ordering only: '/' has the login,
 * '/home' the custom order; full website: '/order' has both).
 * Precedence: verify, kiosk, Spoonity login, custom order, the redirect to
 * the order's location, the single store, the home.
 */
const menuHome = (p, has) => {
  const home = <HomePage notificationState={p.notificationState} />
  const spoonity = has.spoonity && p.queryIntegrationToken && p.queryIntegrationCode === 'spoonity'
  if (p.isUserVerifyRequired && !p.guestCheckoutEnabled) return <Redirect to='/verify' />
  if (p.isKioskApp) return home
  if (spoonity) return spoonityLogin(p)
  if (has.customOrder && p.customOrderEnabled) return home
  if (p.shouldRedirectHomeToOrderLocation) return <Redirect to={p.homeOrderLocationRedirectPath} />
  if (p.singleBusinessActive) return <Redirect to={p.singleBusinessHome} />
  return <PostLoginHomeGate auth={p.auth} hasAddress={p.hasAddress} loading={p.loading}>{home}</PostLoginHomeGate>
}

// '/' of a full website when it is not the marketing page (kiosk, Spoonity login): the server's paint of the page goes
// away as the screen that takes its place mounts, not 10 s later (the guard's timer)
const InsteadOfLanding = ({ children }) => {
  useLayoutEffect(removeLandingSsr, [])
  return children
}

/**
 * The routes of the home, as children of a `<Switch>` (before '/:business_slug'):
 * - ordering only: '/' and '/home' are the menu home;
 * - full website: '/' is the marketing page (the kiosk's menu or the Spoonity login take its place, `isLandingRequest`),
 *   '/order' the menu home, '/home' redirects to '/order' keeping the query.
 * `p`: the App's flags (see menuHome) plus `fullWebsite`.
 */
export const menuHomeRoutes = (p) => p.fullWebsite
  ? [
    <Route
      key='landing'
      exact
      path='/'
      render={({ location }) => isLandingRequest({ kiosk: p.isKioskApp, search: location.search })
        ? <LandingPage />
        : <InsteadOfLanding>{p.isKioskApp ? menuHome(p, {}) : spoonityLogin(p)}</InsteadOfLanding>}
    />,
    <Route key='order' exact path='/order'>{menuHome(p, { spoonity: true, customOrder: true })}</Route>,
    <Route key='home' exact path='/home' render={({ location }) => <Redirect to={{ ...location, pathname: '/order' }} />} />
    ]
  : [
    <Route key='home' exact path='/home'>{menuHome(p, { customOrder: true })}</Route>,
    <Route key='root' exact path='/'>{menuHome(p, { spoonity: true })}</Route>
    ]
