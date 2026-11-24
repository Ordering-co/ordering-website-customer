// "Inactive project" page: when the API blocks a project for its
// subscription (HTTP 401) or its database is archived (HTTP 410), the worker answers every HTML route with a light
// page instead of the app, and records the visit. The page takes the look of the
// store when the API shares it (fetchInactiveStorefront): variant A (cover photo), B (color band) or C (generic,
// Ordering.co brand: archived project, no data or any failure).
// No imports on purpose: seo.js and index.js both depend on this file.

const REASONS = new Set(['trial_expired', 'canceled', 'past_due', 'inactive'])
const MAX_NAME_LENGTH = 120

const toName = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, MAX_NAME_LENGTH) : null)

const toLogo = (value) => {
  if (typeof value !== 'string') return null
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : null
  } catch (_) {
    return null
  }
}

/**
 * `{ reason, id, name, logo }` (plus `archived: true` for the 410) when the API answered "project not active"
 * (401 with `inactive_project`, or 401 whose text says "not active" /
 * "no está activo" — the format api-core has today), or 410 with the
 * `project_database_archived` error code (an archived project reads as
 * canceled, with no id); null for anything else (network, 5xx, 404,
 * "does not exist", any other 410), which keeps today's behavior.
 */
export const parseInactiveProject = (status, json) => {
  if (!json || typeof json !== 'object') return null
  if (status === 410) {
    return Array.isArray(json.error_codes) && json.error_codes.includes('project_database_archived')
      ? { reason: 'canceled', id: null, name: null, logo: null, archived: true }
      : null
  }
  if (status !== 401) return null
  const raw = json.inactive_project
  const hasDetails = !!raw && typeof raw === 'object'
  if (!hasDetails && !/not active|no está activo/i.test(String(json.result))) return null
  const details = hasDetails ? raw : {}
  const id = typeof details.id === 'string' && /^\d+$/.test(details.id) ? Number(details.id) : details.id
  return {
    reason: REASONS.has(details.reason) ? details.reason : 'inactive',
    id: Number.isSafeInteger(id) && id > 0 ? id : null,
    name: toName(details.name),
    logo: toLogo(details.logo)
  }
}

const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|headless|lighthouse|pingdom|monitor|curl|wget|python-requests/i

export const isLikelyBot = (userAgent) => !userAgent || BOT_UA.test(userAgent)

/**
 * Anonymous visitor id: sha256 of ip, user agent, UTC day and project, so it
 * is one per visitor and day and cannot be reversed to an IP. Counting is
 * best effort: every error is swallowed. It is sent with
 * the worker's secret `INACTIVE_SITE_VISITS_KEY`; without it nothing is sent.
 */
export const recordInactiveVisit = async ({ request, project, apiBase, visitsKey }) => {
  if (!visitsKey) return
  try {
    const ip = request.headers.get('cf-connecting-ip') || ''
    const userAgent = request.headers.get('user-agent') || ''
    const day = new Date().toISOString().slice(0, 10)
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${userAgent}|${day}|${project}`))
    const visitor = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    await fetch(`${apiBase}/inactive_site/visits`, {
      method: 'POST',
      // the project of a domain site is "_": the API resolves it from the Origin
      headers: { 'content-type': 'application/json', origin: new URL(request.url).origin, 'x-inactive-site-key': visitsKey },
      body: JSON.stringify({ visitor }),
      signal: AbortSignal.timeout(3000)
    })
  } catch (_) {}
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// ---- the store's look (everything that comes from it is untrusted) ----

const clip = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null)
const positiveInt = (value) => (Number.isSafeInteger(value) && value > 0 ? value : null)
const toFont = (value) => (typeof value === 'string' && /^[A-Za-z0-9 -]{1,60}$/.test(value.trim()) ? value.trim() : null)
const toRadius = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 40 ? `${Math.round(value * 100) / 100}px` : null
  return typeof value === 'string' && /^\d{1,2}(\.\d{1,2})?(px|rem)$/.test(value) ? value : null
}

/**
 * The `result` of GET inactive_site/storefront, cleaned: http(s) URLs only, short strings, max 4 dishes with
 * name and image, a #rrggbb color, font names and radius that are safe to write into CSS, stats as positive
 * integers. Idempotent (the render runs it again), so a cached value is as safe as a fresh one.
 */
export const normalizeStorefront = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const products = []
  for (const item of Array.isArray(raw.products) ? raw.products : []) {
    const name = clip(item?.name, 80)
    const image = toLogo(item?.image)
    if (!name || !image) continue
    products.push({
      name,
      image,
      price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null,
      currency: typeof item.currency === 'string' && /^[A-Z]{3}$/.test(item.currency) ? item.currency : null
    })
    if (products.length === 4) break
  }
  const theme = raw.theme && typeof raw.theme === 'object' ? raw.theme : null
  return {
    logo: toLogo(raw.logo),
    header: toLogo(raw.header),
    description: clip(raw.description, 80),
    city: clip(raw.city, 80),
    products,
    theme: theme && {
      primary_color: typeof theme.primary_color === 'string' && /^#[0-9a-f]{6}$/i.test(theme.primary_color) ? theme.primary_color.toLowerCase() : null,
      fonts: theme.fonts && typeof theme.fonts === 'object' ? { heading: toFont(theme.fonts.heading), body: toFont(theme.fonts.body) } : null,
      button_radius: toRadius(theme.button_radius)
    },
    stats: { visits_7d: positiveInt(raw.stats?.visits_7d), notices_7d: positiveInt(raw.stats?.notices_7d) }
  }
}

/**
 * The store's look for the inactive page, or null. A valid answer (even an empty one) is cached for an hour, any
 * failure for a minute as "no data", so a slow or missing endpoint costs one short wait per minute, not per visit.
 */
export const fetchInactiveStorefront = async ({ request, apiBase, ctx }) => {
  const origin = new URL(request.url).origin
  const key = new Request(`https://inactive-storefront.internal/v1?origin=${encodeURIComponent(origin)}`)
  try {
    const hit = await caches.default.match(key)
    if (hit) return await hit.json()
  } catch (_) {}
  let storefront = null
  let valid = false
  try {
    // the project of a domain site is "_": the API resolves it from the Origin, as with visits
    const response = await fetch(`${apiBase}/inactive_site/storefront`, {
      headers: { origin, accept: 'application/json' },
      signal: AbortSignal.timeout(800)
    })
    const json = response.ok ? await response.json() : null
    if (json && json.error === false && json.result && typeof json.result === 'object') {
      storefront = normalizeStorefront(json.result)
      valid = true
    }
  } catch (_) {}
  try {
    const put = Promise.resolve(caches.default.put(key, new Response(JSON.stringify(storefront), {
      headers: { 'cache-control': `max-age=${valid ? 3600 : 60}` }
    }))).catch(() => {})
    if (ctx?.waitUntil) ctx.waitUntil(put)
    else await put
  } catch (_) {}
  return storefront
}

// WCAG contrast of white text over a #rrggbb color (>= 4.5 passes AA).
const whiteReads = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05) >= 4.5
}

const formatPrice = (lang, { price, currency }) => {
  if (price === null || !currency) return ''
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(price)
  } catch (_) {
    return ''
  }
}

// `n` is the restaurant's name or null (the "without a name" variants).
const COPY = {
  en: {
    pill: 'Online ordering paused',
    title: (n) => (n ? `${n} · Online ordering paused` : 'Online ordering paused'),
    h1: (n) => `You can't order online from ${n || 'this restaurant'} right now`,
    lede: "Their ordering site is paused. Tell them you came by and we'll pass it on.",
    notifyLong: (n) => `Let ${n || 'the restaurant'} know you came by`,
    notifyShort: (n) => `Let ${n || 'the restaurant'} know`,
    quiet: 'No sign-up, no email: one tap.',
    menuH: (n) => (n ? `What people order at ${n}` : 'What people order here'),
    menuSub: 'Back on the menu as soon as they reopen online.',
    genericH1: (n) => (n ? `Online ordering for ${n} is paused` : 'Online ordering is paused'),
    genericLede: "The restaurant isn't taking online orders on this site right now. Tell them you came by and we'll pass it on.",
    genericNotify: 'Let the restaurant know',
    thanks: (n) => `Thanks, we let ${n || 'the restaurant'} know.`,
    thanksDetail: "They'll get an email saying customers are trying to order.",
    taken: 'This restaurant is taking orders again. Reload the page to order.',
    reload: 'Reload page',
    failed: "We couldn't send your message. Please try again.",
    owner: 'Is this your restaurant?',
    visits: (n) => (n === 1 ? 'visit in the last 7 days' : 'visits in the last 7 days'),
    notices: (n) => (n === 1 ? 'customer asked you to come back' : 'customers asked you to come back'),
    cases: {
      trial_expired: ['Your free trial has ended', 'Your site, menu and settings are still here. Pick a plan to switch ordering back on.', 'Log in and choose a plan'],
      canceled: ['Your subscription was canceled', 'Reactivate it to start taking orders again. Your menu, customers and settings are saved.', 'Log in to reactivate'],
      past_due: ['Your site is paused for a billing issue', 'Update your payment details and ordering turns back on right away.', 'Log in to fix billing'],
      inactive: ['Your site is paused', 'Log in to your account to see why and switch ordering back on.', 'Log in to your account']
    },
    powered: (link) => `Powered by ${link}`
  },
  es: {
    pill: 'Pedidos en línea en pausa',
    title: (n) => (n ? `${n} · Pedidos en línea en pausa` : 'Pedidos en línea en pausa'),
    h1: (n) => `Ahora no puedes pedir en línea a ${n || 'este restaurante'}`,
    lede: 'Su sitio de pedidos está en pausa. Diles que pasaste y se lo haremos saber.',
    notifyLong: (n) => `Avisar ${n ? `a ${n}` : 'al restaurante'} que pasaste`,
    notifyShort: (n) => `Avisar ${n ? `a ${n}` : 'al restaurante'}`,
    quiet: 'Sin registro ni correo: un toque.',
    menuH: (n) => (n ? `Lo que más se pide en ${n}` : 'Lo que más se pide aquí'),
    menuSub: 'Vuelven al menú en cuanto reabran en línea.',
    genericH1: (n) => (n ? `Los pedidos en línea de ${n} están en pausa` : 'Los pedidos en línea están en pausa'),
    genericLede: 'El restaurante no está recibiendo pedidos en línea en este sitio. Avísale que pasaste y se lo haremos saber.',
    genericNotify: 'Avisar al restaurante',
    thanks: (n) => `Gracias, avisamos ${n ? `a ${n}` : 'al restaurante'}.`,
    thanksDetail: 'Recibirán un correo diciendo que hay clientes intentando pedir.',
    taken: 'Este restaurante vuelve a recibir pedidos. Recarga la página para pedir.',
    reload: 'Recargar la página',
    failed: 'No pudimos enviar tu aviso. Inténtalo de nuevo.',
    owner: '¿Es tu restaurante?',
    visits: (n) => (n === 1 ? 'visita en los últimos 7 días' : 'visitas en los últimos 7 días'),
    notices: (n) => (n === 1 ? 'cliente pidió que vuelvas' : 'clientes pidieron que vuelvas'),
    cases: {
      trial_expired: ['Tu prueba gratuita terminó', 'Tu sitio, tu menú y tu configuración siguen aquí. Elige un plan para volver a activar los pedidos.', 'Inicia sesión y elige un plan'],
      canceled: ['Tu suscripción se canceló', 'Reactívala para volver a recibir pedidos. Tu menú, tus clientes y tu configuración están guardados.', 'Inicia sesión para reactivar'],
      past_due: ['Tu sitio está en pausa por un problema de facturación', 'Actualiza tus datos de pago y los pedidos se reactivan al instante.', 'Inicia sesión para resolver la facturación'],
      inactive: ['Tu sitio está en pausa', 'Inicia sesión en tu cuenta para ver el motivo y volver a activar los pedidos.', 'Inicia sesión en tu cuenta']
    },
    powered: (link) => `Con la tecnología de ${link}`
  }
}

// First preferred language starting with "es" -> Spanish; anything else -> English.
const pickLang = (acceptLanguage) => (/^\s*es/i.test(String(acceptLanguage || '').split(',')[0]) ? 'es' : 'en')

const initials = (name) => Array.from(name.split(/\s+/).filter(Boolean).slice(0, 2), (word) => Array.from(word)[0]).join('').toUpperCase()

const POWERED_URL = 'https://www.ordering.co/?utm_source=inactive-site&utm_medium=referral&utm_campaign=powered-by'
const OD_LOGO = 'https://brand.ordering.co/assets/logos/ordering-lockup-color.svg'

// Literal colors on purpose: this page is built by the worker without
// first_load, so the app's theme system (--ot-* tokens) is not available.
// The store's own values (--store, --btn-bg, fonts, radius) come from a :root block built in renderInactivePage.
const CSS = `
:root{--ink:#22221f;--ink-2:#5c5a54;--ink-3:#6b685f;--surface:#f4f4f2;--ov:42px}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
body{margin:0;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;background:#fff;color:var(--ink);font:400 16px/1.5 var(--font-b)}
h1,h2,p,ul{margin:0}
h1,h2,.name,.logo,.owner li b{font-family:var(--font-h)}
:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
.page{flex:1}
.wrap{width:100%;max-width:1148px;margin:0 auto;padding:0 20px}
.v-b{--ov:30px}
.hero{position:relative;height:210px;display:flex;align-items:flex-end;background:#2b2420;color:#fff;overflow:hidden}
.v-b .hero{height:150px;background:var(--store);color:var(--band-ink)}
.v-b .sub{opacity:1}
.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,18,16,.15) 0%,rgba(20,18,16,.72) 100%)}
.v-b .hero::after{display:none}
.hero .wrap{position:relative;z-index:1}
.id{display:flex;align-items:center;gap:12px;padding-bottom:calc(var(--ov) + 16px)}
.id>div{min-width:0}
.logo{flex:0 0 auto;width:54px;height:54px;border-radius:50%;background:var(--btn-bg);color:#fff;display:grid;place-items:center;font-weight:800;font-size:18px;border:3px solid #fff;object-fit:cover}
img.logo,.v-b .logo{background:#fff}
.v-b .logo{color:var(--btn-bg)}
.name{font-size:24px;font-weight:700;line-height:1.05;overflow-wrap:anywhere}
.sub{margin-top:6px;font-size:12.5px;opacity:.9}
.shell{position:relative;z-index:2;margin-top:calc(var(--ov) * -1);display:grid;grid-template-columns:minmax(0,1fr);gap:22px;grid-template-areas:"card" "menu" "owner"}
.shell.nomenu{grid-template-areas:"card" "owner"}
.card{grid-area:card;min-width:0;background:#fff;border-radius:18px;padding:22px 20px;box-shadow:0 18px 40px -26px rgba(0,0,0,.4)}
.pill{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 10px;border-radius:999px;background:#fdf1dc;color:#7a4b07;font-size:12.5px;font-weight:700}
.pill i{width:8px;height:8px;border-radius:50%;background:#c97a10;box-shadow:0 0 0 3px rgba(201,122,16,.22)}
h1{margin:14px 0 10px;font-size:26px;line-height:1.1;font-weight:700;letter-spacing:-.015em;text-wrap:balance;overflow-wrap:anywhere}
.lede{margin-bottom:16px;font-size:14px;line-height:1.55;color:var(--ink-2);text-wrap:pretty}
.live{margin-bottom:16px}
.live:empty{display:none}
.done{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:#effaf2;color:#14532d;font-size:14px}
.done svg{flex:0 0 18px;margin-top:1px}
.done b{display:block}
.done.taken{background:var(--surface);color:var(--ink)}
.done.failed{background:#fdf2f2;color:#7f1d1d}
.done a{color:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;padding:10px 22px;border:1.5px solid transparent;border-radius:var(--r);font-family:inherit;font-size:15px;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer}
.btn svg{width:18px;height:18px;flex:0 0 auto}
.btn.primary{background:var(--btn-bg);color:var(--btn-fg)}
.btn.ghost{background:#ecebe7;color:var(--ink-2);cursor:default}
.btn.dark{background:var(--ink);color:#fff}
.btn[aria-busy=true]{opacity:.7;cursor:progress}
.lg{display:none}
.quiet{margin-top:12px;font-size:13px;color:var(--ink-3);text-align:center}
.owner{grid-area:owner;min-width:0;background:var(--surface);border-radius:16px;padding:22px 20px}
.q{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:13.5px;font-weight:700;color:var(--ink-2)}
.q svg{width:18px;height:18px;flex:0 0 auto}
.oh{margin-bottom:8px;font-size:19px;line-height:1.15}
.ob{margin-bottom:16px;font-size:13.5px;line-height:1.55;color:var(--ink-2)}
.owner ul{margin-bottom:20px;padding:0;list-style:none;display:grid;gap:8px;font-size:13.5px;color:var(--ink-2)}
.owner li{display:flex;gap:10px;align-items:baseline}
.owner li b{min-width:3.2ch;font-size:16px;color:var(--ink)}
.menu{grid-area:menu;min-width:0;padding-top:6px}
.menu h2{margin-bottom:4px;font-size:18px;letter-spacing:-.015em}
.msub{margin-bottom:16px;font-size:14px;color:var(--ink-3)}
.grid{display:flex;gap:12px;margin:0 -20px;padding:0 20px 6px;list-style:none;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding:0 20px;scrollbar-width:none}
.grid::-webkit-scrollbar{display:none}
.grid:focus-visible{outline-offset:-3px}
.dish{flex:0 0 132px;scroll-snap-align:start;min-width:0}
.dish img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#ddd;filter:grayscale(.75) contrast(.95);opacity:.9}
.dish b{display:block;margin-top:10px;font:700 14px/1.25 var(--font-h);overflow-wrap:anywhere}
.dish span{font-size:13px;color:var(--ink-3)}
.foot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:0 12px;padding-top:22px;padding-bottom:26px;font-size:12px;color:var(--ink-3);text-align:center}
.foot a{display:inline-flex;align-items:center;min-height:44px;padding:0 2px;color:var(--ink-2);font-weight:600;text-decoration:underline;text-underline-offset:3px}
.v-c{--od-bg:#FFFFFF;--od-surface-subtle:#F6F7F7;--od-text:#0B0C0D;--od-text-muted:#3F4145;--od-border:#DEE0E3;--od-action:#266DF0;--od-action-content:#1F5FD1;--od-action-soft:#EDF3FF;--od-warning:#F5A300;--btn-bg:var(--od-action);--btn-fg:#fff;--r:6px;--ink:var(--od-text);--ink-2:var(--od-text-muted);--ink-3:var(--od-text-muted);--surface:var(--od-surface-subtle);background:var(--od-bg)}
.v-c :focus-visible{outline-color:var(--od-action)}
.oc{width:100%;max-width:560px;margin:0 auto;padding-left:20px;padding-right:20px}
.odtop{padding-top:26px}
.odtop img{display:block;height:26px;width:auto}
.v-c .card{padding:28px 0 8px;border-radius:0;box-shadow:none}
.v-c .pill{padding:5px 10px;border:1px solid var(--od-border);border-radius:6px;background:var(--od-surface-subtle);color:var(--od-text-muted);font-weight:600}
.v-c .pill i{background:var(--od-warning);box-shadow:none}
.v-c h1{letter-spacing:-.02em}
.v-c .lede{font-size:14.5px}
.v-c .btn{font-weight:600}
.v-c .btn.secondary{background:var(--od-bg);border-color:var(--od-border);color:var(--od-action-content)}
.v-c .owner{margin-top:22px;padding:20px;border:1px solid var(--od-border);border-radius:10px}
.v-c .q{font-weight:600}
.v-c .foot a{color:var(--od-action-content)}
@media (min-width:900px){
.v-a{--ov:76px}
.v-b{--ov:44px}
.wrap{padding:0 48px}
.hero{height:340px}
.v-b .hero{height:200px}
.id{gap:16px;padding-bottom:calc(var(--ov) + 28px)}
.logo{width:72px;height:72px;font-size:24px}
.name{font-size:34px}
.sub{font-size:14px}
.shell{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:28px;align-items:start;grid-template-areas:"card owner" "menu menu"}
.shell.nomenu{grid-template-areas:"card owner"}
.card{padding:30px 32px}
h1{max-width:20ch;font-size:34px}
.lede{max-width:46ch;font-size:15px}
.v-a .btn,.v-b .btn{width:auto}
.v-a .quiet,.v-b .quiet{margin-top:14px;text-align:left}
.lg{display:inline}
.sm{display:none}
.owner{padding:28px 28px 26px}
.oh{font-size:22px}
.ob{font-size:14.5px}
.owner ul{font-size:14px}
.menu{padding-top:16px}
.menu h2{font-size:21px}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;margin:0;padding:0;overflow:visible}
.dish b{font-size:15px}
.foot{padding-top:36px;font-size:13px}
.v-a .foot,.v-b .foot{justify-content:space-between;text-align:left}
.odtop{padding-top:40px}
.v-c .card{padding-top:48px}
.v-c h1{max-width:none;font-size:32px}
}
@media (prefers-reduced-motion:no-preference){.btn{transition:background-color .15s,color .15s,opacity .15s}.done{animation:in .25s ease-out}@keyframes in{from{opacity:0}}.grid{scroll-behavior:smooth}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`

const SCRIPT = `
(function(){
var b=document.getElementById('notify'),s=document.getElementById('done'),l=document.getElementById('lede');
if(!b||!s||!document.getElementById('done-tpl'))return;
function show(id){
var n=document.getElementById(id).content.cloneNode(true),a=n.querySelector('a');
if(a)a.href=location.href.split('#')[0];
s.appendChild(n);
}
// done: the button stays off; retry: it comes back for another try
function end(id,done){
b.removeAttribute('aria-busy');
show(id);
if(done){if(l)l.hidden=true;b.className='btn ghost'}
else{b.removeAttribute('aria-disabled');b.className='btn primary'}
}
b.addEventListener('click',function(){
if(b.getAttribute('aria-disabled')==='true')return;
b.setAttribute('aria-disabled','true');
b.setAttribute('aria-busy','true');
s.textContent='';
Promise.resolve().then(function(){
// a hung request ends as the retryable error instead of a button busy forever
return fetch(b.getAttribute('data-endpoint'),{method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout?AbortSignal.timeout(15000):void 0});
}).then(function(r){
if(r.ok)end('done-tpl',true);
else if(r.status===409)end('taken-tpl',true);
else end('error-tpl',false);
},function(){end('error-tpl',false)});
});
})();
`

// without `weights` no axis is asked: a static family (one weight) would make Google answer 400 to a range
const fontLink = (family, weights) => `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}${weights ? `:wght@${weights}` : ''}&display=swap" rel="stylesheet">`

const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'
const SHOP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l1-5h16l1 5"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/></svg>'

/** The whole page as one HTML string. Every interpolated value is escaped. */
export const renderInactivePage = ({ info, lang, apiBase, accountsUrl, storefront }) => {
  const t = COPY[lang] || COPY.en
  const name = info?.name || null
  const [caseTitle, caseBody, caseCta] = t.cases[info?.reason] || t.cases.inactive
  const ownerHref = info?.id ? `${accountsUrl}/project/${info.id}/reactivate` : `${accountsUrl}/projects`
  const store = info?.archived ? null : normalizeStorefront(storefront)
  const color = store?.theme?.primary_color || null
  const hasStore = !!store && !!(store.logo || store.header || store.description || store.city || store.products.length || color)
  const variant = !hasStore ? 'c' : store.header ? 'a' : 'b'
  const generic = variant === 'c'

  const note = (className, fill, glyph, text) => `<div class="done${className}"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="${fill}"/><path d="${glyph}" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${text}</span></div>`
  const done = note('', '#15803d', 'M5.5 10.5l3 3 6-6.5', `<b>${escapeHtml(t.thanks(name))}</b> ${escapeHtml(t.thanksDetail)}`)
  // the link of "taken" gets its href (the current page) from the script
  const taken = note(' taken', '#6b665d', 'M10 9v5M10 6v.5', `${escapeHtml(t.taken)} <a href="">${escapeHtml(t.reload)}</a>`)
  const failed = note(' failed', '#b91c1c', 'M10 5.5v5.5M10 14v.5', escapeHtml(t.failed))

  const label = generic
    ? escapeHtml(t.genericNotify)
    : `${BELL}<span class="lg">${escapeHtml(t.notifyLong(name))}</span><span class="sm">${escapeHtml(t.notifyShort(name))}</span>`
  const card = `<section class="card">
<span class="pill"><i aria-hidden="true"></i>${escapeHtml(t.pill)}</span>
<h1>${escapeHtml(generic ? t.genericH1(name) : t.h1(name))}</h1>
<p id="lede" class="lede">${escapeHtml(generic ? t.genericLede : t.lede)}</p>
<div id="done" class="live" role="status" aria-live="polite"></div>
<button type="button" id="notify" class="btn primary" data-endpoint="${escapeHtml(`${apiBase}/inactive_site/notify_owner`)}">${label}</button>
${generic ? '' : `<p class="quiet">${escapeHtml(t.quiet)}</p>`}
<template id="done-tpl">${done}</template>
<template id="taken-tpl">${taken}</template>
<template id="error-tpl">${failed}</template>
</section>`

  // the owner's panel: neutral gray, never the store's color; counters only on the store's page
  const stat = (n, text) => (n ? `<li><b>${n}</b> ${escapeHtml(text(n))}</li>` : '')
  const stats = generic ? '' : stat(store.stats.visits_7d, t.visits) + stat(store.stats.notices_7d, t.notices)
  const owner = `<aside class="owner">
<p class="q">${generic ? '' : SHOP}${escapeHtml(t.owner)}</p>
<h2 class="oh">${escapeHtml(caseTitle)}</h2>
<p class="ob">${escapeHtml(caseBody)}</p>
${stats ? `<ul>${stats}</ul>` : ''}
<a class="btn ${generic ? 'secondary' : 'dark'}" href="${escapeHtml(ownerHref)}">${escapeHtml(caseCta)}</a>
</aside>`

  const poweredLink = `<a href="${escapeHtml(POWERED_URL)}" target="_blank" rel="noopener">Ordering.co</a>`
  const powered = t.powered(poweredLink)
  const title = escapeHtml(t.title(name))
  const head = (fonts, rootCss) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>:root{${rootCss}}${CSS}</style>
<noscript><style>#notify,.quiet{display:none}</style></noscript>
</head>`

  if (generic) {
    const stack = "'Inter',system-ui,sans-serif"
    return `${head(fontLink('Inter', '400..700'), `--font-h:${stack};--font-b:${stack}`)}
<body class="v-c">
<div class="page oc">
<header class="odtop"><img src="${OD_LOGO}" alt="Ordering.co" height="26"></header>
<main>
${card}
${owner}
</main>
</div>
<footer><div class="oc foot">${powered}</div></footer>
<script>${SCRIPT}</script>
</body>
</html>`
  }

  const heading = store.theme?.fonts?.heading || 'Archivo'
  const bodyFont = store.theme?.fonts?.body || 'Montserrat'
  const ok = !color || whiteReads(color) // no color: the default dark gray reads white
  const storeColor = color || '#22221f'
  const rootCss = [
    `--store:${storeColor}`,
    `--btn-bg:${ok ? storeColor : '#22221f'}`,
    '--btn-fg:#fff',
    // black reads >= 4.5:1 on every color where white does not, the dark gray does not
    `--band-ink:${ok ? '#fff' : '#000'}`,
    `--r:${store.theme?.button_radius || '12px'}`,
    `--font-h:'${heading}',system-ui,sans-serif`,
    `--font-b:'${bodyFont}',system-ui,sans-serif`
  ].join(';')
  const fonts = [...new Set([heading, bodyFont])].map((family) => fontLink(family, family === 'Archivo' || family === 'Montserrat' ? '400..800' : null)).join('\n')

  const logoUrl = store.logo || info?.logo
  const logo = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(name || '')}">`
    : name ? `<div class="logo" aria-hidden="true">${escapeHtml(initials(name))}</div>` : ''
  const sub = [store.description, store.city].filter(Boolean).join(' · ')
  const hero = `<header class="hero">
${store.header ? `<img class="cover" src="${escapeHtml(store.header)}" alt="">` : ''}
<div class="wrap"><div class="id">${logo}<div>${name ? `<div class="name">${escapeHtml(name)}</div>` : ''}${sub ? `<p class="sub">${escapeHtml(sub)}</p>` : ''}</div></div></div>
</header>`

  // dishes only with a photo header and at least two of them
  const dish = (product) => {
    const price = formatPrice(lang, product)
    return `<li class="dish"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async"><b>${escapeHtml(product.name)}</b>${price ? `<span>${escapeHtml(price)}</span>` : ''}</li>`
  }
  const menu = variant === 'a' && store.products.length >= 2
    ? `<section class="menu" aria-labelledby="menu-h">
<h2 id="menu-h">${escapeHtml(t.menuH(name))}</h2>
<p class="msub">${escapeHtml(t.menuSub)}</p>
<ul class="grid" tabindex="0" aria-labelledby="menu-h">${store.products.map(dish).join('')}</ul>
</section>`
    : ''

  return `${head(fonts, rootCss)}
<body class="v-${variant}">
<div class="page">
${hero}
<main class="wrap shell${menu ? '' : ' nomenu'}">
${card}
${menu}
${owner}
</main>
</div>
<footer><div class="wrap foot">${name ? `<span>© ${escapeHtml(name)}</span>` : ''}<span>${powered}</span></div></footer>
<script>${SCRIPT}</script>
</body>
</html>`
}

/** The 503 page (retry later, out of search indexes, never cached). HEAD gets no body. */
export const inactivePageResponse = ({ request, info, apiBase, accountsUrl, storefront }) => {
  const lang = pickLang(request.headers.get('accept-language'))
  const body = request.method === 'HEAD' ? null : renderInactivePage({ info, lang, apiBase, accountsUrl, storefront })
  return new Response(body, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'retry-after': '3600',
      'x-robots-tag': 'noindex',
      'cache-control': 'no-store',
      'cdn-cache-control': 'no-store'
    }
  })
}
