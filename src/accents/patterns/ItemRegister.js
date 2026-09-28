/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Item register: find and act on items in a set. A read-only version statement on top, then saved
 * views and one counted filter, then a dense table with sticky headers that grows as it scrolls. The
 * table's toolbar carries the titled count, a search that filters, column settings and an export of
 * the rows in view. Pressing a row opens the item. On phones secondary columns drop below their row.
 *
 * Use it when people look for items in a set and open them. Do not use it to compare items on a chart;
 * that is the review board. The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Label",
	"sap/m/Select",
	"sap/m/ScrollContainer",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/SearchField",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/DisplayListItem",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"sap/ui/core/Item",
	"sap/ui/Device",
	"sap/ui/core/ResizeHandler",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"accents/core/Format",
	"accents/elements/common/VersionContext",
	"accents/elements/common/CountedSwitch",
	"accents/elements/common/SourceLine",
	"accents/elements/review/InCellBar",
	"accents/core/I18n"
], function (VBox, HBox, Label, Select, ScrollContainer, Table, Column, ColumnListItem, OverflowToolbar, OverflowToolbarLayoutData,
	ToolbarSpacer, Title, Text, SearchField, Button, Dialog, List, StandardListItem, DisplayListItem, ObjectIdentifier, ObjectStatus,
	FlexItemData, Item, Device, ResizeHandler, JSONModel, Filter, Sorter, Format, VersionContext, CountedSwitch, SourceLine, InCellBar, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ItemRegister");

	/**
	 * regions:
	 *   context  the read-only version statement (VersionContext)
	 *   views    the saved-view chooser (a sap.m.Select)
	 *   filter   the counted filter (CountedSwitch)
	 *   table    the sap.m.Table; the pattern makes its headers sticky and scrolls it in place
	 *   height   CSS height of the scrolling table area (default "32rem")
	 *   source   the source line control
	 */
	function compose(r) {
		var bar = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "End" }).addStyleClass("sapUiSmallMarginTopBottom");
		if (r.views) {
			var viewLabel = new Label({ text: t("itemRegister.view"), labelFor: r.views });
			bar.addItem(new VBox({ renderType: "Bare", width: "14rem", items: [viewLabel, r.views] }).addStyleClass("sapUiSmallMarginEnd sapUiTinyMarginBottom"));
		}
		if (r.filter) {
			r.filter.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "14rem", maxWidth: "40rem" }));
			r.filter.addStyleClass("sapUiTinyMarginBottom");
			bar.addItem(r.filter);
		}
		var items = [];
		if (r.context) { items.push(r.context); }
		if (bar.getItems().length) { items.push(bar); }
		if (r.table) {
			// Sticky headers need a scroll area of limited height; growing on scroll uses the same area.
			r.table.setSticky(["HeaderToolbar", "ColumnHeaders"]);
			var scroller = new ScrollContainer({ vertical: true, horizontal: false, width: "100%", height: r.height || "32rem", content: [r.table] });
			// Columns pop in by the table's own width, not the window's, so a narrow region behaves like a
			// phone. The table's "Auto" contextual width did not react on first render, so the width is set here.
			var fit = function () {
				var el = scroller.getDomRef();
				if (el && el.clientWidth && r.table.getContextualWidth() !== el.clientWidth + "px") { r.table.setContextualWidth(el.clientWidth + "px"); }
			};
			scroller.addEventDelegate({ onAfterRendering: function () {
				if (!scroller._accResize) { scroller._accResize = ResizeHandler.register(scroller, fit); }
				fit();
			} });
			items.push(scroller);
		}
		if (r.source) { items.push(r.source); }
		return new VBox({ renderType: "Bare", items: items });
	}

	/** Quotes one CSV field when it holds a comma, a quote or a line break. */
	function csvField(v) {
		var s = v === null || v === undefined ? "" : String(v);
		return /[",\r\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
	}

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.Select", "sap.m.SearchField", "sap.m.OverflowToolbar", "sap.m.Dialog", "sap.m.ScrollContainer"],
			motion: "Counts in the filter pulse and changed in-cell figures flash when data changes. Rows arrive as the table grows; nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var STORES = ["harbor", "pine", "mill", "quay", "oldTown", "station", "riverside", "market"].map(function (key) {
				return t("itemRegister.demo.store." + key);
			});
			var pct = function (v) { return Format.percent(v, 1); };
			var k = function (v) { return t("itemRegister.thousands", Format.number(v, 1)); };

			/**
			 * One row per category and store. A store's sales and plan are shares of the category's
			 * year-to-date figures, drawn from a seeded generator; the newest store has no actuals yet.
			 * Attainment is sales divided by plan.
			 */
			function rows(seed) {
				var s = Data.sample(seed);
				var random = Data.rng(seed * 17 + 5);
				var out = [];
				s.items.forEach(function (i) {
					STORES.forEach(function (store, n) {
						var share = (0.6 + random() * 0.8) / STORES.length;
						var plan = i.plan * share;
						var fresh = n === STORES.length - 1;
						var actual = fresh ? null : plan * (0.86 + random() * 0.26);
						var att = actual === null ? null : actual / plan;
						out.push({
							id: i.id + "-" + String(n + 1).padStart(2, "0"), name: i.name, group: i.group, store: store,
							actual: actual === null ? null : Data.round(actual, 1), plan: Data.round(plan, 1), attainment: att,
							margin: actual === null ? null : Data.round(i.margin + (random() - 0.5) * 0.08, 3),
							status: att === null ? "none" : att < 0.98 ? "behind" : "on"
						});
					});
				});
				return out;
			}

			var STATUS = {
				behind: { text: t("itemRegister.status.behind"), state: "Error", icon: "sap-icon://trend-down" },
				on: { text: t("itemRegister.status.on"), state: "Success", icon: "sap-icon://sys-enter-2" },
				none: { text: t("itemRegister.status.none"), state: "None", icon: "sap-icon://pending" }
			};

			var model = new JSONModel({ rows: rows(7) });
			model.setSizeLimit(10000);
			var maxAtt = function () {
				return model.getProperty("/rows").reduce(function (m, r) { return r.attainment === null ? m : Math.max(m, r.attainment); }, 0) || 1;
			};

			/** Every column: header, how the cell is drawn, how it is written to CSV, and how it behaves on phones. */
			var COLS = [
				{ key: "item", label: t("itemRegister.col.item"), fixed: true, csv: function (r) { return r.name; },
					cell: function (r) { return new ObjectIdentifier({ title: r.name }); } },
				{ key: "id", label: t("itemRegister.col.id"), csv: function (r) { return r.id; }, popin: "Desktop",
					cell: function (r) { return new Text({ text: r.id }); } },
				{ key: "store", label: t("itemRegister.col.store"), csv: function (r) { return r.store; }, popin: true,
					cell: function (r) { return new Text({ text: r.store }); } },
				{ key: "group", label: t("itemRegister.col.group"), csv: function (r) { return r.group; }, popin: "Desktop",
					cell: function (r) { return new Text({ text: r.group }); } },
				{ key: "sales", label: t("itemRegister.col.sales"), align: "End", csv: function (r) { return r.actual; },
					cell: function (r) { return new Text({ text: r.actual === null ? Format.number(null) : k(r.actual) }).addStyleClass("accTabular"); } },
				{ key: "attainment", label: t("itemRegister.col.attainment"), width: "12rem", popin: true,
					csv: function (r) { return r.attainment === null ? "" : Data.round(r.attainment, 4); },
					cell: function (r) {
						return InCellBar.cell(r.attainment, { max: maxAtt(), format: pct, reference: 1, polarity: "up",
							emptyText: t("itemRegister.noActualsYet") }).root;
					} },
				{ key: "margin", label: t("itemRegister.col.margin"), align: "End", popin: "Desktop", csv: function (r) { return r.margin; },
					cell: function (r) { return new Text({ text: Format.percent(r.margin) }).addStyleClass("accTabular"); } },
				{ key: "status", label: t("itemRegister.col.status"), csv: function (r) { return STATUS[r.status].text; },
					cell: function (r) { var s = STATUS[r.status]; return new ObjectStatus({ text: s.text, state: s.state, icon: s.icon }); } }
			];
			var columns = COLS.map(function (c) {
				var settings = { header: new Text({ text: c.label }), hAlign: c.align || "Begin" };
				if (c.width) { settings.width = c.width; }
				if (c.popin) { settings.minScreenWidth = c.popin === true ? "Tablet" : c.popin; settings.demandPopin = true; settings.popinDisplay = "Inline"; }
				var col = new Column(settings);
				col.data("key", c.key);
				return col;
			});

			/* ---------- toolbar ---------- */
			var heading = new Title({ text: t("itemRegister.items"), level: "H2", titleStyle: "H5" });
			var search = new SearchField({ width: "100%", placeholder: t("itemRegister.search"), liveChange: apply, search: apply });
			search.setLayoutData(new OverflowToolbarLayoutData({ minWidth: "10rem", maxWidth: "16rem", shrinkable: true, priority: "NeverOverflow" }));
			var settingsBtn = new Button({ icon: "sap-icon://action-settings", type: "Transparent", tooltip: t("itemRegister.columns"),
				text: t("itemRegister.columns"), press: openColumns });
			settingsBtn.setLayoutData(new OverflowToolbarLayoutData({ priority: "Low" }));
			var exportBtn = new Button({ icon: "sap-icon://download", type: "Transparent", text: t("itemRegister.export"),
				tooltip: t("itemRegister.export.tooltip"), press: exportCsv });
			exportBtn.setLayoutData(new OverflowToolbarLayoutData({ priority: "Low" }));

			var table = new Table({
				headerToolbar: new OverflowToolbar({ content: [heading, new ToolbarSpacer(), search, settingsBtn, exportBtn] }),
				columns: columns,
				growing: true,
				growingThreshold: 20,
				growingScrollToLoad: true,
				popinLayout: "GridSmall",
				noDataText: t("itemRegister.noData"),
				itemPress: function (e) { open(e.getParameter("listItem").getBindingContext().getObject()); }
			}).addStyleClass("sapUiSizeCompact");
			table.setModel(model);
			table.bindItems({ path: "/rows", factory: function (id, c) {
				var r = c.getObject();
				return new ColumnListItem(id, { type: "Navigation", cells: COLS.map(function (col) { return col.cell(r); }) });
			} });

			/* ---------- saved views and the counted filter ---------- */
			var VIEWS = {
				standard: { text: t("itemRegister.view.standard"), sort: [new Sorter("name"), new Sorter("store")], hide: [] },
				weakest: { text: t("itemRegister.view.weakest"), sort: [new Sorter("attainment")], hide: ["group", "margin"] },
				margin: { text: t("itemRegister.view.margin"), sort: [new Sorter("margin")], hide: ["attainment"] }
			};
			var views = new Select({ width: "100%", selectedKey: "standard", change: function () { applyView(); },
				items: Object.keys(VIEWS).map(function (key) { return new Item({ key: key, text: VIEWS[key].text }); }) });
			var status = "all";
			var filter = CountedSwitch.create({ label: t("itemRegister.statusFilter"), onSelect: function (key) { status = key; apply(); } });

			function applyView() {
				var v = VIEWS[views.getSelectedKey()];
				columns.forEach(function (col) { col.setVisible(v.hide.indexOf(col.data("key")) < 0); });
				table.getBinding("items").sort(v.sort);
			}

			function matches(r, q) {
				return !q || [r.name, r.id, r.store, r.group].some(function (v) { return v.toLowerCase().indexOf(q) >= 0; });
			}

			/** Applies search and status together, and recounts the filter over the rows the search leaves. */
			function apply() {
				var q = (search.getValue() || "").trim().toLowerCase();
				var found = model.getProperty("/rows").filter(function (r) { return matches(r, q); });
				var count = function (st) { return found.filter(function (r) { return r.status === st; }).length; };
				filter.update({ selected: status, options: [
					{ key: "all", label: t("itemRegister.filter.all"), count: found.length },
					{ key: "behind", label: STATUS.behind.text, count: count("behind"), tooltip: t("itemRegister.filter.behind.tooltip") },
					{ key: "on", label: STATUS.on.text, count: count("on"), tooltip: t("itemRegister.filter.on.tooltip") },
					{ key: "none", label: STATUS.none.text, count: count("none"), tooltip: t("itemRegister.filter.none.tooltip") }
				] });
				var byId = {};
				found.forEach(function (r) { byId[r.id] = r; });
				var test = new Filter({ path: "id", test: function (id) { var r = byId[id]; return !!r && (status === "all" || r.status === status); } });
				var binding = table.getBinding("items");
				binding.filter([test]);
				heading.setText(t("itemRegister.itemsCount", binding.getLength()));
				exportBtn.setEnabled(binding.getLength() > 0);
				exportBtn.setTooltip(binding.getLength() ? t("itemRegister.export.tooltip") : t("itemRegister.export.none"));
			}

			/* ---------- columns dialog ---------- */
			var colDialog = null;
			function openColumns() {
				if (!colDialog) {
					var list = new List({ mode: "MultiSelect", includeItemInSelection: true });
					COLS.forEach(function (c, i) {
						if (c.fixed) { return; }
						list.addItem(new StandardListItem({ title: c.label }).data("index", i));
					});
					colDialog = new Dialog({ title: t("itemRegister.columns"), contentWidth: "20rem", stretch: Device.system.phone, content: [list],
						beginButton: new Button({ text: t("itemRegister.apply"), type: "Emphasized", press: function () {
							list.getItems().forEach(function (it) { columns[it.data("index")].setVisible(it.getSelected()); });
							colDialog.close();
						} }),
						endButton: new Button({ text: t("itemRegister.cancel"), press: function () { colDialog.close(); } }) });
					colDialog.data("list", list);
					table.addDependent(colDialog);
				}
				colDialog.data("list").getItems().forEach(function (it) { it.setSelected(columns[it.data("index")].getVisible()); });
				colDialog.open();
			}

			/* ---------- export ---------- */
			function exportCsv() {
				var binding = table.getBinding("items");
				var shown = COLS.filter(function (c, i) { return columns[i].getVisible(); });
				var lines = [shown.map(function (c) { return csvField(c.label); }).join(",")];
				binding.getContexts(0, binding.getLength()).forEach(function (c) {
					var r = c.getObject();
					lines.push(shown.map(function (col) { return csvField(col.csv(r)); }).join(","));
				});
				var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
				var url = URL.createObjectURL(blob);
				var a = document.createElement("a");
				a.href = url;
				a.download = "items.csv";
				document.body.appendChild(a);
				a.click();
				a.remove();
				setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
			}

			/* ---------- one item ---------- */
			var detail = null;
			function open(r) {
				if (detail) { detail.destroy(); }
				var statusKey = t("itemRegister.col.status");
				var facts = {};
				facts[t("itemRegister.col.item")] = t("itemRegister.nameAndId", r.name, r.id);
				facts[t("itemRegister.col.store")] = r.store;
				facts[t("itemRegister.col.group")] = r.group;
				facts[t("itemRegister.salesToDate")] = r.actual === null ? t("itemRegister.noneYet") : k(r.actual);
				facts[t("itemRegister.planToDate")] = k(r.plan);
				facts[t("itemRegister.col.attainment")] = r.attainment === null ? t("itemRegister.noneYet") : pct(r.attainment);
				facts[statusKey] = STATUS[r.status].text;
				var list = new List({ showSeparators: "Inner", items: Object.keys(facts).filter(function (key) { return key !== statusKey; }).map(function (key) {
					return new DisplayListItem({ label: key, value: facts[key] });
				}) });
				var titleText = new Title({ text: t("itemRegister.itemAtStore", r.name, r.store), level: "H2", titleStyle: "H5", wrapping: true });
				titleText.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "0" }));
				var head = new HBox({ renderType: "Bare", alignItems: "Center", items: [titleText,
					ctx.assistant.objectButton({ title: t("itemRegister.ai.title", r.name, r.store), facts: facts,
						question: t("itemRegister.ai.question", r.name, r.store) })
				] }).addStyleClass("sapUiSmallMarginBeginEnd sapUiSmallMarginTop");
				var st = STATUS[r.status];
				detail = new Dialog({ title: t("itemRegister.col.item"), contentWidth: "26rem", stretch: Device.system.phone,
					content: [head, new ObjectStatus({ text: st.text, state: st.state, icon: st.icon }).addStyleClass("sapUiSmallMarginBeginEnd"), list],
					endButton: new Button({ text: t("itemRegister.close"), press: function () { detail.close(); } }) });
				table.addDependent(detail);
				detail.open();
			}

			applyView();
			apply();
			var meta = Data.sampleMeta();
			var control = compose({
				context: VersionContext.create({ data: { name: t("itemRegister.demo.plan", Data.SAMPLE_TODAY.slice(0, 4)), kind: t("itemRegister.demo.planKind"), savedAt: meta.readAt } }).root,
				views: views,
				filter: filter.root,
				table: table,
				source: SourceLine.create({ data: meta }).root
			});
			return {
				control: control,
				next: function (seed) { return function () { model.setProperty("/rows", rows(seed)); apply(); }; }
			};
		}
	};
});
