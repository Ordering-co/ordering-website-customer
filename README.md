# Ordering Website

Ordering.co's customer-facing ordering website for marketplaces, brands and franchises, and single restaurants. The same theme v2 storefront serves each of these configurations.

| Use case | Website type in Builder | Storefront |
| --- | --- | --- |
| Marketplace | Marketplace | Customers find stores in the marketplace and order from them. |
| Brand or Franchise | Franchise | Customers choose among the locations of one franchise. |
| Single Restaurant | One store | Customers open the menu of the selected restaurant. |

In **Website settings**, **Online Ordering Only** opens the ordering experience at `/`. **Full Website + Online Ordering** opens a home page at `/` and puts ordering at `/order`. **Order tracking** is a dedicated mode for following an existing order.

See the [configuration guide](docs/website-configuration.md) for choosing a site type, managing themes, and selecting screen layouts. For code changes, see [the configuration skill](.claude/skills/ordering-website-configuration/SKILL.md) and [the design skill](.claude/skills/ordering-website-design/SKILL.md).

## Getting started

### 1. Paste this into your coding agent

```text
Get https://github.com/Ordering-co/ordering-website-customer.git, reusing any existing checkout. Read setup.md and follow it to connect my confirmed Ordering project, start the website, and show one simple visible edit. Preserve my changes.
```

### 2. Confirm your project

Confirm the project your agent identifies, or ask it to help you use a different one.

#### 3. Open your website

Open the local link your agent gives you. Check the selected project and catalog, then ask for a small text change and watch it update.

Local development: macOS or Linux; Windows through WSL.

[Full runbook](setup.md) · [Manual setup](setup.md#manual-setup) · [Troubleshooting](docs/marketplace-troubleshooting.md) · [First edit](docs/marketplace-first-edit.md)

## License

See `LICENSE` and `LICENSE-ORDERING` for the distribution terms. Third-party dependencies retain their own licenses and notices.
