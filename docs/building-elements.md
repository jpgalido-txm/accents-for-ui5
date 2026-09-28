# Building an element or page pattern

This is the contract every module in `src/accents/elements/` and `src/accents/patterns/` follows.
Read one working example before writing a new one:

- `elements/planning/HeadlineFigure.js`: a figure with count-up motion.
- `elements/review/RankedBars.js`: a chart element.
- `elements/common/SourceLine.js`: an element that never animates.
- `patterns/ReviewBoard.js`: a page pattern.

## Element module shape

```js
sap.ui.define([ /* UI5 controls */, "accents/core/Part", /* core helpers */ ], function (...) {
	"use strict";
	return {
		info: {
			controls: ["sap.m.Table", "accents.core.Chart (Apache ECharts)"], // what it is built from
			motion: "One sentence: what moves and when, or 'None. ... never animates.'",
			still: false // true when it must never animate (the gallery then disables Replay)
		},
		create: function (options) { /* ... */ return part; },   // part = Part.make({...})
		example: function (Data, ctx) {
			return { options: { /* includes data */ }, next: function (seed) { return /* new data */; } };
		}
	};
});
```

- **`create(options)`** takes plain data (`options.data`) plus callbacks and a few layout hints. It never
  takes a model or a backend address. It returns a **Part** from `Part.make()`:
  - `part.root` is the control you place on a page.
  - `part.update(data)` applies new data and runs this element's data motion on what changed.
  - `part.state("ready" | "loading" | "empty" | "error", message)` sets the view state.
  - `part.key` is the catalogue key.

  An element may add a few specific methods, such as `selectPeriod(p)`.
- **`example(Data, ctx)`** returns the gallery demo. Build demo data with the seeded helpers in
  `core/Data.js`: `Data.sample(seed)`, `Data.rng(seed)`, `Data.walk`, `Data.periods`. `next(seed)` must
  return visibly different data for the same seed each time, so "Replay motion" shows motion.
  - `ctx.assistant` is the assistant, so object elements can demo `ctx.assistant.objectButton(...)`.
  - `ctx.go(key)` navigates the gallery.
- **Page patterns** export `info`, `compose(regions)` and `example(Data, ctx)`, which returns
  `{ control, next? }`. A pattern arranges regions only; it fetches nothing. `compose()` returns the
  control, or a small handle such as `{ control, setModified(n) }` when the page needs one. See
  [page-patterns.md](page-patterns.md).

## Rules (a module that breaks one is rejected)

1. **Only OpenUI5 libraries:** `sap.m`, `sap.f`, `sap.tnt`, `sap.ui.layout`, `sap.uxap`, `sap.ui.table`,
   `sap.ui.unified`, `sap.ui.core`. Never `sap.viz`, `sap.suite.*`, `sap.ui.comp` or `sap.gantt`: those
   are paid SAP software. Charts go through `accents/core/Chart` (Apache ECharts).
2. **Use UI5 controls.** Hand-written HTML that imitates UI5 is not allowed. A custom control is allowed
   only for something UI5 lacks, and the reason goes in a comment.
3. **No literal colours in JavaScript or CSS.** Read colours from `accents/core/Tokens` (`series(n)`,
   `status("good"|"bad"|"critical"|"neutral"|"info")`, `statusText`, `ramp(kind, n)`, `mix`,
   `category(key)`), or from theme variables in CSS. Chart builders use the `kit` they are given.
4. **Colour the fact, not the container.** No coloured card edges, stripes or tinted headers.
   Colour is never the only signal: pair it with a sign, an arrow, a word, a dash or hatching.
5. **Plan, predicted and scenario** use the same hue as actual, hatched (bars, `kit.hatch()` as
   `itemStyle.decal`) or dashed (lines). A target is a marker or a reference line, never an ordinary bar.
6. **Deltas follow polarity**, not the sign: `Format.tone(delta, "up"|"down")`. Negatives use a true
   minus (`Format` does this). Numbers align right, text aligns left.
7. **Labels are short nouns** (one to three words). Sentences go in tooltips, empty states and
   messages. Counts go in brackets in the label: "Open (3)". Vague labels ("More", "Insights",
   "Details", "Other") are not allowed.
8. **One chart per card.** Show data labels only when a series has twelve points or fewer
   (`kit.labels(n)`). A chart is selectable only when it drills somewhere.
9. **All motion goes through `accents/core/Motion`** (`countTo`, `flash`, `pulse`, `rank`, `sweep`).
   Motion happens only when data really changes, only on what changed, and never on labels, legends,
   axes, headers or source lines. Reduced motion must switch it all off; Motion does that for you.
10. **Nothing inert.** Every button works. If a capability has no data behind it, disable it with a
    tooltip saying why, or leave it out.
11. **No typed figures.** Every number comes from the data passed in, or from a documented calculation
    over it. A missing value shows as a dash (`Format.number(null)`), never as zero.
12. **Empty states say what the absence means**, usually good news: "No exceptions this month."
13. **Assistant buttons** (`ctx.assistant.objectButton`) go only on things a person acts on: a row, an
    alert item, an option, a case, an object header. Never on a chart, a figure, a legend, a column
    header, a count or a title.
14. **UI5 quirk: leave out undefined event handlers.** `new Control({ press: undefined })` throws.
    Build the settings object and add the handler only when there is one.
15. **Icons:** use only `sap-icon://` names that exist in OpenUI5 1.148. Check with
    `sap.ui.core.IconPool.getIconInfo(name)` in the browser. The AI icon is `sap-icon://ai`.
16. **File header:** the same Apache licence header as the other modules, then a short plain-English
    comment on what the element is for.
17. **Every visible word comes from a translation file.** Use `accents/core/I18n`:
    `var t = I18n.use("accents.elements.<group>.i18n.i18n"); t("<element>.<purpose>", value)`.
    - Elements: one file per group, `src/accents/elements/<group>/i18n/i18n.properties`.
    - Page patterns: one file per pattern, `src/accents/patterns/i18n/<PatternFile>.properties`.
    - Keys are `<elementCamelCase>.<purpose>`, for example `rankedBars.seeAll=See all ({0})`. The
      file holds English; translations sit beside it (`i18n_de.properties`).
    - This covers labels, tooltips, messages, empty states, placeholders, column headers, dialog titles
      and sample-data names shown on screen. Numbers, dates and currencies go through `Format`, which
      follows the language.
    - A missing key shows as ⟦key⟧ and fails the check.
    - Never import `accents/core/I18n` under the name `Text`: `sap/m/Text` already uses that name.
18. **Messages go to one list.** Use `accents/core/Messages`: `Messages.field(control, sentence)`
    marks a field and lists its message, and `Messages.add({ type, text, group })` adds any other.
    Never `alert()`. Never show a technical reason; say what happened and what to do.
19. **Anything that deletes, sends, submits or cannot be undone** goes through
    `accents/elements/transactional/ConfirmAction` (`ConfirmAction.ask({ verb, object, consequence,
    danger, reason })`). When an action can be undone, do it at once and offer an undo message instead.
20. **Accessible by construction.**
    - Every input has a visible label linked with `labelFor`, or `ariaLabelledBy` pointing at an
      `sap.ui.core.InvisibleText` when there is no room for one.
    - Every progress bar, slider and icon-only button has a name (`tooltip` or `ariaLabelledBy`).
    - Everything works by keyboard.
    - `tools/check.mjs` runs axe-core on WCAG 2.1 A and AA and fails on serious or critical findings.
21. **Live data where it helps.** Elements take plain data. A demo that shows reading from a service
    uses `accents/core/OData` (`OData.source({ service, path, select, shape, sample })`). The public
    OData V4 test service `https://services.odata.org/TripPinRESTierService/(S(accents))/` allows
    browser access. Always keep a sample fallback (`?data=sample`) so the check never depends on the
    network.

## Checking your work

Serve the repository (`python3 -m http.server 8811 --bind 127.0.0.1`), then run:

```bash
node tools/check.mjs <entry-key> 1600 sap_horizon --replay
```

It must print `"ok": true`. Also check `390` and `sap_horizon_dark`, and look at the screenshot it
saves. A chart must report `drawn: true` with a width above zero.
