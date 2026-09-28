/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Cause map: why one object is held back, drawn as a chain of dependencies. A read-only version
 * statement, the object's facts, the limiting factors as a list ordered by impact, and a dependency map
 * with the failing path marked. Choosing a factor in the list marks its path in the map, and pressing a
 * factor in the map chooses it in the list. Every link of the map is also a keyboard list item: focusing
 * one lights that link up in the map, and choosing it marks the link and its two ends. On phones the list comes first and the map opens on demand
 * in a full-screen dialog.
 *
 * Use it to explain one object that is late or blocked. Do not use it for a set of objects; that is the
 * item register. The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/f/Card",
	"sap/f/cards/Header",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/ObjectStatus",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Toolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/FlexItemData",
	"accents/core/Layout",
	"accents/core/Chart",
	"accents/core/Format",
	"accents/elements/common/VersionContext",
	"accents/elements/common/SourceLine",
	"sap/ui/core/InvisibleText",
	"accents/core/I18n"
], function (Device, Card, CardHeader, VBox, HBox, Title, Text, Label, Button, Dialog, List, StandardListItem, ObjectStatus,
	SegmentedButton, SegmentedButtonItem, Toolbar, ToolbarSpacer, FlexItemData, Layout, Chart, Format, VersionContext, SourceLine,
	InvisibleText, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.CauseMap");

	/**
	 * regions:
	 *   context     the read-only version statement (VersionContext)
	 *   facts       the object's facts, with its assistant button
	 *   factors     the limiting factors (a sap.m.List ordered by impact)
	 *   links       optional: every dependency of the map as a keyboard list (a sap.m.List), under the factors
	 *   graph       the dependency map (one chart)
	 *   graphTitle  short noun for the map ("Dependency map")
	 *   graphTools  controls for the map's toolbar (orientation, zoom)
	 *   source      the source line control
	 *
	 * Wide: list and map side by side, wrapping to one above the other when the region narrows.
	 * Phone: the list, then a button that opens the map in a full-screen dialog.
	 */
	function compose(r) {
		var title = r.graphTitle || t("causeMap.graphTitle");
		var mapBody = new VBox({ renderType: "Bare", items: [
			new Toolbar({ style: "Clear", content: [new ToolbarSpacer()].concat(r.graphTools || []) }),
			r.graph
		] });
		var card = new Card({ header: new CardHeader({ title: title }), content: new VBox({ renderType: "Bare", width: "100%",
			items: [mapBody] }).addStyleClass("accCardBody") }).addStyleClass("accCard");
		card.setLayoutData(new FlexItemData({ growFactor: 3, baseSize: "28rem", minWidth: "0" }));

		var listBox = new VBox({ renderType: "Bare", items: [r.factors].concat(r.links ? [r.links] : []) }).addStyleClass("sapUiSmallMarginEnd sapUiSmallMarginBottom");
		listBox.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "18rem", minWidth: "16rem", maxWidth: "100%" }));
		var body = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Start", items: [listBox, card] });

		var dialog = null;
		var openBtn = new Button({ text: title, icon: "sap-icon://org-chart", width: "100%", press: function () {
			if (!dialog) {
				dialog = new Dialog({ title: title, stretch: true, verticalScrolling: true,
					endButton: new Button({ text: t("causeMap.close"), press: function () { dialog.close(); } }) });
				body.addDependent(dialog);
			}
			dialog.addContent(mapBody);
			dialog.open();
		} }).addStyleClass("sapUiSmallMarginBottom");

		var phone = null;
		function adapt() {
			var now = Layout.narrower("phone");
			if (now === phone) { return; }
			phone = now;
			card.setVisible(!phone);
			openBtn.setVisible(phone);
			// On a phone the map fills the dialog; elsewhere it keeps the height it was given.
			if (r.graph.setHeight) {
				if (!r.graph.data("accHeight")) { r.graph.data("accHeight", r.graph.getHeight()); }
				r.graph.setHeight(phone ? "calc(100vh - 9rem)" : r.graph.data("accHeight"));
			}
			if (phone) {
				card.getContent().removeItem(mapBody);
			} else {
				if (dialog) { dialog.close(); dialog.removeContent(mapBody); }
				card.getContent().addItem(mapBody);
			}
		}
		Device.resize.attachHandler(adapt);
		adapt();

		var items = [];
		if (r.context) { items.push(r.context); }
		if (r.facts) { items.push(r.facts); }
		items.push(body, openBtn);
		if (r.source) { items.push(r.source); }
		var root = new VBox({ renderType: "Bare", items: items });
		var destroy = root.destroy;
		root.destroy = function () { Device.resize.detachHandler(adapt); return destroy.apply(root, arguments); };
		return root;
	}

	return {
		info: {
			controls: ["accents.core.Chart (Apache ECharts graph)", "sap.m.List", "sap.f.Card", "sap.m.SegmentedButton", "sap.m.Dialog"],
			motion: "When data changes the map's links and nodes move to their new places. Choosing a factor fades the rest of the map; nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var OBJECT = t("causeMap.demo.object");
			/** The dependency structure: each node needs the nodes in `needs` before it can go ahead. */
			var NODES = [
				{ id: "obj", name: OBJECT, needs: ["space", "volume", "budget", "price"] },
				{ id: "space", name: t("causeMap.demo.node.space"), needs: ["fitting"] },
				{ id: "fitting", name: t("causeMap.demo.node.fitting"), needs: [] },
				{ id: "volume", name: t("causeMap.demo.node.volume"), needs: ["trucks", "artwork"] },
				{ id: "trucks", name: t("causeMap.demo.node.trucks"), needs: [] },
				{ id: "artwork", name: t("causeMap.demo.node.artwork"), needs: [] },
				{ id: "budget", name: t("causeMap.demo.node.budget"), needs: ["signoff"] },
				{ id: "signoff", name: t("causeMap.demo.node.signoff"), needs: [] },
				{ id: "price", name: t("causeMap.demo.node.price"), needs: [] }
			];
			var byId = {};
			NODES.forEach(function (n) { byId[n.id] = n; });
			var launch = Data.periods(Data.SAMPLE_TODAY, 2)[1] + "-15";

			/**
			 * Each starting dependency is ready some days after the launch date (0 means on time), drawn
			 * from a seeded generator. A node's delay is the longest delay among what it needs.
			 */
			function build(seed) {
				var random = Data.rng(seed * 7 + 11);
				var delay = {};
				var leaves = NODES.filter(function (n) { return !n.needs.length; });
				leaves.forEach(function (n) { delay[n.id] = random() < 0.45 ? 3 + Math.floor(random() * 22) : 0; });
				if (!leaves.some(function (n) { return delay[n.id] > 0; })) { delay[leaves[Math.floor(random() * leaves.length)].id] = 4 + Math.floor(random() * 10); }
				(function walk(id) {
					var n = byId[id];
					if (!n.needs.length) { return delay[id]; }
					delay[id] = Math.max.apply(null, n.needs.map(walk));
					return delay[id];
				})("obj");
				var factors = leaves.filter(function (n) { return delay[n.id] > 0; })
					.sort(function (a, b) { return delay[b.id] - delay[a.id]; })
					.map(function (n) { return { id: n.id, name: n.name, delay: delay[n.id], path: pathUp(n.id) }; });
				return { delay: delay, factors: factors };
			}
			/** The chain from one node up to the object: [node, ..., "obj"]. */
			function pathUp(id) {
				var path = [id];
				while (path[path.length - 1] !== "obj") {
					var cur = path[path.length - 1];
					path.push(NODES.find(function (n) { return n.needs.indexOf(cur) >= 0; }).id);
				}
				return path;
			}
			function days(n) { return n === 1 ? t("causeMap.day", n) : t("causeMap.days", n); }
			/** Every link of the map, in the order the map draws them: `source` is needed by `target`. */
			var LINKS = [];
			NODES.forEach(function (n) { n.needs.forEach(function (c) { LINKS.push({ source: c, target: n.id }); }); });

			/** Depth of each node below the object: the object is 0. */
			var depth = { obj: 0 };
			(function down(id) { byId[id].needs.forEach(function (c) { depth[c] = depth[id] + 1; down(c); }); })("obj");
			var maxDepth = Math.max.apply(null, Object.keys(depth).map(function (id) { return depth[id]; }));
			var column = {};
			NODES.forEach(function (n) { (column[depth[n.id]] = column[depth[n.id]] || []).push(n.id); });

			var state = { model: build(7), selected: null, link: null, down: false, zoom: 1 };

			/* ---------- the map ---------- */
			var chart = new Chart({ label: t("causeMap.chartLabel", OBJECT), height: "26rem", selectable: true });
			chart.setBuilder(function (s, k) {
				var model = s.model;
				var worst = model.factors[0];
				var focus = s.selected ? model.factors.find(function (f) { return f.id === s.selected; }) : worst;
				var onPath = function (a, b) {
					if (!focus) { return false; }
					var i = focus.path.indexOf(a);
					return i >= 0 && focus.path[i + 1] === b;
				};
				// A dependency picked in the keyboard list marks that one link and its two ends.
				var picked = s.link === null || s.link === undefined ? null : LINKS[s.link];
				if (picked) {
					focus = { path: [picked.source, picked.target] };
					onPath = function (a, b) { return a === picked.source && b === picked.target; };
				}
				var dim = !!s.selected || !!picked;
				// Positions in pixels of the drawing area, so the view scales both axes alike and symbols keep their shape.
				var el = chart.getDomRef();
				// A narrow map (a phone) puts every label under its node, so no name runs off the edge.
				var narrow = (k.width || 600) < 480;
				var box = narrow ? { left: 56, right: 64, top: 32, bottom: 64 } : { left: s.down ? 64 : 120, right: s.down ? 64 : 72, top: 40, bottom: 48 };
				var W = Math.max(200, (k.width || 600) - box.left - box.right);
				var Hh = Math.max(160, ((el && el.clientHeight) || 416) - box.top - box.bottom);
				var nodes = NODES.map(function (n) {
					var d = depth[n.id], list = column[d], i = list.indexOf(n.id);
					var along = (i + 0.5) / list.length, step = maxDepth - d;
					var late = model.delay[n.id] > 0, isObj = n.id === "obj";
					var inFocus = !!focus && focus.path.indexOf(n.id) >= 0;
					return {
						id: n.id, name: n.name,
						x: s.down ? along * W : step / maxDepth * W, y: s.down ? step / maxDepth * Hh : along * Hh,
						symbol: isObj ? "roundRect" : late ? "triangle" : "circle",
						symbolSize: isObj ? [26, 18] : 16,
						itemStyle: { color: isObj ? k.series(0) : late ? k.status("bad") : k.status("neutral"),
							borderColor: k.T.background(), borderWidth: 1, opacity: dim && !inFocus ? 0.3 : 1 },
						label: { show: true, color: k.text, fontFamily: k.T.font(), opacity: dim && !inFocus ? 0.45 : 1,
							position: d === 0 || narrow ? "bottom" : s.down ? "right" : d === maxDepth ? "left" : "top", distance: 6,
							width: narrow ? 104 : undefined, overflow: narrow ? "break" : "none", align: "center",
							formatter: late ? t(isObj ? "causeMap.node.held" : "causeMap.node.late", n.name, days(model.delay[n.id])) : t("causeMap.node.onTime", n.name) }
					};
				});
				var links = LINKS.map(function (lk) {
						var c = lk.source, n = byId[lk.target];
						var failing = model.delay[c] > 0, hot = onPath(c, n.id);
						return {
							source: c, target: n.id,
							lineStyle: {
								color: failing ? k.status("bad") : k.T.mix(k.label, k.T.background(), 0.35),
								type: failing ? "dashed" : "solid", width: hot ? 4 : failing ? 2 : 1.5,
								opacity: dim && !hot ? 0.25 : 1, curveness: 0
							},
							label: { show: hot && n.id === "obj" && !picked, formatter: t("causeMap.failingPath"), color: k.T.statusText("bad"), fontFamily: k.T.font(),
								backgroundColor: k.T.background(), padding: [2, 4], borderRadius: 3 }
						};
				});
				return k.base({
					tooltip: { trigger: "item", confine: true, formatter: function (p) {
						if (p.dataType === "edge") {
							var l = links[p.dataIndex];
							return model.delay[l.source] > 0 ? t("causeMap.tip.linkLate", byId[l.target].name, byId[l.source].name, days(model.delay[l.source])) :
								t("causeMap.tip.linkOnTime", byId[l.target].name, byId[l.source].name);
						}
						var n = NODES[p.dataIndex];
						return model.delay[n.id] > 0 ? t("causeMap.tip.nodeLate", n.name, days(model.delay[n.id])) : t("causeMap.tip.nodeOnTime", n.name);
					} },
					series: [{
						type: "graph", layout: "none", roam: true, zoom: s.zoom, scaleLimit: { min: 0.5, max: 3 },
						left: box.left, right: box.right, top: box.top, bottom: box.bottom,
						data: nodes, links: links,
						edgeSymbol: ["none", "arrow"], edgeSymbolSize: 8,
						emphasis: { focus: "adjacency" }
					}]
				});
			});
			chart.attachSelect(function (e) {
				var f = state.model.factors.find(function (x) { return x.name === e.getParameter("name"); });
				if (f) { choose(f.id); }
			});

			var orientation = new SegmentedButton({ selectedKey: "across", tooltip: t("causeMap.orientation"), items: [
				new SegmentedButtonItem({ key: "across", text: t("causeMap.across"), tooltip: t("causeMap.across.tooltip") }),
				new SegmentedButtonItem({ key: "down", text: t("causeMap.down"), tooltip: t("causeMap.down.tooltip") })
			], selectionChange: function (e) { state.down = e.getParameter("item").getKey() === "down"; draw(true); } });
			orientation.addAriaLabelledBy(new InvisibleText({ text: t("causeMap.orientation") }).toStatic());
			function zoomBy(f) {
				state.zoom = Math.max(0.5, Math.min(3, state.zoom * f));
				draw(false);
			}
			var zoomOut = new Button({ icon: "sap-icon://zoom-out", type: "Transparent", tooltip: t("causeMap.zoomOut"), press: function () { zoomBy(0.8); } });
			var zoomIn = new Button({ icon: "sap-icon://zoom-in", type: "Transparent", tooltip: t("causeMap.zoomIn"), press: function () { zoomBy(1.25); } });
			var fit = new Button({ icon: "sap-icon://full-screen", type: "Transparent", tooltip: t("causeMap.fit"),
				press: function () { state.zoom = 1; draw(true); } });
			function draw(full) {
				chart.setData(Object.assign({}, state));
				if (full) { chart.rebuild(); }
				zoomIn.setEnabled(state.zoom < 3);
				zoomOut.setEnabled(state.zoom > 0.5);
			}

			/* ---------- the list ---------- */
			var list = new List({ mode: "SingleSelectMaster", showSeparators: "Inner", headerLevel: "H3", noDataText: t("causeMap.factors.none"),
				selectionChange: function (e) { choose(e.getParameter("listItem").data("id")); } });
			function choose(id) {
				state.selected = id;
				state.link = null;
				list.getItems().forEach(function (it) { it.setSelected(it.data("id") === id); });
				linkList.removeSelections(true);
				draw(false);
			}

			/* ---------- every dependency, for the keyboard ---------- */
			// The map itself takes no keyboard focus, so each of its links is also a list item. Moving focus
			// onto an item lights up that link in the map; choosing it marks the link until something else is chosen.
			function light(on, i) {
				var inst = chart.instance();
				if (inst) { inst.dispatchAction({ type: on ? "highlight" : "downplay", seriesIndex: 0, dataType: "edge", dataIndex: i }); }
			}
			var linkList = new List({ mode: "SingleSelectMaster", showSeparators: "Inner", headerLevel: "H3",
				selectionChange: function (e) { pickLink(e.getParameter("listItem").data("index")); } }).addStyleClass("sapUiSmallMarginTop");
			function pickLink(i) {
				state.selected = null;
				state.link = i;
				list.removeSelections(true);
				linkList.getItems().forEach(function (it) { it.setSelected(it.data("index") === i); });
				draw(false);
			}
			function fillLinks() {
				var m = state.model;
				linkList.setHeaderText(t("causeMap.links.title", LINKS.length));
				linkList.destroyItems();
				LINKS.forEach(function (lk, i) {
					var late = m.delay[lk.source] > 0;
					var item = new StandardListItem({
						title: t("causeMap.links.item", byId[lk.target].name, byId[lk.source].name),
						description: late ? t("causeMap.links.failing", byId[lk.source].name, days(m.delay[lk.source])) :
							t("causeMap.links.clear", byId[lk.source].name),
						info: late ? t("causeMap.links.failingInfo") : t("causeMap.links.clearInfo"),
						infoState: late ? "Error" : "Success", wrapping: true, selected: state.link === i
					}).data("index", i);
					item.addEventDelegate({ onfocusin: function () { light(true, i); }, onfocusout: function () { light(false, i); } });
					linkList.addItem(item);
				});
			}
			function fillList() {
				var m = state.model;
				list.setHeaderText(t("causeMap.factors.title", m.factors.length));
				list.destroyItems();
				m.factors.forEach(function (f) {
					var chain = f.path.slice(1, -1).map(function (id) { return byId[id].name; });
					list.addItem(new StandardListItem({
						title: f.name,
						description: chain.length ? t("causeMap.factor.readyHolds", days(f.delay), chain.reduce(function (x, y) { return t("causeMap.factor.chain", x, y); })) :
							t("causeMap.factor.ready", days(f.delay)),
						info: t("causeMap.factor.late", days(f.delay)), infoState: "Error", wrapping: true
					}).data("id", f.id));
				});
			}

			/* ---------- facts ---------- */
			var held = new ObjectStatus(), delayText = new Text().addStyleClass("accTabular"), ready = new Text();
			function fact(label, control) {
				return new VBox({ renderType: "Bare", items: [new Label({ text: label, labelFor: control }), control] }).addStyleClass("sapUiMediumMarginEnd sapUiSmallMarginBottom");
			}
			var name = new Title({ text: OBJECT, level: "H2", titleStyle: "H4", wrapping: true });
			var ai = ctx.assistant.objectButton({ title: OBJECT, get: function () {
				var m = state.model;
				return {
					title: OBJECT,
					facts: (function () {
						var o = {};
						o[t("causeMap.ai.object")] = OBJECT;
						o[t("causeMap.launchDate")] = Format.when(new Date(launch + "T00:00:00Z"));
						o[t("causeMap.ai.heldBy")] = days(m.delay.obj);
						var named = m.factors.map(function (f) { return t("causeMap.ai.factor", f.name, days(f.delay)); });
						o[t("causeMap.ai.factors")] = named.length ? named.reduce(function (x, y) { return t("causeMap.ai.list", x, y); }) : t("causeMap.ai.none");
						return o;
					}()),
					question: t("causeMap.ai.question", OBJECT)
				};
			} });
			var facts = new VBox({ renderType: "Bare", items: [
				new HBox({ renderType: "Bare", alignItems: "Center", items: [name, ai] }).addStyleClass("sapUiSmallMarginTop"),
				new HBox({ renderType: "Bare", wrap: "Wrap", items: [
					fact(t("causeMap.status"), held), fact(t("causeMap.launchDate"), new Text({ text: new Date(launch + "T00:00:00Z").toLocaleDateString(undefined,
						{ day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) })), fact(t("causeMap.delay"), delayText), fact(t("causeMap.readyBy"), ready)
				] }).addStyleClass("sapUiSmallMarginTop")
			] });
			function fillFacts() {
				var d = state.model.delay.obj;
				held.setText(d > 0 ? t("causeMap.heldBack") : t("causeMap.onTime"));
				held.setState(d > 0 ? "Error" : "Success");
				held.setIcon(d > 0 ? "sap-icon://locked" : "sap-icon://sys-enter-2");
				delayText.setText(days(d));
				ready.setText(new Date(Date.parse(launch + "T00:00:00Z") + d * 86400000).toLocaleDateString(undefined,
					{ day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }));
			}

			function load(seed) {
				state.model = build(seed);
				if (state.selected && !state.model.factors.some(function (f) { return f.id === state.selected; })) { state.selected = null; }
				fillFacts();
				fillList();
				fillLinks();
				if (state.selected) { choose(state.selected); } else { draw(false); }
			}
			load(7);

			var meta = Data.sampleMeta();
			var control = compose({
				context: VersionContext.create({ data: { name: t("causeMap.demo.plan", Data.SAMPLE_TODAY.slice(0, 4)), kind: t("causeMap.demo.planKind"), savedAt: meta.readAt } }).root,
				facts: facts,
				factors: list,
				links: linkList,
				graph: chart,
				graphTitle: t("causeMap.graphTitle"),
				graphTools: [orientation, zoomOut, zoomIn, fit],
				source: SourceLine.create({ data: meta }).root
			});
			return {
				control: control,
				next: function (seed) { return function () { load(seed); }; }
			};
		}
	};
});
