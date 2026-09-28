/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Process flow: where one object is in its process. Steps are drawn left to right, in lanes by role
 * when lanes are given, each marked done, current, waiting or blocked. Every state has its own word
 * and shape, never colour alone. Below the drawing, the same steps as a list with an icon and a word
 * for each state; the list is what a keyboard reaches, and on a phone it is shown alone. UI5's own
 * process-flow control is not open source, so the drawing uses the Accents chart (Apache ECharts).
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/Title",
	"sap/ui/core/ResizeHandler",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Tokens",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/workflow/sampleWork"
], function (VBox, List, StandardListItem, Title, ResizeHandler, Part, Chart, Tokens, Layout, I18n, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	/** Each state: a word, a value state and icon for the list, and a mark shape and colour for the drawing. */
	var STATE = {
		done: { state: "Success", icon: "sap-icon://accept", symbol: "circle", tone: "good", size: 22 },
		current: { state: "Information", icon: "sap-icon://away", symbol: "roundRect", tone: "info", size: 28 },
		waiting: { state: "None", icon: "sap-icon://pending", symbol: "circle", hollow: true, tone: "neutral", size: 20 },
		blocked: { state: "Error", icon: "sap-icon://locked", symbol: "diamond", tone: "bad", size: 26 }
	};
	var PAD = { left: 128, right: 64, top: 34, bottom: 58 };
	var LANE_REM = 4.5;

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.List", "sap.m.StandardListItem"],
			motion: "When a step changes state, its mark takes its new shape and colour; lanes, links and labels stay put.",
			still: false
		},

		/**
		 * options:
		 *   data    { lanes: [{ id, name }] (optional), steps: [{ id, name, lane, state: "done"|"current"|"waiting"|"blocked",
		 *             owner, note }] } — steps in process order
		 *   label   accessible name ("Where the price change is")
		 *   onOpen  optional function (step): makes steps pressable in the list and the drawing
		 */
		create: function (o) {
			var label = o.label || t("processFlow.label");
			var chart = new Chart({ label: label, height: "16rem", selectable: !!o.onOpen });
			var listTitle = new Title({ level: "H4", titleStyle: "H6" }).addStyleClass("sapUiSmallMarginTop");
			var list = new List({ showSeparators: "Inner", ariaLabelledBy: [listTitle] });
			if (o.onOpen) {
				list.attachItemPress(function (e) { o.onOpen(e.getParameter("listItem").data("step")); });
				chart.attachSelect(function (e) {
					var steps = (part.data() || {}).steps || [];
					var s = steps[e.getParameter("index")];
					if (s) { o.onOpen(s); }
				});
			}
			var box = new VBox({ renderType: "Bare", items: [chart, listTitle, list] });
			var drawnWidth = 0;

			function lanesOf(data) {
				if (data.lanes && data.lanes.length) { return data.lanes; }
				return [{ id: "", name: "" }];
			}
			function laneIndex(lanes, id) { var i = lanes.findIndex(function (l) { return l.id === id; }); return i < 0 ? 0 : i; }

			chart.setBuilder(function (data, kit) {
				var lanes = lanesOf(data);
				var named = !!(data.lanes && data.lanes.length);
				var steps = data.steps || [];
				var el = chart.getDomRef();
				var h = el ? el.clientHeight : 256;
				var w = kit.width || 800;
				drawnWidth = w;
				var left = named ? PAD.left : 40;
				// Positions are in pixels and the series box is the whole chart, so marks keep their shape.
				var stepX = function (i) { return steps.length < 2 ? (left + w - PAD.right) / 2 : left + i * (w - left - PAD.right) / (steps.length - 1); };
				var laneY = function (i) { return lanes.length < 2 ? h / 2 : PAD.top + i * (h - PAD.top - PAD.bottom) / (lanes.length - 1); };
				var nodes = steps.map(function (s, i) {
					var st = STATE[s.state] || STATE.waiting;
					var colour = Tokens.status(st.tone);
					return {
						name: s.name,
						value: t("processFlow.state." + s.state),
						x: stepX(i), y: laneY(laneIndex(lanes, s.lane)),
						symbol: st.symbol,
						symbolSize: st.size,
						itemStyle: st.hollow ? { color: kit.T.background(), borderColor: colour, borderWidth: 2 }
							: { color: colour, borderColor: colour, borderWidth: 2 },
						label: { show: true, position: "bottom", distance: 6, color: kit.text, fontFamily: kit.T.font(), fontSize: 12, lineHeight: 15,
							formatter: "{b}\n{state|" + t("processFlow.state." + s.state) + "}",
							rich: { state: { color: kit.T.statusText(st.tone), fontWeight: "bold", fontSize: 11 } } }
					};
				});
				// Two unnamed, invisible anchors at opposite corners make the drawing's scale exactly one
				// pixel per pixel, so lane names line up with the lanes whichever lanes the steps use.
				var anchor = { symbolSize: 0, itemStyle: { opacity: 0 }, label: { show: false }, tooltip: { show: false }, emphasis: { disabled: true } };
				nodes.push(Object.assign({ x: 0, y: 0 }, anchor), Object.assign({ x: w, y: h }, anchor));
				var links = steps.slice(1).map(function (s, i) {
					var pending = s.state === "waiting";
					return { source: i, target: i + 1, lineStyle: { color: kit.label, width: 1.5, type: pending ? "dashed" : "solid", curveness: 0 } };
				});
				var graphic = [];
				if (named) {
					lanes.forEach(function (l, i) {
						graphic.push({ type: "text", left: 8, top: laneY(i) - 8, style: { text: l.name, fill: kit.label, font: "12px " + kit.T.font(), width: PAD.left - 24, overflow: "truncate" } });
						if (i > 0) {
							var y = (laneY(i) + laneY(i - 1)) / 2;
							graphic.push({ type: "line", shape: { x1: 0, y1: y, x2: 4000, y2: y }, style: { stroke: kit.line, lineWidth: 1 }, silent: true });
						}
					});
				}
				return kit.base({
					tooltip: { trigger: "item", confine: true, backgroundColor: kit.T.background(), borderColor: kit.line, textStyle: { color: kit.text },
						formatter: function (p) {
							if (p.dataType !== "node" || !p.name) { return ""; }
							var s = steps[p.dataIndex];
							var lane = lanes[laneIndex(lanes, s.lane)].name;
							return [p.name, t("processFlow.state." + s.state), lane, s.owner, s.note].filter(Boolean).join("<br>");
						} },
					graphic: graphic,
					series: [{
						type: "graph",
						name: t("processFlow.stateColumn"),
						layout: "none",
						left: 0, right: 0, top: 0, bottom: 0,
						roam: false,
						edgeSymbol: ["none", "arrow"],
						edgeSymbolSize: 8,
						data: nodes,
						links: links,
						emphasis: { focus: "none", scale: false }
					}]
				});
			});

			function drawList(data) {
				var lanes = lanesOf(data);
				var named = !!(data.lanes && data.lanes.length);
				list.destroyItems();
				(data.steps || []).forEach(function (s) {
					var st = STATE[s.state] || STATE.waiting;
					var bits = [];
					if (named) { bits.push(lanes[laneIndex(lanes, s.lane)].name); }
					if (s.owner) { bits.push(s.owner); }
					if (s.note) { bits.push(s.note); }
					var settings = { title: s.name, description: bits.join(" · "), icon: st.icon, info: t("processFlow.state." + s.state),
						infoState: st.state, type: o.onOpen ? "Active" : "Inactive" };
					list.addItem(new StandardListItem(settings).data("step", s));
				});
			}
			function listTitleText(data) {
				var steps = data.steps || [];
				var done = steps.filter(function (s) { return s.state === "done"; }).length;
				return t("processFlow.listTitle", done, steps.length);
			}

			// On a phone the drawing gives way to the list, which already says everything it shows.
			var resizeId = null;
			function fit() {
				chart.setVisible(!Layout.narrower("phone"));
				// Marks are placed in pixels, so a new width redraws them rather than stretching them.
				var el = chart.getDomRef();
				if (el && drawnWidth && Math.abs(el.clientWidth - drawnWidth) > 2) { chart.rebuild(); }
			}
			box.addEventDelegate({ onAfterRendering: function () {
				if (!resizeId) { resizeId = ResizeHandler.register(box, fit); }
			} });
			fit();

			var part = Part.make({
				key: "process-flow",
				content: box,
				empty: t("processFlow.empty"),
				onDestroy: function () { if (resizeId) { ResizeHandler.deregister(resizeId); } },
				render: function (data) {
					var lanes = lanesOf(data);
					chart.setHeight(Math.max(12, lanes.length * LANE_REM + 2) + "rem");
					listTitle.setText(listTitleText(data));
					drawList(data);
					chart.setData(data);
					if (!(data.steps || []).length) { part.state("empty"); }
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			function data(seed) {
				var tasks = sampleWork.tasks(seed);
				var task = tasks[seed % 3 === 0 ? 2 : 0];
				var p = sampleWork.process(task);
				// Replay moves the process on by one step, so a state visibly changes.
				if (seed % 2 === 0) {
					p.steps = p.steps.map(function (s) {
						return s.id === "decide" ? Object.assign({}, s, { state: "done" }) : s.id === "carry" ? Object.assign({}, s, { state: "current" }) : s;
					});
				}
				return p;
			}
			return { options: { label: t("processFlow.demoLabel"), data: data(7) }, next: data };
		}
	};
});
