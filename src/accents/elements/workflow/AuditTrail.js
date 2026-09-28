/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Audit trail: every step taken on one object, newest first. Each entry says who did it, what they
 * did, when, what it changed from and to, and the reason when a decision had one. A filter narrows
 * the list to one kind of step, each kind counted. It is a record, so it is read-only and never moves.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/ObjectStatus",
	"sap/m/Select",
	"sap/m/Label",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/VBox",
	"sap/ui/core/Item",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (Table, Column, ColumnListItem, Text, ObjectStatus, Select, Label, OverflowToolbar, ToolbarSpacer, VBox, Item, InvisibleText,
	Part, Format, Layout, I18n, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	/** Each kind of step: an icon beside its word. Decisions carry their own state. */
	var KIND = {
		created: { icon: "sap-icon://add-document", state: "None" },
		assigned: { icon: "sap-icon://employee", state: "None" },
		changed: { icon: "sap-icon://edit", state: "None" },
		sent: { icon: "sap-icon://paper-plane", state: "None" },
		commented: { icon: "sap-icon://comment", state: "None" },
		approved: { icon: "sap-icon://accept", state: "Success" },
		rejected: { icon: "sap-icon://decline", state: "Error" },
		sentBack: { icon: "sap-icon://undo", state: "Warning" }
	};
	/** The filter groups kinds a person thinks of together. */
	var GROUPS = [
		{ key: "all", kinds: null },
		{ key: "decisions", kinds: ["approved", "rejected", "sentBack"] },
		{ key: "changes", kinds: ["created", "changed", "sent"] },
		{ key: "assignments", kinds: ["assigned"] },
		{ key: "comments", kinds: ["commented"] }
	];

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.Select", "sap.m.ObjectStatus"],
			motion: "None. An audit trail is a record and never animates.",
			still: true
		},

		/**
		 * options:
		 *   data   [{ id, at, who, kind: "created"|"assigned"|"changed"|"sent"|"commented"|"approved"|"rejected"|"sentBack",
		 *            what (a short sentence), from, to, reason }]
		 *   label  accessible name of the table
		 */
		create: function (o) {
			var group = "all";
			var select = new Select({ selectedKey: group, change: function (e) { group = e.getParameter("selectedItem").getKey(); rows(); } });
			var label = new Label({ text: t("auditTrail.filter"), labelFor: select, showColon: true }).addStyleClass("sapUiTinyMarginEnd");
			var bar = new OverflowToolbar({ style: "Clear", content: [label, select, new ToolbarSpacer()] });
			var table = Layout.fitTable(new Table({
				headerToolbar: bar,
				popinLayout: "GridSmall",
				columns: [
					new Column({ header: new Text({ text: t("auditTrail.col.when") }), width: "11rem" }),
					new Column({ header: new Text({ text: t("auditTrail.col.who") }), minScreenWidth: "Tablet", demandPopin: true }),
					new Column({ header: new Text({ text: t("auditTrail.col.what") }) }),
					new Column({ header: new Text({ text: t("auditTrail.col.change") }), minScreenWidth: "Tablet", demandPopin: true }),
					new Column({ header: new Text({ text: t("auditTrail.col.reason") }), minScreenWidth: "Tablet", demandPopin: true })
				]
			}));
			table.addAriaLabelledBy(new InvisibleText({ text: o.label || t("auditTrail.label") }).toStatic());
			var events = [];

			function inGroup(e) {
				var g = GROUPS.find(function (x) { return x.key === group; });
				return !g.kinds || g.kinds.indexOf(e.kind) >= 0;
			}
			function rows() {
				table.destroyItems();
				events.filter(inGroup).sort(function (a, b) { return when.ms(b.at) - when.ms(a.at); }).forEach(function (e) {
					var k = KIND[e.kind] || KIND.changed;
					var change = e.from !== undefined || e.to !== undefined
						? t("auditTrail.fromTo", e.from === undefined || e.from === null || e.from === "" ? Format.DASH : e.from,
							e.to === undefined || e.to === null || e.to === "" ? Format.DASH : e.to)
						: Format.DASH;
					table.addItem(new ColumnListItem({ cells: [
						new Text({ text: when.exact(e.at) }),
						new Text({ text: e.who }),
						new VBox({ renderType: "Bare", items: [
							new ObjectStatus({ text: t("auditTrail.kind." + e.kind), icon: k.icon, state: k.state }),
							new Text({ text: e.what || "" }).setVisible(!!e.what)
						] }),
						new Text({ text: change }),
						new Text({ text: e.reason || Format.DASH })
					] }));
				});
				table.setNoDataText(t("auditTrail.none." + group));
			}

			var part = Part.make({
				key: "audit-trail",
				content: table,
				empty: t("auditTrail.empty"),
				render: function (data) {
					events = (data || []).slice();
					select.destroyItems();
					GROUPS.forEach(function (g) {
						var n = events.filter(function (e) { return !g.kinds || g.kinds.indexOf(e.kind) >= 0; }).length;
						select.addItem(new Item({ key: g.key, text: t("auditTrail.group." + g.key, n) }));
					});
					select.setSelectedKey(group);
					rows();
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			function data(seed) {
				var task = sampleWork.tasks(seed)[0];
				// The price change's history, finished with the decision, so every kind of step appears.
				return sampleWork.history(task).concat([
					{ id: "d1", at: new Date(sampleWork.now().getTime() - 2 * when.HOUR), who: sampleWork.me().name, kind: "approved",
						what: t("sample.audit.decided"), from: t("sample.value.waitingDecision"), to: t("sample.value.approved") }
				]);
			}
			return { options: { label: t("auditTrail.demoLabel"), data: data(7) }, next: data };
		}
	};
});
