/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Timeline: objects as bars on a time axis, grouped under their group's name, with exactly one
 * "Today" line. Built on the Accents chart (Apache ECharts) rather than a calendar control, so the
 * today line comes from the data and no second, clock-driven "now" marker can appear. Planned
 * objects are drawn in the same hue, hatched; late ones are coloured and say "Late" in words.
 * On a narrow screen the chart gives way to a dated list, with today stated once above it.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/GroupHeaderListItem",
	"sap/m/ObjectStatus",
	"sap/ui/core/ResizeHandler",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/I18n"
], function (VBox, List, StandardListItem, GroupHeaderListItem, ObjectStatus, ResizeHandler, Part, Chart, Format, Layout, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.collaboration.i18n.i18n");

	// Below the shared phone width the timeline becomes a dated list.
	var DAY = 86400000;
	var STATUS = {
		done: { text: t("timelineCalendar.status.done"), state: "Success" },
		active: { text: t("timelineCalendar.status.active"), state: "Information" },
		late: { text: t("timelineCalendar.status.late"), state: "Error" },
		planned: { text: t("timelineCalendar.status.planned"), state: "None" }
	};

	function ms(date) { return Date.parse(date + "T00:00:00Z"); }
	function day(v, withYear) {
		return new Date(v).toLocaleDateString(undefined, withYear ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }
			: { day: "numeric", month: "short", timeZone: "UTC" });
	}
	function span(o) { return t("timelineCalendar.span", day(ms(o.start), false), day(ms(o.end), true)); }

	/** Rows in display order: a heading row per group, then that group's objects by start date. */
	function arrange(objects) {
		var groups = [];
		objects.forEach(function (o) { if (groups.indexOf(o.group) < 0) { groups.push(o.group); } });
		var out = [];
		groups.forEach(function (g) {
			out.push({ heading: g });
			objects.filter(function (o) { return o.group === g; })
				.sort(function (a, b) { return ms(a.start) - ms(b.start); })
				.forEach(function (o) { out.push(o); });
		});
		return out;
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.List", "sap.m.ObjectStatus"],
			motion: "Bars slide and stretch to their new dates when the data changes; the today line and labels stay put.",
			still: false
		},

		/**
		 * options:
		 *   label  the question the timeline answers ("Promotions this year")
		 *   data   { today: "2026-08-01", objects: [{ id, name, group, start: "2026-03-02", end: "2026-05-30",
		 *            status: "done"|"active"|"late"|"planned" }] }
		 */
		create: function (o) {
			var chart = new Chart({ label: o.label || t("timelineCalendar.label"), height: "16rem" });
			var list = new List({ visible: false, showSeparators: "Inner" });
			var todayLine = new ObjectStatus({ icon: "sap-icon://calendar", visible: false }).addStyleClass("sapUiTinyMarginBottom");
			var box = new VBox({ renderType: "Bare", items: [chart, todayLine, list] });
			var narrow = null;

			chart.setBuilder(function (d, k) {
				var rows = arrange(d.objects);
				var bars = rows.filter(function (r) { return !r.heading; });
				var min = Math.min.apply(null, bars.map(function (r) { return ms(r.start); }).concat([ms(d.today)]));
				var max = Math.max.apply(null, bars.map(function (r) { return ms(r.end); }).concat([ms(d.today)]));
				// Whole months either side, with a tick and label at each month start.
				var first = new Date(min), last = new Date(max);
				min = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
				max = Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 1);
				var months = [];
				for (var m = new Date(min); m.getTime() <= max; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
					months.push(m.getTime() - min);
				}
				var step = Math.ceil(months.length / 8);
				var labelled = months.filter(function (v, i) { return i % step === 0; });
				var showWords = bars.length <= 12;
				var colour = function (r) { return r.status === "late" ? k.status("bad") : k.series(0); };
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						var r = rows[p.dataIndex];
						return r && !r.heading ? r.name + "<br>" + span(r) + "<br>" + (STATUS[r.status] || STATUS.planned).text : "";
					} },
					grid: { left: 8, right: showWords ? 88 : 16, top: 28, bottom: 24, containLabel: true },
					xAxis: k.axis("value", { min: 0, max: max - min, position: "top",
						axisTick: { show: true, customValues: months, lineStyle: { color: k.line } },
						splitLine: { show: true, lineStyle: { color: k.line } },
						axisLabel: { color: k.label, customValues: labelled, formatter: function (v) {
							var dt = new Date(v + min);
							return Format.period(dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0"), dt.getUTCMonth() !== 0);
						} } }),
					yAxis: k.axis("category", { inverse: true, axisLine: { show: false },
						data: rows.map(function (r) {
							return r.heading ? { value: r.heading, textStyle: { fontWeight: "bold", color: k.text } } : { value: r.name };
						}) }),
					series: [{
						// Offset from the axis start; invisible, it only positions each bar.
						type: "bar", stack: "t", silent: true, barMaxWidth: 16,
						itemStyle: { opacity: 0 }, emphasis: { disabled: true },
						data: rows.map(function (r) { return r.heading ? null : ms(r.start) - min; })
					}, {
						type: "bar", stack: "t", barMaxWidth: 16,
						data: rows.map(function (r) {
							if (r.heading) { return null; }
							var style = { color: colour(r), borderRadius: 3 };
							if (r.status === "planned") { style.decal = k.hatch(); }
							return { value: ms(r.end) - ms(r.start) + DAY, itemStyle: style };
						}),
						label: { show: showWords, position: "right", color: k.label, fontFamily: k.T.font(),
							formatter: function (p) { var r = rows[p.dataIndex]; return r && !r.heading ? (STATUS[r.status] || STATUS.planned).text : ""; } },
						markLine: {
							silent: true, symbol: "none", animation: false,
							lineStyle: { color: k.text, type: "solid", width: 1.5 },
							label: { formatter: t("timelineCalendar.today"), position: "end", color: k.text, fontFamily: k.T.font() },
							data: [{ xAxis: ms(d.today) - min }]
						}
					}]
				});
			});

			function fillList(d) {
				list.destroyItems();
				arrange(d.objects).forEach(function (r) {
					if (r.heading) { list.addItem(new GroupHeaderListItem({ title: r.heading })); return; }
					var s = STATUS[r.status] || STATUS.planned;
					list.addItem(new StandardListItem({ title: r.name, description: span(r), info: s.text, infoState: s.state }));
				});
				todayLine.setText(t("timelineCalendar.todayLine", day(ms(d.today), true)));
			}

			function layout() {
				var el = box.getDomRef();
				if (!el || !el.clientWidth) { return; }
				var isNarrow = Layout.narrower("phone", el.clientWidth);
				if (isNarrow === narrow) { return; }
				narrow = isNarrow;
				chart.setVisible(!narrow);
				list.setVisible(narrow);
				todayLine.setVisible(narrow);
			}
			var handle = null;
			box.addEventDelegate({ onAfterRendering: function () {
				if (!handle) { handle = ResizeHandler.register(box, layout); }
				layout();
			} });

			var part = Part.make({
				key: "timeline-calendar",
				content: box,
				empty: t("timelineCalendar.empty"),
				render: function (d) {
					var bars = d.objects.length;
					chart.setHeight(Math.max(10, Math.round((bars + new Set(d.objects.map(function (x) { return x.group; })).size) * 1.75 + 3)) + "rem");
					chart.setData(d);
					fillList(d);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			var KINDS = [t("timelineCalendar.demo.kind.promotion"), t("timelineCalendar.demo.kind.launch"), t("timelineCalendar.demo.kind.rangeReview")];
			function data(seed) {
				var s = Data.sample(seed);
				var random = Data.rng(seed * 31 + 3);
				var today = Data.SAMPLE_TODAY + "-01";
				var objects = s.items.slice(0, 7).map(function (it, i) {
					var startMonth = 1 + Math.floor(random() * 9);
					var start = Date.UTC(2026, startMonth - 1, 1 + Math.floor(random() * 20));
					var end = start + (20 + Math.floor(random() * 70)) * DAY;
					var now = ms(today);
					var status = end < now ? (random() < 0.25 ? "late" : "done") : start > now ? "planned" : "active";
					var iso = function (v) { return new Date(v).toISOString().slice(0, 10); };
					return { id: it.id + i, name: t("timelineCalendar.demo.name", it.name, KINDS[i % KINDS.length]), group: it.group, start: iso(start), end: iso(end), status: status };
				});
				return { today: today, objects: objects };
			}
			return {
				options: { label: t("timelineCalendar.demo.label"), data: data(7) },
				next: function (seed) { return data(seed); }
			};
		}
	};
});
