/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Decision panel: approve or reject one task, or several at once. Before deciding, the person sees
 * what the decision changes, fact by fact, before and after. Rejecting and sending back always ask
 * for a reason. Approving asks first only when it cannot be undone; otherwise it happens at once and
 * the result offers an undo. The result is handed to the caller to record, and shown here. When the
 * person may not decide, the buttons are disabled and the reason is stated.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Button",
	"sap/m/Link",
	"sap/m/MessageStrip",
	"sap/m/Table",
	"sap/m/Column",
	"sap/m/ColumnListItem",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/transactional/ConfirmAction",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (VBox, HBox, Title, Text, Button, Link, MessageStrip, Table, Column, ColumnListItem, List, StandardListItem, InvisibleText,
	Part, Messages, I18n, ConfirmAction, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.Table", "sap.m.Button", "sap.m.MessageStrip", "accents ConfirmAction (sap.m.Dialog)"],
			motion: "None. A decision never animates; the result appears in words.",
			still: true
		},

		/**
		 * options:
		 *   data      { tasks: [{ id, title, object, irreversible, preview: [{ label, before, after }] }],
		 *               allowed (default true), notAllowed (the sentence saying why not), result (a recorded decision) }
		 *             One task is a single decision; several are one decision for all of them (bulk).
		 *   sendBack  true shows "Send back", which returns the task to its requester with a reason
		 *   person    the name recorded as the one who decided (default "You")
		 *   now       optional function returning the time to record (default the clock)
		 *   onDecide  function (result) where result is { decision: "approve"|"reject"|"sendBack", reason,
		 *             tasks, by, at, undoable }; record it here
		 *   onUndo    optional function (result); offered only for decisions that can be undone
		 */
		create: function (o) {
			var heading = new Title({ level: "H3", titleStyle: "H5", wrapping: true });
			var subject = new Text();
			var previewTitle = new Title({ text: t("decisionPanel.changes"), level: "H4", titleStyle: "H6" }).addStyleClass("sapUiSmallMarginTop");
			var previewLabel = new InvisibleText({ text: t("decisionPanel.changes") }).toStatic();
			var preview = new Table({
				ariaLabelledBy: [previewLabel],
				columns: [
					new Column({ header: new Text({ text: t("decisionPanel.col.fact") }) }),
					new Column({ header: new Text({ text: t("decisionPanel.col.before") }) }),
					new Column({ header: new Text({ text: t("decisionPanel.col.after") }) })
				]
			});
			var bulkList = new List({ showSeparators: "Inner", ariaLabelledBy: [previewLabel] });
			var blocker = new MessageStrip({ type: "Information", showIcon: true, visible: false }).addStyleClass("sapUiSmallMarginTop");
			var warning = new Text({ visible: false }).addStyleClass("sapUiTinyMarginTop");
			var approve = new Button({ type: "Accept", icon: "sap-icon://accept", press: function () { decide("approve"); } });
			var reject = new Button({ type: "Reject", icon: "sap-icon://decline", press: function () { decide("reject"); } });
			var back = new Button({ icon: "sap-icon://undo", visible: !!o.sendBack, press: function () { decide("sendBack"); } });
			var buttons = new HBox({ renderType: "Bare", wrap: "Wrap", items: [
				approve.addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom"),
				reject.addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom"),
				back.addStyleClass("sapUiTinyMarginBottom")
			] }).addStyleClass("sapUiSmallMarginTop");
			var undo = new Link({ text: t("decisionPanel.undo"), press: function () { undoLast(); } });
			var result = new MessageStrip({ type: "Success", showIcon: true, visible: false, link: undo }).addStyleClass("sapUiSmallMarginTop");
			var box = new VBox({ renderType: "Bare", items: [heading, subject, previewTitle, preview, bulkList, warning, blocker, buttons, result] });

			var tasks = [], last = null;

			function bulk() { return tasks.length > 1; }
			function irreversible() { return tasks.some(function (x) { return x.irreversible; }); }
			function objectName() {
				return bulk() ? t("decisionPanel.object.bulk", tasks.length) : t("decisionPanel.object.one", tasks[0].title, tasks[0].object);
			}

			function decide(kind) {
				if (!tasks.length) { return; }
				var ask;
				if (kind === "reject") {
					ask = ConfirmAction.ask({ verb: t("decisionPanel.verb.reject"), object: objectName(), danger: true,
						consequence: bulk() ? t("decisionPanel.rejectConsequence.bulk") : t("decisionPanel.rejectConsequence"),
						reason: { label: t("decisionPanel.reason.reject"), required: true } });
				} else if (kind === "sendBack") {
					ask = ConfirmAction.ask({ verb: t("decisionPanel.verb.sendBack"), object: objectName(),
						consequence: t("decisionPanel.sendBackConsequence"),
						reason: { label: t("decisionPanel.reason.sendBack"), required: true } });
				} else if (irreversible()) {
					ask = ConfirmAction.ask({ verb: t("decisionPanel.verb.approve"), object: objectName(),
						consequence: bulk() ? t("decisionPanel.approveConsequence.bulk") : t("decisionPanel.approveConsequence") });
				} else {
					ask = Promise.resolve(true);
				}
				ask.then(function (answer) {
					if (!answer) { return; }
					record(kind, answer.reason || "");
				});
			}

			function record(kind, reason) {
				var at = o.now ? o.now() : new Date();
				var res = {
					decision: kind, reason: reason, tasks: tasks.slice(), by: o.person || t("decisionPanel.you"), at: at,
					undoable: kind === "approve" && !irreversible() && !!o.onUndo
				};
				last = res;
				showResult(res);
				Messages.add({ type: "Success", text: resultText(res), group: t("decisionPanel.group") });
				if (o.onDecide) { o.onDecide(res); }
			}

			function resultText(res) {
				var what = res.tasks.length > 1 ? t("decisionPanel.object.bulk", res.tasks.length) : res.tasks[0].title;
				var text = t("decisionPanel.done." + res.decision, what, res.by, when.exact(res.at));
				return res.reason ? text + " " + t("decisionPanel.done.reason", res.reason) : text;
			}

			function showResult(res) {
				result.setText(resultText(res));
				result.setType(res.decision === "approve" ? "Success" : "Information");
				undo.setVisible(!!res.undoable);
				result.setVisible(true);
				[approve, reject, back].forEach(function (b) { b.setEnabled(false); b.setTooltip(t("decisionPanel.decided")); });
			}

			function undoLast() {
				if (!last || !last.undoable) { return; }
				var res = last;
				last = null;
				result.setVisible(false);
				Messages.add({ type: "Information", text: t("decisionPanel.undone", res.tasks.length > 1 ? t("decisionPanel.object.bulk", res.tasks.length) : res.tasks[0].title),
					group: t("decisionPanel.group") });
				if (o.onUndo) { o.onUndo(res); }
				render(part.data());
			}

			function render(data) {
				tasks = (data && data.tasks) || [];
				var allowed = data.allowed !== false;
				var n = tasks.length;
				heading.setText(bulk() ? t("decisionPanel.title.bulk", n) : n ? tasks[0].title : "");
				subject.setText(bulk() ? t("decisionPanel.subject.bulk") : n ? tasks[0].object : "");
				preview.setVisible(!bulk());
				bulkList.setVisible(bulk());
				preview.destroyItems();
				bulkList.destroyItems();
				if (bulk()) {
					previewTitle.setText(t("decisionPanel.tasks", n));
					tasks.forEach(function (x) {
						bulkList.addItem(new StandardListItem({ title: x.title, description: x.object,
							info: x.irreversible ? t("decisionPanel.cannotUndo") : "", infoState: x.irreversible ? "Warning" : "None" }));
					});
				} else if (n) {
					previewTitle.setText(t("decisionPanel.changes"));
					(tasks[0].preview || []).forEach(function (f) {
						preview.addItem(new ColumnListItem({ cells: [new Text({ text: f.label }), new Text({ text: f.before }),
							new Text({ text: f.after })] }));
					});
					preview.setNoDataText(t("decisionPanel.noChanges"));
				}
				warning.setText(irreversible() ? (bulk() ? t("decisionPanel.warning.bulk") : t("decisionPanel.warning")) : t("decisionPanel.canUndo"));
				warning.setVisible(n > 0);
				blocker.setText(allowed ? "" : (data.notAllowed || t("decisionPanel.notAllowed")));
				blocker.setVisible(!allowed);
				approve.setText(bulk() ? t("decisionPanel.approve.bulk", n) : t("decisionPanel.approve"));
				reject.setText(bulk() ? t("decisionPanel.reject.bulk", n) : t("decisionPanel.reject"));
				back.setText(t("decisionPanel.sendBack"));
				back.setVisible(!!o.sendBack && !bulk());
				[approve, reject, back].forEach(function (b) {
					b.setEnabled(allowed && n > 0);
					b.setTooltip(allowed ? "" : (data.notAllowed || t("decisionPanel.notAllowed")));
				});
				approve.setTooltip(allowed ? (irreversible() ? t("decisionPanel.approveTip.ask") : t("decisionPanel.approveTip.now")) : approve.getTooltip());
				reject.setTooltip(allowed ? t("decisionPanel.rejectTip") : reject.getTooltip());
				back.setTooltip(allowed ? t("decisionPanel.sendBackTip") : back.getTooltip());
				result.setVisible(false);
				if (data.result) { last = data.result; showResult(data.result); }
				if (!n) { part.state("empty"); }
			}

			var part = Part.make({
				key: "decision-panel",
				content: box,
				empty: t("decisionPanel.empty"),
				render: render
			});
			part.last = function () { return last; };
			// Kept for callers that want the decision without a click, such as a keyboard shortcut.
			part.decide = decide;
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			var list = sampleWork.tasks(7);
			// The demo decides on the price change: approving it can be undone, rejecting needs a reason.
			var options = {
				sendBack: true,
				person: sampleWork.me().name,
				now: sampleWork.now,
				onDecide: function () { /* the result is shown in the panel and in the Messages list */ },
				onUndo: function () { /* the panel returns to the undecided task */ },
				data: { tasks: [list[0]] }
			};
			return {
				options: options,
				next: function (seed) { var l = sampleWork.tasks(seed); return { tasks: [l[seed % l.length]] }; }
			};
		}
	};
});
