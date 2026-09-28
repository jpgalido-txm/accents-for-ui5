# OpenUI5 licensing and trademark facts for a personal open-source framework

Researched 27 September 2026 from primary sources. Every item is marked VERIFIED (read directly from the source today) or UNVERIFIED (not confirmed from a primary source, or a judgement).

Note: `github.com/SAP/openui5` now redirects to **`github.com/UI5/openui5`**. The files below were read from the `master` branch there.

## Summary

- OpenUI5 is Apache-2.0. Loading it from SAP's CDN is simple. If you bundle or redistribute it, you must keep its licence and third-party notices.
- The current long-term maintenance (LTM) version is **1.148.x** (latest patch 1.148.9). 1.120.x is also still LTM. 1.136.x's LTM period ends Q3/2026.
- sap.viz, sap.suite.ui.microchart, sap.suite.ui.commons, sap.ui.comp and sap.gantt are **SAPUI5-only and proprietary**. Do not use them.
- The SAP-icons and TNT icon fonts are Apache-2.0 and can be used.
- **The "72" font is the risk.** The repository labels it Apache-2.0, but the font file itself carries a Monotype licence that says "You may not copy or distribute this software." Do not bundle or redistribute the 72 font files. Use a different default font.
- Do not put "SAP", "Fiori" or "SAPUI5" in the project name. "UI5" and "OpenUI5" are not on SAP's published trademark list, but SAP says that list is partial. "X for OpenUI5" or "built on OpenUI5" follows SAP's own examples of acceptable wording.

---

## 1. OpenUI5 licence and what you must do to comply — VERIFIED

**OBSERVED**
- `LICENSE.txt` is the full Apache License 2.0 text. Source: https://github.com/UI5/openui5/blob/master/LICENSE.txt
- README: "OpenUI5 is licensed under the Apache License, Version 2.0"; third-party modules are listed in THIRDPARTY.txt and REUSE.toml. Source: https://github.com/UI5/openui5/blob/master/README.md
- `REUSE.toml` default annotation: `path = "**"`, copyright "2026 SAP SE or an SAP affiliate company and OpenUI5 contributors", `Apache-2.0`. Source: https://github.com/UI5/openui5/blob/master/REUSE.toml
- `THIRDPARTY.txt` lists bundled components under Apache-2.0, MIT, BSD-3-Clause, ISC, EPL-1.0 and Unicode-3.0. Examples: UI5 Web Components 2.24.2, purify.js, Ace, jQuery UI. Source: https://github.com/UI5/openui5/blob/master/THIRDPARTY.txt
- The files served from the CDN carry the licence header themselves. For example, `sap-ui-core.js` starts with: "OpenUI5 (c) Copyright 2026 SAP SE … Licensed under the Apache License, Version 2.0".
- The repository has **no NOTICE file**. `LICENSES/` holds Apache-2.0, BSD-3-Clause, EPL-1.0, ISC, JSONinJSPublicDomain, Unicode-3.0 and MIT.
- REUSE.toml also carries a package comment: calls to APIs of SAP products that are not part of OpenUI5 are *not* licensed under Apache-2.0. Using them needs a valid SAP licence.

**INFERRED** (from Apache-2.0 section 4)
- **Loading from the CDN, with nothing copied into your repository:** you are not redistributing OpenUI5, so you have no redistribution duties. Good practice is to state "Depends on OpenUI5 (Apache-2.0), © SAP SE" in your README or a THIRD-PARTY notice.
- **Bundling it (npm build output, vendored `resources/`, or a self-contained build):** you must include the Apache-2.0 licence text, keep SAP's copyright and licence headers, and pass on OpenUI5's THIRDPARTY.txt (or the licences it points to) for every bundled component. You must not imply that SAP endorses your project.
- Your own code can use any licence you choose. Apache-2.0 or MIT both work with this.

## 2. LTM version and CDN bootstrap URL — VERIFIED

**OBSERVED** in https://sdk.openui5.org/versionoverview.json, read today:

| Version | Status | End of maintenance | End of cloud provisioning |
|---|---|---|---|
| **1.148.\*** | Maintenance, `lts: true` | Long-term Maintenance, Q3/2027 | Q3/2028 |
| 1.136.\* | Maintenance, `lts: true` | Long-term Maintenance, **Q3/2026** (ends now) | Q3/2027 |
| 1.120.\* | Maintenance, `lts: true` | Long-term Maintenance, Q4/2030 (maintenance of minor features ends Q4/2026) | Q4/2031 |
| 1.152.\* | Latest (not LTM) | — | — |

- Latest patches: **1.148.9**, 1.136.21, 1.120.50. The unversioned CDN currently serves 1.152.0.
- URL pattern: `https://sdk.openui5.org/<version>/resources/sap-ui-core.js`
- Checked today, each returned HTTP 200: `https://sdk.openui5.org/1.148.9/resources/sap-ui-core.js`, `https://sdk.openui5.org/1.136.19/resources/sap-ui-core.js`, `https://sdk.openui5.org/1.120.40/resources/sap-ui-core.js`, and `https://sdk.openui5.org/resources/sap-ui-core.js` (latest).

**RECOMMENDATION**
- Pin a full patch version such as `1.148.9`, never the unversioned URL. 1.148 has the longest maintenance runway among current releases.
- Choose 1.120 only when a target system is on 1.120.

## 3. OpenUI5 vs SAPUI5-only libraries — VERIFIED

**OBSERVED** in `https://sdk.openui5.org/1.148.9/resources/sap-ui-version.json`, plus a check of each library's `library.js` (HTTP status) on both CDNs:

| Library | In OpenUI5 (sdk.openui5.org) | SAPUI5 (ui5.sap.com) |
|---|---|---|
| sap.m | Yes (200) | Yes |
| sap.f | Yes (200) | Yes |
| sap.tnt | Yes (200) | Yes |
| sap.uxap | Yes (200) | Yes |
| sap.ui.table | Yes (200) | Yes |
| sap.ui.layout | Yes (200) | Yes |
| sap.ui.unified | Yes (200) | Yes |
| sap.ui.integration | Yes (200) | Yes |
| sap.viz | **No (404)** | Yes, header "SAPUI5 (c) SAP SE. All rights reserved." |
| sap.suite.ui.microchart | **No (404)** | Yes, same proprietary header |
| sap.suite.ui.commons | **No (404)** | Yes |
| sap.ui.comp | **No (404)** | Yes |
| sap.gantt | **No (404)** | Yes |

- The full OpenUI5 1.148.9 library list is: sap.f, sap.m, sap.tnt, sap.ui.codeeditor, sap.ui.commons, sap.ui.core, sap.ui.documentation, sap.ui.dt, sap.ui.fl, sap.ui.integration, sap.ui.layout, sap.ui.mdc, sap.ui.rta, sap.ui.server.java, sap.ui.suite, sap.ui.support, sap.ui.table, sap.ui.testrecorder, sap.ui.unified, sap.ui.ux3, sap.uxap, and the theme libraries for belize, bluecrystal, fiori_3 and horizon.

**INFERRED**
- A public Apache/MIT framework must not depend on the five SAPUI5-only libraries or load them from ui5.sap.com. They are proprietary SAP software.
- sap.ui.mdc (in OpenUI5) is the open replacement for many sap.ui.comp smart controls.
- **UNVERIFIED:** in sap.ui.integration, "Analytical" cards depend on sap.viz, so they will not render on OpenUI5 alone. Other card types (List, Table, Object, Component, AdaptiveCard) do not need it.

## 4. SAP-icons and TNT icon fonts — VERIFIED

**OBSERVED**
- `SAP-icons.ttf` sits at `src/sap.ui.core/src/sap/ui/core/themes/base/fonts/`. Its embedded licence field reads: "SAP icons is created for Open UI5 and is therefore covered by the same licence information. OpenUI5 is … available under the Apache 2.0 license." The licence URL points to OpenUI5 LICENSE.txt. The trademark field reads: "SAP-icons is a trademark of SAP SE Visual Design." (Version 4.24.)
- `SAP-icons-TNT.woff2` sits at `src/sap.tnt/src/sap/tnt/themes/base/fonts/`. It has no separate REUSE annotation, so the repository default (Apache-2.0) applies.
- THIRDPARTY.txt lists "UI5 Web Components Icons", "Icons Business Suite" and "Icons TNT" (2.24.2) as Apache-2.0.

**INFERRED**
- Using `sap-icon://…` through OpenUI5 is allowed. Redistributing the font is allowed under Apache-2.0.
- Do not call the icon set by SAP's name in your own branding. Refer to it as "SAP-icons, shipped with OpenUI5".

## 5. The "72" font family — VERIFIED conflict; the conclusion is a risk judgement

**OBSERVED**
- OpenUI5 ships the 72 font inside the theme libraries, for example `src/themelib_sap_horizon/src/sap/ui/core/themes/sap_horizon/fonts/72-Regular.woff2` (also Black, Bold, Light, SemiboldDuplex and `-full` variants; fiori_3 and belize include 72Mono). `sap_horizon/library.css` declares `@font-face{font-family:'72'; src:url('fonts/72-Regular.woff2')…}`.
- The OpenUI5 REUSE.toml has **no specific entry** for these fonts, so the repository default "Apache-2.0" covers them on paper.
- The upstream source, SAP Theming Base Content (https://github.com/SAP/theming-base-content), states `Files: *  License: Apache-2.0` in `.reuse/dep5`.
- **But the font files themselves say otherwise.** I decoded OpenUI5's `sap_horizon/fonts/72-Regular.woff2` and theming-base-content's `72-Regular.woff`. Both contain:
  - Copyright: "Copyright 2019-2023 SAP SE. All rights reserved."
  - Manufacturer: Monotype Imaging Inc. Designer: Terrance Weinzerl, Monotype Design Office. Font name "72 W01 Regular".
  - Licence description: "This font software is the property of Monotype Imaging Inc. … You may not copy or distribute this software."

**INFERRED**
- The repository metadata (Apache-2.0) contradicts the licence embedded in the font (a Monotype proprietary licence). Which one governs is a legal question. The source code alone cannot settle it.

**RECOMMENDATION** (risk judgement; you decide, with legal advice if the project matters)
- **Do not bundle, vendor or redistribute any 72 font files** in your repository or npm package.
- Set your framework's own default font to an open font such as Inter, IBM Plex Sans or Source Sans 3 (all under the SIL Open Font Licence). Let 72 load only when it is already present, meaning an adopter's own OpenUI5 theme from SAP's CDN supplies it.
- Do not promote "uses SAP's 72 font" as a feature.

## 6. Themes (sap_horizon, sap_horizon_dark, hcb/hcw, sap_fiori_3) — VERIFIED, apart from the fonts

**OBSERVED**
- Theme libraries `themelib_sap_horizon` and `themelib_sap_fiori_3` are in the OpenUI5 repository and carry the default Apache-2.0 annotation. `base.less` files are annotated "SAP Theming Base Content", Apache-2.0.
- Each of these returned HTTP 200 at `https://sdk.openui5.org/1.148.9/resources/sap/m/themes/<theme>/library.css`: sap_horizon, sap_horizon_dark, sap_horizon_hcb, sap_horizon_hcw, sap_fiori_3, sap_fiori_3_dark, sap_fiori_3_hcb, sap_fiori_3_hcw.

**INFERRED**
- The theme CSS and LESS are usable and redistributable under Apache-2.0. The only exception is the 72 font files they reference (see item 5).
- Theme IDs such as `sap_horizon` are technical identifiers. Using them in code is fine. Do not use "Horizon" or "Fiori" as the name of your own theme or product.

## 7. Trademarks and naming — VERIFIED list and guidance; the "UI5" status is UNVERIFIED

**OBSERVED** on https://www.sap.com/about/legal/trademark.html (effective 12 January 2026; read through a browser because direct fetches return 403):
- The list includes **SAP®**, **SAP® \<Approved Name\>** (this covers any "SAP …" product name, such as SAPUI5 or SAP Build), **SAP Fiori®** (descriptors: "user experience; design system; design language(s); apps"), SAP HANA®, OpenSAP® and others.
- **UI5, OpenUI5, Horizon and Joule are not on the list.** The page says the list is "partial" and that "Failure by SAP to list a particular trademark … is not a waiver of any SAP rights."
- Third-party use rule: third parties "cannot use the SAP logo or include the name 'SAP', a trademark of SAP, the name of an SAP offering or similar variations in their own company/product/service names, slogans, domain names, or logos." The same applies to social media account names that could confuse people.
- Compatibility wording SAP permits: "for," "built on," "designed for use with," "compatible with," "works well with," "runs on," "runs with," "is an add-on for/to". A product name "can state the relevant SAP environment or offering using 'for'", for example "\<Partner Product Name\> for SAP S/4HANA®".
- Required attribution in any material that mentions an SAP trademark: "\<SAP TRADEMARK(S)\> is/are the trademark(s) or registered trademark(s) of SAP SE or its affiliates in Germany and in other countries."
- You must not imply SAP "sponsorship, affiliation, certification, approval, or endorsement" without express permission. Contact: trademarks@sap.com.
- The SAP-icons font declares "SAP-icons is a trademark of SAP SE Visual Design."

**OBSERVED** about the community naming precedent:
- The GitHub organisation **ui5-community** ("UI5 Community") hosts wdi5, Easy UI5 and bestofui5.org. It describes UI5 as a collaborative effort with OpenUI5 at its core. Source: https://github.com/ui5-community
- "UI5 Web Components" is SAP's own project (https://github.com/UI5/webcomponents, Apache-2.0), so it is not a third-party naming precedent.

**UNVERIFIED**
- I found no SAP page that explicitly allows or forbids "UI5" in third-party project names. Community projects use it widely and openly (ui5-community, wdi5, Easy UI5), but tolerance is not a licence.
- I did not check the German (DPMA), EU (EUIPO) or US (USPTO) trademark registers for "UI5", "OpenUI5", "Horizon" or "Joule".

**RECOMMENDATION** (naming)
- Safe: a distinct name of your own, followed by a compatibility statement. For example, "Acme Patterns — a component framework built on OpenUI5", or "Acme for OpenUI5".
- Avoid in the name, domain, logo or npm scope: SAP, Fiori, SAPUI5, Joule, and "Horizon" when used with SAP context.
- Treat "UI5" as a word you can use for describing the project but should not put in the name. Keep a leading "UI5-…" out of the product name. If you want "UI5" in the name, email trademarks@sap.com first.
- Put the attribution sentence in the README footer and the documentation site. For example: "SAP, SAP Fiori and SAPUI5 are trademarks or registered trademarks of SAP SE or its affiliates in Germany and in other countries. This project is not affiliated with or endorsed by SAP."

## 8. Charting to replace sap.viz and microcharts — VERIFIED licences

**OBSERVED** through the GitHub API today:
- **Apache ECharts**: Apache-2.0, about 67k stars, active (last push 2026-09-16). The jsDelivr CDN `echarts@5` returned 200.
- **Chart.js**: MIT, about 68k stars, active.
- **uPlot**: MIT, very small and fast, suited to time series and sparklines.

**RECOMMENDATION**
- Use **Apache ECharts** as the main engine. It covers the full range of sap.viz chart types. It can read CSS custom properties, so you can feed it OpenUI5 theme parameters (`sap.ui.core.theming.Parameters`) for colours and dark mode. Wrap it in your own `sap.ui.core.Control`.
- For microchart-style sparklines and bullets, use small custom controls that draw SVG, or uPlot.
