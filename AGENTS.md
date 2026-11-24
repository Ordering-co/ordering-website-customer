# AGENTS.md

Entry point for agents that read `AGENTS.md` (Codex, Cursor). The repository guidance (stack, commands, architecture, edit boundary, conventions) is in [`CLAUDE.md`](./CLAUDE.md); read it first. If this file and `CLAUDE.md` conflict, follow `CLAUDE.md`.

## Website configuration

For site types, ordering routes, theme states and screen variants, read [the configuration guide](docs/website-configuration.md) and [`ordering-website-configuration`](.claude/skills/ordering-website-configuration/SKILL.md). Use the design skill as well when changing UI, styling or tokens. The two skills are available under `.claude/skills/`, `.agents/skills/` and `.cursor/skills/`.

## Design system and UI design

Every new or changed screen, component, style or visual value follows the project skill [`ordering-website-design`](./.claude/skills/ordering-website-design/SKILL.md) and [`docs/THEMING.md`](./docs/THEMING.md). This applies to every UI change, not only redesigns. The skill is in the repository: Claude Code loads it from `.claude/skills/`, Codex from `.agents/skills/` and Cursor from `.cursor/skills/` (symlinks to the same folder).

1. The store's theme decides every value (color, space, radius, type, icon and control size, motion, images, what is shown). No hex, px, ms or font name in a component; no stored value rewritten or "fixed" in CSS.
2. New UI uses the base pieces in `src/ui/src/design-system/components/` (shadcn on Base UI + Tailwind 4, utilities with the `ui:` prefix, no Preflight). Never restyle one with `styled(...)`: its utilities live in `@layer` and unlayered CSS wins. styled-components stays for legacy code. Details: `.claude/skills/ordering-website-design/references/design-system.md`.
3. Every order flow must be finishable start to end, with its states (loading, empty with action, error with retry, closed store, guest).
4. Verify with at least 2-3 themes at 390 and 1440 px and with computed-CSS assertions, not screenshots alone.
