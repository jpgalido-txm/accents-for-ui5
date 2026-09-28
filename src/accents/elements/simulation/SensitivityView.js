/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Sensitivity view: how one outcome moves as one setting changes, split by a second setting. It shows
 * either a heat map (setting across, split down, coloured by change against the base case) or one line
 * per split value. The person chooses the outcome measure. Choosing a cell or point offers to apply that
 * combination as a new scenario; applying goes to a callback, never straight to the plan.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Select",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/ui/core/Item",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/core/Tokens",
	"accents/core/I18n"
], function (VBox, Toolbar, ToolbarSpacer, SegmentedButton, SegmentedButtonItem, Select, Text, Button, MessageToast, Item,
	InvisibleText, Part, Chart, Format, Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.simulation.i18n.i18n");

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.SegmentedButton", "sap.m.Select", "sap.m.Toolbar", "sap.m.Button"],
			motion: "Cells recolour and lines move to their new values when the data changes; switching view or measure redraws without motion.",
			still: false
		},

		/**
		 * options:
		 *   label     the question the chart answers ("How revenue responds to price")
		 *   view      "heatmap" (default) or "lines"
		 *   height    chart height (default "18rem")
		 *   onApply   optional function (choice) -> void, where choice is
		 *             { setting, split, measure, value }. Without it, cells are not selectable.
		 *   data      {
		 *               setting: { label, values: [n], format(v) },    across
		 *               split:   { label, values: [n], format(v) },    down, or one line each
		 *               base:    { setting: index, split: index },     the case the scenario starts from
		 *               measures: [{ key, label, polarity, format(v), values: [[v per setting] per split] }]
		 *             }
		 */
		create: function (o) {
			var view = o.view === "lines" ? "lines" : "heatmap";
			var measureKey = null;
			var choice = null;
			var chart = new Chart({ label: o.label || t("sensitivityView.label"), height: o.height || "18rem", selectable: !!o.onApply });
			// The view switch and the measure list have no visible label, so hidden texts name them.
			var viewName = new InvisibleText({ text: t("sensitivityView.view") });
			var measureName = new InvisibleText({ text: t("sensitivityView.measure") });
			var switcher = new SegmentedButton({ selectedKey: view, ariaLabelledBy: [viewName], items: [
				new SegmentedButtonItem({ key: "heatmap", icon: "sap-icon://heatmap-chart", tooltip: t("sensitivityView.heatmap") }),
				new SegmentedButtonItem({ key: "lines", icon: "sap-icon://line-chart", tooltip: t("sensitivityView.lines") })
			], selectionChange: function (e) {
				view = e.getParameter("item").getKey();
				draw(true);
			} });
			var measure = new Select({ width: "11rem", tooltip: t("sensitivityView.measure"), ariaLabelledBy: [measureName], change: function () {
				measureKey = measure.getSelectedKey();
				choice = null;
				draw(true);
			} });
			var picked = new Text({ text: "", wrapping: true });
			var applySettings = { text: t("sensitivityView.apply"), icon: "sap-icon://add", enabled: false, tooltip: t("sensitivityView.apply.first"),
				press: function () { if (choice && o.onApply) { o.onApply(choice); } } };
			var apply = new Button(applySettings);
			var offer = new Toolbar({ style: "Clear", visible: !!o.onApply, content: [picked, new ToolbarSpacer(), apply] });
			var top = new Toolbar({ style: "Clear", content: [measure, new ToolbarSpacer(), switcher] });
			var content = new VBox({ renderType: "Bare", items: [viewName, measureName, top, chart, offer] });

			function current() {
				var d = part.data();
				if (!d) { return null; }
				var m = d.measures.filter(function (x) { return x.key === measureKey; })[0] || d.measures[0];
				return { d: d, m: m };
			}
			function sfmt(axis, v) { return axis.format ? axis.format(v) : Format.number(v); }
			function mfmt(m, v) { return m.format ? m.format(v) : Format.short(v); }
			function baseValue(d, m) {
				var b = d.base || { setting: 0, split: 0 };
				var v = m.values[b.split] && m.values[b.split][b.setting];
				return v === undefined ? null : v;
			}

			function showChoice() {
				var c = current();
				if (!choice || !c) {
					picked.setText(t("sensitivityView.pick"));
					apply.setEnabled(false);
					apply.setTooltip(t("sensitivityView.apply.first"));
					return;
				}
				var pct = Format.change(choice.value, baseValue(c.d, c.m));
				var said = [c.d.setting.label, sfmt(c.d.setting, choice.setting), c.d.split.label, sfmt(c.d.split, choice.split),
					c.m.label, mfmt(c.m, choice.value)];
				picked.setText(pct === null ? t.apply(null, ["sensitivityView.picked"].concat(said))
					: t.apply(null, ["sensitivityView.pickedAgainst"].concat(said, [Format.delta(pct, "percent")])));
				apply.setEnabled(true);
				apply.setTooltip(t("sensitivityView.apply.ready"));
			}

			chart.attachSelect(function (e) {
				var c = current();
				if (!c) { return; }
				var si, xi;
				if (view === "heatmap") {
					var v = e.getParameter("value");
					if (!v) { return; }
					xi = v[0]; si = v[1];
				} else {
					xi = e.getParameter("index");
					si = c.d.split.values.map(function (s) { return sfmt(c.d.split, s); }).indexOf(e.getParameter("series"));
				}
				if (si < 0 || xi === undefined) { return; }
				choice = { setting: c.d.setting.values[xi], split: c.d.split.values[si], measure: c.m.key, value: c.m.values[si][xi] };
				showChoice();
			});

			function build(input, k) {
				var d = input.d, m = input.m;
				var base = baseValue(d, m);
				var xs = d.setting.values.map(function (v) { return sfmt(d.setting, v); });
				var ys = d.split.values.map(function (v) { return sfmt(d.split, v); });
				var tip = function (xi, si) {
					var v = m.values[si][xi];
					var pct = Format.change(v, base);
					return t("sensitivityView.tip.where", d.setting.label, xs[xi], d.split.label, ys[si]) + "<br/>" + t("sensitivityView.tip.value", m.label, mfmt(m, v)) +
						(pct === null ? "" : "<br/>" + t("sensitivityView.tip.against", Format.delta(pct, "percent")));
				};
				var nameStyle = { color: k.label, fontFamily: k.T.font() };
				if (input.view === "heatmap") {
					var cells = [], spread = 0;
					m.values.forEach(function (row, si) {
						row.forEach(function (v, xi) {
							var pct = Format.change(v, base);
							var signedPct = pct === null ? null : (m.polarity === "down" ? -pct : pct);
							if (signedPct !== null) { spread = Math.max(spread, Math.abs(signedPct)); }
							cells.push({ value: [xi, si, signedPct === null ? 0 : signedPct], raw: v, pct: pct });
						});
					});
					spread = spread || 0.01;
					return k.base({
						grid: { left: 28, right: 8, top: 8, bottom: 56, containLabel: true },
						tooltip: Object.assign(k.base().tooltip, { trigger: "item", formatter: function (p) { return tip(p.value[0], p.value[1]); } }),
						xAxis: k.axis("category", { data: xs, name: d.setting.label, nameLocation: "middle", nameGap: 24, nameTextStyle: nameStyle, splitArea: { show: false } }),
						yAxis: k.axis("category", { data: ys, name: d.split.label, nameLocation: "middle", nameGap: 40, nameTextStyle: nameStyle, splitLine: { show: false } }),
						visualMap: { type: "continuous", min: -spread, max: spread, dimension: 2, orient: "horizontal", left: "center", bottom: 0,
							itemWidth: 10, itemHeight: 120, calculable: false, inRange: { color: k.T.ramp("diverge", 7) },
							text: [t("sensitivityView.better", Format.delta(spread, "percent")), t("sensitivityView.worse", Format.delta(-spread, "percent"))],
							textStyle: { color: k.label, fontFamily: k.T.font() } },
						series: [{
							type: "heatmap",
							data: cells,
							itemStyle: { borderColor: k.T.background(), borderWidth: 2, borderRadius: 3 },
							emphasis: { itemStyle: { borderColor: k.text, borderWidth: 2 } },
							label: k.labels(cells.length, function (p) {
								return p.data.pct === null ? Format.DASH : Format.delta(p.data.pct, "percent");
							})
						}]
					});
				}
				return k.base({
					grid: { left: 8, right: 64, top: 16, bottom: 40, containLabel: true },
					tooltip: Object.assign(k.base().tooltip, { trigger: "item", formatter: function (p) { return tip(p.dataIndex, ys.indexOf(p.seriesName)); } }),
					xAxis: k.axis("category", { data: xs, boundaryGap: false, name: d.setting.label, nameLocation: "middle", nameGap: 26, nameTextStyle: nameStyle }),
					yAxis: k.axis("value", { scale: true, axisLabel: { color: k.label, formatter: function (v) { return mfmt(m, v); } } }),
					series: m.values.map(function (row, si) {
						return {
							name: ys[si], type: "line", data: row, symbol: "circle", symbolSize: 7,
							lineStyle: { width: 2, color: k.series(si) }, itemStyle: { color: k.series(si) },
							endLabel: { show: true, color: k.text, fontFamily: k.T.font(), formatter: function () { return ys[si]; } }
						};
					})
				});
			}

			chart.setBuilder(build);

			function draw(full) {
				var c = current();
				if (!c) { return; }
				var input = { d: c.d, m: c.m, view: view };
				if (full) { chart.setBuilder(build); }
				chart.setData(input);
				showChoice();
			}

			var part = Part.make({
				key: "sensitivity-view",
				content: content,
				empty: t("sensitivityView.empty"),
				render: function (d, prev) {
					if (!d.measures || !d.measures.length) { part.state("empty"); return; }
					var keys = d.measures.map(function (m) { return m.key; });
					if (!prev || prev.measures.map(function (m) { return m.key; }).join() !== keys.join()) {
						measure.destroyItems();
						d.measures.forEach(function (m) { measure.addItem(new Item({ key: m.key, text: m.label })); });
					}
					if (keys.indexOf(measureKey) < 0) { measureKey = keys[0]; }
					measure.setSelectedKey(measureKey);
					choice = null;
					draw(!prev);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function grid(seed) {
				var r = Data.rng(seed * 13);
				var prices = [-10, -5, 0, 5];
				var depths = [10, 20, 30];
				var pct = function (v) { return (v > 0 ? "+" : v < 0 ? Format.MINUS : "") + Math.abs(v) + "%"; };
				var elasticity = -1.6 - r() * 0.8;
				var revenue = depths.map(function (dp) {
					return prices.map(function (p) {
						var volume = 1 + elasticity * p / 100 + dp / 100 * (0.5 + r() * 0.3);
						return Math.round(2.4e6 * (1 + p / 100) * (1 - dp / 400) * volume);
					});
				});
				var margin = depths.map(function (dp, si) {
					return prices.map(function (p, xi) { return Math.round(revenue[si][xi] * (0.26 + p / 200 - dp / 250)); });
				});
				return {
					setting: { label: t("sensitivityView.demo.price"), values: prices, format: pct },
					split: { label: t("sensitivityView.demo.depth"), values: depths, format: function (v) { return v + "%"; } },
					base: { setting: 2, split: 0 },
					measures: [
						{ key: "revenue", label: t("sensitivityView.demo.revenue"), polarity: "up", format: function (v) { return Format.money(v, "USD", true); }, values: revenue },
						{ key: "margin", label: t("sensitivityView.demo.margin"), polarity: "up", format: function (v) { return Format.money(v, "USD", true); }, values: margin }
					]
				};
			}
			return {
				options: {
					label: t("sensitivityView.demo.label"),
					data: grid(7),
					onApply: function (c) {
						MessageToast.show(t("sensitivityView.demo.applied", (c.setting > 0 ? "+" : c.setting < 0 ? Format.MINUS : "") +
							Math.abs(c.setting) + "%", c.split + "%"));
					}
				},
				next: function (seed) { return grid(seed); }
			};
		}
	};
});
