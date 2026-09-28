# Accents MCP server

Gives AI coding assistants what they need to build with Accents correctly. It has no dependencies and
needs Node 22 or later. `accents_check` also needs Google Chrome.

## Tools

| Tool | What it does |
|---|---|
| `accents_overview` | What Accents is, how a screen is built, and the rules that get a screen rejected. The assistant is told to call this first. |
| `accents_list` | The catalogue: 9 page patterns and 45 elements, filtered by kind, group or a search word |
| `accents_get` | One entry: its purpose, the UI5 controls it uses, how it moves, the options it takes, and a working example |
| `accents_docs` | One of the documents (principles, shell, assistant, page patterns, planning, colour and motion, building elements, traps, readme, licence), whole or only the sections that mention a word |
| `accents_new_app` | Creates a starter app in a new or empty folder: the shell and one page pattern on sample data, ready to serve |
| `accents_lint` | Checks an app folder, or Accents itself, against the rules a script can check |
| `accents_check` | Renders a gallery entry in headless Chrome and audits it: errors, charts drawn, cards aligned, nothing wider than the page |

## Connect it

Replace `/path/to` with where this repository is.

**Claude Code**

```bash
claude mcp add accents -- node /path/to/accents-for-ui5/mcp/server.mjs
```

**Claude Desktop, Cursor and other clients** that take a JSON configuration:

```json
{
  "mcpServers": {
    "accents": { "command": "node", "args": ["/path/to/accents-for-ui5/mcp/server.mjs"] }
  }
}
```

## Test it

```bash
node mcp/test.mjs --check
```

This starts the server, talks to it the way a client does and calls every tool. It prints one line per
test.

## What it reads and writes

- It reads only this repository.
- `accents_new_app` writes only into the folder it is given, and only when that folder is new or empty.
- `accents_check` serves this repository on a free port on 127.0.0.1 while the server runs. It is never
  reachable from other machines.
- It sends nothing over the network, except that `accents_check` opens the gallery, which loads OpenUI5
  and Apache ECharts from their public servers.
