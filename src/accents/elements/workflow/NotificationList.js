/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Notifications: the messages sent to one person, grouped by day or by kind. Each one carries the
 * action it asks for, as a button that does it. Opening a notification marks it read; "Mark all read"
 * marks every one. Dismissing can be undone, so it happens at once and offers an undo. The unread
 * count is in brackets.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/NotificationList",
	"sap/m/NotificationListGroup",
	"sap/m/NotificationListItem",
	"sap/m/Button",
	"sap/m/Link",
	"sap/m/Title",
	"sap/m/MessageStrip",
	"sap/m/OverflowToolbar",
	"sap/m/ToolbarSpacer",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/OverflowToolbarLayoutData",
	"sap/ui/core/InvisibleText",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (VBox, NotificationList, NotificationListGroup, NotificationListItem, Button, Link, Title, MessageStrip, OverflowToolbar,
	ToolbarSpacer, SegmentedButton, SegmentedButtonItem, OverflowToolbarLayoutData, InvisibleText, Part, Motion, Messages, I18n, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");
	var TYPES = ["task", "mention", "reminder", "system"];

	function initials(name) {
		return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
	}

	return {
		info: {
			controls: ["sap.m.NotificationList", "sap.m.NotificationListGroup", "sap.m.NotificationListItem", "sap.m.SegmentedButton"],
			motion: "The unread count pulses once when it changes; notifications themselves stay still.",
			still: false
		},

		/**
		 * options:
		 *   data      { now, items: [{ id, type: "task"|"mention"|"reminder"|"system", at, title, description, author,
		 *               unread, actions: [{ key, text }] }] }
		 *   groupBy   "day" (default) or "type"
		 *   onAction  function (item, action) when a notification's action button is pressed; the item is then marked read
		 *   onChange  optional function (items) after marking read, dismissing or undoing
		 */
		create: function (o) {
			var groupBy = o.groupBy === "type" ? "type" : "day";
			var now = null, items = [], lastDismissed = null;

			var title = new Title({ level: "H3", titleStyle: "H5" });
			var groupLabel = new InvisibleText({ text: t("notificationList.groupBy") }).toStatic();
			var grouping = new SegmentedButton({ selectedKey: groupBy, ariaLabelledBy: [groupLabel], items: [
				new SegmentedButtonItem({ key: "day", text: t("notificationList.byDay") }),
				new SegmentedButtonItem({ key: "type", text: t("notificationList.byType") })
			], selectionChange: function (e) { groupBy = e.getParameter("item").getKey(); draw(); } });
			var readAll = new Button({ text: t("notificationList.readAll"), type: "Transparent", icon: "sap-icon://accept",
				press: function () { items = items.map(function (n) { return Object.assign({}, n, { unread: false }); }); changed(); } });
			var bar = new OverflowToolbar({ style: "Clear", content: [title, new ToolbarSpacer(),
				grouping.setLayoutData(new OverflowToolbarLayoutData({ priority: "High" })), readAll] });
			var undo = new Link({ text: t("notificationList.undo"), press: function () { undoDismiss(); } });
			var strip = new MessageStrip({ type: "Information", showIcon: true, visible: false, link: undo }).addStyleClass("sapUiTinyMarginBottom");
			var list = new NotificationList({ ariaLabelledBy: [title], noDataText: t("notificationList.none") });
			var box = new VBox({ renderType: "Bare", items: [bar, strip, list] });

			function unread() { return items.filter(function (n) { return n.unread; }).length; }

			function groupKey(n) {
				if (groupBy === "type") { return n.type; }
				var d = Math.round((new Date(when.ms(now)).setHours(0, 0, 0, 0) - new Date(when.ms(n.at)).setHours(0, 0, 0, 0)) / when.DAY);
				return d <= 0 ? "today" : d === 1 ? "yesterday" : "earlier";
			}
			function groupTitle(k) { return groupBy === "type" ? t("notificationList.type." + k) : t("notificationList.day." + k); }
			function groupOrder() { return groupBy === "type" ? TYPES : ["today", "yesterday", "earlier"]; }

			function markRead(n) {
				if (!n.unread) { return; }
				items = items.map(function (x) { return x.id === n.id ? Object.assign({}, x, { unread: false }) : x; });
				changed();
			}
			function dismiss(n) {
				var index = items.findIndex(function (x) { return x.id === n.id; });
				lastDismissed = { item: n, index: index };
				items = items.filter(function (x) { return x.id !== n.id; });
				strip.setText(t("notificationList.dismissed", n.title));
				undo.setVisible(true);
				strip.setVisible(true);
				changed();
			}
			function undoDismiss() {
				if (!lastDismissed) { return; }
				items = items.slice();
				items.splice(Math.max(0, lastDismissed.index), 0, lastDismissed.item);
				strip.setText(t("notificationList.restored", lastDismissed.item.title));
				undo.setVisible(false);
				lastDismissed = null;
				changed();
			}

			function item(n) {
				var buttons = (n.actions || []).map(function (a) {
					return new Button({ text: a.text, type: "Transparent", press: function () {
						markRead(n);
						if (o.onAction) { o.onAction(n, a); }
					} });
				});
				var settings = {
					title: n.title,
					description: n.description || "",
					datetime: when.ago(n.at, now),
					unread: !!n.unread,
					showCloseButton: true,
					truncate: false,
					hideShowMoreButton: true,
					buttons: buttons,
					tooltip: t("notificationList.sentAt", when.exact(n.at)),
					press: function () { markRead(n); },
					close: function () { dismiss(n); }
				};
				if (n.author) { settings.authorName = n.author; settings.authorInitials = initials(n.author); }
				else { settings.authorPicture = "sap-icon://bell"; }
				return new NotificationListItem(settings);
			}

			function draw() {
				list.destroyItems();
				groupOrder().forEach(function (k) {
					var inGroup = items.filter(function (n) { return groupKey(n) === k; })
						.sort(function (a, b) { return when.ms(b.at) - when.ms(a.at); });
					if (!inGroup.length) { return; }
					var u = inGroup.filter(function (n) { return n.unread; }).length;
					list.addItem(new NotificationListGroup({
						title: u ? t("notificationList.groupUnread", groupTitle(k), inGroup.length, u) : t("notificationList.groupCount", groupTitle(k), inGroup.length),
						showCloseButton: false,
						showItemsCounter: false,
						collapsed: false,
						items: inGroup.map(item)
					}));
				});
				var n = unread();
				title.setText(n ? t("notificationList.titleUnread", n) : t("notificationList.title"));
				readAll.setEnabled(n > 0);
				readAll.setTooltip(n ? t("notificationList.readAllTip", n) : t("notificationList.allRead"));
			}

			var lastCount = null;
			function changed() {
				draw();
				var n = unread();
				if (lastCount !== null && n !== lastCount && title.getDomRef()) { Motion.pulse(title); }
				lastCount = n;
				if (o.onChange) { o.onChange(items.slice()); }
			}

			var part = Part.make({
				key: "notification-list",
				content: box,
				empty: t("notificationList.none"),
				render: function (data) {
					now = data.now || new Date();
					items = (data.items || []).slice();
					lastDismissed = null;
					strip.setVisible(false);
					var n = unread();
					draw();
					if (lastCount !== null && n !== lastCount && title.getDomRef()) { Motion.pulse(title); }
					lastCount = n;
				}
			});
			part.unread = unread;
			part.items = function () { return items.slice(); };
			part.markRead = function (id) { var n = items.find(function (x) { return x.id === id; }); if (n) { markRead(n); } };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data, ctx) {
			return {
				options: {
					data: { now: sampleWork.now(), items: sampleWork.notifications(7) },
					onAction: function (n, a) {
						// Each action goes where it says: the demo opens the page that holds the task or case.
						Messages.add({ type: "Information", text: t("notificationList.demoOpened", a.text, n.title), group: t("notificationList.group") });
						if (ctx && ctx.go) { ctx.go(a.key === "openTask" ? "approval-inbox" : "case-workspace"); }
					}
				},
				next: function (seed) { return { now: sampleWork.now(), items: sampleWork.notifications(seed) }; }
			};
		}
	};
});
