# The shell

Every Accents app starts from the same shell, `accents/shell/Shell`. People learn it once and find
things in the same place in every app.

## What it contains

| Part | What is in it | When it appears |
|---|---|---|
| Top bar | Menu button, the organisation's own mark, app name, search, notifications, help, assistant, avatar | Menu, name, assistant and avatar always. The mark only when the app supplies a real one: never an invented logo. The rest when the app supplies a destination. |
| Left panel, top | The app's own pages | Always |
| Left panel, bottom | Customize home, Settings, Help, Feedback, Legal, Service status | Customize home and Settings always, because the shell owns them. The rest when the app supplies a destination. |
| User menu | Who is signed in, read from the identity and never typed, then Account, Personal settings, What's new, and Sign out last | Identity when the app passes a user; otherwise "Not signed in". |
| Settings | Theme, density and the assistant's model | Always |

**Leaving a part out is a written decision.** Pass no destination for it, and say in the app's handover
why it is missing. A button that goes nowhere is never acceptable.

## Width

| Width | Left panel | Search |
|---|---|---|
| 1024 px and up | Open | Shown |
| 768 to 1023 px | Icon rail | Shown |
| Below 768 px | Off-canvas; choosing a page closes it | Hidden |

## Use

```js
sap.ui.define(["accents/shell/Shell"], function (Shell) {
	var shell = Shell.create({
		app: { title: "Order Desk", mark: { src: "logo.svg", alt: "Harbor & Pine" } },
		pages: [
			{ key: "home", title: "Home", icon: "sap-icon://home", build: buildHome },
			{ key: "orders", title: "Orders", icon: "sap-icon://sales-order", build: buildOrders,
				context: function () { return { title: "the order list", facts: { "Open orders": 12 } }; } }
		],
		home: "home",
		search: { placeholder: "Search orders", onSearch: function (q) { /* ... */ } },
		user: { name: "Ana Reyes", id: "AREYES", email: "ana@example.com", org: "Harbor & Pine" },
		links: { help: "https://example.com/help", legal: "https://example.com/legal" },
		signOut: function () { /* ... */ },
		homeSections: { id: "order-desk", sections: [{ key: "today", title: "Today" }, { key: "late", title: "Late orders" }],
			onChange: function () { shell.refresh(); } }
	});
	shell.start("content");
});
```

- `context()` tells the assistant what the page is about. Without it the assistant knows only the
  page title.
- `homeLayout()` returns the home sections the person chose, in their order. When they hide all of
  them, show `shell.emptyHome()`, which offers the way back instead of blank space.

## The page must look right before the first paint

Load `boot.js` in `<head>` before the UI5 bootstrap. Leave the theme attribute off the bootstrap tag.
`boot.js` reads the saved theme, hands it to UI5 and paints the background at once. See
`gallery/index.html` for the full head.
