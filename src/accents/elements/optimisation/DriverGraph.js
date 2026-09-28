/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Driver graph: the levers on the left, the outcomes they move on the right, and a link for each lever
 * that moves an outcome. A link's width is its strength. The weakest link is marked three ways at once:
 * dashed, in the critical colour, and labelled in words. Pressing a node opens a popover with what it
 * is and every link into or out of it. Under the drawing, every link is also a row in a list, so the
 * graph can be read and explored by keyboard: focusing or selecting a row highlights that link and its
 * two nodes in the drawing.
 */
sap.ui.define([
	"sap/m/Popover",
	"sap/m/VBox",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/Title",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Chart",
	"accents/core/Tokens",
	"accents/core/Format",
	"accents/core/I18n",
	"accents/elements/optimisation/sampleOptions"
], function (Popover, VBox, Text, ObjectStatus, List, StandardListItem, Title, Device, Part, Chart, Tokens, Format, I18n, sampleOptions) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");

	/** Column of each node: levers at 0, every other node one step past the furthest node feeding it. */
	function columns(d) {
		var col = {};
		d.nodes.forEach(function (n) { col[n.id] = n.kind === "lever" ? 0 : 1; });
		for (var pass = 0; pass < d.nodes.length; pass++) {
			d.links.forEach(function (l) { if (col[l.to] <= col[l.from]) { col[l.to] = col[l.from] + 1; } });
		}
		return col;
	}

	function weakest(links) {
		return links.reduce(function (w, l) { return !w || l.strength < w.strength ? l : w; }, null);
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts)", "sap.m.Popover", "sap.m.ObjectStatus", "sap.m.List"],
			motion: "Links thicken or thin to their new strengths when the data changes. Nodes never move on their own.",
			still: false
		},

		/**
		 * options:
		 *   label   the question the graph answers ("What drives return")
		 *   height  chart height (default "18rem")
		 *   data    { nodes: [{ id, name, kind: "lever" | "outcome", lever (category key, for levers), detail }],
		 *             links: [{ from, to, strength (0 to 1), note }] }
		 */
		create: function (o) {
			var chart = new Chart({ label: o.label || t("driverGraph.label"), height: o.height || "18rem", selectable: true });
			var hooked = false;
			var popover = null;

			function details(node) {
				var d = part.data();
				var weak = weakest(d.links);
				var name = function (id) { return (d.nodes.find(function (n) { return n.id === id; }) || { name: id }).name; };
				var items = [new Text({ text: node.kind === "lever" ? t("driverGraph.kind.lever") : t("driverGraph.kind.outcome") }).addStyleClass("accLabel")];
				if (node.detail) { items.push(new Text({ text: node.detail }).addStyleClass("sapUiTinyMarginTop")); }
				d.links.filter(function (l) { return l.from === node.id || l.to === node.id; }).forEach(function (l) {
					var other = l.from === node.id ? t("driverGraph.moves", name(l.to)) : t("driverGraph.movedBy", name(l.from));
					items.push(new ObjectStatus({
						title: other,
						text: t(l === weak ? "driverGraph.strengthWeakest" : "driverGraph.strength", Format.number(l.strength, 2)),
						state: l === weak ? "Warning" : "None",
						icon: l === weak ? "sap-icon://alert" : ""
					}).addStyleClass("sapUiTinyMarginTop"));
					if (l.note) { items.push(new Text({ text: l.note }).addStyleClass("accLabel")); }
				});
				return items;
			}

			function open(node, x, y) {
				var el = chart.getDomRef();
				if (!el) { return; }
				// The popover needs something to point at; a node is drawn inside the chart, not a control.
				var anchor = el.querySelector(".accGraphAnchor");
				if (!anchor) {
					anchor = document.createElement("span");
					anchor.className = "accGraphAnchor";
					anchor.style.position = "absolute";
					anchor.style.width = "1px";
					anchor.style.height = "1px";
					anchor.style.pointerEvents = "none";
					el.appendChild(anchor);
				}
				anchor.style.left = x + "px";
				anchor.style.top = y + "px";
				if (popover) { popover.destroy(); }
				popover = new Popover({
					title: node.name,
					placement: "Auto",
					contentWidth: Device.system.phone ? "auto" : "18rem",
					content: [new VBox({ renderType: "Bare", items: details(node) })],
					afterClose: function () { if (popover) { popover.destroy(); popover = null; } }
				}).addStyleClass("sapUiContentPadding");
				popover.openBy(anchor);
			}

			chart.attachDrawn(function () {
				var inst = chart.instance();
				if (hooked || !inst) { return; }
				hooked = true;
				inst.on("click", function (p) {
					if (p.dataType !== "node") { return; }
					var node = part.data().nodes[p.dataIndex];
					if (node) { open(node, p.event.offsetX, p.event.offsetY); }
				});
			});

			chart.setBuilder(function (d, k) {
				var col = columns(d);
				var maxCol = Math.max.apply(null, Object.keys(col).map(function (id) { return col[id]; }));
				var perCol = {};
				d.nodes.forEach(function (n) { (perCol[col[n.id]] = perCol[col[n.id]] || []).push(n.id); });
				var weak = weakest(d.links);
				var soft = k.T.mix(k.label, k.T.background(), 0.35);
				var nodes = d.nodes.map(function (n) {
					var c = col[n.id], list = perCol[c], i = list.indexOf(n.id);
					var lever = n.kind === "lever";
					return {
						name: n.name, id: n.id,
						value: [maxCol ? c / maxCol : 0, (i + 0.5) / list.length],
						symbol: lever ? "circle" : "roundRect",
						symbolSize: lever ? 16 : [22, 16],
						itemStyle: { color: lever && n.lever ? Tokens.category(n.lever) : k.label, borderColor: k.T.background(), borderWidth: 1 },
						label: { show: true, position: c === 0 ? "left" : c === maxCol ? "right" : "top", color: k.text, fontFamily: k.T.font() }
					};
				});
				var links = d.links.map(function (l) {
					var isWeak = l === weak;
					return {
						source: l.from, target: l.to, value: l.strength,
						lineStyle: { width: 1 + l.strength * 6, color: isWeak ? k.status("critical") : soft, type: isWeak ? "dashed" : "solid",
							opacity: 1, curveness: 0.12 },
						label: { show: isWeak, formatter: t("driverGraph.weakestMark"), color: k.T.statusText("critical"), fontFamily: k.T.font(),
							fontSize: 12, backgroundColor: k.T.background(), padding: [2, 4], borderRadius: 3 }
					};
				});
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						if (p.dataType === "edge") {
							var l = d.links[p.dataIndex];
							return t(l === weak ? "driverGraph.edgeTooltipWeakest" : "driverGraph.edgeTooltip", nodeName(l.from), nodeName(l.to),
								Format.number(l.strength, 2));
						}
						return t("driverGraph.nodeTooltip", p.name);
					} },
					// Nodes sit on hidden value axes, so symbols keep their pixel size and shape at every width.
					// Fixed margins leave room for the node names on either side.
					grid: { left: 96, right: 72, top: 24, bottom: 24, containLabel: false },
					xAxis: { type: "value", min: 0, max: 1, show: false },
					yAxis: { type: "value", min: 0, max: 1, inverse: true, show: false },
					series: [{
						type: "graph", layout: "none", coordinateSystem: "cartesian2d", roam: false,
						data: nodes, links: links,
						edgeSymbol: ["none", "arrow"], edgeSymbolSize: 7,
						emphasis: { focus: "adjacency", lineStyle: { opacity: 1 } },
						cursor: "pointer"
					}]
				});
				function nodeName(id) { return (d.nodes.find(function (n) { return n.id === id; }) || { name: id }).name; }
			});

			/** Highlights one link (by its index in data.links) and its two nodes; null clears. */
			function highlight(index) {
				var inst = chart.instance();
				if (!inst) { return; }
				// A highlighted edge is only released by a downplay naming that edge.
				(part.data() ? part.data().links : []).forEach(function (l, i) {
					inst.dispatchAction({ type: "downplay", seriesIndex: 0, dataType: "edge", dataIndex: i });
				});
				if (index !== null && index >= 0) { inst.dispatchAction({ type: "highlight", seriesIndex: 0, dataType: "edge", dataIndex: index }); }
			}
			function selectedIndex() {
				var item = list.getSelectedItem();
				return item ? item.data("link") : null;
			}

			// The keyboard way into the drawing: one row per link, in the order the data gives them.
			var listTitle = new Title({ text: t("driverGraph.list.header"), level: "H4", titleStyle: "H6", wrapping: true })
				.addStyleClass("sapUiSmallMarginTop");
			var list = new List({
				ariaLabelledBy: [listTitle],
				mode: "SingleSelectMaster",
				showSeparators: "Inner",
				selectionChange: function () { highlight(selectedIndex()); }
			});
			// Focusing a row highlights its link; leaving the list goes back to the selected link, or to none.
			function rowFocus(index) {
				return {
					onfocusin: function () { highlight(index); },
					onfocusout: function (e) {
						var el = list.getDomRef();
						if (el && e.relatedTarget && el.contains(e.relatedTarget)) { return; }
						highlight(selectedIndex());
					}
				};
			}

			function fillList(d) {
				var weak = weakest(d.links);
				var name = function (id) { return (d.nodes.find(function (n) { return n.id === id; }) || { name: id }).name; };
				list.destroyItems();
				d.links.forEach(function (l, i) {
					var isWeak = l === weak;
					var strength = t("driverGraph.list.strength", Format.number(l.strength, 2));
					var row = new StandardListItem({
						title: t("driverGraph.list.title", name(l.from), name(l.to)),
						description: l.note ? t("driverGraph.list.strengthNote", strength, l.note) : strength,
						info: isWeak ? t("driverGraph.list.weakest") : "",
						infoState: isWeak ? "Warning" : "None",
						icon: isWeak ? "sap-icon://alert" : ""
					}).data("link", i);
					row.addEventDelegate(rowFocus(i));
					list.addItem(row);
				});
			}

			var part = Part.make({
				key: "driver-graph",
				content: new VBox({ renderType: "Bare", items: [chart, listTitle, list] }),
				empty: t("driverGraph.empty"),
				render: function (d) {
					if (popover) { popover.close(); }
					chart.setData(d);
					fillList(d);
					if (!d.links.length) { part.state("empty"); }
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			/**
			 * Strength of each link = the absolute correlation, across every option of a seeded demo run,
			 * between the lever's setting and the outcome. Nothing is typed in.
			 */
			function corr(xs, ys) {
				var n = xs.length, mx = 0, my = 0;
				xs.forEach(function (x, i) { mx += x / n; my += ys[i] / n; });
				var sxy = 0, sxx = 0, syy = 0;
				xs.forEach(function (x, i) { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); syy += (ys[i] - my) * (ys[i] - my); });
				return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
			}
			function data(seed) {
				var run = sampleOptions.run(Data, seed);
				var setting = {
					price: function (op) { return op.settings.price; },
					display: function (op) { return op.settings.display; },
					feature: function (op) { return op.settings.feature ? 1 : 0; },
					promotion: function (op) { return op.settings.promotion; }
				};
				var outcomes = [
					{ id: "ret", name: t("driverGraph.demo.return"), get: function (op) { return op.ret; } },
					{ id: "cost", name: t("driverGraph.demo.cost"), get: function (op) { return op.cost; } }
				];
				var nodes = run.levers.map(function (l) {
					return { id: l.key, name: l.name, kind: "lever", lever: l.key, detail: t("driverGraph.demo.leverDetail") };
				}).concat(outcomes.map(function (oc) {
					return { id: oc.id, name: oc.name, kind: "outcome", detail: t("driverGraph.demo.outcomeDetail") };
				}));
				var links = [];
				run.levers.forEach(function (l) {
					var xs = run.options.map(setting[l.key]);
					outcomes.forEach(function (oc) {
						var r = corr(xs, run.options.map(oc.get));
						links.push({ from: l.key, to: oc.id, strength: Data.round(Math.abs(r), 2),
							note: t(r >= 0 ? "driverGraph.demo.raising" : "driverGraph.demo.lowering", l.name.toLowerCase(), oc.name.toLowerCase()) });
					});
				});
				return { nodes: nodes, links: links };
			}
			return {
				options: { label: t("driverGraph.demo.label"), data: data(7) },
				next: function (seed) { return data(seed); }
			};
		}
	};
});
