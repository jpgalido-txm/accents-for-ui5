/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Exception types: every rule the app checks, with how many items break it right now. Each type shows
 * its count in brackets, the rule written out in words, and its severity as a standard value state.
 * A type with no items stays on the list with a sentence saying so, because "nothing broke this rule"
 * is news worth reading. No assistant button here: a type is a count, not something a person acts on;
 * the items behind it carry the buttons.
 */
sap.ui.define([
	"sap/m/List",
	"sap/m/CustomListItem",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/Title",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/I18n"
], function (List, CustomListItem, VBox, HBox, Text, Title, ObjectStatus, FlexItemData, Part, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.monitoring.i18n.i18n");

	/** Severity follows what breaking the rule costs: money lost, target missed, or a model extrapolating. */
	var SEVERITY = {
		error: { state: "Error", text: t("exceptionTypes.severity.error"), icon: "sap-icon://error" },
		warning: { state: "Warning", text: t("exceptionTypes.severity.warning"), icon: "sap-icon://alert" },
		information: { state: "Information", text: t("exceptionTypes.severity.information"), icon: "sap-icon://information" }
	};
	var CLEAR = { state: "Success", text: t("exceptionTypes.clear"), icon: "sap-icon://sys-enter-2" };

	return {
		info: {
			controls: ["sap.m.List", "sap.m.CustomListItem", "sap.m.Title", "sap.m.ObjectStatus", "sap.m.Text"],
			motion: "A count that changes pulses once. Names, rules and severities never move.",
			still: false
		},

		/**
		 * options:
		 *   data      [{ id, name, rule, severity: "error" | "warning" | "information", count, clear, consequence }]
		 *             clear is the sentence shown when count is zero (a default is used when absent);
		 *             consequence is the short status text, when the severity's default words would
		 *             not match the rule (for example "Behind plan")
		 *   onSelect  optional: pressing a type calls onSelect(type), usually to open its items
		 */
		create: function (o) {
			var list = new List({ showSeparators: "Inner" }).addStyleClass("accExceptionTypes");
			var rows = {};   // id -> { item, name, count, rule, clear, status, pending }

			function row() {
				var r = { pending: false };
				r.name = new Title({ text: "", level: "H3", titleStyle: "H6", wrapping: true }).addStyleClass("sapUiTinyMarginEnd");
				r.count = new Text({ text: "", wrapping: false }).addStyleClass("accTabular");
				// The count pulses once after it has been re-rendered with its new value.
				r.count.addEventDelegate({ onAfterRendering: function () {
					if (r.pending) { r.pending = false; Motion.pulse(r.count); }
				} });
				r.rule = new Text({ text: "" }).addStyleClass("accLabel");
				r.clear = new Text({ text: "" });
				r.status = new ObjectStatus({ inverted: false }).addStyleClass("sapUiSmallMarginBegin");
				var body = new VBox({ renderType: "Bare", items: [
					new HBox({ renderType: "Bare", alignItems: "Baseline", items: [r.name, r.count] }).addStyleClass("sapUiTinyMarginBottom"),
					r.rule, r.clear
				] });
				body.setLayoutData(new FlexItemData({ growFactor: 1, shrinkFactor: 1, minWidth: "0" }));
				var settings = {
					content: [new HBox({ renderType: "Bare", alignItems: "Start", justifyContent: "SpaceBetween",
						items: [body, r.status] }).addStyleClass("sapUiSmallMarginTopBottom sapUiSmallMarginBeginEnd")]
				};
				if (o.onSelect) {
					settings.type = "Navigation";
					settings.press = function () { part.selectType(r.data.id); o.onSelect(r.data); };
				}
				r.item = new CustomListItem(settings);
				return r;
			}

			function fill(r, ty, prev) {
				var sev = ty.count > 0 ? (SEVERITY[ty.severity] || SEVERITY.information) : CLEAR;
				r.data = ty;
				r.name.setText(ty.name);
				r.count.setText(t("exceptionTypes.count", ty.count));
				r.rule.setText(t("exceptionTypes.rule", ty.rule));
				r.clear.setText(ty.clear || t("exceptionTypes.noItems"));
				r.clear.setVisible(ty.count === 0);
				r.status.setText(ty.count > 0 && ty.consequence ? ty.consequence : sev.text);
				r.status.setState(sev.state);
				r.status.setIcon(sev.icon);
				r.item.setTooltip(t(ty.count === 0 ? "exceptionTypes.tooltip.none" : ty.count === 1 ? "exceptionTypes.tooltip.one" : "exceptionTypes.tooltip.many",
					ty.name, ty.count));
				if (prev && prev.count !== ty.count) { r.pending = true; }
			}

			var part = Part.make({
				key: "exception-types",
				content: list,
				empty: t("exceptionTypes.empty"),
				render: function (types, previous) {
					var before = {};
					(previous || []).forEach(function (ty) { before[ty.id] = ty; });
					var keep = {};
					types.forEach(function (ty, i) {
						var r = rows[ty.id];
						if (!r) { r = rows[ty.id] = row(); }
						fill(r, ty, before[ty.id]);
						keep[ty.id] = true;
						if (list.indexOfItem(r.item) !== i) {
							list.removeItem(r.item);
							list.insertItem(r.item, i);
						}
					});
					Object.keys(rows).forEach(function (id) {
						if (!keep[id]) { list.removeItem(rows[id].item); rows[id].item.destroy(); delete rows[id]; }
					});
					if (!types.length) { part.state("empty"); }
				}
			});
			/** Marks the chosen type with the list's navigated indicator. */
			part.selectType = function (id) {
				Object.keys(rows).forEach(function (k) { rows[k].item.setNavigated(k === id); });
				return part;
			};
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			/** Each type is a written rule counted over the sample items; nothing here is typed in. */
			function types(seed) {
				var items = Data.sample(seed).items;
				var count = function (test) { return items.filter(test).length; };
				return [
					{ id: "margin", name: t("exceptionTypes.demo.margin"), severity: "error",
						rule: t("exceptionTypes.demo.margin.rule"),
						count: count(function (i) { return i.margin < 0.05; }),
						clear: t("exceptionTypes.demo.margin.clear") },
					{ id: "target", name: t("exceptionTypes.demo.target"), severity: "warning",
						rule: t("exceptionTypes.demo.target.rule"),
						count: count(function (i) { return i.actual < i.target; }),
						clear: t("exceptionTypes.demo.target.clear") },
					{ id: "plan", name: t("exceptionTypes.demo.plan"), severity: "warning", consequence: t("exceptionTypes.demo.plan.consequence"),
						rule: t("exceptionTypes.demo.plan.rule"),
						count: count(function (i) { return i.actual < i.plan * 0.98; }),
						clear: t("exceptionTypes.demo.plan.clear") },
					{ id: "extrapolating", name: t("exceptionTypes.demo.range"), severity: "information",
						rule: t("exceptionTypes.demo.range.rule"),
						count: count(function (i) {
							var top = Math.max.apply(null, i.months.map(function (m) { return m.actual || 0; }));
							return i.months.some(function (m) { return m.forecast !== null && m.forecast > top * 1.12; });
						}),
						clear: t("exceptionTypes.demo.range.clear") }
				];
			}
			return {
				options: { data: types(7), onSelect: function () { ctx.go("exception-items"); } },
				next: function (seed) { return types(seed); }
			};
		}
	};
});
