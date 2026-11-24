import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORE_PARAMS } from '../../pages/Landing/useFranchiseStores'
import { FRANCHISE_STORE_FIELDS, LANDING_SSR_GUARD, LANDING_SSR_MAX_WAIT_MS, landingSsrMarkup, renderLandingHtml } from '../../../worker/landingSsr.js'

describe('landingSsrMarkup', () => {
  it('the style hides #root and carries the CSS; the markup follows it, in the node the client looks for', () => {
    const markup = landingSsrMarkup({ html: '<main><h1>Casa</h1></main>', css: '.a{color:red}' })
    expect(markup).toBe('<style id="landing-ssr-style">#root{display:none}.a{color:red}</style><div id="landing-ssr"><main><h1>Casa</h1></main></div>')
  })

  it('the theme\'s font links come first, with the id and href App.js gives its own, escaped', () => {
    const markup = landingSsrMarkup({ html: '', css: '', fonts: [{ id: 'body-font-styles', name: 'Inter', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap' }, { id: 'heading-font-styles', name: 'A"B', href: 'https://f.test/?a=1&b=2' }] })
    const page = new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html')
    const links = [...page.querySelectorAll('link[id$="-font-styles"]')]
    expect(links.map((link) => [link.id, link.rel, link.getAttribute('href'), link.dataset.fontName])).toEqual([
      ['body-font-styles', 'stylesheet', 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap', 'Inter'],
      ['heading-font-styles', 'stylesheet', 'https://f.test/?a=1&b=2', 'A"B']
    ])
    expect(markup.startsWith('<link')).toBe(true)
  })

  it('a CSS that tries to close the style tag cannot', () => {
    const markup = landingSsrMarkup({ html: '', css: '.a::after{content:"</style><script>alert(1)</script>"}' })
    expect(markup.match(/<\/style/gi)).toHaveLength(1)
    const page = new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html')
    expect(page.querySelectorAll('script')).toHaveLength(0)
    expect(page.getElementById('landing-ssr-style').textContent).toContain('alert(1)')
  })
})

describe('LANDING_SSR_GUARD', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<style id="landing-ssr-style">#root{display:none}</style><div id="landing-ssr">server</div><div id="root"></div>'
  })
  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState(null, '', '/')
  })

  // the page runs it inline; here eval does, over the fake timers
  // eslint-disable-next-line no-eval
  const run = () => window.eval(LANDING_SSR_GUARD)
  const present = () => [!!document.getElementById('landing-ssr'), !!document.getElementById('landing-ssr-style')]

  it('on / before the limit it leaves the markup and its style', () => {
    run()
    vi.advanceTimersByTime(LANDING_SSR_MAX_WAIT_MS - 1000)
    expect(present()).toEqual([true, true])
  })

  it('it drops them as soon as the page is not / (the app redirected before mounting the landing)', () => {
    run()
    vi.advanceTimersByTime(500)
    window.history.replaceState(null, '', '/kiosk')
    vi.advanceTimersByTime(250)
    expect(present()).toEqual([false, false])
  })

  it('on a path that is not / when it starts, it drops them at once', () => {
    window.history.replaceState(null, '', '/order')
    run()
    expect(present()).toEqual([false, false])
  })

  it('past the limit, with the app\'s own page in #root, it drops them and #root is visible again (no second page)', () => {
    run()
    document.getElementById('root').innerHTML = '<main>app</main>'
    vi.advanceTimersByTime(LANDING_SSR_MAX_WAIT_MS + 250)
    expect(present()).toEqual([false, false])
    expect(document.getElementById('root')).not.toBeNull()
    expect(document.querySelector('style')).toBeNull()
  })

  it('past the limit with #root still empty it keeps the markup (never a blank page) and drops it when the app paints something else', () => {
    run()
    vi.advanceTimersByTime(LANDING_SSR_MAX_WAIT_MS * 3)
    expect(present()).toEqual([true, true])
    document.getElementById('root').innerHTML = '<main>app</main>'
    vi.advanceTimersByTime(250)
    expect(present()).toEqual([false, false])
  })

  it('a route change drops them even with #root empty and before the limit', () => {
    run()
    window.history.replaceState(null, '', '/menu')
    vi.advanceTimersByTime(250)
    expect(present()).toEqual([false, false])
  })

  it('it gives the font links the name App.js compares (a link in markup has no `name` property)', () => {
    document.body.insertAdjacentHTML('afterbegin', '<link id="body-font-styles" rel="stylesheet" href="about:blank" data-font-name="Inter">')
    run()
    expect(document.getElementById('body-font-styles').name).toBe('Inter')
    // and the body's family, as App.js puts it
    expect(document.body.style.fontFamily).toBe('"Inter", sans-serif')
    document.getElementById('body-font-styles').remove()
    document.body.style.fontFamily = ''
  })

  it('once the app swapped it, it stops looking', () => {
    run()
    document.getElementById('landing-ssr').remove()
    const clear = vi.spyOn(window, 'clearInterval')
    vi.advanceTimersByTime(250)
    expect(clear).toHaveBeenCalled()
  })
})

describe('renderLandingHtml', () => {
  it('without the bundle (not built) or on any error it answers null: the page goes out as before', async () => {
    await expect(renderLandingHtml({ envelope: {} })).resolves.toBeNull()
  })
})

describe('FRANCHISE_STORE_FIELDS', () => {
  it('are the fields the client\'s useFranchiseStores asks for (the Worker cannot import them): the seed is what its own read would give', () => {
    expect(FRANCHISE_STORE_FIELDS.join(',')).toBe(STORE_PARAMS)
  })
})
