/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Sample report data for the reporting demos: one row per category and region for the fictional
 * retailer in core/Data. Every figure is derived from Data.sample(seed) by the documented steps in
 * rows() below, so the demos never carry typed figures. Names shown on screen come from the group's
 * translation file.
 */
sap.ui.define([
	"accents/core/Data",
	"accents/core/I18n"
], function (Data, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");
	var REGIONS = ["north", "south", "east", "west"];

	/**
	 * One row per category and region. For each category, each region takes a seeded share of the
	 * category's year-to-date actual, plan and prior-year figures (in thousands, so times 1,000 gives
	 * dollars); sales also vary by a seeded factor between 0.94 and 1.06 so regions differ. Units are sales divided by a seeded unit price between 3 and 12 dollars. Attainment is
	 * sales divided by plan. The last order date is a seeded day between 1 June and 31 August 2026.
	 */
	function rows(seed) {
		var s = Data.sample(seed);
		var random = Data.rng((seed || 7) * 31 + 3);
		var out = [];
		s.items.forEach(function (item) {
			var price = 3 + random() * 9;
			REGIONS.forEach(function (region) {
				var share = (0.5 + random()) / REGIONS.length;
				var sales = Data.round(item.actual * 1000 * share * (0.94 + random() * 0.12), 0);
				var plan = Data.round(item.plan * 1000 * share, 0);
				var prior = Data.round(item.prior * 1000 * share, 0);
				var day = Math.floor(random() * 92);
				out.push({
					id: item.id + "-" + region.toUpperCase().slice(0, 1),
					item: t("sample.item." + item.id),
					group: t("sample.group." + item.group.toLowerCase()),
					region: t("sample.region." + region),
					sales: sales,
					plan: plan,
					prior: prior,
					units: Math.round(sales / price),
					attainment: plan ? sales / plan : null,
					lastOrder: new Date(Date.UTC(2026, 5, 1 + day))
				});
			});
		});
		return out;
	}

	/** The column definitions ReportTable, ExportMenu and PrintView share for this data. */
	function columns() {
		return [
			{ key: "item", label: t("sample.col.item"), type: "text" },
			{ key: "group", label: t("sample.col.group"), type: "text" },
			{ key: "region", label: t("sample.col.region"), type: "text" },
			{ key: "sales", label: t("sample.col.sales"), type: "money", currency: "USD", total: "sum" },
			{ key: "plan", label: t("sample.col.plan"), type: "money", currency: "USD", total: "sum" },
			{ key: "attainment", label: t("sample.col.attainment"), type: "percent", total: { ratio: ["sales", "plan"] } },
			{ key: "units", label: t("sample.col.units"), type: "number", total: "sum" },
			{ key: "lastOrder", label: t("sample.col.lastOrder"), type: "date" }
		];
	}

	/** The distinct values of one key, sorted, as select items. */
	function members(list, key) {
		var seen = {};
		list.forEach(function (r) { seen[r[key]] = true; });
		return Object.keys(seen).sort().map(function (v) { return { key: v, text: v }; });
	}

	return { rows: rows, columns: columns, members: members, REGIONS: REGIONS };
});
