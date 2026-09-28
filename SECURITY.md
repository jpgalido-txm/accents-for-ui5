# Security

## Reporting a problem

Please report security problems privately, through this repository's **Security** tab ("Report a
vulnerability"). Do not open a public issue.

## What to know before you use the assistant

Accents' assistant is off until someone chooses where a model runs.

- **A key typed into Settings** stays in the page's memory for that visit only. It is never saved,
  logged or shown again, and it is sent only to its own provider.
- **"Bring your own key" calls the provider straight from the browser.** That suits personal use and
  prototypes. Anyone who can run code in the page (a browser extension, or a script the app loads)
  could read a key while it is in memory.
- **For production, register your own server** with `Providers.usePlatform(transport)`, so keys stay on
  the server and never reach a browser. See [docs/ai.md](docs/ai.md).
- A self-hosted model address may use plain http only on this computer (localhost).

## What Accents loads from the internet

| What | From | When |
|---|---|---|
| OpenUI5 1.148.9 | sdk.openui5.org | Every page |
| Apache ECharts 6.1.0 | cdn.jsdelivr.net | The first chart on a page |
| axe-core 4.13.0 | cdn.jsdelivr.net | Only during `tools/check.mjs`, never in an app |

Apps with a strict content security policy should host these files themselves and point the bootstrap
and `Chart.SRC` at their own copies.
