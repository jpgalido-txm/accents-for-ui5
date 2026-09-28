/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Assignee picker: chooses who a task goes to. Search the people who can take it; each says how many
 * open tasks they already have and whether they are available, in words. "Assign to me" takes it in
 * one press. Assigning can be undone, so it happens at once and the result offers an undo.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/Link",
	"sap/m/SearchField",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/MessageStrip",
	"sap/m/FlexItemData",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (VBox, HBox, Text, Label, Button, Link, SearchField, List, StandardListItem, MessageStrip, FlexItemData,
	Part, Messages, I18n, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	/** Availability as a word with a state; the icon on each row is the same for everyone. */
	var AVAILABLE = { available: "Success", busy: "Warning", away: "Error" };

	return {
		info: {
			controls: ["sap.m.SearchField", "sap.m.List", "sap.m.StandardListItem", "sap.m.MessageStrip"],
			motion: "None. The chosen person is marked and the result is stated in words.",
			still: true
		},

		/**
		 * options:
		 *   data      { me (person id), assignee (person id or null), task (short name of what is assigned),
		 *               people: [{ id, name, role, open (open tasks), availability: "available"|"busy"|"away", back (Date) }] }
		 *   onAssign  function (person, previous) after each assignment; previous may be null
		 *   onUndo    optional function (restored, undone) after an undo
		 */
		create: function (o) {
			var me = null, people = [], assignee = null, task = "", query = "", previous = null, undoable = false;

			var current = new Text();
			var currentLabel = new Label({ text: t("assigneePicker.current"), labelFor: current, showColon: true }).addStyleClass("sapUiTinyMarginEnd");
			var mine = new Button({ text: t("assigneePicker.toMe"), icon: "sap-icon://employee", press: function () { assign(me); } });
			current.setLayoutData(new FlexItemData({ growFactor: 1 }));
			var head = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [currentLabel, current, mine] });
			var search = new SearchField({ width: "100%", placeholder: t("assigneePicker.search"),
				liveChange: function (e) { query = (e.getParameter("newValue") || "").toLowerCase(); draw(); } });
			var searchLabel = new Label({ text: t("assigneePicker.searchLabel"), labelFor: search }).addStyleClass("sapUiSmallMarginTop");
			search.addAriaLabelledBy(searchLabel);
			var list = new List({ mode: "SingleSelectMaster", ariaLabelledBy: [searchLabel], includeItemInSelection: true,
				selectionChange: function (e) { assign(e.getParameter("listItem").data("person").id); } });
			var undo = new Link({ text: t("assigneePicker.undo"), press: function () { undoLast(); } });
			var result = new MessageStrip({ type: "Success", showIcon: true, visible: false, link: undo }).addStyleClass("sapUiSmallMarginTop");
			var box = new VBox({ renderType: "Bare", items: [head, result, searchLabel, search, list] });

			function person(id) { return people.find(function (p) { return p.id === id; }) || null; }
			function availability(p) {
				if (p.availability === "away") { return p.back ? t("assigneePicker.awayUntil", when.day(p.back)) : t("assigneePicker.away"); }
				return t("assigneePicker." + p.availability);
			}
			function load(p) { return p.open === 1 ? t("assigneePicker.oneOpen") : t("assigneePicker.open", p.open); }

			function draw() {
				list.destroyItems();
				var a = person(assignee);
				current.setText(a ? (a.id === me ? t("assigneePicker.you", a.name) : a.name) : t("assigneePicker.nobody"));
				mine.setEnabled(!!me && assignee !== me);
				mine.setTooltip(assignee === me ? t("assigneePicker.alreadyYou") : t("assigneePicker.toMeTip", task));
				people.filter(function (p) {
					return !query || p.name.toLowerCase().indexOf(query) >= 0 || String(p.role || "").toLowerCase().indexOf(query) >= 0;
				}).forEach(function (p) {
					var item = new StandardListItem({
						title: p.id === me ? t("assigneePicker.you", p.name) : p.name,
						description: (p.role ? p.role + " · " : "") + load(p),
						info: availability(p),
						infoState: AVAILABLE[p.availability] || "None",
						icon: "sap-icon://person-placeholder",
						iconInset: false,
						selected: p.id === assignee
					});
					item.data("person", p);
					list.addItem(item);
				});
				list.setNoDataText(t("assigneePicker.noMatch"));
			}

			function assign(id) {
				if (!id || id === assignee) { draw(); return; }
				var p = person(id);
				if (!p) { return; }
				previous = assignee;
				assignee = id;
				undoable = true;
				result.setType("Success");
				result.setText(t("assigneePicker.assigned", task, id === me ? t("assigneePicker.yourself") : p.name));
				undo.setVisible(true);
				result.setVisible(true);
				draw();
				if (o.onAssign) { o.onAssign(p, person(previous)); }
			}

			function undoLast() {
				if (!undoable) { return; }
				var undone = person(assignee);
				assignee = previous;
				undoable = false;
				var back = person(assignee);
				result.setType("Information");
				result.setText(back ? t("assigneePicker.restored", task, back.name) : t("assigneePicker.restoredNobody", task));
				undo.setVisible(false);
				Messages.add({ type: "Information", text: result.getText(), group: t("assigneePicker.group") });
				draw();
				if (o.onUndo) { o.onUndo(back, undone); }
			}

			var part = Part.make({
				key: "assignee-picker",
				content: box,
				empty: t("assigneePicker.empty"),
				render: function (data) {
					me = data.me;
					people = data.people || [];
					assignee = data.assignee || null;
					task = data.task || t("assigneePicker.thisTask");
					undoable = false;
					result.setVisible(false);
					draw();
					if (!people.length) { part.state("empty"); }
				}
			});
			part.assignee = function () { return person(assignee); };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			function data(seed) {
				var list = sampleWork.tasks(seed);
				return { me: sampleWork.me().id, assignee: "owen", task: list[seed % list.length].title, people: sampleWork.people(seed) };
			}
			return {
				options: { data: data(7), onAssign: function () { /* the demo records nothing; the result is shown in the picker */ } },
				next: data
			};
		}
	};
});
