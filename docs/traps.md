# Traps

Surprising behaviour found by measuring, with the fix. Each entry names the version it was measured on.
Re-check the list when a version changes.

| Symptom | Cause | Fix | Measured on |
|---|---|---|---|
| A control throws "Cannot read properties of undefined (reading '0')" when created | An event setting was passed as `undefined`, for example `press: o.press` when there is no handler | Build the settings object and add the handler only when there is one | OpenUI5 1.148.9 |
| `GridContainerSettings` rejects `columnSize: "1fr"` | The property accepts fixed sizes only | Let the control pick the column count, then share the width with CSS on `.sapFGridContainerListUl` (see `Layout.band`) | OpenUI5 1.148.9 |
| A chart inside a card is 0 pixels wide and draws nothing | Card content is a flex row, so a child box does not stretch | Give the card body `flex: 1 1 auto; width: 100%; min-width: 0` (in `accents.css`) | OpenUI5 1.148.9 |
| A CSS class on `sap.m.Text` has no effect | The theme's `.sapMText` rule loads later with the same specificity | Write the rule as `.sapMText.yourClass` | OpenUI5 1.148.9 |
| Bold text turns regular after changing the font | The theme picks weight by font-family name (`"72-Bold"`), not by `font-weight` | Declare a family per weight and point each `--sapFont*Family` variable at it (see `accents.css`) | OpenUI5 1.148.9 |
| `sap-icon://layout` shows nothing | No icon has that name | Check each name with `IconPool.getIconInfo(name)`; `grid` exists | OpenUI5 1.148.9 |
| The theme on the bootstrap tag overrides the saved choice | Bootstrap attributes outrank the global `sap-ui-config` object | Leave `data-sap-ui-theme` off the tag; `boot.js` sets `sap-ui-config.theme` | OpenUI5 1.148.9 |
| A "390 px" headless screenshot looks right but content is really about 500 px wide | Headless Chrome will not make a window narrower than about 500 px; `--window-size=390` only crops the picture | Use device emulation (`Emulation.setDeviceMetricsOverride`), as `tools/check.mjs` does | Chrome, 27 Sep 2026 |
| A `sap.m.HBox` row runs past the screen edge on a phone | The box defaults to no wrapping, and a CSS `flex-wrap` rule loses to the theme's class | Set the control's own `wrap: "Wrap"` | OpenUI5 1.148.9 |
| axe reports "Required ARIA attributes must be provided" on a splitter bar, and "Scrollable region must have keyboard access" on a splitter pane | Both are inside `sap.ui.layout.Splitter`'s own rendering | Nothing an app can do; `tools/check.mjs` tolerates exactly these two and still fails on every other serious finding | OpenUI5 1.148.9, axe-core 4.13.0 |
| A `sap.m.SegmentedButton` is reported as an input with no name | It renders as a list box; a nearby `sap.m.Label` is not linked | Give the label `labelFor` and add it with `addAriaLabelledBy` | OpenUI5 1.148.9 |
| On a right-to-left page (Arabic, Hebrew), chart category names are cut to their first letter | ECharts measures and anchors its text as left-to-right inside a right-to-left container | Charts carry `dir="ltr"` (in `core/Chart.js`); the rest of the page still mirrors | ECharts 6.1.0 |
| axe reports "Certain ARIA roles must contain particular children" (critical) on a `sap.m.Table` list on narrow screens | When the table moves columns under their row ("pop-in"), UI5 links the extra line to its row with `aria-owns`, which axe 4.13 does not follow | Keep pop-in (hiding the columns on phones would be worse). `tools/check.mjs` tolerates exactly this finding on `*-listUl`; every other serious finding still fails | OpenUI5 1.148.9, axe-core 4.13.0 |
| axe reports an image with no name inside an active `sap.m.ObjectStatus` | An active status renders its icon as an image without a text alternative | After rendering, give the icon an `aria-label` ("Up", "Down", "No change"), as `reporting/KpiTag.js` does | OpenUI5 1.148.9, axe-core 4.13.0 |
| A single apostrophe disappears from translated text ("don't" shows as "dont") | `I18n.use()` always passes arguments, so UI5 runs its message formatting, which treats `'` as a quote | Write apostrophes twice in translation files (`don''t`) | OpenUI5 1.148.9 |
| `sap.ui.export` (spreadsheet export) is missing | It ships only in the paid SAPUI5 | `reporting/ExportMenu.js` writes .xlsx itself (a stored zip with CRC-32 and five XML parts) | OpenUI5 1.148.9 |
| A `sap.ui.layout.form.Form` row refuses a `VBox` or `HBox` | Form layouts accept only fields and labels in a row | Field elements expose `part.fields` (the bare controls) for form rows; put side-by-side parts in with `VariantLayoutData` | OpenUI5 1.148.9 |
| `sap.m.upload.UploadSet` is deprecated | Deprecated since 1.129 in favour of `sap.m.plugins.UploadSetwithTable`; still works in 1.148.9 | `transactional/AttachmentList.js` uses it for now; moving to the plugin is on the backlog | OpenUI5 1.148.9 |
| UploadSet icons come back after `showIcons: false`, and removing an item in `afterItemAdded` breaks rendering | The control rebuilds its icons on each render, and the event fires mid-render | Name or hide icons after rendering (a delegate on `getList()`); swap items on the next tick | OpenUI5 1.148.9 |
| Focus events never fire in headless Chrome scripts | A headless page has no focus unless asked | Send `Emulation.setFocusEmulationEnabled` before testing focus behaviour | Chrome, 27 Sep 2026 |
