/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Review board: one review meeting on one page. A filter panel on the left (a popover on narrow
 * screens), a band of up to four KPI tiles, then bands of single-chart cards, an optional call-out
 * pointing to where the fix happens, and the source line at the foot.
 *
 * Use it when several questions about one scope are reviewed together. Do not use it for changing
 * figures; that is the planning desk. The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/ResponsivePopover",
	"sap/m/FlexItemData",
	"accents/core/Layout",
	"accents/elements/planning/HeadlineFigure",
	"accents/elements/review/RankedBars",
	"accents/elements/common/SourceLine",
	"accents/core/Format",
	"accents/core/I18n"
], function (Device, VBox, HBox, Title, Text, Button, ResponsivePopover, FlexItemData, Layout, HeadlineFigure, RankedBars, SourceLine, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ReviewBoard");

	/**
	 * regions:
	 *   title, lead   page heading and one sentence
	 *   filters       one control holding every filter (one filter surface per screen)
	 *   kpis          up to four controls (usually headline figures)
	 *   bands         [{ title, cards: [Layout.card(...)] }]
	 *   callout       optional control (next-step call-out)
	 *   source        the source line control
	 */
	function compose(r) {
		if (r.kpis && r.kpis.length > 4) { throw new Error("A review board holds at most four KPI tiles. Move the rest into side indicators."); }
		var kpiCards = (r.kpis || []).map(function (k, i) {
			return Layout.card({ title: null, content: k, cols: 4, rows: 2 });
		});
		var main = new VBox({ renderType: "Bare", items: [].concat(
			kpiCards.length ? [Layout.band({ cards: kpiCards, rowSize: "3.5rem" })] : [],
			r.callout ? [r.callout] : [],
			(r.bands || []).map(Layout.band),
			r.source ? [r.source] : []
		) });
		main.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "0" }));

		var filterPanel = r.filters ? new VBox({ renderType: "Bare", width: "16rem", items: [
			new Title({ text: t("reviewBoard.filters"), level: "H2", titleStyle: "H5" }), r.filters
		] }).addStyleClass("sapUiMediumMarginEnd") : null;
		var filterBtn = null, pop = null;
		var body = new HBox({ renderType: "Bare", alignItems: "Start", items: filterPanel ? [filterPanel, main] : [main] });

		if (filterPanel) {
			filterBtn = new Button({ text: t("reviewBoard.filters"), icon: "sap-icon://filter", press: function (e) {
				if (!pop) { pop = new ResponsivePopover({ title: t("reviewBoard.filters"), placement: "Bottom", contentWidth: "18rem" }).addStyleClass("sapUiContentPadding"); }
				pop.removeAllContent();
				pop.addContent(r.filters);
				pop.openBy(e.getSource());
			} });
			var adapt = function () {
				var narrow = window.innerWidth < 1024;
				filterBtn.setVisible(narrow);
				if (narrow && filterPanel.getItems().length > 1) { filterPanel.removeItem(r.filters); }
				if (!narrow && filterPanel.getItems().length < 2) { if (pop) { pop.close(); pop.removeAllContent(); } filterPanel.addItem(r.filters); }
				filterPanel.setVisible(!narrow);
			};
			Device.resize.attachHandler(adapt);
			adapt();
		}

		var head = new HBox({ justifyContent: "SpaceBetween", alignItems: "Center", renderType: "Bare",
			items: [new Title({ text: r.title, level: "H1", titleStyle: "H3" })].concat(filterBtn ? [filterBtn] : []) });
		var items = [head];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		items.push(body);
		return new VBox({ renderType: "Bare", items: items });
	}

	return {
		info: {
			controls: ["sap.f.GridContainer", "sap.f.Card", "sap.m.ResponsivePopover", "sap.m.HBox"],
			motion: "Cards rise in once, the first time the page shows. Figures move only when data changes.",
			still: false
		},
		compose: compose,

		example: function (Data) {
			var s = Data.sample(7);
			var sum = function (key) { return s.items.reduce(function (a, i) { return a + i[key]; }, 0) * 1000; };
			var money = function (v) { return Format.money(v, "USD", true); };
			var kpis = [
				HeadlineFigure.create({ label: t("reviewBoard.demo.netRevenue"), format: "money", polarity: "up", baseLabel: t("reviewBoard.demo.plan"), data: { value: sum("actual"), base: sum("plan") } }),
				HeadlineFigure.create({ label: t("reviewBoard.demo.againstLastYear"), format: "money", polarity: "up", baseLabel: t("reviewBoard.demo.lastYear"), data: { value: sum("actual"), base: sum("prior") } }),
				HeadlineFigure.create({ label: t("reviewBoard.demo.behindPlan"), format: "number", polarity: "down", baseLabel: t("reviewBoard.demo.lastMonth"),
					data: { value: s.items.filter(function (i) { return i.actual < i.plan * 0.97; }).length, base: 2 } }),
				HeadlineFigure.create({ label: t("reviewBoard.demo.averageMargin"), format: "percent", polarity: "up", baseLabel: t("reviewBoard.demo.target"),
					data: { value: s.items.reduce(function (a, i) { return a + i.margin; }, 0) / s.items.length, base: 0.28 } })
			];
			var revenue = RankedBars.create({ label: t("reviewBoard.demo.revenueByCategory"), format: money,
				data: s.items.map(function (i) { return { name: i.name, value: i.actual * 1000, flag: i.actual < i.plan * 0.97 ? "bad" : null }; }) });
			var margin = RankedBars.create({ label: t("reviewBoard.demo.marginByCategory"), format: function (v) { return Format.percent(v); },
				data: s.items.map(function (i) { return { name: i.name, value: i.margin, flag: i.margin < 0.1 ? "bad" : null }; }) });
			var control = compose({
				title: t("reviewBoard.demo.title"),
				lead: t("reviewBoard.demo.lead"),
				kpis: kpis.map(function (p) { return p.root; }),
				bands: [{ title: t("reviewBoard.demo.categories"), cards: [
					Layout.card({ title: t("reviewBoard.demo.revenueByCategory"), subtitle: t("reviewBoard.demo.revenueSubtitle"), content: revenue.root, cols: 8, rows: 4 }),
					Layout.card({ title: t("reviewBoard.demo.marginByCategory"), subtitle: t("reviewBoard.demo.marginSubtitle"), content: margin.root, cols: 8, rows: 4 })
				] }],
				source: SourceLine.create({ data: s.meta }).root
			});
			return { control: control };
		}
	};
});
