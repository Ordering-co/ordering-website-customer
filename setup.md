# Ordering Website setup runbook for an AI agent

```text
Get https://github.com/Ordering-co/ordering-website-customer.git, reusing any existing checkout. Read setup.md and follow it to connect my confirmed Ordering project, start the website, and show one simple visible edit. Preserve my changes.
```

## Rules that apply before any sign-in

- Prefer detection or browser selection and never ask again for an identifier already returned. If neither is available, explain the pending capability and offer the explicit public-project fallback below. Do not silently choose a demo or the first project.
- Inspect an existing connection before starting any login. Never create a new key/session just because the source folder is new.
- The Website consumes public project configuration and consumer API endpoints. It requires no MCP key or administrative REST API key to run. MCP is an optional way to discover an already authenticated developer's project. Consumer login remains separate.
- Never read, print, copy or edit credentials yourself. Native MCP tools or their already installed launcher handle credentials. Public configuration stays public. Do not grant write scope, register clients, revoke connections or create keys for this pilot.
- Preserve active sessions, servers, local changes, lockfiles and the pinned shared components.

## 1. Inspect checkout and environment

Read CLAUDE.md, package.json, .nvmrc/NODE_VERSION.txt and the lockfile. Use the available Node 24 and pnpm 9.15.0 through Corepack; do not install latest or change the global default. Record git rev-parse HEAD and git ls-tree HEAD src/@/components. Reuse an existing checkout without recloning or changing its identity. Only when absent, obtain https://github.com/Ordering-co/ordering-website-customer.git and initialize its pinned submodule with git submodule update --init --recursive. Preserve existing source instructions and credentials; do not register new clients or change credentials. Preserve the included lockfile and existing customer changes.

Without an explicitly configured src/config.local.json, normal source and Worker behavior remains unchanged; do not alter the existing base configuration. Inspect an existing local override as public data. If this checkout already has a verified selected project and the customer asked to continue it, preserve it and proceed to doctor/start; do not repeat sign-in.

## 2. Detect and offer the existing project

First call the available Ordering MCP whoami tool. Read only its project and authenticated identity; never include email, tokens or the raw response in a message. Tool success is the source of the detected project, not a default/demo setting.

If native tools are unavailable, run:

```sh
corepack pnpm marketplace:connection
```

This inspects the bundled helper's existing selection/connection, then probes an already prepared ~/ordering-dev-quickstart/ordering launcher. It performs initialize/whoami only, reads no credential file itself, copies no key and makes no global changes. Missing installations are not installed. It prints only status, project and source. Do not inspect other clients' secrets.

If a valid project is found, ask once in the customer's language: **I found your existing connection to PROJECT. Use this project for Ordering Website?** Insert the actual detected value yourself. If their current instruction already explicitly selected that same project, do not ask again.

On yes, store that returned value in your process as DETECTED_PROJECT and run:

```sh
corepack pnpm marketplace:configure --public-project "$DETECTED_PROJECT"
```

DETECTED_PROJECT is filled by the agent from whoami/connection output; the customer must never type it. This command uses public API reads only. It does not copy credentials from the existing connection, request additional permissions or require a newly paired helper.

If they choose another project, or no valid connection is found, proceed to step 3. Do not select a demo/first project or use an expired/rejected connection silently.

## 3. Browser selection only when needed

The bundled helper checks the connect page for `marketplace-project-selection-v1` before starting a pairing. Use the project-only route when that check succeeds.

```sh
./scripts/marketplace/connection/ordering project-login start --client codex
```

For Claude use --client claude. This uses the existing relay/RSA protocol and Dashboard/Accounts bridges. The helper checks the public page capability before creating the pairing. If the project-only page is not published yet, report that precise release dependency; do not fall back to creating MCP/REST keys. The existing-project path above works independently.

Show the private link and code once, only to the person who started this. They open their link, sign in, choose their project (Accounts supports multiple projects), accept using that project locally and type the code. The browser validates identity and project membership; the terminal receives only the project identifier encrypted for that pairing. No MCP enablement, MCP key, REST key or revocation is needed. Do not open their login yourself or publish pairing details.

```sh
./scripts/marketplace/connection/ordering project-login wait
corepack pnpm marketplace:configure
```

Keep the pending process/session ID and collect its final exit code. The browser's success is selection delivery, not installation. The helper remembers the selected project in ignored .marketplace-project.json; configure derives it automatically. **Do not ask for an expected project code before or after login.** On cancellation/expiry/failure, preserve previous config and retry project-login start if needed.

The old login command remains in the pinned source for compatibility; do not invoke it during Website onboarding because it can create an MCP key. If such a helper already finished a legacy login, marketplace:configure can derive that verified project automatically too. Do not start another pairing.

### Explicit public-project fallback

When project-only browser selection is unavailable and no existing MCP project can be reused, report the release dependency and offer a manual alternative. Only after the customer explicitly chooses it, use the public project identifier they provide (or their already confirmed local public configuration):

```sh
corepack pnpm marketplace:configure --public-project "$CONFIRMED_PUBLIC_PROJECT"
```

The agent fills CONFIRMED_PUBLIC_PROJECT from that explicit choice. Public `/current`, configs, theme and catalog reads validate the configuration and project type. They do **not** authenticate the person or prove project membership. Say so in the result. Do not request credentials, use the legacy login command, or derive a default tenant. An intentional change still needs `--reconnect`.

## 4. Install, start, validate

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm marketplace:doctor
corepack pnpm marketplace:start
```

The local config is written atomically with recovery backup. Repetition preserves unrelated customizations. An intentional project change requires --reconnect after the person chooses it; a mismatch fails rather than silently changing tenant. marketplace:restore recovers the previous config.

Startup chooses an available port and never stops other listeners. For another device, use --host with the current private Tailscale IPv4 after checking device/network state. No public tunnel. Keep the server active and collect its startup result.

Open a fresh consumer profile. Confirm the selected project label, effective API project and a successful catalog/menu read, then the actual rendered Website. A prior consumer token from another/unknown project is preserved and blocked. Do not create orders, prices, payments or customer-data changes. Existing MCP may be disconnected after setup and the Website will still work.

## 5. First edit and report

Follow docs/marketplace-first-edit.md, verify Fast Refresh and the unchanged project. Edit presentation only, not src/@/components. Report separately: detected/authenticated project choice, validated public config, and running Website. A public config check is not proof of developer authentication; report whether identity came from native MCP, capability-checked browser selection, or remains unverified in the explicit public fallback. See the included reference, troubleshooting and prompts.

## Manual setup

Use Node.js 24, Git and the pnpm version pinned in package.json.

```sh
git clone --recursive https://github.com/Ordering-co/ordering-website-customer.git
cd ordering-website-customer
pnpm install --frozen-lockfile
pnpm start
```

Use the confirmed Ordering project for local testing. For a particular Builder site, follow [Run a specific dashboard site locally](README.md#run-a-specific-dashboard-site-locally). The configuration belongs to your checkout. Keep administrative credentials out of browser settings and source control.

Compare site and theme options in [Ordering Website configuration](docs/website-configuration.md). Use [troubleshooting](docs/marketplace-troubleshooting.md) for project selection, configuration recovery and Fast Refresh.
