/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The one place charts are built. A UI5 control around Apache ECharts (Apache-2.0), loaded on first
 * use. You give it data and a builder function; it hands the builder theme colours and helpers, redraws
 * when the theme changes, resizes with its parent, and records whether it actually drew.
 *
 *   new Chart({ label: "Revenue by month", height: "16rem" })
 *     .setBuilder(function (data, kit) { return { ...ECharts option... }; })
 *     .setData(rows);
 */
sap.ui.define([
	"sap/ui/core/Control",
	"accents/core/Tokens",
	"accents/core/Motion",
	"accents/core/Format",
	"accents/core/I18n"
], function (Control, Tokens, Motion, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	var SRC = "https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js";
	var loading = null;
	var all = new Set();

	function load() {
		if (window.echarts) { return Promise.resolve(window.echarts); }
		if (!loading) {
			loading = new Promise(function (resolve, reject) {
				var s = document.createElement("script");
				s.src = Chart.SRC;
				s.async = true;
				s.onload = function () { resolve(window.echarts); };
				s.onerror = function () { loading = null; reject(new Error(t("chart.libraryFailed"))); };
				document.head.appendChild(s);
			});
		}
		return loading;
	}

	/** Width bands in which a builder's layout stays the same (matches Layout.WIDTHS plus a small-chart band). */
	function widthBucket(w) { return w < 480 ? 0 : w < 600 ? 1 : w < 1024 ? 2 : 3; }

	function value(v) { return v && typeof v === "object" && !Array.isArray(v) ? v.value : v; }

	/** Builds { head, rows } from a drawn ECharts option, or null when there is nothing tabular. */
	function tableFrom(opt) {
		var series = (opt.series || []).filter(function (s) { return s && s.data && s.data.length; });
		if (!series.length) { return null; }
		var axes = [].concat(opt.xAxis || [], opt.yAxis || []);
		var cat = axes.find(function (a) { return a && a.type === "category" && a.data && a.data.length; });
		if (cat && series.every(function (s) { return s.type === "bar" || s.type === "line"; })) {
			var named = series.filter(function (s) { return s.name; });
			var use = named.length ? named : series;
			return {
				head: [""].concat(use.map(function (s, i) { return s.name || t("chart.value", i + 1); })),
				rows: cat.data.map(function (c, i) {
					return [value(c)].concat(use.map(function (s) { var v = value(s.data[i]); return Array.isArray(v) ? v[v.length - 1] : v; }));
				})
			};
		}
		if (series[0].type === "heatmap" && cat) {
			return { head: ["", "", "Value"], rows: series[0].data.map(function (d) {
				var v = value(d);
				var xs = axes.filter(function (a) { return a && a.type === "category"; });
				return [xs[0] && xs[0].data[v[0]] !== undefined ? value(xs[0].data[v[0]]) : v[0],
					xs[1] && xs[1].data[v[1]] !== undefined ? value(xs[1].data[v[1]]) : v[1], v[2]];
			}) };
		}
		var rows = [];
		(function walk(list) {
			list.forEach(function (d) {
				if (d && typeof d === "object" && d.name !== undefined) {
					var v = value(d);
					rows.push([d.name, Array.isArray(v) ? v.join(", ") : v]);
				}
				if (d && d.children) { walk(d.children); }
			});
		})(series[0].data);
		return rows.length ? { head: ["", series[0].name || "Value"], rows: rows } : null;
	}

	/** Helpers handed to every builder, so builders never hold a colour or a font themselves. */
	function kit() {
		var text = Tokens.text(), label = Tokens.label(), line = Tokens.line();
		var font = Tokens.font();
		return {
			T: Tokens,
			F: Format,
			text: text,
			label: label,
			line: line,
			series: Tokens.series,
			status: Tokens.status,
			/** Base option: font, palette, grid, tooltip, and no title (the card carries the title). */
			base: function (extra) {
				var palette = [];
				for (var i = 0; i < 12; i++) { palette.push(Tokens.series(i)); }
				return Object.assign({
					color: palette,
					textStyle: { fontFamily: font, color: text },
					grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
					tooltip: { trigger: "axis", confine: true, backgroundColor: Tokens.background(), borderColor: line,
						textStyle: { color: text, fontFamily: font } },
					legend: { show: false, textStyle: { color: label } }
				}, extra || {});
			},
			/** An axis styled from the theme. type: "category" or "value". */
			axis: function (type, extra) {
				return Object.assign({
					type: type,
					axisLine: { show: type === "category", lineStyle: { color: line } },
					axisTick: { show: false },
					axisLabel: { color: label, fontFamily: font },
					splitLine: { show: type === "value", lineStyle: { color: line } }
				}, extra || {});
			},
			/** Diagonal hatching for planned, predicted or scenario bars: same hue as the solid version. */
			hatch: function () {
				return { symbol: "rect", symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [2, 3], rotation: -Math.PI / 4,
					color: Tokens.mix(Tokens.background(), "rgba(0,0,0,0)", 0.25) };
			},
			/** Show labels on marks only when there are few enough points to read them. */
			labels: function (count, formatter) {
				return { show: count <= 12, color: text, fontFamily: font, formatter: formatter };
			},
			legend: function (show) {
				return { show: show !== false, bottom: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10,
					textStyle: { color: label, fontFamily: font } };
			}
		};
	}

	var Chart = Control.extend("accents.core.Chart", {
		metadata: {
			properties: {
				/** Height of the chart area. Charts must never sit in a zero-height parent. */
				height: { type: "sap.ui.core.CSSSize", defaultValue: "16rem" },
				/** Accessible name: the question the chart answers. */
				label: { type: "string", defaultValue: "" },
				/** Only charts that drill somewhere are selectable. */
				selectable: { type: "boolean", defaultValue: false }
			},
			events: {
				select: { parameters: { index: { type: "int" }, name: { type: "string" }, series: { type: "string" }, value: { type: "any" } } },
				/** Fired after each draw, with whether marks were actually drawn. */
				drawn: { parameters: { ok: { type: "boolean" } } }
			}
		},

		renderer: {
			apiVersion: 2,
			render: function (rm, c) {
				// Charts draw left to right even on right-to-left pages: ECharts clips its labels otherwise.
				rm.openStart("div", c).class("accChart").attr("dir", "ltr").style("height", c.getHeight())
					.attr("role", "figure").attr("aria-label", c.getLabel()).openEnd();
				rm.close("div");
			}
		},

		init: function () {
			this._builder = null;
			this._data = null;
			this._inst = null;
			this._drawnOk = false;
			this._stop = Tokens.onChange(this._redraw.bind(this, true));
			all.add(this);
		},

		exit: function () {
			this._stop();
			if (this._ro) { this._ro.disconnect(); }
			if (this._inst) { this._inst.dispose(); }
			all.delete(this);
		},

		/** builder(data, kit) returns an ECharts option. */
		setBuilder: function (fn) { this._builder = fn; this._redraw(true); return this; },
		setData: function (data) { this._data = data; this._redraw(false); return this; },
		/** Redraws from scratch, for when the set of series changes (a merge would leave old ones behind). */
		rebuild: function () { this._redraw(true); return this; },
		getData: function () { return this._data; },
		/** Direct access for element-specific calls such as highlighting one point. */
		instance: function () { return this._inst; },
		isDrawn: function () { return this._drawnOk; },

		onAfterRendering: function () {
			var el = this.getDomRef();
			var self = this;
			if (!el) { return; }
			load().then(function (echarts) {
				if (self.bIsDestroyed || self.getDomRef() !== el) { return; }
				if (self._inst && self._inst.getDom() !== el) { self._inst.dispose(); self._inst = null; }
				if (!self._inst) {
					self._inst = echarts.init(el, null, { renderer: "svg" });
					self._inst.on("click", function (p) {
						if (!self.getSelectable()) { return; }
						self.fireSelect({ index: p.dataIndex, name: p.name, series: p.seriesName, value: p.value });
					});
					if (self._ro) { self._ro.disconnect(); }
					self._ro = new ResizeObserver(function () {
						if (!self._inst) { return; }
						// Builders may choose a narrow layout from kit.width, so crossing a width
						// breakpoint re-runs the builder; any other resize only rescales.
						var bucket = widthBucket(el.clientWidth);
						if (bucket !== self._bucket) { self._redraw(true); } else { self._inst.resize(); self._check(); }
					});
					self._ro.observe(el);
				}
				self._redraw(true);
			}, function (err) {
				el.textContent = err.message;
				self.fireDrawn({ ok: false });
			});
		},

		_redraw: function (full) {
			if (!this._inst || !this._builder || this._data === null || this._data === undefined) { return; }
			var el = this.getDomRef();
			var k = kit();
			/** The chart's own width in pixels, for builders that switch to a narrow layout. */
			k.width = el ? el.clientWidth : 0;
			this._bucket = widthBucket(k.width);
			var option = this._builder(this._data, k);
			var calm = Motion.reduced();
			option.animation = !calm;
			option.animationDuration = 400;
			option.animationDurationUpdate = 400;
			option.animationEasingUpdate = "cubicOut";
			option.aria = { enabled: true, label: { description: this.getLabel() } };
			this._inst.setOption(option, { notMerge: !!full, lazyUpdate: false });
			this._table();
			this._check();
		},

		/**
		 * Every chart carries a table of the same numbers, hidden on screen and read by screen readers.
		 * It is derived from what was drawn: category axes give one row per category and one column
		 * per series; pies, treemaps and graphs give one row per named point.
		 */
		_table: function () {
			var el = this.getDomRef();
			if (!el || !this._inst) { return; }
			var tab = tableFrom(this._inst.getOption());
			var old = el.querySelector(":scope > table.accChartTable");
			if (old) { old.remove(); }
			if (!tab) { return; }
			var table = document.createElement("table");
			table.className = "accChartTable";
			var cap = document.createElement("caption");
			cap.textContent = this.getLabel();
			table.appendChild(cap);
			[tab.head].concat(tab.rows).forEach(function (cells, r) {
				var tr = document.createElement("tr");
				cells.forEach(function (c, i) {
					var cell = document.createElement(r === 0 || i === 0 ? "th" : "td");
					cell.textContent = c === null || c === undefined ? Format.DASH : typeof c === "number" ? Format.number(c, Math.abs(c) < 10 ? 2 : 0) : String(c);
					tr.appendChild(cell);
				});
				table.appendChild(tr);
			});
			el.appendChild(table);
		},

		/** A chart has drawn only if it has size and marks. Zero-size parents draw nothing, silently. */
		_check: function () {
			var el = this.getDomRef();
			var ok = !!el && el.clientWidth > 0 && el.clientHeight > 0 &&
				el.querySelectorAll("svg path, svg rect, svg circle, svg polyline").length > 1;
			if (ok !== this._drawnOk || !ok) { this._drawnOk = ok; this.fireDrawn({ ok: ok }); }
		}
	});

	Chart.SRC = SRC;
	Chart.kit = kit;
	Chart.load = load;
	/** For audits: every chart on the page, with its size and whether it drew. */
	Chart.audit = function () {
		return Array.from(all).filter(function (c) { return c.getDomRef(); }).map(function (c) {
			var el = c.getDomRef();
			return { id: c.getId(), label: c.getLabel(), width: el.clientWidth, height: el.clientHeight, drawn: c.isDrawn(),
				marks: el.querySelectorAll("svg path, svg rect, svg circle").length,
				tableRows: el.querySelectorAll(":scope > table.accChartTable tr").length };
		});
	};
	return Chart;
});
