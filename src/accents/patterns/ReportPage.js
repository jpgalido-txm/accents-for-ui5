/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Report page: a finished report to read, share and print. The filter bar with saved views on top,
 * then the results as a chart or a table (one at a time, the choice remembered), export and print
 * beside the results heading, and the source line at the foot saying whether the data is live.
 *
 * Use it when people read results and hand them on. Do not use it to drill from a figure into its
 * rows; that is the analytical list. The pattern arranges regions only; it fetches nothing.
 *
 * The gallery example reads live data from the public TripPin OData V4 service (people and their
 * trips) through core/OData. With ?data=sample it uses fictional sample people instead, and the
 * source line says so.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/FlexItemData",
	"accents/core/OData",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/reporting/FilterBar",
	"accents/elements/reporting/ReportTable",
	"accents/elements/reporting/ChartTableSwitch",
	"accents/elements/reporting/ExportMenu",
	"accents/elements/reporting/PrintView",
	"accents/elements/reporting/Snapshot",
	"accents/elements/common/SourceLine"
], function (VBox, HBox, Title, FlexItemData, OData, Format, I18n, FilterBar, ReportTable, ChartTableSwitch, ExportMenu, PrintView,
	Snapshot, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ReportPage");
	var TRIPPIN = "https://services.odata.org/TripPinRESTierService/(S(accents))/";

	/**
	 * regions:
	 *   filterBar  the filter bar control (with its saved views)
	 *   title      the results heading, a short noun phrase
	 *   results    the results control: a chart-and-table switch or a report table
	 *   actions    controls beside the heading: export and print
	 *   source     the source line control
	 * Returns { control, setTitle(text) }.
	 */
	function compose(r) {
		var heading = new Title({ text: r.title || "", level: "H2", titleStyle: "H4", wrapping: true });
		heading.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "12rem" }));
		var head = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", justifyContent: "SpaceBetween", width: "100%",
			items: [heading, new HBox({ renderType: "Bare", alignItems: "Center", items: r.actions || [] })] }).addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom");
		var items = [];
		if (r.filterBar) { items.push(r.filterBar); }
		items.push(head);
		if (r.results) { items.push(r.results); }
		if (r.source) { items.push(r.source.addStyleClass("sapUiSmallMarginTop")); }
		return { control: new VBox({ renderType: "Bare", width: "100%", items: items }), setTitle: function (text) { heading.setText(text); } };
	}

	return {
		info: {
			controls: ["sap.m.Title", "accents reporting elements (FilterBar, ChartTableSwitch, ReportTable, ExportMenu, PrintView)", "accents.core.OData (OData V4)"],
			motion: "Bars grow to new lengths and changed totals flash once when the filters change the results; nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data) {
			var columns = [
				{ key: "person", label: t("col.person"), type: "text" },
				{ key: "gender", label: t("col.gender"), type: "text" },
				{ key: "city", label: t("col.city"), type: "text" },
				{ key: "country", label: t("col.country"), type: "text" },
				{ key: "trips", label: t("col.trips"), type: "number", total: "sum" },
				{ key: "budget", label: t("col.budget"), type: "number", digits: 2, total: "sum" },
				{ key: "perTrip", label: t("col.perTrip"), type: "number", digits: 2, total: { ratio: ["budget", "trips"] } },
				{ key: "firstTrip", label: t("col.firstTrip"), type: "date" }
			];

			/** One TripPin person as a report row: home city from the first address, budget summed over trips. */
			function shape(p) {
				var city = p.AddressInfo && p.AddressInfo[0] && p.AddressInfo[0].City;
				var trips = p.Trips || [];
				var budget = trips.reduce(function (a, x) { return a + (x.Budget || 0); }, 0);
				var starts = trips.map(function (x) { return x.StartsAt; }).filter(Boolean).sort();
				return {
					id: p.UserName,
					person: [p.FirstName, p.LastName].filter(Boolean).join(" "),
					gender: p.Gender || null,
					city: city ? city.Name : null,
					country: city ? city.CountryRegion : null,
					trips: trips.length,
					budget: trips.length ? Math.round(budget * 100) / 100 : null,
					perTrip: trips.length ? Math.round(budget * 100) / 100 / trips.length : null,
					firstTrip: starts.length ? new Date(starts[0]) : null
				};
			}

			/**
			 * Sample people in the same shape, used only with ?data=sample. Names come from the translation
			 * file; trips, budgets and dates are drawn from a seeded generator.
			 */
			function sample() {
				var random = Data.rng(11);
				var cities = [1, 2, 3, 4, 5].map(function (n) { return [t("sample.city." + n), t("sample.country")]; });
				var out = [];
				for (var i = 1; i <= 16; i++) {
					var c = cities[Math.floor(random() * cities.length)];
					var n = Math.floor(random() * 4);
					var budget = 0, first = null;
					for (var k = 0; k < n; k++) {
						budget += Math.round((500 + random() * 4500) * 100) / 100;
						var d = new Date(Date.UTC(2013 + Math.floor(random() * 2), Math.floor(random() * 12), 1));
						if (!first || d < first) { first = d; }
					}
					out.push({ id: "p" + i, person: t("sample.person." + i), gender: i % 2 ? "Female" : "Male", city: c[0], country: c[1], trips: n,
						budget: n ? Math.round(budget * 100) / 100 : null, perTrip: n ? Math.round(budget * 100) / 100 / n : null, firstTrip: first });
				}
				return out;
			}

			var source = OData.source({
				service: TRIPPIN,
				path: "/People",
				// TripPin rejects $select together with $expand here, so the whole person is read.
				expand: "Trips",
				top: 100,
				label: t("source.live"),
				shape: shape,
				sample: sample,
				sampleMeta: { source: t("source.sample") }
			});

			var all = [];
			var meta = null;
			var filterBar = null;
			var sourceLine = SourceLine.create({});
			sourceLine.root.setVisible(false);   // shown once there is something to say about the data

			var table = ReportTable.create({ label: t("table.label"), columns: columns, groupBy: "city", sort: { key: "budget", descending: true }, rows: 14 });
			var results = ChartTableSwitch.create({ reportId: "report-page-trippin", label: t("chart.label"), category: t("col.city"), measure: t("col.budget"),
				format: function (v) { return Format.number(v, 0); }, table: table.root, view: "chart" });
			function snapshot() { return Snapshot.of({ title: t("report.title"), table: table, filterBar: filterBar, source: meta }); }
			var exportMenu = ExportMenu.create({ name: t("export.name"), from: snapshot });
			var printView = PrintView.create({ from: snapshot });
			var holder = new VBox({ renderType: "Bare", width: "100%" });
			var page = compose({ filterBar: holder, title: t("results.title"), results: results.root, actions: [exportMenu.root, printView.root], source: sourceLine.root });

			/** Budget by home city, the chart's question. People with no city are counted under a dash. */
			function byCity(list) {
				var g = {};
				list.forEach(function (r) { var k = r.city || Format.DASH; g[k] = (g[k] || 0) + (r.budget || 0); });
				return Object.keys(g).sort().map(function (k) { return { name: k, value: g[k] }; });
			}
			function refresh() {
				var shown = filterBar ? filterBar.filter(all) : all;
				table.update(shown);
				if (shown.length) { results.update(byCity(shown)); } else { results.state("empty", t("results.empty")); }
				page.setTitle(t("results.count", shown.length));
				exportMenu.update({ enabled: shown.length > 0 });
				printView.update({ enabled: shown.length > 0 });
			}
			function members(key) {
				var seen = {};
				all.forEach(function (r) { if (r[key]) { seen[r[key]] = true; } });
				return Object.keys(seen).sort().map(function (k) { return { key: k, text: k }; });
			}

			results.state("loading");
			exportMenu.update({ enabled: false });
			printView.update({ enabled: false });
			var loaded = source.load().then(function (res) {
				all = res.data;
				meta = res.meta;
				filterBar = FilterBar.create({
					id: "report-page-trippin",
					fields: [
						{ key: "person", label: t("filter.person"), type: "search", placeholder: t("filter.personPlaceholder"), paths: ["person", "city"] },
						{ key: "gender", label: t("filter.gender"), type: "multi", items: members("gender") },
						{ key: "city", label: t("filter.city"), type: "multi", items: members("city") },
						{ key: "firstTrip", label: t("filter.firstTrip"), type: "date" }
					],
					views: [{ key: "female", name: t("view.female"), values: { gender: ["Female"] } },
						{ key: "travelled", name: t("view.early"), values: { firstTrip: { operator: "DATERANGE",
							values: [new Date(2013, 0, 1), new Date(2013, 11, 31)] } } }],
					onGo: refresh
				});
				holder.addItem(filterBar.root);
				sourceLine.update(meta);
				sourceLine.root.setVisible(true);
				refresh();
				return { rows: all.length, mode: meta.mode };
			}, function () {
				// The adapter has already put a plain sentence in the Messages list; the page says it in place too.
				results.state("error", t("results.failed"));
				return { rows: 0, mode: "failed" };
			});

			page.control.data("accParts", { loaded: loaded, table: table, results: results, filterBar: function () { return filterBar; },
				exportMenu: exportMenu, printView: printView, meta: function () { return meta; }, snapshot: snapshot });
			// No replay: the service returns the same people each time, so there is no second data set.
			return { control: page.control };
		}
	};
});
