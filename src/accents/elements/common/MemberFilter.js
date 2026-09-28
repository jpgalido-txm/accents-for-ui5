/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Member filter: a checklist of the members of one dimension, with an "All" entry that shows a
 * partial state when some but not all are chosen. A search field appears only when the list is long.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/CheckBox",
	"sap/m/SearchField",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/ScrollContainer",
	"sap/m/Text",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/I18n"
], function (VBox, CheckBox, SearchField, List, StandardListItem, ScrollContainer, Text, Part, Format, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.common.i18n.i18n");

	var LONG = 8; // more members than this, and the search field appears

	return {
		info: {
			controls: ["sap.m.CheckBox (All, partial state)", "sap.m.List (multi-select)", "sap.m.SearchField"],
			motion: "None. A filter changes only when a person uses it.",
			still: true
		},

		/**
		 * options:
		 *   label     short noun for the dimension ("Categories")
		 *   countMeans optional sentence saying what the bracketed counts are
 *   onChange  optional; receives the selected keys
		 *   data      { members: [{ key, text, count }], selected: [keys] }
		 */
		create: function (o) {
			var noun = o.label || t("memberFilter.members");
			var all = new CheckBox({ text: t("memberFilter.all"), partiallySelected: false });
			var search = new SearchField({ width: "100%", placeholder: t("memberFilter.search", noun.toLowerCase()), visible: false });
			var list = new List({ mode: "MultiSelect", includeItemInSelection: true, showSeparators: "None", rememberSelections: false });
			var none = new Text({ text: "", visible: false }).addStyleClass("accLabel sapUiSmallMarginBegin");
			var scroller = new ScrollContainer({ vertical: true, horizontal: false, content: [list, none] });
			var summary = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
			var members = [];
			var means = new Text({ text: o.countMeans || "", visible: !!o.countMeans }).addStyleClass("accLabel sapUiTinyMarginBottom");

			function shown() { return list.getItems().filter(function (i) { return i.getVisible(); }); }
			function selectedKeys() { return list.getItems().filter(function (i) { return i.getSelected(); }).map(function (i) { return i.data("key"); }); }
			function sync() {
				var vis = shown();
				var on = vis.filter(function (i) { return i.getSelected(); }).length;
				all.setText(t("memberFilter.allCount", vis.length));
				all.setSelected(on > 0);
				all.setPartiallySelected(on > 0 && on < vis.length);
				all.setEnabled(vis.length > 0);
				var n = selectedKeys().length;
				summary.setText(n === members.length ? t("memberFilter.allIncluded", members.length, noun.toLowerCase())
					: n === 0 ? t("memberFilter.noneChosen")
						: t("memberFilter.someIncluded", n, members.length, noun.toLowerCase()));
			}
			function changed() { sync(); if (o.onChange) { o.onChange(selectedKeys()); } }

			all.attachSelect(function () {
				var vis = shown();
				var everyOn = vis.every(function (i) { return i.getSelected(); });
				vis.forEach(function (i) { i.setSelected(!everyOn); });
				changed();
			});
			list.attachSelectionChange(changed);
			search.attachLiveChange(function (e) {
				var q = (e.getParameter("newValue") || "").trim().toLowerCase();
				list.getItems().forEach(function (i) { i.setVisible(!q || i.data("text").toLowerCase().indexOf(q) >= 0); });
				var count = shown().length;
				none.setText(t("memberFilter.noMatch", noun.toLowerCase(), q));
				none.setVisible(count === 0);
				sync();
			});

			var content = new VBox({ renderType: "Bare", items: [means, search, all, scroller, summary] });

			var part = Part.make({
				key: "member-filter",
				content: content,
				empty: t("memberFilter.empty"),
				render: function (d) {
					members = d.members.slice();
					var chosen = new Set(d.selected || members.map(function (m) { return m.key; }));
					list.destroyItems();
					members.forEach(function (m) {
						var item = new StandardListItem({
							title: m.count === undefined ? m.text : t("memberFilter.memberCount", m.text, Format.number(m.count)),
							selected: chosen.has(m.key)
						});
						item.data("key", m.key);
						item.data("text", m.text);
						list.addItem(item);
					});
					var long = members.length > LONG;
					search.setVisible(long);
					search.setValue("");
					none.setVisible(false);
					scroller.setHeight(long ? "18rem" : "auto");
					sync();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function d(seed) {
				var s = Data.sample(seed);
				var random = Data.rng(seed * 7 + 1);
				// Months as members, each with how many categories missed plan in it.
				var members = s.periods.filter(function (p) { return p <= s.today; }).concat(s.periods.filter(function (p) { return p > s.today; }))
					.map(function (p) {
						var k = s.periods.indexOf(p);
						var missed = s.items.filter(function (i) { var m = i.months[k]; return m.actual !== null && m.actual < m.plan; }).length;
						return { key: p, text: Format.period(p), count: p <= s.today ? missed : undefined };
					});
				var selected = members.filter(function () { return random() < 0.6; }).map(function (m) { return m.key; });
				return { members: members, selected: selected };
			}
			return { options: { label: t("memberFilter.demo.label"), countMeans: t("memberFilter.demo.countMeans"), data: d(7) }, next: function (seed) { return d(seed); } };
		}
	};
});
