/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * History and uplift: history and forecast on one time axis. Actuals are a solid line; the baseline
 * forecast is the same colour, dashed; the extra volume expected from events (promotions, launches) is
 * its own series of columns, so a person can see how much of the forecast rests on events.
 */
sap.ui.define([
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/I18n"
], function (Part, Chart, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.forecasting.i18n.i18n");

	function has(v) { return v !== null && v !== undefined; }
	/** Legend keys drawn as the line itself: solid for what happened, dashed for what is expected. */
	var SOLID = "path://M0,4H24V6H0Z";
	var DASHED = "path://M0,4H6V6H0Z M9,4H15V6H9Z M18,4H24V6H18Z";

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)"],
			motion: "Lines and uplift columns move to their new values when the data changes.",
			still: false
		},

		/**
		 * options:
		 *   label        the question the chart answers ("Volume: history and forecast")
		 *   format       function (value) -> text; default Format.short
		 *   height       chart height (default "18rem")
		 *   data         { today: "2026-08", periods: [{ period, actual, forecast, uplift }] }
		 *                actual is ignored for periods after today; uplift is the event volume on top
		 *                of the baseline forecast.
		 */
		create: function (o) {
			var fmt = o.format || Format.short;
			var chart = new Chart({ label: o.label || t("historyUpliftLine.label"), height: o.height || "18rem" });
			chart.setBuilder(function (d, k) {
				var rows = d.periods;
				var colour = k.series(0);
				var ACTUAL = t("historyUpliftLine.actual"), FORECAST = t("historyUpliftLine.forecast"), UPLIFT = t("historyUpliftLine.uplift");
				var actual = rows.map(function (r) { return r.period <= d.today && has(r.actual) ? r.actual : null; });
				// The dashed forecast starts at the last actual, so the two lines meet instead of leaving a gap.
				var lastActual = actual.reduce(function (m, v, i) { return v !== null ? i : m; }, -1);
				var forecast = rows.map(function (r, i) {
					if (i === lastActual && !has(r.forecast)) { return actual[i]; }
					return has(r.forecast) ? r.forecast : null;
				});
				var uplift = rows.map(function (r) { return has(r.uplift) && r.uplift !== 0 ? r.uplift : null; });
				var todayIndex = rows.map(function (r) { return r.period; }).indexOf(d.today);
				return k.base({
					grid: { left: 8, right: 16, top: 24, bottom: 32, containLabel: true },
					legend: Object.assign(k.legend(true), { data: [{ name: ACTUAL, icon: SOLID }, { name: FORECAST, icon: DASHED }, UPLIFT], itemWidth: 24 }),
					tooltip: Object.assign(k.base().tooltip, { formatter: function (ps) {
						var i = ps[0].dataIndex, r = rows[i];
						var lines = [Format.period(r.period)];
						if (actual[i] !== null) { lines.push(t("historyUpliftLine.tip.value", ACTUAL, fmt(actual[i]))); }
						if (has(r.forecast)) { lines.push(t("historyUpliftLine.tip.value", FORECAST, fmt(r.forecast))); }
						if (uplift[i] !== null) { lines.push(t("historyUpliftLine.tip.value", UPLIFT, Format.delta(uplift[i], "short"))); }
						return lines.join("<br/>");
					} }),
					xAxis: k.axis("category", { data: rows.map(function (r) { return Format.period(r.period, true); }), boundaryGap: true }),
					yAxis: k.axis("value", { axisLabel: { color: k.label, formatter: function (v) { return fmt(v); } } }),
					series: [
						{ name: ACTUAL, type: "line", data: actual, symbol: "circle", symbolSize: 5, lineStyle: { width: 2, color: colour },
							itemStyle: { color: colour }, z: 3,
							markLine: todayIndex < 0 ? undefined : { silent: true, symbol: "none", lineStyle: { color: k.label, type: "solid", width: 1 },
								label: { formatter: t("historyUpliftLine.today"), color: k.label, position: "insideEndTop" }, data: [{ xAxis: todayIndex }] } },
						{ name: FORECAST, type: "line", data: forecast, symbol: "emptyCircle", symbolSize: 5,
							lineStyle: { width: 2, type: "dashed", color: colour }, itemStyle: { color: colour }, z: 3 },
						{ name: UPLIFT, type: "bar", data: uplift, barMaxWidth: 16,
							itemStyle: { color: k.series(1), borderRadius: [3, 3, 0, 0] },
							label: Object.assign(k.labels(uplift.filter(function (v) { return v !== null; }).length, function (p) { return Format.delta(p.value, "short"); }),
								{ position: "top" }) }
					]
				});
			});

			var part = Part.make({
				key: "history-uplift-line",
				content: chart,
				empty: t("historyUpliftLine.empty"),
				render: function (d) {
					if (!d.periods || !d.periods.length) { part.state("empty"); return; }
					chart.setData(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function build(seed) {
				var s = Data.sample(seed);
				var r = Data.rng(seed * 7);
				var events = { "2026-10": 0.12 + r() * 0.08, "2026-12": 0.18 + r() * 0.1, "2026-05": 0.1 + r() * 0.06 };
				return { today: s.today, periods: s.periods.map(function (p, i) {
					var actual = 0, forecast = 0, past = p <= s.today;
					s.items.forEach(function (it) { actual += it.months[i].actual || 0; forecast += it.months[i].forecast || 0; });
					var base = past ? actual : forecast;
					return { period: p, actual: past ? Math.round(actual * 100) : null, forecast: past ? null : Math.round(forecast * 100),
						uplift: events[p] ? Math.round(base * 100 * events[p]) : null };
				}) };
			}
			return {
				options: { label: t("historyUpliftLine.demo.label"), format: Format.short, data: build(7) },
				next: function (seed) { return build(seed); }
			};
		}
	};
});
