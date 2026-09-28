/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Planning desk: where a plan is changed. A title with a modified marker and the simulate, save and
 * discard actions; the version bar, which warns while changes are not simulated or not saved; a row of
 * settings; up to three headline figures; then the workspace chart above a resizable splitter with the
 * key-figure grid below it. Chart, grid, figures and applied settings all show the same simulated state.
 * On a phone the actions stay pinned to the bottom of the screen, so Simulate is always in reach, and the
 * grid shows one item at a time.
 *
 * Use it when a person changes figures and needs to see the effect before keeping it. Do not use it
 * for reading a review; that is the review board. The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/FlexBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"sap/ui/layout/Splitter",
	"sap/ui/layout/SplitterLayoutData",
	"accents/core/Layout",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/elements/planning/VersionBar",
	"accents/elements/planning/ScenarioActions",
	"accents/elements/planning/RangeSlider",
	"accents/elements/planning/ModeChoice",
	"accents/elements/planning/OverrideAmount",
	"accents/elements/planning/AppliedSettings",
	"accents/elements/planning/HeadlineFigure",
	"accents/elements/planning/WorkspaceChart",
	"accents/elements/planning/KeyFigureToggle",
	"accents/elements/planning/KeyFigureGrid",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (Device, VBox, HBox, FlexBox, Title, Text, Button, ObjectStatus, FlexItemData, Splitter, SplitterLayoutData, Layout, Format,
	Motion, VersionBar, ScenarioActions, RangeSlider, ModeChoice, OverrideAmount, AppliedSettings, HeadlineFigure, WorkspaceChart,
	KeyFigureToggle, KeyFigureGrid, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.PlanningDesk");
	// The replay finds the Simulate button by its text, in whatever language the planning elements show it.
	var simulateText = I18n.use("accents.elements.planning.i18n.i18n")("scenarioActions.simulate");

	var CHART_PANE = "18rem";

	/** Pins a control to the bottom of the screen while its page is in view. Colours are theme variables. */
	function pin(control, on) {
		var el = control.getDomRef();
		if (!el) { return; }
		var s = el.style;
		s.position = on ? "sticky" : "";
		s.bottom = on ? "0" : "";
		s.zIndex = on ? "5" : "";
		s.padding = on ? "0.5rem 0" : "";
		s.backgroundColor = on ? "var(--sapPageFooter_Background)" : "";
		s.borderTop = on ? "var(--sapPageFooter_BorderWidth, 1px) solid var(--sapPageFooter_BorderColor)" : "";
	}

	/**
	 * regions:
	 *   title, lead   page heading and one sentence
	 *   versionBar    the version bar control (it carries the pending-changes warning strip)
	 *   actions       the scenario actions control (simulate, save, discard)
	 *   settings      the setting controls, in order (range slider, mode choice, override)
	 *   applied       the applied-settings control; it sits under the settings as their summary line
	 *   tiles         up to three controls (headline figures)
	 *   toggle        the key-figure toggle control
	 *   chart         the workspace chart control; the splitter gives it the height of its pane
	 *   grid          the key-figure grid control
	 *   source        the source line control
	 *
	 * Returns { control, setModified(count) }. setModified shows "Modified (n)" by the title while n
	 * changes are not simulated or not saved, and hides it at zero.
	 */
	function compose(r) {
		if (r.tiles && r.tiles.length > 3) { throw new Error("A planning desk holds at most three headline figures; the grid carries the rest."); }

		var marker = new ObjectStatus({ text: "", state: "Warning", icon: "sap-icon://edit", visible: false,
			tooltip: t("planningDesk.modifiedTooltip") }).addStyleClass("sapUiSmallMarginBegin");
		var heading = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [
			new Title({ text: r.title, level: "H1", titleStyle: "H3", wrapping: true }), marker
		] }).addStyleClass("sapUiSmallMarginEnd");
		var topActions = new VBox({ renderType: "Bare", items: r.actions ? [r.actions] : [] });
		var footActions = new VBox({ renderType: "Bare", items: [] });
		var head = new FlexBox({ renderType: "Bare", justifyContent: "SpaceBetween", alignItems: "Center", wrap: "Wrap", items: [heading, topActions] });

		var settingsCard = null;
		if (r.settings && r.settings.length) {
			var row = new FlexBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Start", items: r.settings.map(function (c) {
				return new VBox({ renderType: "Bare", items: [c], layoutData: new FlexItemData({ growFactor: 1, baseSize: "17rem", minWidth: "0" }) })
					.addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");
			}) });
			var settingsBody = new VBox({ renderType: "Bare", items: [row].concat(r.applied ? [r.applied] : []) }).addStyleClass("sapUiSmallMargin");
			settingsCard = Layout.card({ title: t("planningDesk.settingsTitle", r.settings.length), subtitle: t("planningDesk.settingsSubtitle"), content: settingsBody });
			settingsCard.addStyleClass("sapUiSmallMarginTop");
		}

		var tiles = (r.tiles || []).map(function (tile) { return Layout.card({ title: null, content: tile, cols: 4, rows: 2 }); });

		// The chart takes the height of its pane, so dragging the splitter trades chart height for grid rows.
		var chartPane = new VBox({ renderType: "Bare", items: r.chart ? [r.chart] : [],
			layoutData: new SplitterLayoutData({ size: CHART_PANE, minSize: 160 }) });
		var gridPane = new VBox({ renderType: "Bare", items: r.grid ? [r.grid] : [],
			layoutData: new SplitterLayoutData({ size: "auto", minSize: 160 }) }).addStyleClass("sapUiTinyMarginTop");
		var splitter = new Splitter({ orientation: "Vertical", height: "46rem", width: "100%", contentAreas: [chartPane, gridPane] });
		function charts() {
			return r.chart ? r.chart.findAggregatedObjects(true, function (c) { return c.isA("accents.core.Chart"); }) : [];
		}
		function fitChart() {
			var pane = chartPane.getDomRef();
			if (!pane || !pane.clientHeight) { return; }
			var h = Math.max(120, pane.clientHeight - 8) + "px";
			charts().forEach(function (c) {
				if (c.getHeight() === h) { return; }
				c.setProperty("height", h, true);
				if (c.getDomRef()) { c.getDomRef().style.height = h; } // the chart's own resize observer redraws it
			});
		}
		splitter.attachResize(function () { setTimeout(fitChart, 0); });
		chartPane.addEventDelegate({ onAfterRendering: function () { setTimeout(fitChart, 0); } });

		var workspace = Layout.card({ title: t("planningDesk.workspaceTitle"), subtitle: t("planningDesk.workspaceSubtitle"),
			content: new VBox({ renderType: "Bare", items: (r.toggle ? [r.toggle] : []).concat([splitter]) }).addStyleClass("sapUiSmallMargin") });
		workspace.addStyleClass("sapUiSmallMarginTop");

		var items = [head];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		if (r.versionBar) { items.push(r.versionBar); }
		if (settingsCard) { items.push(settingsCard); }
		if (tiles.length) { items.push(Layout.band({ cards: tiles, rowSize: "3.5rem" }).addStyleClass("sapUiSmallMarginTop")); }
		items.push(workspace);
		if (r.source) { items.push(r.source); }
		items.push(footActions);
		var control = new VBox({ renderType: "Bare", items: items });

		// On a phone the actions move to a bar pinned to the bottom of the screen, so Simulate stays in reach.
		var phone = null;
		function adapt() {
			if (!r.actions) { return; }
			var now = Layout.narrower("phone");
			if (now === phone) { return; }
			phone = now;
			(now ? topActions : footActions).removeItem(r.actions);
			(now ? footActions : topActions).addItem(r.actions);
			footActions.setVisible(now);
		}
		footActions.addEventDelegate({ onAfterRendering: function () { pin(footActions, !!phone); } });
		adapt();
		Device.resize.attachHandler(adapt);
		var destroy = control.destroy;
		control.destroy = function () { Device.resize.detachHandler(adapt); return destroy.apply(this, arguments); };

		return {
			control: control,
			setModified: function (n) {
				var was = marker.getVisible() ? marker.getText() : "";
				marker.setText(t("planningDesk.modified", n));
				marker.setVisible(n > 0);
				if (n > 0 && was !== marker.getText()) { setTimeout(function () { Motion.pulse(marker); }, 0); }
			}
		};
	}

	return {
		info: {
			controls: ["sap.ui.layout.Splitter (vertical)", "sap.f.Card", "sap.f.GridContainer", "sap.m.ObjectStatus",
				"version-bar", "scenario-actions", "range-slider", "mode-choice", "override-amount", "applied-settings",
				"headline-figure", "workspace-chart", "key-figure-toggle", "key-figure-grid"],
			motion: "Nothing moves while settings change. On Simulate and Discard, the figures count, the chart lines move and changed grid cells sweep once; the modified marker pulses when its count changes.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var KEPT_IN = t("planningDesk.demo.keptIn");
			var money = function (v) { return Format.money(v * 1000, "USD", true); };
			var s = Data.sample(7);
			var items = s.items.slice(0, 4);
			var periods = s.periods;
			var future = periods.map(function (p, i) { return p > s.today ? i : -1; }).filter(function (i) { return i >= 0; });
			var MODES = [
				{ key: "even", text: t("planningDesk.demo.modeEven"), tooltip: t("planningDesk.demo.modeEvenTooltip") },
				{ key: "plan", text: t("planningDesk.demo.modePlan"), tooltip: t("planningDesk.demo.modePlanTooltip") },
				{ key: "front", text: t("planningDesk.demo.modeFront"), tooltip: t("planningDesk.demo.modeFrontTooltip") }
			];
			var KFS = [
				{ key: "REV", name: t("planningDesk.demo.kfRevenue"), polarity: "up", digits: 0, slot: 0 },
				{ key: "PLAN", name: t("planningDesk.demo.kfPlan"), polarity: "up", digits: 0, slot: 1 },
				{ key: "SPEND", name: t("planningDesk.demo.kfSpend"), polarity: "down", digits: 1, slot: 2 }
			];

			/*
			 * The recompute, over the sample data (figures in thousands of US dollars):
			 *  - base revenue is the actual for past months and the forecast for the rest;
			 *  - a price change p scales remaining revenue by (1 + p) × (1 − 0.6 × p): volume falls 0.6%
			 *    for each 1% of price;
			 *  - the promotion budget is 5% of remaining base revenue unless it is overridden; it is split
			 *    over the remaining months by the spread mode and over items by their remaining base revenue;
			 *  - each dollar of promotion adds 1.8 dollars of revenue in the month it is spent;
			 *  - a revenue figure typed into the grid replaces the calculated one for that item and month.
			 */
			var ELASTICITY = 0.6, RETURN = 1.8, BUDGET_SHARE = 0.05;
			var baseRev = items.map(function (it) { return it.months.map(function (m) { return m.actual !== null ? m.actual : m.forecast; }); });
			var futureBase = items.map(function (it, i) { return future.reduce(function (a, k) { return a + baseRev[i][k]; }, 0); });
			var futureTotal = futureBase.reduce(function (a, v) { return a + v; }, 0);
			var calculatedBudget = Math.round(futureTotal * BUDGET_SHARE) * 1000;

			function weights(mode) {
				var raw = future.map(function (k, n) {
					if (mode === "plan") { return items.reduce(function (a, it) { return a + it.months[k].plan; }, 0); }
					if (mode === "front") { return future.length - n; }
					return 1;
				});
				var total = raw.reduce(function (a, v) { return a + v; }, 0);
				return raw.map(function (v) { return v / total; });
			}

			function compute(st) {
				var p = st.settings.price / 100;
				var factor = (1 + p) * (1 - ELASTICITY * p);
				var budget = (st.settings.budget.on ? st.settings.budget.amount : calculatedBudget) / 1000;
				var w = weights(st.settings.spread);
				var rev = [], spend = [];
				items.forEach(function (it, i) {
					rev.push(baseRev[i].slice());
					spend.push(periods.map(function () { return null; }));
					future.forEach(function (k, n) {
						var sp = budget * w[n] * futureBase[i] / futureTotal;
						spend[i][k] = Data.round(sp, 1);
						var typed = st.edits[it.id + "|" + periods[k]];
						rev[i][k] = typeof typed === "number" ? typed : Data.round(baseRev[i][k] * factor + sp * RETURN, 1);
					});
				});
				return { rev: rev, spend: spend };
			}

			function clone(st) { return { settings: JSON.parse(JSON.stringify(st.settings)), edits: Object.assign({}, st.edits) }; }
			var BASE = { settings: { price: 0, spread: "even", budget: { on: false, amount: null } }, edits: {} };
			var base = compute(BASE);
			// The saved scenario starts as the base with one revenue figure changed and saved, to show that state.
			var firstEdit = {};
			firstEdit[items[1].id + "|" + periods[future[1]]] = Data.round(base.rev[1][future[1]] * 1.08, 1);
			var saved = { settings: clone(BASE).settings, edits: firstEdit };
			var applied = clone(saved), now = clone(saved);
			var savedFigures = compute(saved), screen = compute(applied);

			function sumBy(m, k) { return Data.round(m.reduce(function (a, row) { return a + (row[k] || 0); }, 0), 1); }
			function total(m) { return m.reduce(function (a, row) { return a + row.reduce(function (b, v) { return b + (v || 0); }, 0); }, 0); }

			function chartData() {
				return { periods: periods, baseName: t("planningDesk.demo.baseName"), scenarioName: t("planningDesk.demo.scenarioName"), keyFigures: [
					{ key: "REV", name: t("planningDesk.demo.kfRevenue"), slot: 0, base: periods.map(function (p, k) { return sumBy(base.rev, k); }),
						scenario: periods.map(function (p, k) { return sumBy(screen.rev, k); }) },
					{ key: "PLAN", name: t("planningDesk.demo.kfPlan"), slot: 1, base: periods.map(function (p, k) { return Data.round(items.reduce(function (a, it) { return a + it.months[k].plan; }, 0), 1); }),
						scenario: periods.map(function (p, k) { return Data.round(items.reduce(function (a, it) { return a + it.months[k].plan; }, 0), 1); }) },
					{ key: "SPEND", name: t("planningDesk.demo.kfSpend"), slot: 2, base: periods.map(function (p, k) { return future.indexOf(k) < 0 ? null : sumBy(base.spend, k); }),
						scenario: periods.map(function (p, k) { return future.indexOf(k) < 0 ? null : sumBy(screen.spend, k); }) }
				] };
			}

			/*
			 * The grid shows as many months as fit its width without scrolling sideways (all twelve on a
			 * wide screen, and on a phone, where the grid lists months down the page). win is the window of
			 * month indexes on show; Earlier and Later move it, and choosing a month on the chart brings it
			 * into view.
			 */
			var win = { start: 0, count: periods.length };
			var selected = periods[future[0]];
			function shown() { return periods.slice(win.start, win.start + win.count); }

			/** Revenue cells: changed from the saved scenario means pending; saved but not the base means saved. */
			function gridData() {
				var rows = [], ks = shown().map(function (p) { return periods.indexOf(p); });
				items.forEach(function (it, i) {
					rows.push({ item: it.id, itemName: it.name, keyFigure: "REV", cells: ks.map(function (k) {
						var v = screen.rev[i][k];
						if (it.months[k].actual !== null) { return { value: v, state: "actual" }; }
						return { value: v, state: v !== savedFigures.rev[i][k] ? "pending" : v !== base.rev[i][k] ? "saved" : "editable" };
					}) });
					rows.push({ item: it.id, itemName: it.name, keyFigure: "PLAN", cells: ks.map(function (k) { return { value: it.months[k].plan, state: "readonly" }; }) });
					rows.push({ item: it.id, itemName: it.name, keyFigure: "SPEND", cells: ks.map(function (k) {
						return screen.spend[i][k] === null ? { value: null, state: "na" } : { value: screen.spend[i][k], state: "readonly" };
					}) });
				});
				return { periods: shown(), keyFigures: KFS, rows: rows };
			}
			function refreshGrid() {
				grid.update(gridData());
				if (shown().indexOf(selected) >= 0) { grid.selectPeriod(selected); }
				var all = win.count >= periods.length;
				windowBar.setVisible(!all);
				windowText.setText(t("planningDesk.demo.window", win.count, periods.length, Format.period(periods[win.start]),
					Format.period(periods[win.start + win.count - 1])));
				earlier.setEnabled(win.start > 0);
				earlier.setTooltip(win.start > 0 ? t("planningDesk.demo.earlierTooltip") : t("planningDesk.demo.firstInView"));
				later.setEnabled(win.start + win.count < periods.length);
				later.setTooltip(win.start + win.count < periods.length ? t("planningDesk.demo.laterTooltip") : t("planningDesk.demo.lastInView"));
			}
			/** Window placement: keep the start where it was when possible, and always keep the selected month in view. */
			function place(count, start) {
				var n = periods.length;
				count = Math.max(1, Math.min(n, count));
				var sel = periods.indexOf(selected);
				start = Math.max(0, Math.min(n - count, start));
				if (sel >= 0 && sel < start) { start = sel; }
				if (sel >= 0 && sel >= start + count) { start = sel - count + 1; }
				if (count === win.count && start === win.start) { return false; }
				win = { start: start, count: count };
				return true;
			}
			/** How many month columns fit: the grid's width less its item, key-figure and ask columns, over a month's minimum width. */
			function fit() {
				var el = gridHolder.getDomRef();
				if (!el || !el.clientWidth) { return; }
				var rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
				var count = window.innerWidth < 640 ? periods.length : Math.floor((el.clientWidth - (8 + 9 + 3.25) * rem - 24) / 72);
				if (place(Math.max(3, count), win.count >= periods.length ? future[0] - Math.max(3, count) + future.length : win.start)) { refreshGrid(); }
			}

			var planLeft = items.reduce(function (a, it) { return a + future.reduce(function (b, k) { return b + it.months[k].plan; }, 0); }, 0);
			/** Remaining revenue and spend: the months a scenario can still change (after the sample's today). */
			function remaining(m) { return m.reduce(function (a, row) { return a + future.reduce(function (b, k) { return b + (row[k] || 0); }, 0); }, 0); }
			function tileData() {
				return [
					{ value: remaining(screen.rev) * 1000, base: remaining(base.rev) * 1000 },
					{ value: total(screen.spend) * 1000, base: total(base.spend) * 1000 },
					{ value: remaining(screen.rev) / planLeft, base: remaining(base.rev) / planLeft }
				];
			}

			function modeText(key) { return (MODES.find(function (m) { return m.key === key; }) || {}).text || key; }
			function settingTexts(st) {
				return {
					price: Format.delta(st.settings.price / 100, "percent", 0),
					spread: modeText(st.settings.spread),
					budget: st.settings.budget.on ? Format.money(st.settings.budget.amount, "USD", true) : t("planningDesk.demo.calculated")
				};
			}
			function settingValues(st) {
				return { price: st.settings.price, spread: st.settings.spread, budget: st.settings.budget.on ? st.settings.budget.amount : false };
			}
			function appliedData() {
				var tx = settingTexts(applied), v = settingValues(applied);
				return {
					applied: [
						{ key: "price", label: t("planningDesk.demo.appliedPrice"), value: v.price, text: tx.price },
						{ key: "spread", label: t("planningDesk.demo.appliedSpread"), value: v.spread, text: tx.spread },
						{ key: "budget", label: t("planningDesk.demo.appliedBudget"), value: v.budget, text: tx.budget }
					],
					current: settingValues(now),
					texts: settingTexts(now)
				};
			}

			// Elements.
			var versionData = { base: { key: "BASE", name: t("planningDesk.demo.baseName"), description: t("planningDesk.demo.baseDescription", Format.period(s.today)) },
				scenarios: [{ key: "S1", name: t("planningDesk.demo.scenarioName") }], active: "S1", unsimulated: 0, unsaved: 0 };
			var versionBar = VersionBar.create({ data: versionData });
			var range = RangeSlider.create({ label: t("planningDesk.demo.priceChange"), unit: "%", min: -10, max: 15, step: 1, safe: { min: -5, max: 10 },
				data: { value: now.settings.price }, onChange: function (v) { now.settings.price = v; changed(); } });
			var mode = ModeChoice.create({ label: t("planningDesk.demo.budgetSpread"), data: { modes: MODES, selected: now.settings.spread },
				onChange: function (key) { now.settings.spread = key; changed(); } });
			var override = OverrideAmount.create({ label: t("planningDesk.demo.promotionBudget"), unit: "USD", min: 0, max: 5000000, step: 1000,
				data: { on: false, amount: null, calculated: calculatedBudget },
				onChange: function (x) { now.settings.budget = { on: x.on, amount: x.on ? x.amount : null }; changed(); } });
			var appliedTag = AppliedSettings.create({ data: appliedData() });
			var tiles = [
				HeadlineFigure.create({ label: t("planningDesk.demo.tileRemaining"), format: "money", polarity: "up", baseLabel: t("planningDesk.demo.base"), data: tileData()[0] }),
				HeadlineFigure.create({ label: t("planningDesk.demo.kfSpend"), unit: "USD", format: "short", polarity: "down", baseLabel: t("planningDesk.demo.base"), data: tileData()[1] }),
				HeadlineFigure.create({ label: t("planningDesk.demo.tileToPlan"), format: "percent", polarity: "up", baseLabel: t("planningDesk.demo.base"), data: tileData()[2] })
			];
			var visible = ["REV", "PLAN"];
			var chart = WorkspaceChart.create({ label: t("planningDesk.demo.chartLabel"), format: money,
				visible: visible, selected: selected, data: chartData(),
				onSelectPeriod: function (p) {
					selected = p;
					if (shown().indexOf(p) < 0 && place(win.count, win.start)) { refreshGrid(); } else { grid.selectPeriod(p); }
				} });
			var grid = KeyFigureGrid.create({ data: gridData(), visible: visible, selected: selected, rowCount: 12, assistant: ctx && ctx.assistant,
				onSelectPeriod: function (p) { selected = p; chart.selectPeriod(p); },
				onEdit: function (c) {
					if (c.keyFigure !== "REV") { return; }
					now.edits[c.item + "|" + c.period] = Data.round(c.value, 1);
					changed();
				} });
			var windowText = new Text({ text: "" }).addStyleClass("accLabel sapUiSmallMarginEnd");
			var earlier = new Button({ text: t("planningDesk.demo.earlier"), icon: "sap-icon://navigation-left-arrow", type: "Transparent",
				press: function () { if (place(win.count, win.start - win.count)) { refreshGrid(); } } });
			var later = new Button({ text: t("planningDesk.demo.later"), icon: "sap-icon://navigation-right-arrow", iconFirst: false, type: "Transparent",
				press: function () { if (place(win.count, win.start + win.count)) { refreshGrid(); } } });
			var windowBar = new FlexBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", visible: false, items: [windowText, earlier, later] });
			var gridHolder = new VBox({ renderType: "Bare", width: "100%", items: [windowBar, grid.root] });
			gridHolder.addEventDelegate({ onAfterRendering: function () { setTimeout(fit, 0); } });
			Device.resize.attachHandler(fit);
			var toggle = KeyFigureToggle.create({ data: KFS.map(function (k) { return { key: k.key, name: k.name, slot: k.slot, visible: visible.indexOf(k.key) >= 0 }; }),
				onChange: function (keys) { chart.setVisible(keys); grid.setVisible(keys); } });
			var actions = ScenarioActions.create({
				data: { unsimulated: 0, unsaved: 0, keptIn: KEPT_IN },
				onSimulate: function () { applied = clone(now); screen = compute(applied); show(); },
				onSave: function () {
					saved = clone(applied);
					savedFigures = compute(saved);
					refreshGrid();
					return KEPT_IN;
				},
				onDiscard: function () {
					now = clone(saved);
					applied = clone(saved);
					screen = compute(applied);
					range.update({ value: now.settings.price });
					mode.update({ modes: MODES, selected: now.settings.spread });
					override.update({ on: now.settings.budget.on, amount: now.settings.budget.amount, calculated: calculatedBudget });
					show();
				},
				onStatus: function (st) {
					versionData.unsimulated = st.unsimulated;
					versionData.unsaved = st.unsaved;
					versionBar.update(versionData);
					desk.setModified(st.unsimulated + st.unsaved);
				}
			});

			function changed() {
				actions.changed(1);
				appliedTag.setCurrent(settingValues(now), settingTexts(now));
			}
			function show() {
				chart.update(chartData());
				refreshGrid();
				tileData().forEach(function (d, i) { tiles[i].update(d); });
				appliedTag.update(appliedData());
			}

			var desk = compose({
				title: t("planningDesk.demo.title"),
				lead: t("planningDesk.demo.lead"),
				versionBar: versionBar.root,
				actions: actions.root,
				settings: [range.root, mode.root, override.root],
				applied: appliedTag.root,
				tiles: tiles.map(function (tile) { return tile.root; }),
				toggle: toggle.root,
				chart: chart.root,
				grid: gridHolder,
				source: SourceLine.create({ data: Data.sampleMeta({ model: t("planningDesk.demo.model") }) }).root
			});

			// Test hook for automated checks of the simulate, save and discard loop. Not for apps.
			desk.control.data("demo", { now: function () { return now; }, applied: function () { return applied; }, saved: function () { return saved; },
				screen: function () { return screen; }, range: range, mode: mode, override: override, actions: actions, grid: grid, chart: chart, tiles: tiles });

			var destroy = desk.control.destroy;
			desk.control.destroy = function () { Device.resize.detachHandler(fit); return destroy.apply(this, arguments); };
			return {
				control: desk.control,
				// Replay: a new price change from the seed, simulated at once, so every view moves together.
				next: function (seed) {
					return function () {
						var v = Math.round(Data.rng(seed)() * 14) - 4;
						if (v === now.settings.price) { v += 1; }
						now.settings.price = v;
						range.update({ value: v });
						changed();
						var sim = actions.root.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Button") && c.getText() === simulateText; })[0];
						if (sim && sim.getEnabled()) { sim.firePress(); }
					};
				}
			};
		}
	};
});
