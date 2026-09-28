/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Approval inbox: the tasks waiting for one person's decision, in three flexible columns. First the
 * inbox, then the object the chosen task is about (its facts, where it is in its process, its history
 * and its comments), then the decision. After a decision the task leaves the inbox, the counts change
 * and the next task opens. Choosing several tasks turns the decision column into one decision for all
 * of them. On narrower widths the columns become two, then one, each with a way back.
 *
 * Use it when a person works through decisions one after another. The pattern arranges regions only;
 * it fetches nothing.
 */
sap.ui.define([
	"sap/f/FlexibleColumnLayout",
	"sap/m/Page",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/MessageStrip",
	"sap/m/Link",
	"sap/m/List",
	"sap/m/DisplayListItem",
	"sap/m/FlexItemData",
	"sap/m/IllustratedMessage",
	"accents/core/I18n",
	"accents/core/Layout",
	"accents/elements/workflow/TaskInbox",
	"accents/elements/workflow/DecisionPanel",
	"accents/elements/workflow/ProcessFlow",
	"accents/elements/workflow/AuditTrail",
	"accents/elements/workflow/CommentThread",
	"accents/elements/workflow/sampleWork",
	"accents/elements/common/SourceLine"
], function (FlexibleColumnLayout, Page, VBox, HBox, Title, Text, Button, MessageStrip, Link, List, DisplayListItem, FlexItemData, IllustratedMessage,
	I18n, Layout, TaskInbox, DecisionPanel, ProcessFlow, AuditTrail, CommentThread, sampleWork, SourceLine) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ApprovalInbox");

	/** Which flexible-column layout shows each level. */
	var LAYOUT = { inbox: "OneColumn", object: "TwoColumnsMidExpanded", decision: "ThreeColumnsMidExpanded" };

	/**
	 * regions:
	 *   inbox          control: the tasks (first column)
	 *   inboxTitle     short noun for the first column ("Inbox (7)")
	 *   object         control: the chosen task's object (second column)
	 *   objectTitle    short noun for the second column
	 *   decision       control: the decision (third column)
	 *   decisionTitle  short noun for the third column
	 *   notice         optional control above the columns, such as a statement that nothing is sent
	 *   source         the source line control, shown under the columns
	 *   height         CSS height of the column area (default "44rem")
	 *
	 * Returns a control carrying:
	 *   control.show(level)   "inbox" | "object" | "decision"
	 *   control.level()       the level on show
	 *   control.setTitles({ inbox, object, decision })
	 */
	function compose(r) {
		var level = "inbox";
		var pages = {};
		var decide = new Button({ text: t("decide"), type: "Emphasized", visible: false, press: function () { show("decision"); } });
		function page(key, title, content, back, extra) {
			var settings = { title: title || "", showNavButton: false, content: [content], backgroundDesign: "List" };
			if (back) { settings.navButtonPress = back; settings.navButtonTooltip = t("back"); }
			if (extra) { settings.headerContent = extra; }
			pages[key] = new Page(settings);
			return pages[key];
		}
		var fcl = new FlexibleColumnLayout({
			layout: LAYOUT.inbox,
			backgroundDesign: "Translucent",
			beginColumnPages: [page("inbox", r.inboxTitle, r.inbox)],
			midColumnPages: [page("object", r.objectTitle, r.object, function () { show("inbox"); }, [decide])],
			endColumnPages: [page("decision", r.decisionTitle, r.decision, function () { show("object"); })]
		});

		/** The layout for a level at the width the columns have now. */
		function layoutFor(max) { return level === "object" && max >= 3 ? LAYOUT.decision : LAYOUT[level]; }
		/** A column gets a back button when the column before it is hidden at this width. */
		function backs() {
			var max = fcl.getMaxColumnsCount();
			// The width is known only once the columns are drawn, so the layout is chosen again here.
			if (fcl.getDomRef() && fcl.getLayout() !== layoutFor(max)) { fcl.setLayout(layoutFor(max)); }
			pages.object.setShowNavButton(level !== "inbox" && max < 2);
			pages.decision.setShowNavButton(level === "decision" && max < 3);
			// When the decision column cannot sit beside the object, the object column offers it.
			decide.setVisible(level === "object" && max < 3);
		}
		function show(to) {
			level = LAYOUT[to] ? to : "inbox";
			// Wide screens open the object and the decision together; narrow ones one step at a time.
			fcl.setLayout(layoutFor(fcl.getMaxColumnsCount()));
			backs();
		}
		fcl.attachStateChange(backs);
		fcl.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "0", minHeight: "0" }));

		var frame = new VBox({ renderType: "Bare", height: r.height || "44rem", items: [fcl] });
		var control = new VBox({ renderType: "Bare", items: (r.notice ? [r.notice] : []).concat([frame], r.source ? [r.source] : []) });
		control.show = show;
		control.level = function () { return level; };
		control.setTitles = function (x) {
			Object.keys(x || {}).forEach(function (k) { if (pages[k]) { pages[k].setTitle(x[k]); } });
		};
		return control;
	}

	return {
		info: {
			controls: ["sap.f.FlexibleColumnLayout", "sap.m.Page", "sap.m.Table", "sap.m.FeedListItem", "accents.core.Chart (Apache ECharts)"],
			motion: "Columns slide as a person moves from the inbox to a task and its decision. Filter counts pulse when a task leaves; nothing else moves.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var now = sampleWork.now();
			var me = sampleWork.me();
			var people = sampleWork.people(7);
			var tasks = [], openId = null, selected = [];
			var quiet = false;         // true while the demo itself changes the selection
			var details = {};          // task id -> { history, comments }, kept while the demo runs
			var decided = 0;

			function detail(task) {
				if (!details[task.id]) { details[task.id] = { history: sampleWork.history(task), comments: sampleWork.comments(task) }; }
				return details[task.id];
			}
			function byId(id) { return tasks.find(function (x) { return x.id === id; }); }

			/* ---------- second column: the task's object ---------- */
			var heading = new Title({ level: "H2", titleStyle: "H4", wrapping: true });
			var objectText = new Text();
			var aiSlot = new HBox({ renderType: "Bare" });
			heading.setLayoutData(new FlexItemData({ growFactor: 1, shrinkFactor: 1, minWidth: "0" }));
			var head = new HBox({ renderType: "Bare", alignItems: "Center", items: [heading, aiSlot] });
			var factsTitle = new Title({ text: t("facts"), level: "H3", titleStyle: "H5" }).addStyleClass("sapUiSmallMarginTop");
			var facts = new List({ showSeparators: "Inner", ariaLabelledBy: [factsTitle] });
			var processTitle = new Title({ text: t("process"), level: "H3", titleStyle: "H5" }).addStyleClass("sapUiMediumMarginTop");
			var process = ProcessFlow.create({ label: t("processLabel") });
			var historyTitle = new Title({ text: t("history"), level: "H3", titleStyle: "H5" }).addStyleClass("sapUiMediumMarginTop");
			var history = AuditTrail.create({ label: t("historyLabel") });
			var comments = CommentThread.create({ now: sampleWork.now, onChange: function (list) {
				if (openId && details[openId]) { details[openId].comments = list; }
			} });
			comments.root.addStyleClass("sapUiMediumMarginTop");
			var none = new IllustratedMessage({ illustrationType: "sapIllus-NoTasks", illustrationSize: "Dot", enableDefaultTitleAndDescription: false,
				title: t("nothingOpen") });
			var objectBox = new VBox({ renderType: "Bare", items: [none, head, objectText, factsTitle, facts, processTitle, process.root,
				historyTitle, history.root, comments.root] }).addStyleClass("sapUiSmallMargin");

			/* ---------- third column: the decision ---------- */
			var decision = DecisionPanel.create({
				sendBack: true,
				person: me.name,
				now: sampleWork.now,
				onDecide: decidedOn,
				onUndo: undone
			});
			var decisionBox = new VBox({ renderType: "Bare", items: [decision.root] }).addStyleClass("sapUiSmallMargin");

			/* ---------- first column: the inbox ---------- */
			var inbox = TaskInbox.create({
				label: t("inboxLabel"),
				assistant: ctx.assistant,
				onOpen: function (task) { quiet = true; inbox.clearSelection(); quiet = false; selected = []; open(task.id); },
				onSelect: function (list) {
					if (quiet) { return; }
					selected = list;
					if (list.length > 1) { showBulk(); }
					else if (list.length === 1) { open(list[0].id); }
					else if (openId) { open(openId); }
				}
			});

			var notice = new MessageStrip({ type: "Information", showIcon: true, text: t("notice") }).addStyleClass("sapUiSmallMarginBottom");
			var control = compose({
				inbox: inbox.root, inboxTitle: t("inbox"),
				object: objectBox, objectTitle: t("object"),
				decision: decisionBox, decisionTitle: t("decision"),
				notice: notice,
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});

			function showObject(task) {
				var on = !!task;
				[head, objectText, factsTitle, facts, processTitle, process.root, historyTitle, history.root, comments.root]
					.forEach(function (c) { c.setVisible(on); });
				none.setVisible(!on);
				aiSlot.destroyItems();
				facts.destroyItems();
				if (!on) { return; }
				heading.setText(task.title);
				objectText.setText(task.object);
				sampleWork.facts(task).forEach(function (f) { facts.addItem(new DisplayListItem({ label: f.label, value: f.value })); });
				var factMap = {};
				sampleWork.facts(task).forEach(function (f) { factMap[f.label] = f.value; });
				aiSlot.addItem(ctx.assistant.objectButton({ title: task.title + " (" + task.object + ")", facts: factMap,
					question: t("aiQuestion") }));
				process.update(sampleWork.process(task));
				var d = detail(task);
				history.update(d.history);
				comments.update({ me: me.id, people: people, comments: d.comments });
			}

			function open(id) {
				var task = byId(id);
				openId = task ? task.id : null;
				inbox.setOpen(openId);
				showObject(task);
				decision.update({ tasks: task ? [task] : [] });
				control.setTitles({ object: task ? task.title : t("object"), decision: t("decision") });
				control.show(task ? "object" : "inbox");
			}

			function showBulk() {
				showObject(null);
				decision.update({ tasks: selected.slice() });
				control.setTitles({ decision: t("decisionBulk", selected.length) });
				control.show("decision");
			}

			function refreshInbox() {
				inbox.update({ now: now, tasks: tasks });
				control.setTitles({ inbox: t("inboxCount", tasks.length) });
			}

			/** The decision is recorded on the demo's own copy: the task leaves the inbox and the next one opens. */
			function decidedOn(res) {
				var ids = res.tasks.map(function (x) { return x.id; });
				var kind = { approve: "approved", reject: "rejected", sendBack: "sentBack" }[res.decision];
				res.tasks.forEach(function (task) {
					detail(task).history = detail(task).history.concat([{ id: "d" + (++decided), at: res.at, who: res.by, kind: kind,
						what: t("decided"), from: t("waiting"), to: t("state." + res.decision), reason: res.reason }]);
				});
				// The next task is the one after the decided one in the order the inbox shows.
				var order = inbox.visible().map(function (x) { return x.id; });
				var at = order.indexOf(ids[0]);
				var rest = order.filter(function (id) { return ids.indexOf(id) < 0; });
				var nextId = rest[Math.min(Math.max(at, 0), rest.length - 1)] || null;
				tasks = tasks.filter(function (x) { return ids.indexOf(x.id) < 0; });
				selected = [];
				quiet = true;
				inbox.clearSelection();
				quiet = false;
				lastDecided = res;
				refreshInbox();
				// The result stays readable for a moment in the decision column before the next task opens.
				var nextTask = nextId ? byId(nextId) : null;
				openId = nextTask ? nextTask.id : null;
				inbox.setOpen(openId);
				showObject(nextTask);
				decision.update({ tasks: nextTask ? [nextTask] : [], result: null });
				resultStrip.setText(t("decidedNext." + (nextTask ? "more" : "last") + (res.tasks.length > 1 ? ".bulk" : ""),
					res.tasks.length > 1 ? t("tasksN", res.tasks.length) : res.tasks[0].title,
					t("state." + res.decision).toLowerCase()));
				undoLink.setVisible(!!res.undoable);
				resultStrip.setVisible(true);
				control.setTitles({ object: nextTask ? nextTask.title : t("object"), decision: t("decision") });
				control.show(nextTask ? "object" : "inbox");
			}

			var lastDecided = null;
			var undoLink = new Link({ text: t("undo"), press: function () { undone(lastDecided); } });
			var resultStrip = new MessageStrip({ type: "Success", showIcon: true, visible: false, link: undoLink }).addStyleClass("sapUiSmallMarginBottom");
			decisionBox.insertItem(resultStrip, 0);

			function undone(res) {
				if (!res || lastDecided !== res) { return; }
				lastDecided = null;
				res.tasks.forEach(function (task) {
					if (!byId(task.id)) { tasks.push(task); }
					var h = detail(task).history;
					detail(task).history = h.slice(0, h.length - 1);
				});
				refreshInbox();
				resultStrip.setText(res.tasks.length > 1 ? t("undone.bulk", t("tasksN", res.tasks.length)) : t("undone", res.tasks[0].title));
				undoLink.setVisible(false);
				open(res.tasks[0].id);
			}

			function load(seed) {
				tasks = sampleWork.tasks(seed);
				details = {};
				lastDecided = null;
				resultStrip.setVisible(false);
				refreshInbox();
				var first = inbox.visible()[0];
				open(first ? first.id : null);
				// On a phone the page starts at the inbox; the first task is marked, ready to open.
				if (Layout.narrower("phone")) { control.show("inbox"); }
			}
			load(7);
			return {
				control: control,
				next: function (seed) { return function () { load(seed); }; }
			};
		}
	};
});
