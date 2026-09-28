/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Case workspace: everything about one case in one place. An object page whose header says where the
 * case stands, who owns it and when it is due, with the case's actions: change the owner, open the
 * notifications about it, and ask the assistant. Below, anchored sections: facts, steps, where it is
 * in its process, comments and history. A notification's action takes the person to the section it
 * is about.
 *
 * Use it for one case, claim, request or incident that several people work on. The pattern arranges
 * regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/uxap/ObjectPageLayout",
	"sap/uxap/ObjectPageDynamicHeaderTitle",
	"sap/uxap/ObjectPageSection",
	"sap/uxap/ObjectPageSubSection",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Button",
	"sap/m/ObjectStatus",
	"sap/m/MessageStrip",
	"sap/m/Dialog",
	"sap/m/ResponsivePopover",
	"sap/m/List",
	"sap/m/DisplayListItem",
	"sap/m/FlexItemData",
	"sap/m/OverflowToolbarLayoutData",
	"sap/ui/Device",
	"accents/core/I18n",
	"accents/elements/collaboration/StepsTable",
	"accents/elements/workflow/ProcessFlow",
	"accents/elements/workflow/CommentThread",
	"accents/elements/workflow/AuditTrail",
	"accents/elements/workflow/AssigneePicker",
	"accents/elements/workflow/NotificationList",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork",
	"accents/elements/common/SourceLine"
], function (ObjectPageLayout, DynamicHeaderTitle, ObjectPageSection, ObjectPageSubSection, VBox, HBox, Title, Text, Label, Button,
	ObjectStatus, MessageStrip, Dialog, ResponsivePopover, List, DisplayListItem, FlexItemData, OverflowToolbarLayoutData, Device, I18n,
	StepsTable, ProcessFlow, CommentThread, AuditTrail, AssigneePicker, NotificationList, when, sampleWork, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.CaseWorkspace");

	/**
	 * regions:
	 *   title      the case's name
	 *   status     optional control beside the title (an ObjectStatus)
	 *   facts      [{ label, value }] where value is a control; the header's key facts
	 *   actions    controls for the header's actions
	 *   assistant  the case's assistant button; it stays in view and never goes into the overflow
	 *   sections   [{ key, title, content }] anchored sections, in order
	 *   notice     optional control above the page, such as a statement that nothing is sent
	 *   height     CSS height of the object page (default "46rem"); it scrolls inside
	 *   source     the source line control
	 *
	 * Returns a control carrying control.scrollTo(key), which brings one section into view.
	 */
	function compose(r) {
		var heading = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [
			new Title({ text: r.title, level: "H2", titleStyle: "H3", wrapping: true }).addStyleClass("sapUiSmallMarginEnd")
		].concat(r.status ? [r.status] : []) });
		var actions = (r.actions || []).slice();
		if (r.assistant) {
			r.assistant.setLayoutData(new OverflowToolbarLayoutData({ priority: "NeverOverflow" }));
			actions.push(r.assistant);
		}
		var facts = new HBox({ renderType: "Bare", wrap: "Wrap", items: (r.facts || []).map(function (f) {
			return new VBox({ renderType: "Bare", items: [new Label({ text: f.label, labelFor: f.value }), f.value] })
				.addStyleClass("sapUiMediumMarginEnd sapUiSmallMarginBottom");
		}) });
		var byKey = {};
		var page = new ObjectPageLayout({
			upperCaseAnchorBar: false,
			useIconTabBar: false,
			showFooter: false,
			headerTitle: new DynamicHeaderTitle({ heading: heading, actions: actions }),
			headerContent: [facts],
			sections: (r.sections || []).map(function (s) {
				var section = new ObjectPageSection({ title: s.title, titleUppercase: false, subSections: [
					new ObjectPageSubSection({ blocks: [s.content] })
				] });
				byKey[s.key] = section;
				return section;
			})
		});
		page.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));
		var frame = new VBox({ renderType: "Bare", height: r.height || "46rem", items: [page] });
		var control = new VBox({ renderType: "Bare", items: (r.notice ? [r.notice] : []).concat([frame], r.source ? [r.source] : []) });
		control.scrollTo = function (key) { if (byKey[key]) { page.scrollToSection(byKey[key].getId()); } };
		control.page = page;
		return control;
	}

	return {
		info: {
			controls: ["sap.uxap.ObjectPageLayout", "sap.uxap.ObjectPageDynamicHeaderTitle", "sap.m.ResponsivePopover", "sap.m.Table",
				"sap.m.FeedListItem", "sap.m.NotificationListItem", "accents.core.Chart (Apache ECharts)"],
			motion: "When a step changes, its cells in the steps table flash once and its mark in the process takes its new look. The header stays put.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var me = sampleWork.me();
			var control = null;
			var task, people, process, history, comments, owner, notes;

			/** The case is the supplier task of the sample: its process has a blocked check. */
			function build(seed) {
				task = sampleWork.tasks(seed)[2];
				people = sampleWork.people(seed);
				process = sampleWork.process(task);
				history = sampleWork.history(task);
				comments = sampleWork.comments(task);
				owner = "priya";
				notes = sampleWork.notifications(seed);
				// Replay unblocks the check on even seeds, so the steps and the process visibly change.
				if (seed % 2 === 0) {
					process.steps = process.steps.map(function (s) { return s.id === "check" ? Object.assign({}, s, { state: "done", note: "" }) : s; });
				}
			}
			function person(id) { return people.find(function (p) { return p.id === id; }); }

			/** Steps table rows, from the process: one step a month, ending in the case's due month. */
			function stepRows() {
				var ps = Data.periods("2026-06", process.steps.length);
				var map = { done: "done", current: "active", blocked: "late", waiting: "planned" };
				return process.steps.map(function (s, i) {
					var lane = process.lanes.find(function (l) { return l.id === s.lane; });
					return { id: s.id, name: s.name, owner: s.owner, group: lane ? lane.name : "", period: ps[i], status: map[s.state],
						tasks: s.state === "done" ? 0 : s.state === "blocked" ? 2 : 1 };
				});
			}

			/* ---------- header ---------- */
			var status = new ObjectStatus();
			var ownerText = new Text(), dueText = new Text(), dueState = new ObjectStatus(), priority = new ObjectStatus();
			var dueBox = new VBox({ renderType: "Bare", items: [dueText, dueState] });

			function refreshHeader() {
				var blocked = process.steps.some(function (s) { return s.state === "blocked"; });
				status.setText(blocked ? t("status.blocked") : t("status.open"));
				status.setState(blocked ? "Error" : "Information");
				status.setIcon(blocked ? "sap-icon://locked" : "sap-icon://away");
				var o = person(owner);
				ownerText.setText(o ? (o.id === me.id ? t("ownerYou", o.name) : o.name) : t("nobody"));
				dueText.setText(when.exact(task.due));
				var d = when.due(task.due, sampleWork.now());
				dueState.setText(d.text); dueState.setState(d.state); dueState.setIcon(d.icon);
				priority.setText(t("priority." + task.priority));
				priority.setState({ high: "Error", medium: "Warning", low: "None" }[task.priority]);
				priority.setIcon({ high: "sap-icon://high-priority", medium: "sap-icon://status-critical", low: "sap-icon://status-inactive" }[task.priority]);
			}

			/* ---------- owner ---------- */
			var picker = AssigneePicker.create({
				onAssign: function (p, previous) {
					owner = p.id;
					history = history.concat([{ id: "own" + history.length, at: sampleWork.now(), who: me.name, kind: "assigned",
						what: t("ownerChanged"), from: previous ? previous.name : t("nobody"), to: p.name }]);
					refreshAll();
				},
				onUndo: function (restored) {
					owner = restored ? restored.id : null;
					history = history.slice(0, history.length - 1);
					refreshAll();
				}
			});
			var ownerDialog = new Dialog({
				title: t("ownerTitle"),
				contentWidth: "30rem",
				stretch: Device.system.phone,
				content: [picker.root],
				endButton: new Button({ text: t("close"), press: function () { ownerDialog.close(); } })
			}).addStyleClass("sapUiContentPadding");
			// The picker is filled once per data set, so its undo stays available after the dialog closes.
			var pickerFilled = false;
			var changeOwner = new Button({ text: t("changeOwner"), icon: "sap-icon://employee", press: function () {
				if (!pickerFilled) { picker.update({ me: me.id, assignee: owner, task: t("caseName"), people: people }); pickerFilled = true; }
				ownerDialog.open();
			} });

			/* ---------- notifications ---------- */
			var noteList = NotificationList.create({
				onAction: function (n, a) {
					notePopover.close();
					if (a.key === "openComments") { control.scrollTo("comments"); }
					else if (a.key === "openHistory") { control.scrollTo("history"); }
					else { control.scrollTo("steps"); }
				},
				onChange: function (items) { notes = items; refreshNotes(); }
			});
			var notePopover = new ResponsivePopover({ title: t("notifications"), placement: "Bottom", contentWidth: "32rem",
				content: [noteList.root],
				endButton: new Button({ text: t("close"), press: function () { notePopover.close(); } }) }).addStyleClass("sapUiContentPadding");
			var noteButton = new Button({ icon: "sap-icon://bell", press: function () { notePopover.openBy(noteButton); } });
			noteButton.addDependent(notePopover);
			function refreshNotes() {
				var n = notes.filter(function (x) { return x.unread; }).length;
				noteButton.setText(t("notificationsCount", n));
				noteButton.setTooltip(n ? t("notificationsTip", n) : t("notificationsNone"));
			}

			/* ---------- sections ---------- */
			var factsList = new List({ showSeparators: "Inner" });
			var steps = StepsTable.create({ label: t("stepsLabel"), assistant: ctx.assistant });
			var flow = ProcessFlow.create({ label: t("processLabel") });
			var thread = CommentThread.create({ now: sampleWork.now, onChange: function (list) { comments = list; } });
			var trail = AuditTrail.create({ label: t("historyLabel") });

			function refreshAll() {
				refreshHeader();
				refreshNotes();
				factsList.destroyItems();
				[[t("fact.supplier"), task.object], [t("fact.requester"), task.requester], [t("fact.owner"), ownerText.getText()],
					[t("fact.due"), when.exact(task.due)], [t("fact.kind"), task.title]].forEach(function (f) {
					factsList.addItem(new DisplayListItem({ label: f[0], value: f[1] }));
				});
				steps.update(stepRows());
				flow.update(process);
				trail.update(history);
			}

			var aiButton = ctx.assistant.objectButton({ title: t("caseName"), get: function () {
				var blocked = process.steps.filter(function (s) { return s.state === "blocked"; }).map(function (s) { return s.name; });
				var o = person(owner);
				return {
					title: t("caseName"),
					facts: { "Case": t("caseName"), "Owner": o ? o.name : "nobody", "Due": when.exact(task.due),
						"Blocked steps": blocked.join(", ") || "none", "Comments": String(comments.length) },
					question: t("aiQuestion")
				};
			} });

			build(7);
			control = compose({
				title: t("caseName"),
				status: status,
				facts: [
					{ label: t("fact.owner"), value: ownerText }, { label: t("fact.due"), value: dueBox }, { label: t("fact.priority"), value: priority }
				],
				actions: [changeOwner, noteButton],
				assistant: aiButton,
				sections: [
					{ key: "facts", title: t("section.facts"), content: factsList },
					{ key: "steps", title: t("section.steps"), content: steps.root },
					{ key: "process", title: t("section.process"), content: flow.root },
					{ key: "comments", title: t("section.comments"), content: thread.root },
					{ key: "history", title: t("section.history"), content: trail.root }
				],
				notice: new MessageStrip({ type: "Information", showIcon: true, text: t("notice") }).addStyleClass("sapUiSmallMarginBottom"),
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			function load(seed) {
				build(seed);
				pickerFilled = false;
				thread.update({ me: me.id, people: people, comments: comments });
				noteList.update({ now: sampleWork.now(), items: notes });
				refreshAll();
			}
			load(7);
			return {
				control: control,
				next: function (seed) { return function () { load(seed); }; }
			};
		}
	};
});
