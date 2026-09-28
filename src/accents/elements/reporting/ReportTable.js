/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Report table: the rows of a report in a sap.ui.table.Table. People sort by any column and group by
 * one text column from the column header menu or the settings dialog (sap.m.p13n.Popup), which also
 * chooses and orders the columns. Each group opens with a header row carrying its count and
 * subtotals, and can be collapsed; a totals row stays pinned at the bottom. Numbers align right and go
 * through Format. The first column is frozen, and narrows when the table itself is narrow.
 *
 * Totals follow each column's rule (see Snapshot.js): sums for amounts, and for a rate the sum of its
 * numerator divided by the sum of its denominator, never an average of rates.
 */
sap.ui.define([
	"sap/ui/table/Table",
	"sap/ui/table/Column",
	"sap/ui/table/rowmodes/Fixed",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/HBox",
	"sap/m/OverflowToolbar",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/ToolbarSpacer",
	"sap/m/Title",
	"sap/m/p13n/Popup",
	"sap/m/p13n/SelectionPanel",
	"sap/m/p13n/SortPanel",
	"sap/m/p13n/GroupPanel",
	"sap/m/table/columnmenu/Menu",
	"sap/m/table/columnmenu/QuickSort",
	"sap/m/table/columnmenu/QuickSortItem",
	"sap/m/table/columnmenu/QuickGroup",
	"sap/m/table/columnmenu/QuickGroupItem",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/ResizeHandler",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/Motion",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/reporting/Snapshot",
	"accents/elements/reporting/sampleReport"
], function (Table, Column, FixedRows, Label, Button, HBox, OverflowToolbar, OverflowToolbarLayoutData, ToolbarSpacer, Title,
	Popup, SelectionPanel, SortPanel, GroupPanel, ColumnMenu, QuickSort, QuickSortItem, QuickGroup, QuickGroupItem,
	JSONModel, ResizeHandler, Part, Format, Layout, Motion, Messages, I18n, Snapshot, sampleReport) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");

	function missing(v) { return v === null || v === undefined || v === "" || (typeof v === "number" && isNaN(v)); }

	return {
		info: {
			controls: ["sap.ui.table.Table", "sap.ui.table.rowmodes.Fixed", "sap.m.table.columnmenu.Menu", "sap.m.p13n.Popup",
				"sap.m.p13n.SelectionPanel", "sap.m.p13n.SortPanel", "sap.m.p13n.GroupPanel", "sap.m.Label"],
			motion: "When new data arrives, each total that changed flashes once in the totals row; nothing else moves.",
			still: false
		},

		/**
		 * options:
		 *   label     what the table lists ("Sales by category"); the title adds the row count
		 *   columns   [{ key, label, type, digits, currency, total, polarity }]: see Snapshot.js
		 *   data      [{ key: value }] plain rows
		 *   groupBy   optional key of a text column to group by
		 *   sort      optional { key, descending }
		 *   visible   optional list of column keys shown at first (default: all)
		 *   rows      how many rows show before the table scrolls (default 12)
		 *   actions   optional controls placed in the table's toolbar (export, print)
		 *   onSelect  optional: rows become selectable; receives the selected data rows (a group
		 *             header selects its whole group)
		 *   empty     optional sentence for when no rows match
		 */
		create: function (o) {
			var cols = o.columns.slice();
			var byKey = {};
			cols.forEach(function (c) { byKey[c.key] = c; });
			var order = cols.map(function (c) { return c.key; });
			var shown = {};
			(o.visible || order).forEach(function (k) { shown[k] = true; });
			var sortKey = o.sort ? o.sort.key : null;
			var desc = !!(o.sort && o.sort.descending);
			var groupBy = o.groupBy || null;
			var collapsed = {};
			var data = [];
			var groups = [];
			var ordered = [];
			var totals = {};
			var hasTotals = cols.some(function (c) { return !!c.total; });
			var lastTotals = null;

			var model = new JSONModel({ rows: [], first: order[0] });
			model.setSizeLimit(100000);

			function firstKey() { return order.filter(function (k) { return shown[k]; })[0]; }

			/* ---------- cells ---------- */
			function template(c) {
				var numeric = Snapshot.numeric(c);
				var toggle = new Button({
					type: "Transparent",
					icon: { path: "_expanded", formatter: function (e) { return e ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow"; } },
					tooltip: { path: "_expanded", formatter: function (e) { return e ? t("reportTable.collapse") : t("reportTable.expand"); } },
					visible: { parts: [{ path: "_kind" }, { path: "/first" }], formatter: function (k, first) { return k === "group" && first === c.key; } },
					press: function (e) {
						var key = e.getSource().getBindingContext().getProperty("_key");
						collapsed[key] = !collapsed[key];
						refresh();
					}
				});
				var text = new Label({
					width: "100%",
					wrapping: false,
					textAlign: numeric ? "End" : "Begin",
					design: { path: "_kind", formatter: function (k) { return k === "row" ? "Standard" : "Bold"; } },
					text: { parts: [{ path: c.key }, { path: "_kind" }, { path: "_label" }, { path: "/first" }], formatter: function (v, kind, label, first) {
						if (!kind) { return ""; }
						if (kind !== "row" && first === c.key) { return label; }
						if (kind !== "row" && !c.total) { return ""; }
						return Snapshot.display(c, v);
					} }
				}).addStyleClass("accTabular");
				return new HBox({ renderType: "Bare", alignItems: "Center", width: "100%", items: [toggle, text] });
			}

			/* ---------- column header menu: sort and group from the header ---------- */
			var quickSort = new QuickSort({ change: function (e) {
				var order = e.getParameter("sortOrder");
				if (order === "None") { sortKey = null; } else { sortKey = e.getParameter("key"); desc = order === "Descending"; }
				refresh();
			} });
			var quickGroup = new QuickGroup({ change: function (e) {
				groupBy = e.getParameter("grouped") ? e.getParameter("key") : null;
				refresh();
			} });
			var menu = new ColumnMenu({
				quickActions: [quickSort, quickGroup],
				showTableSettingsButton: true,
				tableSettingsPressed: function () { openSettings(); },
				beforeOpen: function (e) {
					var col = e.getParameter("openBy");
					var c = byKey[col && col.data("key")];
					if (!c) { return; }
					quickSort.destroyItems();
					quickSort.addItem(new QuickSortItem({ key: c.key, label: c.label,
						sortOrder: sortKey === c.key ? (desc ? "Descending" : "Ascending") : "None" }));
					quickGroup.destroyItems();
					quickGroup.setVisible(c.type === "text");
					if (c.type === "text") { quickGroup.addItem(new QuickGroupItem({ key: c.key, label: c.label, grouped: groupBy === c.key })); }
				}
			});

			var columns = {};
			cols.forEach(function (c) {
				var settings = { label: new Label({ text: c.label, wrapping: true }), template: template(c), hAlign: Snapshot.numeric(c) ? "End" : "Begin",
					headerMenu: menu.getId(), minWidth: 80, width: Snapshot.numeric(c) || c.type === "date" ? "9rem" : "12rem" };
				columns[c.key] = new Column(settings).data("key", c.key);
			});

			/* ---------- the table ---------- */
			var title = new Title({ text: o.label, level: "H3", titleStyle: "H5", wrapping: true });
			var settingsBtn = new Button({ icon: "sap-icon://action-settings", type: "Transparent", text: t("reportTable.settings"),
				tooltip: t("reportTable.settingsTip"), press: function () { openSettings(); } });
			settingsBtn.setLayoutData(new OverflowToolbarLayoutData({ priority: "Low" }));
			var rowMode = new FixedRows({ rowCount: 1 });
			var tableSettings = {
				extension: [new OverflowToolbar({ style: "Clear", content: [title, new ToolbarSpacer()].concat(o.actions || [], [settingsBtn]) })],
				rowMode: rowMode,
				fixedColumnCount: 1,
				selectionMode: o.onSelect ? "MultiToggle" : "None",
				enableColumnReordering: false,
				ariaLabelledBy: [title],
				rows: "{/rows}"
			};
			var silent = false;
			if (o.onSelect) {
				tableSettings.rowSelectionChange = function () {
					if (silent) { return; }
					var picked = [];
					var seen = new Set();
					table.getSelectedIndices().forEach(function (i) {
						var r = model.getProperty("/rows/" + i);
						if (!r) { return; }
						var list = r._kind === "group" ? (groups.find(function (g) { return g.key === r._key; }) || { rows: [] }).rows
							: r._kind === "row" ? [r._src] : [];
						list.forEach(function (x) { if (!seen.has(x)) { seen.add(x); picked.push(x); } });
					});
					o.onSelect(picked);
				};
			}
			var table = new Table(tableSettings);
			table.setModel(model);
			table.addDependent(menu);

			function arrange() {
				// Visible columns first, in the chosen order, so the frozen column is always the first one shown.
				var vis = order.filter(function (k) { return shown[k]; });
				var hid = order.filter(function (k) { return !shown[k]; });
				table.removeAllColumns();
				vis.concat(hid).forEach(function (k) { columns[k].setVisible(!!shown[k]); table.addColumn(columns[k]); });
				model.setProperty("/first", vis[0]);
				fit();
			}

			/** The table's own width decides how wide the frozen column is, so it behaves the same inside a narrow panel. */
			var lastWidth = 0;
			function fit() {
				var el = table.getDomRef();
				var w = el ? el.clientWidth : 0;
				if (w) { lastWidth = w; }
				var narrow = Layout.narrower("phone", lastWidth || window.innerWidth);
				var first = firstKey();
				order.forEach(function (k) {
					var c = byKey[k];
					var base = Snapshot.numeric(c) || c.type === "date" ? (narrow ? "7.5rem" : "9rem") : (narrow ? "9rem" : "12rem");
					columns[k].setWidth(k === first ? (narrow ? "10.5rem" : "14rem") : base);
				});
			}
			var resizeId = null;
			table.addEventDelegate({ onAfterRendering: function () {
				if (!resizeId) { resizeId = ResizeHandler.register(table, function () { var before = lastWidth; fit(); if (Layout.narrower("phone", before) !== Layout.narrower("phone", lastWidth)) { table.invalidate(); } }); }
				var el = table.getDomRef();
				if (el && el.clientWidth && el.clientWidth !== lastWidth) { fit(); }
			} });

			/* ---------- sort, group, flatten ---------- */
			function compare(a, b) {
				var c = byKey[sortKey];
				var x = a[sortKey], y = b[sortKey];
				if (missing(x) && missing(y)) { return 0; }
				if (missing(x)) { return 1; }   // missing values go last in either direction
				if (missing(y)) { return -1; }
				var r = c.type === "date" ? Snapshot.asDate(x) - Snapshot.asDate(y)
					: Snapshot.numeric(c) ? x - y : String(x).localeCompare(String(y), I18n.language());
				return desc ? -r : r;
			}
			function sorted(list) { return sortKey && byKey[sortKey] ? list.slice().sort(compare) : list.slice(); }

			function flatten() {
				var flat = [];
				groups = [];
				ordered = [];
				var row = function (r) { return Object.assign({ _kind: "row", _src: r }, r); };
				if (groupBy && byKey[groupBy]) {
					var buckets = {};
					data.forEach(function (r) {
						var k = missing(r[groupBy]) ? "" : String(r[groupBy]);
						(buckets[k] = buckets[k] || []).push(r);
					});
					var keys = Object.keys(buckets).sort(function (a, b) { return a.localeCompare(b, I18n.language()); });
					if (sortKey === groupBy && desc) { keys.reverse(); }
					keys.forEach(function (k) {
						var list = sorted(buckets[k]);
						var sub = Snapshot.totals(cols, list);
						var label = t("reportTable.group", k === "" ? Format.DASH : k, list.length);
						groups.push({ key: k, value: k, label: label, count: list.length, totals: sub, rows: list });
						flat.push(Object.assign({ _kind: "group", _key: k, _label: label, _expanded: !collapsed[k] }, sub));
						if (!collapsed[k]) { list.forEach(function (r) { flat.push(row(r)); }); }
						ordered = ordered.concat(list);
					});
				} else {
					ordered = sorted(data);
					ordered.forEach(function (r) { flat.push(row(r)); });
				}
				totals = Snapshot.totals(cols, data);
				if (hasTotals && data.length) {
					flat.push(Object.assign({ _kind: "total", _label: t("reportTable.total", data.length) }, totals));
				}
				return flat;
			}

			function indicate() {
				order.forEach(function (k) {
					var on = sortKey === k;
					columns[k].setSortOrder(on ? (desc ? "Descending" : "Ascending") : "None");
				});
			}

			function refresh() {
				var flat = flatten();
				silent = true;
				if (o.onSelect) { table.clearSelection(); }
				silent = false;
				model.setProperty("/rows", flat);
				var max = o.rows || 12;
				rowMode.setRowCount(Math.max(1, Math.min(flat.length, max)));
				rowMode.setFixedBottomRowCount(hasTotals && flat.length > 1 ? 1 : 0);
				title.setText(t("reportTable.title", o.label, data.length));
				indicate();
				if (o.onSelect) { o.onSelect([]); }
			}

			/** After new data: each total that changed flashes once, in the tone of its column's polarity. */
			function flashTotals(prev) {
				if (!prev || !hasTotals) { return; }
				table.attachEventOnce("rowsUpdated", function () {
					var rows = table.getRows();
					var last = rows[rows.length - 1];
					var ctx = last && last.getBindingContext();
					if (!ctx || ctx.getProperty("_kind") !== "total") { return; }
					last.getCells().forEach(function (cell, i) {
						var col = table.getColumns().filter(function (c) { return c.getVisible(); })[i];
						var key = col && col.data("key");
						if (!key || !byKey[key].total || prev[key] === totals[key]) { return; }
						Motion.flash(cell.getItems()[1], Format.tone(totals[key] - prev[key], byKey[key].polarity));
					});
				});
			}

			/* ---------- settings dialog: columns, sort, group ---------- */
			var popup = null, selPanel, sortPanel, groupPanel;
			function openSettings() {
				if (!popup) {
					selPanel = new SelectionPanel({ title: t("reportTable.columns"), enableReorder: true, showHeader: true, enableCount: true,
						fieldColumn: t("reportTable.column") });
					sortPanel = new SortPanel({ title: t("reportTable.sort"), queryLimit: 1 });
					groupPanel = new GroupPanel({ title: t("reportTable.groupPanel"), queryLimit: 1 });
					popup = new Popup({ title: t("reportTable.settingsTitle"), panels: [selPanel, sortPanel, groupPanel], close: function (e) {
						if (e.getParameter("reason") !== "Ok") { return; }
						var sel = selPanel.getP13nData();
						if (!sel.some(function (x) { return x.visible; })) {
							Messages.add({ type: "Warning", text: t("reportTable.keepOne"), group: o.label });
						} else {
							order = sel.map(function (x) { return x.name; });
							shown = {};
							sel.forEach(function (x) { if (x.visible) { shown[x.name] = true; } });
						}
						var s = sortPanel.getP13nData().filter(function (x) { return x.sorted; })[0];
						sortKey = s ? s.name : null;
						desc = !!(s && s.descending);
						var g = groupPanel.getP13nData().filter(function (x) { return x.grouped; })[0];
						groupBy = g ? g.name : null;
						arrange();
						refresh();
					} });
					table.addDependent(popup);
				}
				selPanel.setP13nData(order.map(function (k) { return { name: k, label: byKey[k].label, visible: !!shown[k] }; }));
				sortPanel.setP13nData(cols.map(function (c) { return { name: c.key, label: c.label, sorted: sortKey === c.key, descending: desc }; }));
				groupPanel.setP13nData(cols.filter(function (c) { return c.type === "text"; }).map(function (c) {
					return { name: c.key, label: c.label, grouped: groupBy === c.key };
				}));
				popup.open(settingsBtn);
			}

			var part = Part.make({
				key: "report-table",
				content: table,
				empty: o.empty || t("reportTable.empty"),
				onDestroy: function () { if (resizeId) { ResizeHandler.deregister(resizeId); } },
				render: function (rows) {
					data = rows || [];
					if (!data.length) { part.state("empty", o.empty || t("reportTable.empty")); }
					var prev = lastTotals;
					refresh();
					lastTotals = Object.assign({}, totals);
					flashTotals(prev);
				}
			});
			arrange();

			/** What is on screen, for export and print: visible columns in order, rows in shown order, groups and totals. */
			part.view = function () {
				return {
					columns: order.filter(function (k) { return shown[k]; }).map(function (k) { return byKey[k]; }),
					rows: ordered.slice(),
					groups: groupBy ? groups.map(function (g) { return { label: g.label, value: g.value, count: g.count, totals: g.totals, rows: g.rows.slice() }; }) : null,
					groupBy: groupBy ? byKey[groupBy] : null,
					totals: hasTotals ? Object.assign({}, totals) : null
				};
			};
			part.setGroup = function (key) { groupBy = key || null; refresh(); return part; };
			part.setSort = function (key, descending) { sortKey = key || null; desc = !!descending; refresh(); return part; };
			part.setCollapsed = function (key, on) { collapsed[key] = !!on; refresh(); return part; };
			part.table = table;
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			return {
				options: {
					label: t("reportTable.demoLabel"),
					columns: sampleReport.columns(),
					data: sampleReport.rows(7),
					groupBy: "group",
					sort: { key: "sales", descending: true }
				},
				next: function (seed) { return sampleReport.rows(seed); }
			};
		}
	};
});
