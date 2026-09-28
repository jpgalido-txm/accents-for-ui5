/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Steps table: the dated steps of one object, each with who owns it, which group it belongs to, the
 * period it falls in, where it stands, and how many tasks are still open. Status is a word with an
 * icon, never colour alone. A row is something a person acts on, so it may carry an assistant button.
 */
sap.ui.define([
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/Text",
	"sap/m/ObjectIdentifier",
	"sap/m/ObjectStatus",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/core/Layout",
	"accents/core/I18n"
], function (Table, Column, ColumnListItem, Text, ObjectIdentifier, ObjectStatus, Part, Format, Motion, Layout, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.collaboration.i18n.i18n");

	var STATUS = {
		done: { text: t("stepsTable.status.done"), state: "Success", icon: "sap-icon://accept" },
		active: { text: t("stepsTable.status.active"), state: "Information", icon: "sap-icon://away" },
		late: { text: t("stepsTable.status.late"), state: "Error", icon: "sap-icon://alert" },
		planned: { text: t("stepsTable.status.planned"), state: "None", icon: "sap-icon://pending" }
	};

	/** Runs fn once, right after the control next renders. */
	function afterRender(control, fn) {
		var d = { onAfterRendering: function () { control.removeEventDelegate(d); fn(); } };
		control.addEventDelegate(d);
	}

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.ObjectStatus", "sap.m.ObjectIdentifier"],
			motion: "When a step's status or open-task count changes, that cell flashes once; nothing else moves.",
			still: false
		},

		/**
		 * options:
		 *   label      accessible name of the table ("Plan approval steps")
		 *   assistant  optional; the app's assistant, to put an object button on each row
		 *   onOpen     optional; makes rows navigable and receives the step
		 *   data       [{ id, name, owner, group, period ("2026-07"), status: "done"|"active"|"late"|"planned", tasks }]
		 */
		create: function (o) {
			var withAi = !!(o.assistant && o.assistant.objectButton);
			var columns = [
				new Column({ header: new Text({ text: t("stepsTable.column.step") }) }),
				new Column({ header: new Text({ text: t("stepsTable.column.owner") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("stepsTable.column.group") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("stepsTable.column.period") }), minScreenWidth: "Tablet", demandPopin: true }),
				new Column({ header: new Text({ text: t("stepsTable.column.status") }) }),
				new Column({ header: new Text({ text: t("stepsTable.column.openTasks") }), hAlign: "End", width: "6rem" })
			];
			if (withAi) { columns.push(new Column({ width: "3rem", hAlign: "Center" })); }
			var table = Layout.fitTable(new Table({ columns: columns, popinLayout: "GridSmall", ariaLabelledBy: [] }));
			if (o.label) { table.setTooltip(o.label); }
			if (o.onOpen) {
				table.attachItemPress(function (e) { o.onOpen(e.getParameter("listItem").data("step")); });
			}
			var rows = {};

			function cellsFor(step) {
				var cells = {
					name: new ObjectIdentifier({ title: step.name }),
					owner: new Text({ text: "" }),
					group: new Text({ text: step.group || Format.DASH }),
					period: new Text({ text: Format.period(step.period) }),
					status: new ObjectStatus(),
					tasks: new Text({ text: "" }).addStyleClass("accTabular")
				};
				var list = [cells.name, cells.owner, cells.group, cells.period, cells.status, cells.tasks];
				if (withAi) {
					list.push(o.assistant.objectButton({
						title: t("stepsTable.ai.title", step.name),
						get: function () {
							var s = item.data("step");
							var facts = {};
							facts[t("stepsTable.column.step")] = s.name;
							facts[t("stepsTable.column.owner")] = s.owner || t("stepsTable.notAssigned");
							facts[t("stepsTable.column.group")] = s.group;
							facts[t("stepsTable.column.period")] = Format.period(s.period);
							facts[t("stepsTable.column.status")] = (STATUS[s.status] || STATUS.planned).text;
							facts[t("stepsTable.column.openTasks")] = Format.number(s.tasks);
							return {
								title: t("stepsTable.ai.title", s.name),
								facts: facts,
								question: t("stepsTable.ai.question")
							};
						}
					}));
				}
				var settings = { cells: list };
				if (o.onOpen) { settings.type = "Navigation"; }
				var item = new ColumnListItem(settings);
				return { item: item, cells: cells };
			}

			function write(row, step) {
				var s = STATUS[step.status] || STATUS.planned;
				row.cells.name.setTitle(step.name);
				row.cells.owner.setText(step.owner || t("stepsTable.notAssigned"));
				row.cells.group.setText(step.group || Format.DASH);
				row.cells.period.setText(Format.period(step.period));
				row.cells.status.setText(s.text);
				row.cells.status.setState(s.state);
				row.cells.status.setIcon(s.icon);
				row.cells.tasks.setText(Format.number(step.tasks));
				row.item.data("step", step);
			}

			var part = Part.make({
				key: "steps-table",
				content: table,
				empty: t("stepsTable.empty"),
				render: function (steps, prev) {
					var before = {};
					(prev || []).forEach(function (s) { before[s.id] = s; });
					var sameSet = prev && prev.length === steps.length && steps.every(function (s, i) { return prev[i].id === s.id; });
					if (!sameSet) {
						table.destroyItems();
						rows = {};
						steps.forEach(function (s) {
							var row = cellsFor(s);
							rows[s.id] = row;
							write(row, s);
							table.addItem(row.item);
						});
						return;
					}
					steps.forEach(function (s) {
						var row = rows[s.id], old = before[s.id];
						write(row, s);
						if (old && old.status !== s.status) {
							afterRender(row.cells.status, function () { Motion.flash(row.cells.status, "none"); });
						}
						if (old && old.tasks !== s.tasks) {
							afterRender(row.cells.tasks, function () { Motion.flash(row.cells.tasks, Format.tone(s.tasks - old.tasks, "down")); });
						}
					});
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			var STEPS = [
				{ id: "S1", name: t("stepsTable.demo.step.S1"), owner: t("stepsTable.demo.owner.rosa"), group: t("stepsTable.demo.group.demand") },
				{ id: "S2", name: t("stepsTable.demo.step.S2"), owner: t("stepsTable.demo.owner.tomas"), group: t("stepsTable.demo.group.demand") },
				{ id: "S3", name: t("stepsTable.demo.step.S3"), owner: t("stepsTable.demo.owner.priya"), group: t("stepsTable.demo.group.supply") },
				{ id: "S4", name: t("stepsTable.demo.step.S4"), owner: t("stepsTable.demo.owner.priya"), group: t("stepsTable.demo.group.supply") },
				{ id: "S5", name: t("stepsTable.demo.step.S5"), owner: t("stepsTable.demo.owner.owen"), group: t("stepsTable.demo.group.finance") },
				{ id: "S6", name: t("stepsTable.demo.step.S6"), owner: null, group: t("stepsTable.demo.group.leadership") }
			];
			function rows(seed) {
				var random = Data.rng(seed);
				var ps = Data.periods("2026-05", STEPS.length);
				return STEPS.map(function (s, i) {
					var p = ps[i];
					var status = p < Data.SAMPLE_TODAY ? (random() < 0.3 ? "late" : "done") : p === Data.SAMPLE_TODAY ? "active" : "planned";
					var tasks = status === "done" ? 0 : Math.round(random() * 6) + (status === "late" ? 1 : 0);
					return Object.assign({}, s, { period: p, status: status, tasks: tasks });
				});
			}
			return {
				options: { label: t("stepsTable.demo.label"), assistant: ctx && ctx.assistant, data: rows(7) },
				next: function (seed) { return rows(seed); }
			};
		}
	};
});
