/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Filter bar: the filters of a report, built from sap.m fields (search, multiple choice, single
 * choice, date range), with saved views in sap.m.VariantManagement. It counts the filters in use,
 * says in one sentence which filters produced the rows on screen, and warns while changes wait for Go.
 * In live mode every change applies at once and there is no Go button.
 *
 * Saved views are kept in this browser's local storage under "accents.reporting.views.<id>", and the
 * bar says so on screen; they are not shared with other people or devices. It never uses sap.ui.comp.
 *
 * part.filter(rows) keeps the rows that match the applied filters; part.summary() is the sentence;
 * part.values() the applied values.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/ToggleButton",
	"sap/m/SearchField",
	"sap/m/MultiComboBox",
	"sap/m/Select",
	"sap/m/DynamicDateRange",
	"sap/m/VariantManagement",
	"sap/m/VariantItem",
	"sap/m/FlexItemData",
	"sap/ui/core/Item",
	"accents/core/Part",
	"accents/core/Layout",
	"accents/core/Motion",
	"accents/core/I18n",
	"accents/elements/reporting/sampleReport"
], function (VBox, HBox, Label, Text, Button, ToggleButton, SearchField, MultiComboBox, Select, DynamicDateRange, VariantManagement,
	VariantItem, FlexItemData, Item, Part, Layout, Motion, I18n, sampleReport) {
	"use strict";

	var t = I18n.use("accents.elements.reporting.i18n.i18n");
	var STANDARD = "standard";
	var DATE_OPTIONS = ["DATE", "DATERANGE", "FROM", "TO", "LASTDAYS", "LASTWEEKS", "LASTMONTHS", "THISMONTH", "LASTMONTH",
		"THISQUARTER", "LASTQUARTER", "THISYEAR", "LASTYEAR", "YEARTODATE"];
	var ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

	/** localStorage, or null when the browser refuses it (private windows, blocked storage). */
	function storage() {
		try {
			var s = window.localStorage;
			s.setItem("accents.probe", "1");
			s.removeItem("accents.probe");
			return s;
		} catch (e) { return null; }
	}
	function revive(key, v) { return typeof v === "string" && ISO.test(v) ? new Date(v) : v; }
	function copy(values) { return JSON.parse(JSON.stringify(values || {}), revive); }
	function same(a, b) { return JSON.stringify(a || {}) === JSON.stringify(b || {}); }
	function jsDate(x) {
		if (!x) { return null; }
		if (x instanceof Date) { return x; }
		if (x.getJSDate) { return x.getJSDate(); }
		if (x.oDate instanceof Date) { return x.oDate; }
		return new Date(x);
	}
	function pad(n) { return String(n).padStart(2, "0"); }
	/** A calendar day as "YYYY-MM-DD". Row dates are calendar days in UTC; picked dates are local days. */
	function dayUtc(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
	function dayLocal(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
	function active(f, v) {
		if (v === null || v === undefined || v === "") { return false; }
		if (f.type === "multi") { return v.length > 0; }
		return true;
	}

	return {
		info: {
			controls: ["sap.m.VariantManagement", "sap.m.SearchField", "sap.m.MultiComboBox", "sap.m.Select", "sap.m.DynamicDateRange",
				"sap.m.ToggleButton", "sap.m.Button"],
			motion: "The filter count pulses once when the number of filters in use changes; nothing else moves.",
			still: false
		},

		/**
		 * options:
		 *   id       names this report's saved views in the browser (required for saving)
		 *   fields   [{ key, label, type: "search" | "multi" | "select" | "date", items: [{ key, text }],
		 *            placeholder, path (row key; default key), paths (search: row keys to look in) }]
		 *   values   optional starting values { key: value }
		 *   views    optional ready-made views [{ key, name, values }]; they cannot be renamed or deleted
		 *   live     true applies every change at once, without Go
		 *   onGo     function (values, part), called whenever filters are applied
		 */
		create: function (o) {
			var fields = o.fields || [];
			var store = storage();
			var storeKey = "accents.reporting.views." + (o.id || "report");
			var standardValues = copy(o.values || {});
			var controls = {};
			var applied = copy(o.values || {});
			var lastCount = -1;

			/* ---------- fields ---------- */
			function changed() {
				markModified();
				if (o.live) { apply(); } else { refresh(); }
			}
			var liveTimer = null;
			var boxes = fields.map(function (f) {
				var c;
				if (f.type === "search") {
					c = new SearchField({ width: "100%", placeholder: f.placeholder || "", search: function () { apply(); },
						liveChange: function () {
							if (!o.live) { changed(); return; }
							clearTimeout(liveTimer);
							liveTimer = setTimeout(changed, 300);
						} });
				} else if (f.type === "multi") {
					c = new MultiComboBox({ width: "100%", items: (f.items || []).map(function (i) { return new Item({ key: i.key, text: i.text }); }),
						selectionFinish: changed });
				} else if (f.type === "select") {
					c = new Select({ width: "100%", forceSelection: false,
						items: [new Item({ key: "", text: t("filterBar.all") })].concat((f.items || []).map(function (i) { return new Item({ key: i.key, text: i.text }); })),
						change: changed });
				} else if (f.type === "date") {
					c = new DynamicDateRange({ width: "100%", standardOptions: DATE_OPTIONS, change: changed });
				}
				controls[f.key] = c;
				var label = new Label({ text: f.label, labelFor: c });
				if (f.type === "search" || f.type === "date") { c.addAriaLabelledBy(label); }
				var box = new VBox({ renderType: "Bare", items: [label, c] }).addStyleClass("sapUiSmallMarginEnd sapUiTinyMarginBottom");
				box.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "12rem", maxWidth: "20rem" }));
				return box;
			});

			function read() {
				var v = {};
				fields.forEach(function (f) {
					var c = controls[f.key];
					if (f.type === "search") { v[f.key] = c.getValue().trim(); }
					else if (f.type === "multi") { v[f.key] = c.getSelectedKeys(); }
					else if (f.type === "select") { v[f.key] = c.getSelectedKey(); }
					else if (f.type === "date") { v[f.key] = c.getValue() || null; }
					if (!active(f, v[f.key])) { delete v[f.key]; }
				});
				return v;
			}
			function write(values) {
				fields.forEach(function (f) {
					var c = controls[f.key];
					var v = values[f.key];
					if (f.type === "search") { c.setValue(v || ""); }
					else if (f.type === "multi") { c.setSelectedKeys(v || []); }
					else if (f.type === "select") { c.setSelectedKey(v || ""); }
					else if (f.type === "date") { c.setValue(v || null); }
				});
			}

			/* ---------- what the filters mean ---------- */
			function range(f, v) {
				var dates = controls[f.key].toDates(v).map(jsDate).filter(Boolean);
				if (!dates.length) { return null; }
				return { from: dates[0], to: dates[dates.length - 1] };
			}
			function describe(values) {
				var parts = [];
				fields.forEach(function (f) {
					var v = values[f.key];
					if (!active(f, v)) { return; }
					if (f.type === "search") { parts.push(t("filterBar.contains", f.label, v)); }
					else if (f.type === "multi" || f.type === "select") {
						var names = [].concat(v).map(function (k) {
							var hit = (f.items || []).find(function (i) { return i.key === k; });
							return hit ? hit.text : k;
						});
						parts.push(t("filterBar.is", f.label, names.join(" " + t("filterBar.or") + " ")));
					} else if (f.type === "date") {
						var r = range(f, v);
						var fmt = function (d) { return d.toLocaleDateString(I18n.language(), { day: "numeric", month: "short", year: "numeric" }); };
						if (r) { parts.push(t("filterBar.between", f.label, fmt(r.from), fmt(r.to))); }
					}
				});
				return parts.length ? t("filterBar.summary", parts.join("; ")) : t("filterBar.summaryNone");
			}
			function count(values) { return fields.filter(function (f) { return active(f, values[f.key]); }).length; }

			/** Keeps the rows that match every applied filter. */
			function filter(rows) {
				var tests = fields.filter(function (f) { return active(f, applied[f.key]); }).map(function (f) {
					var v = applied[f.key];
					var path = f.path || f.key;
					if (f.type === "search") {
						var q = v.toLowerCase();
						var paths = f.paths || [path];
						return function (r) { return paths.some(function (p) { return String(r[p] === null || r[p] === undefined ? "" : r[p]).toLowerCase().indexOf(q) >= 0; }); };
					}
					if (f.type === "multi") { return function (r) { return v.indexOf(String(r[path])) >= 0; }; }
					if (f.type === "select") { return function (r) { return String(r[path]) === v; }; }
					var rg = range(f, v);
					if (!rg) { return function () { return true; }; }
					var lo = dayLocal(rg.from), hi = dayLocal(rg.to);
					return function (r) {
						var d = r[path] instanceof Date ? r[path] : r[path] ? new Date(r[path]) : null;
						if (!d || isNaN(d.getTime())) { return false; }
						var day = dayUtc(d);
						return day >= lo && day <= hi;
					};
				});
				return (rows || []).filter(function (r) { return tests.every(function (test) { return test(r); }); });
			}

			/* ---------- saved views ---------- */
			var saved = { views: [], defaultKey: STANDARD };
			if (store) {
				try { saved = Object.assign(saved, JSON.parse(store.getItem(storeKey) || "{}", revive)); } catch (e) { /* unreadable: start fresh */ }
			}
			function persist() {
				if (!store) { return; }
				try { store.setItem(storeKey, JSON.stringify(saved)); } catch (e) { /* full or refused: views last this visit */ }
			}
			var presets = (o.views || []).map(function (v) { return { key: v.key, name: v.name, values: copy(v.values), fixed: true }; });
			function allViews() {
				return [{ key: STANDARD, name: t("filterBar.standard"), values: standardValues, fixed: true }].concat(presets, saved.views);
			}
			function viewOf(key) { return allViews().find(function (v) { return v.key === key; }); }

			var vm = new VariantManagement({
				supportDefault: true,
				supportFavorites: false,
				supportApplyAutomatically: false,
				supportPublic: false,
				creationAllowed: true,
				maxWidth: "24rem",
				tooltip: store ? t("filterBar.stored") : t("filterBar.notStored"),
				select: function (e) { useView(e.getParameter("key")); },
				save: function (e) {
					var values = read();
					if (e.getParameter("overwrite")) {
						var own = saved.views.find(function (v) { return v.key === e.getParameter("key"); });
						if (own) { own.values = values; }
					} else {
						var key = "v" + Date.now().toString(36);
						saved.views.push({ key: key, name: e.getParameter("name"), values: values });
						vm.addItem(item({ key: key, name: e.getParameter("name") }));
						vm.setSelectedKey(key);
						if (e.getParameter("def")) { saved.defaultKey = key; vm.setDefaultKey(key); }
					}
					persist();
					vm.setModified(false);
					apply();
				},
				manage: function (e) {
					(e.getParameter("renamed") || []).forEach(function (r) {
						var own = saved.views.find(function (v) { return v.key === r.key; });
						if (own) { own.name = r.name; }
					});
					var gone = e.getParameter("deleted") || [];
					gone.forEach(function (key) {
						saved.views = saved.views.filter(function (v) { return v.key !== key; });
						var it = vm.getItems().find(function (i) { return i.getKey() === key; });
						if (it) { vm.removeItem(it); it.destroy(); }
					});
					if (e.getParameter("def")) { saved.defaultKey = e.getParameter("def"); }
					if (gone.indexOf(saved.defaultKey) >= 0) { saved.defaultKey = STANDARD; }
					vm.setDefaultKey(saved.defaultKey);
					persist();
					if (gone.indexOf(vm.getSelectedKey()) >= 0 || !viewOf(vm.getSelectedKey())) { useView(saved.defaultKey); }
				}
			});
			function item(v) {
				return new VariantItem({ key: v.key, title: v.name, rename: !v.fixed, remove: !v.fixed, changeable: !v.fixed, author: "" });
			}
			allViews().forEach(function (v) { vm.addItem(item(v)); });
			function useView(key) {
				var v = viewOf(key) || viewOf(STANDARD);
				vm.setSelectedKey(v.key);
				write(copy(v.values));
				vm.setModified(false);
				apply();
			}
			function markModified() {
				var v = viewOf(vm.getSelectedKey());
				vm.setModified(!!v && !same(read(), v.values));
			}

			/* ---------- bar ---------- */
			var fieldsBox = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "End", items: boxes, width: "100%" }).addStyleClass("sapUiTinyMarginTop");
			var toggle = new ToggleButton({ type: "Transparent", icon: "sap-icon://filter", tooltip: t("filterBar.filtersTip"),
				pressed: !Layout.narrower("phone"), press: function () { fieldsBox.setVisible(toggle.getPressed()); } });
			fieldsBox.setVisible(toggle.getPressed());
			var clear = new Button({ text: t("filterBar.clear"), tooltip: t("filterBar.clearTip"), type: "Transparent", press: function () {
				write({});
				markModified();
				if (o.live) { apply(); } else { refresh(); }
			} });
			var go = new Button({ text: t("filterBar.go"), tooltip: t("filterBar.goTip"), type: "Emphasized", visible: !o.live, press: function () { apply(); } });
			var buttons = new HBox({ renderType: "Bare", alignItems: "Center", items: [toggle, clear, go] });
			var head = new HBox({ renderType: "Bare", wrap: "Wrap", alignItems: "Center", justifyContent: "SpaceBetween", width: "100%",
				items: [vm, buttons] });
			var summary = new Text({ text: "", wrapping: true }).addStyleClass("sapUiTinyMarginTop");
			var pending = new Text({ text: t("filterBar.pending"), visible: false, wrapping: true }).addStyleClass("sapUiTinyMarginTop");
			var note = new Text({ text: store ? t("filterBar.stored") : t("filterBar.notStored"), wrapping: true }).addStyleClass("accSource sapUiTinyMarginTop");
			var root = new VBox({ renderType: "Bare", width: "100%", items: [head, fieldsBox, summary, pending, note] });

			function refresh() {
				var n = count(applied);
				toggle.setText(t("filterBar.filters", n));
				summary.setText(describe(applied));
				pending.setVisible(!o.live && !same(read(), applied));
				clear.setEnabled(count(read()) > 0);
				if (lastCount >= 0 && n !== lastCount && toggle.getDomRef()) { Motion.pulse(toggle); }
				lastCount = n;
			}
			function apply() {
				applied = read();
				refresh();
				if (o.onGo) { o.onGo(copy(applied), part); }
			}

			var part = Part.make({
				key: "filter-bar",
				content: root,
				/** update(values) sets the fields to these values and applies them. */
				render: function (values) { write(values || {}); markModified(); apply(); }
			});
			part.filter = filter;
			part.summary = function () { return describe(applied); };
			part.values = function () { return copy(applied); };
			part.count = function () { return count(applied); };
			part.describe = describe;
			part.useView = useView;
			part.views = function () { return allViews().map(function (v) { return { key: v.key, name: v.name }; }); };

			// Start from the person's default view when there is one, otherwise from the given values.
			var start = viewOf(saved.defaultKey) ? saved.defaultKey : STANDARD;
			vm.setDefaultKey(start);
			vm.setSelectedKey(start);
			write(copy((viewOf(start) || {}).values || {}));
			applied = read();
			refresh();
			return part;
		},

		example: function () {
			var rows = sampleReport.rows(7);
			var groupItems = sampleReport.members(rows, "group");
			var regionItems = sampleReport.members(rows, "region");
			var sets = [
				{ group: [groupItems[0].key] },
				{ region: [regionItems[1].key, regionItems[2].key], item: "e" },
				{}
			];
			var i = 0;
			return {
				options: {
					id: "gallery-filter-bar",
					fields: [
						{ key: "item", label: t("filterBar.demo.search"), type: "search", placeholder: t("filterBar.demo.searchPlaceholder") },
						{ key: "group", label: t("filterBar.demo.group"), type: "multi", items: groupItems },
						{ key: "region", label: t("filterBar.demo.region"), type: "multi", items: regionItems },
						{ key: "lastOrder", label: t("filterBar.demo.lastOrder"), type: "date" }
					],
					views: [{ key: "fresh-north", name: t("filterBar.demo.viewFresh"),
						values: { group: [t("sample.group.fresh")], region: [t("sample.region.north")] } }]
				},
				next: function () { i += 1; return sets[i % sets.length]; }
			};
		}
	};
});
