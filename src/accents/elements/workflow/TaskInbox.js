/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Task inbox: the tasks waiting for one person. Each row says what the task is, which object it is
 * about, who asked, when it is due and how urgent it is. Priority is a word with an icon, and time
 * overdue is stated in words, so colour is never the only signal. Counted filters (Overdue, Due today,
 * All), sorting by due date, and several rows can be chosen for one decision. Each row is something a
 * person acts on, so it carries the assistant's object button.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectStatus",
	"sap/m/VBox",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/Button",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Layout",
	"accents/core/I18n",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (Table, Column, ColumnListItem, Text, ObjectIdentifier, ObjectStatus, VBox, OverflowToolbar, ToolbarSpacer,
	SegmentedButton, SegmentedButtonItem, Button, InvisibleText, Part, Motion, Layout, I18n, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	/** Priority as a word with an icon; the order sorts urgent work first when due times are equal. */
	var PRIORITY = {
		high: { state: "Error", icon: "sap-icon://high-priority", rank: 0 },
		medium: { state: "Warning", icon: "sap-icon://status-critical", rank: 1 },
		low: { state: "None", icon: "sap-icon://status-inactive", rank: 2 }
	};
	var FILTERS = ["overdue", "today", "all"];

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.SegmentedButton", "sap.m.ObjectStatus", "sap.m.ObjectIdentifier"],
			motion: "When tasks arrive or leave, the filter counts pulse once; rows and headers stay still.",
			still: false
		},

		/**
		 * options:
		 *   data       { now, tasks: [{ id, title, object, requester, due (Date or ISO), priority: "high"|"medium"|"low" }] }
		 *   label      accessible name of the table
		 *   assistant  optional; puts the assistant's object button on each row
		 *   onOpen     optional; makes rows open the task, receives the task
		 *   onSelect   optional; receives the chosen tasks whenever the choice changes (turns on multi-select)
		 *   filter     optional starting filter: "overdue" | "today" | "all" (default "all")
		 *
		 * Extra methods: part.selected(), part.clearSelection(), part.setOpen(id), part.visible() (tasks in
		 * the current filter and order).
		 */
		create: function (o) {
			var filter = FILTERS.indexOf(o.filter) >= 0 ? o.filter : "all";
			var ascending = true;
			var openId = null;
			var multi = !!o.onSelect;
			var withAi = !!(o.assistant && o.assistant.objectButton);

			var filterLabel = new InvisibleText({ text: t("taskInbox.filterLabel") }).toStatic();
			var filters = new SegmentedButton({
				selectedKey: filter,
				ariaLabelledBy: [filterLabel],
				items: FILTERS.map(function (k) { return new SegmentedButtonItem({ key: k, text: t("taskInbox.filter." + k, 0) }); }),
				selectionChange: function (e) { filter = e.getParameter("item").getKey(); rows(); }
			});
			var sort = new Button({ icon: "sap-icon://sort-ascending", type: "Transparent", press: function () { ascending = !ascending; rows(); } });
			var chosen = new Text({ text: "" });
			var clear = new Button({ text: t("taskInbox.clear"), type: "Transparent", press: function () { part.clearSelection(); } });
			// The counted filters get a row of their own, so their counts stay readable on a phone.
			filters.setWidth("100%");
			var filterRow = new VBox({ renderType: "Bare", items: [filters] }).addStyleClass("sapUiTinyMarginBottom");
			var bar = new OverflowToolbar({ style: "Clear", content: [chosen, clear, new ToolbarSpacer(), sort] });

			var columns = [
				new Column({ header: new Text({ text: t("taskInbox.col.task") }) }),
				new Column({ header: new Text({ text: t("taskInbox.col.requester") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("taskInbox.col.due") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("taskInbox.col.priority") }), minScreenWidth: "Tablet", demandPopin: true })
			];
			if (withAi) { columns.push(new Column({ width: "3rem", hAlign: "Center", header: new InvisibleText({ text: t("taskInbox.col.assistant") }) })); }
			var tableSettings = {
				columns: columns,
				headerToolbar: bar,
				mode: multi ? "MultiSelect" : "None",
				popinLayout: "GridSmall",
				sticky: ["HeaderToolbar", "ColumnHeaders"],
				selectionChange: function () { selectionChanged(); }
			};
			var table = Layout.fitTable(new Table(tableSettings));
			table.addAriaLabelledBy(new InvisibleText({ text: o.label || t("taskInbox.label") }).toStatic());
			if (o.onOpen) {
				table.attachItemPress(function (e) {
					var task = e.getParameter("listItem").data("task");
					part.setOpen(task.id);
					o.onOpen(task);
				});
			}

			var now = null, all = [], shown = [], counts = null;

			function inFilter(task) {
				var d = when.due(task.due, now);
				return filter === "all" || (filter === "overdue" ? d.overdue : d.today);
			}
			function sorted(list) {
				return list.slice().sort(function (a, b) {
					var d = when.ms(a.due) - when.ms(b.due);
					if (d === 0) { d = PRIORITY[a.priority].rank - PRIORITY[b.priority].rank; }
					return ascending ? d : -d;
				});
			}

			function row(task) {
				var due = when.due(task.due, now);
				var p = PRIORITY[task.priority] || PRIORITY.low;
				var cells = [
					new ObjectIdentifier({ title: task.title, text: task.object }),
					new Text({ text: task.requester }),
					new VBox({ renderType: "Bare", items: [
						new Text({ text: when.day(task.due), tooltip: when.exact(task.due) }),
						new ObjectStatus({ text: due.text, state: due.state, icon: due.icon })
					] }),
					new ObjectStatus({ text: t("taskInbox.priority." + task.priority), state: p.state, icon: p.icon })
				];
				if (withAi) {
					cells.push(o.assistant.objectButton({
						title: task.title + " (" + task.object + ")",
						facts: {
							"Task": task.title, "Object": task.object, "Requester": task.requester,
							"Due": when.exact(task.due), "Due status": due.text, "Priority": t("taskInbox.priority." + task.priority)
						},
						question: t("taskInbox.aiQuestion")
					}));
				}
				var settings = { cells: cells, type: o.onOpen ? "Navigation" : "Inactive", navigated: task.id === openId };
				var item = new ColumnListItem(settings);
				item.data("task", task);
				return item;
			}

			function rows() {
				var keep = selectedIds();
				shown = sorted(all.filter(inFilter));
				table.destroyItems();
				shown.forEach(function (task) {
					var item = row(task);
					table.addItem(item);
					if (keep.indexOf(task.id) >= 0) { item.setSelected(true); }
				});
				table.setNoDataText(t("taskInbox.none." + filter));
				sort.setTooltip(ascending ? t("taskInbox.sortEarliest") : t("taskInbox.sortLatest"));
				sort.setIcon(ascending ? "sap-icon://sort-ascending" : "sap-icon://sort-descending");
				selectionChanged(true);
			}

			function selectedIds() { return table.getSelectedItems().map(function (i) { return i.data("task").id; }); }

			function selectionChanged(quiet) {
				var n = table.getSelectedItems().length;
				chosen.setText(t("taskInbox.selected", n));
				chosen.setVisible(multi && n > 0);
				clear.setVisible(multi && n > 0);
				if (!quiet && o.onSelect) { o.onSelect(part.selected()); }
			}

			function count() {
				var c = { overdue: 0, today: 0, all: all.length };
				all.forEach(function (task) { var d = when.due(task.due, now); if (d.overdue) { c.overdue += 1; } if (d.today) { c.today += 1; } });
				return c;
			}

			var part = Part.make({
				key: "task-inbox",
				content: new VBox({ renderType: "Bare", items: [filterRow, table] }),
				empty: t("taskInbox.empty"),
				render: function (data) {
					now = data.now || new Date();
					all = data.tasks || [];
					var before = counts;
					counts = count();
					filters.getItems().forEach(function (item) { item.setText(t("taskInbox.filter." + item.getKey(), counts[item.getKey()])); });
					rows();
					if (!all.length) { part.state("empty"); }
					if (before && (before.all !== counts.all || before.overdue !== counts.overdue || before.today !== counts.today) && filters.getDomRef()) {
						Motion.pulse(filters);
					}
				}
			});
			part.selected = function () { return table.getSelectedItems().map(function (i) { return i.data("task"); }); };
			part.clearSelection = function () { table.removeSelections(true); selectionChanged(); };
			part.visible = function () { return shown.slice(); };
			part.setOpen = function (id) {
				openId = id;
				table.getItems().forEach(function (i) { i.setNavigated(i.data("task").id === id); });
			};
			part.setFilter = function (k) { if (FILTERS.indexOf(k) >= 0) { filter = k; filters.setSelectedKey(k); rows(); } };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			return {
				options: {
					label: t("taskInbox.demoLabel"),
					assistant: ctx && ctx.assistant,
					onSelect: function () { /* the demo shows the count in the toolbar; the approval inbox decides on them */ },
					data: { now: sampleWork.now(), tasks: sampleWork.tasks(7) }
				},
				next: function (seed) {
					// A decided task leaves and the rest move in time, so counts and order visibly change.
					var list = sampleWork.tasks(seed);
					return { now: sampleWork.now(), tasks: list.filter(function (x, i) { return i !== seed % list.length; }) };
				}
			};
		}
	};
});
