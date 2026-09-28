# Privacy

Accents for UI5 collects no personal data. It has no server, no account, no analytics and no tracking.

## What stays on your computer

- **Preferences** (theme, density, language, home layout, the assistant's chosen provider and model) are
  kept in your browser's local storage. They never leave your browser.
- **A key you type for the assistant** is held in the page's memory for that visit only. It is never
  saved, logged or sent anywhere except to the provider you chose.

## What goes over the internet

| What | To whom | When |
|---|---|---|
| OpenUI5 and Apache ECharts files | sdk.openui5.org and cdn.jsdelivr.net | When a page loads; ordinary web requests |
| Your questions to the assistant | Only the model provider you chose in Settings | Only after you choose one and ask |
| Your app's data | Only the services your app is built to call | As your app decides |

## The Claude plugin and MCP server

The MCP server runs on your own computer. It reads the Accents files it was installed with and, when
asked, writes a starter app into a folder you name. It sends nothing to JP Galido or any other party.
Its render check loads the gallery in a local browser, which fetches OpenUI5, ECharts and axe-core from
their public servers.

## Contact

Open an issue at https://github.com/jpgalido-txm/accents-for-ui5/issues, or use the repository's
Security tab for anything sensitive.
