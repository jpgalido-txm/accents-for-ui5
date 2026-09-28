/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Run and rank: a calculation that takes parameters and returns ranked results. Parameters sit in one
 * column with Run and Reset in view; results sit in the other and appear only after a run. Before the
 * first run the results side says, in one sentence, that there is nothing yet and why. Below tablet
 * width the two columns stack as two steps, and a Run bar stays pinned to the bottom of the screen so
 * the run is always in reach.
 *
 * Use it for optimisers and simulations that are run on demand. Do not use it when figures change as
 * settings move; that is the planning desk. The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/FlexBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/FlexItemData",
	"accents/core/Layout",
	"accents/core/Format",
	"accents/elements/simulation/ParameterPanel",
	"accents/elements/optimisation/RunStats",
	"accents/elements/optimisation/RankedOptions",
	"accents/elements/optimisation/OptionsScatter",
	"accents/elements/optimisation/sampleOptions",
	"accents/elements/common/EmptyState",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (Device, VBox, FlexBox, Title, Text, Button, FlexItemData, Layout, Format, ParameterPanel, RunStats, RankedOptions,
	OptionsScatter, sampleOptions, EmptyState, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.RunAndRank");

	/** Sets or clears sticky placement on a control's node. Colours are theme variables. */
	function stick(control, where) {
		var el = control.getDomRef();
		if (!el) { return; }
		var s = el.style;
		s.position = where ? "sticky" : "";
		s.top = where === "top" ? "0" : "";
		s.bottom = where === "bottom" ? "0" : "";
		s.zIndex = where ? "5" : "";
		s.padding = where === "bottom" ? "0.5rem 0" : "";
		s.backgroundColor = where === "bottom" ? "var(--sapPageFooter_Background)" : "";
		s.borderTop = where === "bottom" ? "var(--sapPageFooter_BorderWidth, 1px) solid var(--sapPageFooter_BorderColor)" : "";
	}

	/**
	 * regions:
	 *   title, lead   page heading and one sentence
	 *   parameters    the parameter panel control (it holds Run and Reset)
	 *   results       result controls, top to bottom: [{ title, subtitle, content }], each becomes a card
	 *   empty         the control shown on the results side before the first run (an empty state)
	 *   run           { text, press, enabled() }: the pinned Run bar used below tablet width
	 *   source        the source line control
	 *
	 * Returns { control, showResults(on), setRunning(on) }.
	 */
	function compose(r) {
		var paramTitle = new Title({ text: t("runAndRank.parameters"), level: "H2", titleStyle: "H5" }).addStyleClass("accBandTitle");
		var resultTitle = new Title({ text: t("runAndRank.results"), level: "H2", titleStyle: "H5" }).addStyleClass("accBandTitle");
		var paramCard = Layout.card({ title: null, content: new VBox({ renderType: "Bare", items: [r.parameters] }).addStyleClass("sapUiSmallMargin") });
		var paramCol = new VBox({ renderType: "Bare", items: [paramTitle, paramCard] });
		var cards = (r.results || []).map(function (x) {
			return Layout.card({ title: x.title, subtitle: x.subtitle, content: x.content }).addStyleClass("sapUiSmallMarginBottom");
		});
		var resultBox = new VBox({ renderType: "Bare", items: cards, visible: false });
		var emptyBox = new VBox({ renderType: "Bare", items: r.empty ? [r.empty] : [] });
		var resultCol = new VBox({ renderType: "Bare", items: [resultTitle, emptyBox, resultBox],
			layoutData: new FlexItemData({ growFactor: 1, minWidth: "0" }) });
		var body = new FlexBox({ renderType: "Bare", items: [paramCol, resultCol] });

		var runButton = new Button({ text: (r.run && r.run.text) || t("runAndRank.run"), type: "Emphasized", icon: "sap-icon://media-play", width: "100%" });
		if (r.run && r.run.press) { runButton.attachPress(function () { r.run.press(); }); }
		var runBar = new VBox({ renderType: "Bare", visible: false, items: [runButton] });

		var narrow = null;
		/*
		 * Stacked below tablet width, and also whenever the page itself is too narrow for both columns
		 * (a tablet-width window with the side navigation open).
		 */
		function adapt() {
			var el = control && control.getDomRef();
			var rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
			var now = Layout.narrower("tablet") || (!!el && el.clientWidth > 0 && el.clientWidth < 56 * rem);
			if (now === narrow) { return; }
			narrow = now;
			body.setDirection(now ? "Column" : "Row");
			body.setAlignItems(now ? "Stretch" : "Start");
			paramCol.setWidth(now ? "100%" : "22rem");
			paramCol.setLayoutData(new FlexItemData({ shrinkFactor: 0 }));
			paramCol.toggleStyleClass("sapUiMediumMarginEnd", !now);
			paramCol.toggleStyleClass("sapUiMediumMarginBottom", now);
			// Stacked, the columns read as two steps.
			paramTitle.setText(now ? t("runAndRank.stepParameters") : t("runAndRank.parameters"));
			resultTitle.setText(now ? t("runAndRank.stepResults") : t("runAndRank.results"));
			runBar.setVisible(now && !!r.run);
			stick(paramCol, now ? null : "top");
		}
		paramCol.addEventDelegate({ onAfterRendering: function () { stick(paramCol, narrow ? null : "top"); } });
		runBar.addEventDelegate({ onAfterRendering: function () { stick(runBar, "bottom"); } });
		var control = null;
		adapt();
		Device.resize.attachHandler(adapt);

		var items = [new Title({ text: r.title, level: "H1", titleStyle: "H3", wrapping: true })];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		items.push(body);
		if (r.source) { items.push(r.source); }
		items.push(runBar);
		control = new VBox({ renderType: "Bare", items: items });
		control.addEventDelegate({ onAfterRendering: function () { setTimeout(adapt, 0); } });
		var destroy = control.destroy;
		control.destroy = function () { Device.resize.detachHandler(adapt); return destroy.apply(this, arguments); };

		return {
			control: control,
			showResults: function (on) { resultBox.setVisible(!!on); emptyBox.setVisible(!on); },
			setRunning: function (on) {
				runButton.setEnabled(!on);
				runButton.setText(on ? t("runAndRank.running") : (r.run && r.run.text) || t("runAndRank.run"));
			}
		};
	}

	return {
		info: {
			controls: ["sap.m.FlexBox", "sap.f.Card", "sap.m.Button (pinned Run bar)", "parameter-panel", "run-stats", "ranked-options",
				"options-scatter", "empty-state"],
			motion: "Nothing moves before a run. When a run finishes, the counts count up, ranked rows enter in rank order and points move to their places.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var money = function (v) { return Format.money(v * 1000, "USD", true); };
			var runSeed = 7;
			var FEATURE = [{ key: "any", text: t("runAndRank.demo.featureAny") }, { key: "yes", text: t("runAndRank.demo.featureYes") }, { key: "no", text: t("runAndRank.demo.featureNo") }];
			var defs = [
				{ key: "n", label: t("runAndRank.demo.nLabel"), type: "number", required: true, min: 6, max: 60, value: 24, unit: t("runAndRank.demo.nUnit"),
					help: t("runAndRank.demo.nHelp") },
				{ key: "budget", label: t("runAndRank.demo.budgetLabel"), type: "number", required: true, min: 100, max: 600, value: 300, unit: t("runAndRank.demo.budgetUnit"),
					help: t("runAndRank.demo.budgetHelp") },
				{ key: "feature", label: t("runAndRank.demo.featureLabel"), type: "choice", required: false, value: "any", options: FEATURE,
					help: t("runAndRank.demo.featureHelp") }
			];

			/*
			 * One run, from the seeded demo optimiser (elements/optimisation/sampleOptions): it tries n
			 * options; the ranking keeps those within the budget cap and matching the feature choice, best
			 * return first. Every option tried counts as evaluated; "met target" counts the kept ones at or
			 * above the target.
			 */
			function result(values, seed) {
				var r = sampleOptions.run(Data, seed, values.n);
				var kept = r.options.filter(function (op) {
					return op.cost <= values.budget && (!values.feature || values.feature === "any" || (values.feature === "yes") === op.settings.feature);
				}).map(function (op, i) { return Object.assign({}, op, { rank: i + 1 }); });
				return { start: r.start, target: r.target, tried: r.options.length, options: kept };
			}

			var stats = RunStats.create({ targetLabel: t("runAndRank.demo.targetReturn"), format: money });
			var scatter = OptionsScatter.create({ label: t("runAndRank.demo.costAgainstReturn"), format: money, height: "18rem",
				onSelect: function (op) { ranked.selectOption(op.id); } });
			var ranked = RankedOptions.create({ format: money, limit: 8, assistant: ctx && ctx.assistant,
				settingsText: function (st) {
					return t("runAndRank.demo.settings", Format.delta(st.price, "number", 1), st.display,
						st.feature ? t("runAndRank.demo.feature") : t("runAndRank.demo.noFeature"), st.promotion);
				},
				onSelect: function (op) { scatter.selectOption(op.id); } });
			var empty = EmptyState.create({ data: { illustration: "sapIllus-NoEntries",
				title: t("runAndRank.demo.emptyTitle"),
				description: t("runAndRank.demo.emptyDescription") } });

			function valid(values) {
				return defs.every(function (d) {
					var v = values[d.key];
					if (d.type !== "number") { return true; }
					if (v === null || v === undefined) { return !d.required; }
					return !isNaN(v) && v >= d.min && v <= d.max;
				});
			}

			function doRun(values) {
				runSeed += 1;
				var seed = runSeed;
				return new Promise(function (resolve) {
					setTimeout(function () {
						var res = result(values, seed);
						stats.update({ evaluated: res.tried, met: res.options.filter(function (op) { return op.ret >= res.target; }).length, target: res.target });
						ranked.update({ target: res.target, options: res.options });
						scatter.update({ start: res.start, target: res.target, options: res.options });
						page.showResults(true);
						resolve();
					}, 900);
				});
			}

			var panel = ParameterPanel.create({ title: t("runAndRank.demo.settingsTitle"), data: { parameters: defs }, onRun: doRun });

			var page = compose({
				title: t("runAndRank.demo.title"),
				lead: t("runAndRank.demo.lead"),
				parameters: panel.root,
				empty: empty.root,
				results: [
					{ title: t("runAndRank.run"), subtitle: t("runAndRank.demo.runSubtitle"), content: stats.root },
					{ title: t("runAndRank.demo.costAgainstReturn"), subtitle: t("runAndRank.demo.scatterSubtitle"), content: scatter.root },
					{ title: t("runAndRank.demo.rankedTitle"), subtitle: t("runAndRank.demo.rankedSubtitle"), content: ranked.root }
				],
				// The pinned Run bar runs exactly what the panel's own Run button runs.
				run: { text: t("runAndRank.run"), press: function () {
					var values = panel.values();
					if (!valid(values)) {
						sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
							MessageToast.show(t("runAndRank.demo.fixFirst"));
						});
						return;
					}
					panel.setRunning(true);
					page.setRunning(true);
					doRun(values).then(function () { panel.setRunning(false); page.setRunning(false); });
				} },
				source: SourceLine.create({ data: Data.sampleMeta({ model: t("runAndRank.demo.model") }) }).root
			});
			return {
				control: page.control,
				next: function () { return function () { doRun(panel.values()); }; }
			};
		}
	};
});
