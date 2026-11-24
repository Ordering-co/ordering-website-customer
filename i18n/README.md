# i18n — Web Marketplace (implementation notes / implementation notes)

Source of truth for UI translation keys used by this app (`useLanguage` / `t('KEY', 'fallback')`).

## Single source of truth for locales

[`config.json`](./config.json) defines product metadata and locales:

```json
{
  "product": "website",
  "prefix": "WEBSITE_",
  "sourceLanguage": "en",
  "supportedLocales": ["es", "fr", "it", "de", "pt", "da", "nl", "ar", "el", "bg", "tr"],
  "catalogPath": "i18n/translations.json"
}
```

- **`sourceLanguage`**: English base (from code fallbacks).
- **`supportedLocales`**: non-English locales that must be present in the catalog. Adding a language later (e.g. `"ja"`) only requires editing this array; `generate` / `verify` / the translate skill read it dynamically.
- **`prefix` / `product`**: applied at API sync time (`pnpm i18n:sync`), not stored on catalog keys.

## Catalog

[`translations.json`](./translations.json) — multi-locale SoT:

```json
{
  "ADD_TO_CART": {
    "en": "Add to Cart",
    "es": "Agregar al carrito"
  }
}
```

Keys are **unprefixed**. Placeholder tokens (`_attribute_`, `_NUMBER_`, `%s`, etc.) must be preserved verbatim in every locale.

### Orphan keys

Keys that exist in the catalog (or later in the DB) but are no longer referenced in code are **kept on purpose**. Sync will not delete them from the database (avoids accidental data loss). `verify` reports orphans as warnings only. A future cleanup / soft-delete ticket can address them.

## Commands

```bash
pnpm i18n:generate                         # scan code → refresh en + merge translations.json + CSV
pnpm i18n:verify                           # fail if keys/locales incomplete or English drifts
pnpm i18n:missing --summary
pnpm i18n:missing --limit 40 --write i18n/batch-missing.json
pnpm i18n:apply-batch i18n/batch-filled.json --strict
pnpm i18n:sync                              # dry-run (default; no HTTP)
pnpm i18n:sync:live                         # Phase 7 only — needs env (see Sync)
node i18n/sync.cjs --dry-run --dump-dir i18n/sync-dumps
```

`verify` loads locales from `config.json`. It fails when:

1. Code uses a static `t('KEY')` missing from the catalog.
2. Catalog English does not match the code scan (when a static fallback exists).
3. Any `supportedLocales` entry is missing or empty for a key (except `runtime_variable_fallback` keys with no static English).
4. A catalog value differs from [`glossary.json`](./glossary.json): the order-flow terms (Pickup, Delivery, Cash…) reviewed by a person. The live sync overwrites the API with the catalog, so a bad bulk fill reaches every store; edit the glossary only on purpose.

### Developer flow (definitive DX)

| Step | Who | Manual? |
|------|-----|---------|
| 1. Code UI with `t('KEY', 'English fallback')` | Dev | Yes |
| 2. Commit | Husky runs `i18n:generate` and stages catalog | No |
| 3. `/translate-keys` until locales complete | Cursor / Claude Code | **Yes (only agent step)** |
| 4. Open PR | CI: `check-generated` + `verify` | No |
| 5. Merge to `main` | CI `i18n Sync`: dry-run then `--live` if secrets set | No |

Local helpers (usually unnecessary): `pnpm i18n:generate`, `pnpm i18n:check-generated`, `pnpm i18n:missing --summary`, `pnpm i18n:verify`, `pnpm i18n:sync`.

### Filling locales (translate-keys skill)

Same skill is installed for **Cursor and Claude Code** (keep both copies in sync when editing):

| Tool | Path |
|------|------|
| Cursor | [`.cursor/skills/translate-keys/SKILL.md`](../.cursor/skills/translate-keys/SKILL.md) |
| Claude Code | [`.claude/skills/translate-keys/SKILL.md`](../.claude/skills/translate-keys/SKILL.md) |

Invoke with `/translate-keys` or ask the agent to run it:

1. Export a batch of incomplete keys (`i18n:missing`). Runtime-variable keys are skipped automatically.
2. Fill **every** `missingLocales` entry for **every** key in the batch (no skips).
3. Apply with `i18n:apply-batch --strict`.
4. Repeat until `i18n:verify` passes.

Target languages always come from `config.json` `supportedLocales` — never hardcode the list in prompts.

## Legacy CSV

`generate` still writes:

| File | What |
| -- | -- |
| `lang_keys.csv` | English export: `key,value,source,note` |
| `lang_keys_conflicts.csv` | Keys with multiple English fallbacks in code |
| `typos_fixed.csv` | Historical typo log (not regenerated) |

Prefer `translations.json` for ongoing work. CSV remains for reference / transitional imports.

## Local E2E walkthrough (before Phase 6)

Step-by-step what to run and what you should see: **[LOCAL_E2E.md](./LOCAL_E2E.md)**.

One-shot 2-key demo (generate → fill → apply → sync dry-run):

```bash
pnpm i18n:demo-e2e
```

## Sync to api-core

[`sync.cjs`](./sync.cjs) builds chunked payloads for:

`POST /{version}/system/bulks/translations`
Header: `X-Translation-Sync-Key-X` (dedicated sync secret)

- Prefixes keys with `config.prefix` (`ADD_TO_CART` → `WEBSITE_ADD_TO_CART`)
- Puts English in `value`; puts non-empty `supportedLocales` into `langs` (empty slots omitted)
- Chunks of ≤500 keys (api-core contract max)
- **Default is dry-run** (no HTTP). Safe before the endpoint is merged.


For local live runs, copy [`i18n/.env.example`](./.env.example) to `i18n/.env` (gitignored). `sync.cjs` loads it automatically.
### Live env (Phase 7 — after api-core PR merge)

```bash
# Generate once: php -r 'echo bin2hex(random_bytes(32)),"\n";'
# Store same value as api-core TRANSLATION_SYNC_API_KEY
export ORDERING_API_BASE_URL=https://apiv4.ordering.co
export ORDERING_API_VERSION=v400          # optional
export ORDERING_TRANSLATION_SYNC_KEY=...  # api-core TRANSLATION_SYNC_API_KEY
pnpm i18n:sync:live
```

### Workflow

`.github/workflows/i18n-sync.yml`:

| Trigger | Behavior |
|---------|----------|
| `push` to `main`/`production` with `paths: ['i18n/**']` | `verify` → dry-run → **live** if secrets exist (else skip live) |
| `workflow_dispatch` mode=`dry-run` | verify + dry-run |
| `workflow_dispatch` mode=`live` | verify + dry-run + live (fails if secrets missing) |

Secrets for live: `ORDERING_API_BASE_URL`, `ORDERING_TRANSLATION_SYNC_KEY` (optional `ORDERING_API_VERSION`).

## CI verify

`.github/workflows/ci.yml` job **i18n Verify** (required by Quality Gate):

1. `node i18n/check-generated.cjs` — catalog must match a fresh code scan
2. `node i18n/verify.cjs` — every non-runtime key has every `supportedLocales` value

No LLM. No API sync in that job. Incomplete locales block merge.

## Scope & method

Scans all `t('KEY', …)` calls across `src/` (app **and** `src/@/components` submodule), excluding dynamic-prefix keys like `t('DAY' + n)`.

Do not edit the submodule from this repo for string fixes; open PRs in [ordering-components](https://github.com/Finitless-com/ordering-components) when needed.
