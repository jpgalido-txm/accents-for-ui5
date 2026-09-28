/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Exception triage: work through rule-based exceptions one at a time. Three flexible columns: the
 * exception types with their counts and rules, then the items of the chosen type, then the chosen
 * item with its evidence, the one-sentence reason and a link to where it is fixed. On narrower widths
 * the flexible column layout shows two columns, then one, and each column that hides the one before
 * it gets a back button.
 *
 * Use it when a rule engine produces exceptions a person works through one by one. The pattern
 * arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/f/FlexibleColumnLayout",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/List",
	"sap/m/DisplayListItem",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"sap/m/MessageToast",
	"accents/core/Format",
	"accents/elements/monitoring/ExceptionTypes",
	"accents/elements/monitoring/ExceptionItems",
	"accents/elements/monitoring/NextStepCallout",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (FlexibleColumnLayout, Page, VBox, HBox, Title, Text, List, DisplayListItem, ObjectStatus, FlexItemData, MessageToast,
	Format, ExceptionTypes, ExceptionItems, NextStepCallout, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ExceptionTriage");

	/** Which flexible-column layout shows each level. */
	var LAYOUT = { types: "OneColumn", items: "TwoColumnsMidExpanded", detail: "ThreeColumnsMidExpanded" };

	/**
	 * regions:
	 *   types        control: the exception types (first column)
	 *   typesTitle   short noun for the first column ("Types (4)")
	 *   items        control: the items of the chosen type (second column)
	 *   itemsTitle   short noun for the second column
	 *   detail       control: the chosen item (third column)
	 *   detailTitle  short noun for the third column
	 *   source       the source line control, shown under the columns
	 *   height       CSS height of the column area (default "40rem")
	 *
	 * Returns the page control. It carries three functions for the caller that drives it:
	 *   control.show(level)          "types" | "items" | "detail"
	 *   control.setTitles({ types, items, detail })
	 *   control.level()              the level on show
	 */
	function compose(r) {
		var level = "types";
		var pages = {};
		function page(key, title, content, back) {
			var settings = { title: title || "", showNavButton: false, content: [content], backgroundDesign: "List" };
			if (back) { settings.navButtonPress = back; settings.navButtonTooltip = t("exceptionTriage.back"); }
			pages[key] = new Page(settings);
			return pages[key];
		}
		var fcl = new FlexibleColumnLayout({
			layout: LAYOUT.types,
			backgroundDesign: "Translucent",
			beginColumnPages: [page("types", r.typesTitle, r.types)],
			midColumnPages: [page("items", r.itemsTitle, r.items, function () { show("types"); })],
			endColumnPages: [page("detail", r.detailTitle, r.detail, function () { show("items"); })]
		});

		/** A column gets a back button when the column before it is hidden at this width. */
		function backs() {
			var max = fcl.getMaxColumnsCount();
			pages.items.setShowNavButton(level !== "types" && max < 2);
			pages.detail.setShowNavButton(level === "detail" && max < 3);
		}
		function show(to) {
			level = LAYOUT[to] ? to : "types";
			fcl.setLayout(LAYOUT[level]);
			backs();
		}
		fcl.attachStateChange(backs);
		fcl.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));

		var frame = new VBox({ renderType: "Bare", height: r.height || "40rem", items: [fcl] });
		var control = new VBox({ renderType: "Bare", items: [frame].concat(r.source ? [r.source] : []) });
		control.show = show;
		control.level = function () { return level; };
		control.setTitles = function (titles) {
			Object.keys(titles || {}).forEach(function (k) { if (pages[k]) { pages[k].setTitle(titles[k]); } });
		};
		return control;
	}

	return {
		info: {
			controls: ["sap.f.FlexibleColumnLayout", "sap.m.Page", "sap.m.List", "sap.m.Table"],
			motion: "Columns slide in and out as a person moves between types, items and one item. Counts pulse and figures flash only when data changes.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var k = function (v) { return t("exceptionTriage.thousands", Format.number(v, 1)); };
			var pct = function (v) { return t("exceptionTriage.percent", Format.number(v, 1)); };

			/**
			 * Every rule is written out and counted over the sample items; each item carries the figure
			 * that broke the rule and the limit it broke. Nothing here is typed in.
			 */
			var RULES = [
				{ id: "margin", name: t("exceptionTriage.rule.margin.name"), severity: "error", unit: "%", measure: t("exceptionTriage.measure.margin"),
					rule: t("exceptionTriage.rule.margin.rule"), clear: t("exceptionTriage.rule.margin.clear"),
					fix: { text: t("exceptionTriage.fix.planning"), target: "planning-desk" },
					test: function (i) { return i.margin < 0.05; },
					figure: function (i) { return i.margin * 100; }, limit: function () { return 5; } },
				{ id: "target", name: t("exceptionTriage.rule.target.name"), severity: "warning", unit: "k", measure: t("exceptionTriage.measure.sales"),
					rule: t("exceptionTriage.rule.target.rule"), clear: t("exceptionTriage.rule.target.clear"),
					fix: { text: t("exceptionTriage.fix.planning"), target: "planning-desk" },
					test: function (i) { return i.actual < i.target; },
					figure: function (i) { return i.actual; }, limit: function (i) { return i.target; } },
				{ id: "plan", name: t("exceptionTriage.rule.plan.name"), severity: "warning", unit: "k", measure: t("exceptionTriage.measure.sales"),
					rule: t("exceptionTriage.rule.plan.rule"), clear: t("exceptionTriage.rule.plan.clear"),
					fix: { text: t("exceptionTriage.fix.planning"), target: "planning-desk" },
					test: function (i) { return i.actual < i.plan * 0.98; },
					figure: function (i) { return i.actual; }, limit: function (i) { return i.plan * 0.98; } },
				{ id: "extrapolating", name: t("exceptionTriage.rule.extrapolating.name"), severity: "information", unit: "k", measure: t("exceptionTriage.measure.forecastMonth"),
					rule: t("exceptionTriage.rule.extrapolating.rule"),
					clear: t("exceptionTriage.rule.extrapolating.clear"),
					fix: { text: t("exceptionTriage.fix.forecast"), target: "forecast-error-heatmap" },
					test: function (i) { return peakForecast(i) > peakActual(i) * 1.12; },
					figure: peakForecast, limit: function (i) { return peakActual(i) * 1.12; } }
			];
			function peakActual(i) { return Math.max.apply(null, i.months.map(function (m) { return m.actual || 0; })); }
			function peakForecast(i) { return Math.max.apply(null, i.months.map(function (m) { return m.forecast || 0; })); }

			var sample = null;
			var typeId = null, itemId = null;

			function rule(id) { return RULES.find(function (x) { return x.id === id; }); }
			function typesData() {
				return RULES.map(function (x) {
					return { id: x.id, name: x.name, severity: x.severity, rule: x.rule, clear: x.clear, count: sample.items.filter(x.test).length };
				});
			}
			function itemsData(x) {
				return { type: x.name, severity: x.severity, rule: x.rule, items: sample.items.filter(x.test).map(function (i) {
					return { id: i.id, object: i.name, level: t("exceptionTriage.level", i.group), figure: x.figure(i), limit: x.limit(i), measure: x.measure };
				}) };
			}
			function fmt(x) { return x && x.unit === "%" ? pct : k; }

			/* ---------- third column: one item ---------- */
			var heading = new Title({ text: "", level: "H2", titleStyle: "H4", wrapping: true });
			var severity = new ObjectStatus().addStyleClass("sapUiSmallMarginBottom");
			var aiSlot = new HBox({ renderType: "Bare" });
			heading.setLayoutData(new FlexItemData({ growFactor: 1, shrinkFactor: 1, minWidth: "0" }));
			var head = new HBox({ renderType: "Bare", alignItems: "Center", items: [heading, aiSlot] });
			var evidenceTitle = new Title({ text: t("exceptionTriage.evidence"), level: "H3", titleStyle: "H6" }).addStyleClass("sapUiSmallMarginTop");
			var evidence = new List({ showSeparators: "Inner", inset: false });
			var callout = NextStepCallout.create({ onLink: function (target) { ctx.go(target); } });
			var empty = new Text({ text: t("exceptionTriage.empty") });
			var detail = new VBox({ renderType: "Bare", items: [empty, head, severity, callout.root, evidenceTitle, evidence] })
				.addStyleClass("sapUiSmallMargin");

			function showDetail() {
				var x = rule(typeId);
				var i = x && sample.items.find(function (s) { return s.id === itemId && x.test(s); });
				[head, severity, callout.root, evidenceTitle, evidence].forEach(function (c) { c.setVisible(!!i); });
				empty.setVisible(!i);
				aiSlot.destroyItems();
				evidence.destroyItems();
				if (!i) { return; }
				var f = fmt(x), figure = x.figure(i), limit = x.limit(i), gap = figure - limit;
				heading.setText(i.name);
				severity.setText(x.name);
				severity.setState({ error: "Error", warning: "Warning", information: "Information" }[x.severity]);
				severity.setIcon({ error: "sap-icon://error", warning: "sap-icon://alert", information: "sap-icon://information" }[x.severity]);
				var facts = {};
				facts[t("exceptionTriage.ai.object")] = t("exceptionTriage.nameAndId", i.name, i.id);
				facts[t("exceptionTriage.ai.rule")] = x.rule;
				facts[t("exceptionTriage.ai.breaking")] = t("exceptionTriage.ai.breakingValue", x.measure, f(figure));
				facts[t("exceptionTriage.limit")] = f(limit);
				aiSlot.addItem(ctx.assistant.objectButton({ title: t("exceptionTriage.nameAndId", i.name, x.name), facts: facts,
					question: t("exceptionTriage.ai.question", i.name) }));
				var rows = [
					[x.measure, f(figure)],
					[t("exceptionTriage.limit"), f(limit)],
					[t("exceptionTriage.gap"), (gap > 0 ? "+" : gap < 0 ? Format.MINUS : "") + f(Math.abs(gap))]
				];
				// Context figures, left out when they repeat the breaking figure or the limit.
				[[t("exceptionTriage.salesToDate"), k(i.actual)], [t("exceptionTriage.planToDate"), k(i.plan)], [t("exceptionTriage.targetToDate"), k(i.target)],
					[t("exceptionTriage.measure.margin"), Format.percent(i.margin)]]
					.forEach(function (row) { if (row[1] !== rows[0][1] && row[1] !== rows[1][1]) { rows.push(row); } });
				rows.forEach(function (row) { evidence.addItem(new DisplayListItem({ label: row[0], value: row[1] })); });
				var above = gap > 0;
				callout.update({
					show: true,
					tone: x.severity === "error" ? "bad" : x.severity === "warning" ? "critical" : "info",
					heading: t("exceptionTriage.reason"),
					text: t(above ? "exceptionTriage.reason.above" : "exceptionTriage.reason.below", i.name, x.measure.toLowerCase(), f(figure),
						f(Math.abs(gap)), f(limit)),
					link: x.fix
				});
			}

			/* ---------- first and second columns ---------- */
			var control;
			var itemFormat = function (v) { return fmt(rule(typeId))(v); };
			var items = ExceptionItems.create({
				title: t("exceptionTriage.items"),
				format: itemFormat,
				assistant: ctx.assistant,
				onHandOff: function (picked) {
					// The demo has no backend, so it says what would be sent instead of sending it.
					MessageToast.show(t(picked.length === 1 ? "exceptionTriage.handOff.one" : "exceptionTriage.handOff.other", picked.length));
				}
			});
			// ExceptionItems has no row press, so the pattern makes its rows open the item.
			// Reported as an element gap: an onOpen option would make this unnecessary.
			var table = items.content;
			function navigable() {
				table.getItems().forEach(function (row) {
					row.setType("Navigation");
					var it = row.data("item");
					row.setNavigated(!!it && it.id === itemId);
				});
			}
			table.attachItemPress(function (e) {
				var it = e.getParameter("listItem").data("item");
				itemId = it.id;
				navigable();
				showDetail();
				control.show("detail");
			});
			var types = ExceptionTypes.create({ onSelect: function (picked) {
				typeId = picked.id;
				itemId = null;
				showItems();
				showDetail();
				control.show("items");
			} });

			function showItems() {
				var x = rule(typeId);
				if (!x) { return; }
				items.update(itemsData(x));
				navigable();
				// Mark the chosen type, so the first column says which type the second column lists.
				types.content.getItems().forEach(function (row, n) { row.setNavigated(RULES[n] && RULES[n].id === typeId); });
				control.setTitles({ items: x.name });
			}

			function load(seed) {
				sample = Data.sample(seed);
				var list = typesData();
				types.update(list);
				control.setTitles({ types: t("exceptionTriage.typesCount", list.length) });
				// Keep the chosen type and item when they still break the rule; otherwise fall back.
				if (!typeId) {
					var first = list.find(function (x) { return x.count > 0; });
					typeId = first ? first.id : list[0].id;
				}
				showItems();
				var x = rule(typeId);
				var still = sample.items.some(function (s) { return s.id === itemId && x.test(s); });
				if (!still) { var firstItem = sample.items.find(x.test); itemId = firstItem ? firstItem.id : null; }
				navigable();
				showDetail();
			}

			control = compose({
				types: types.root, typesTitle: t("exceptionTriage.types"),
				items: items.root, itemsTitle: t("exceptionTriage.items"),
				detail: detail, detailTitle: t("exceptionTriage.item"),
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			load(7);
			control.show(itemId ? "detail" : "items");
			return {
				control: control,
				next: function (seed) { return function () { load(seed); }; }
			};
		}
	};
});
