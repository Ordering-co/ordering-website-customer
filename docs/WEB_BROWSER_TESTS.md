# Web browser suite (`e2e/web`)

Cross-cutting browser tests of the real app, with the whole API mocked by the docs fixtures (`e2e/docs/lib`). They exist
to catch the classes of failure QA kept reopening: a fix that covered one entry and not the other, layout that jsdom
cannot measure, and widths or engines nobody ran. implementation notes, wave 0. CI wiring is wave 1 and is not done yet.

```bash
pnpm test:web:browser          # 390 and 1440 in Chromium: what a PR should run
pnpm test:web:browser:matrix   # 360, 382, 390, 412, 768, 1024, 1440 + WebKit at 390 and 412
E2E_APP_PORT=3107 E2E_REUSE_SERVER=1 pnpm exec playwright test -c playwright.web.config.js --project=w390 e2e/web/reopened
```

`E2E_APP_PORT` (default 3137, shared with the docs suite) lets two checkouts run at once; `E2E_REUSE_SERVER=1` reuses a
`pnpm dev` already listening there. Playwright browsers: `pnpm exec playwright install chromium webkit`.

## The shared fixture (`e2e/lib/fixtures.js`)

A spec opens a page with `app.open(fixtureName, route, { authenticated, mutate })` and drives it. At teardown of every
test the fixture fails it if:

- a write (POST, PUT, PATCH, DELETE) left the app without a mock (the guard of `e2e/docs/lib/network.js` answers 418);
- there was a `console.error` or an uncaught page error;
- the user ever read the browser's wording of a network failure (`Failed to fetch`, `Load failed`, `NetworkError…`),
  `[object Object]`, `undefined` or the witness text of an injected fault, even for a moment (a MutationObserver
  watches from the first paint).

On demand, `app.check(label)` adds: no horizontal scroll, dialogs inside the viewport, header margins equal (±2px) with
menu and cart on one line, standard `autocomplete` on personal and address fields, and `{ axe: true }` for axe.

Faults: `app.inject422({ witness, match, methods })` answers matching requests with a 422 whose body carries the
witness; `app.cutNetwork({ match, methods })` kills them at the transport. `app.reload()` reloads keeping localStorage.

## Specs

`e2e/web/reopened/` has one spec per reopened bug (1477, 1478, 1482, 1483, 1484, 1488, 1505), written from the QA steps in
their comments. While a fix is not integrated its spec carries `test.fail(KNOWN_BUGS, …)` and a
`// SERGIO-n: quitar test.fail al integrar el arreglo` comment: the suite stays green and turns red (unexpected pass)
when the fix lands, which is the cue to delete the `test.fail`. `E2E_KNOWN_BUGS=off` runs them as plain tests, to read
the real failure or to verify a fix.
