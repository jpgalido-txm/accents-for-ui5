/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Comments on one object: newest first, each reply under the comment it answers. Typing @ suggests
 * people from the list given; choosing one writes the name. A person can edit and delete their own
 * comments; deleting asks first. Times read "3 hours ago", with the exact time in the tooltip.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Title",
	"sap/m/FeedInput",
	"sap/m/FeedListItem",
	"sap/m/FeedListItemAction",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/Popover",
	"sap/m/MessageStrip",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Label",
	"sap/m/TextArea",
	"sap/ui/Device",
	"accents/core/Part",
	"accents/core/Messages",
	"accents/core/I18n",
	"accents/elements/transactional/ConfirmAction",
	"accents/elements/workflow/when",
	"accents/elements/workflow/sampleWork"
], function (VBox, Title, FeedInput, FeedListItem, FeedListItemAction, List, StandardListItem, Popover, MessageStrip, Dialog, Button,
	Label, TextArea, Device, Part, Messages, I18n, ConfirmAction, when, sampleWork) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");

	function escape(s) {
		return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; });
	}
	function initials(name) {
		return String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
	}

	return {
		info: {
			controls: ["sap.m.FeedInput", "sap.m.FeedListItem", "sap.m.FeedListItemAction", "sap.m.Popover", "accents ConfirmAction (sap.m.Dialog)"],
			motion: "None. Comments appear in place; nothing animates.",
			still: true
		},

		/**
		 * options:
		 *   data      { me (person id), people: [{ id, name }], comments: [{ id, author (person id), text, at, parent, edited }] }
		 *   now       optional function returning the time now (default the clock)
		 *   onChange  optional function (comments, change) after every add, reply, edit or delete;
		 *             change is { kind: "add"|"reply"|"edit"|"delete", comment }
		 */
		create: function (o) {
			var clock = o.now || function () { return new Date(); };
			var me = null, people = [], comments = [], replyTo = null, seq = 0;

			function person(id) { return people.find(function (p) { return p.id === id; }) || { id: id, name: id }; }
			function byId(id) { return comments.find(function (c) { return c.id === id; }); }

			var title = new Title({ level: "H3", titleStyle: "H5" });
			var replying = new MessageStrip({ type: "Information", showIcon: true, showCloseButton: true, visible: false,
				close: function () { setReply(null); } });
			var feed = new FeedInput({
				showIcon: true,
				placeholder: t("commentThread.placeholder"),
				buttonTooltip: t("commentThread.post"),
				ariaLabelForPicture: t("commentThread.you"),
				growing: true,
				post: function (e) { post(e.getParameter("value")); }
			});
			var list = new List({ showSeparators: "Inner", noDataText: t("commentThread.none"), ariaLabelledBy: [title] });
			var box = new VBox({ renderType: "Bare", items: [title, replying, feed, list] });

			/* ---------- mentions ---------- */
			var suggestions = new List({ mode: "None", ariaLabelledBy: [] });
			var popover = new Popover({ showHeader: false, placement: "Bottom", showArrow: false, contentMinWidth: "14rem",
				initialFocus: feed, content: [suggestions],
				afterClose: function () { focusInput(); } });
			popover.setTitle(t("commentThread.mention"));
			suggestions.attachItemPress(function (e) { insertMention(e.getParameter("listItem").data("person")); });
			box.addDependent(popover);
			var mentionAt = -1;

			function textarea() { var d = feed.getDomRef(); return d && d.querySelector("textarea"); }
			function focusInput() {
				var ta = textarea();
				if (ta) { ta.focus(); var n = ta.value.length; ta.setSelectionRange(n, n); }
			}
			function mentionQuery(value, caret) {
				var before = value.slice(0, caret);
				var m = /(^|\s)@([^\s@]{0,30})$/.exec(before);
				return m ? { start: caret - m[2].length - 1, query: m[2].toLowerCase() } : null;
			}
			function suggest() {
				var ta = textarea();
				if (!ta) { return; }
				var q = mentionQuery(ta.value, ta.selectionStart);
				var matches = q ? people.filter(function (p) { return p.id !== me && p.name.toLowerCase().indexOf(q.query) >= 0; }) : [];
				if (!q || !matches.length) { if (popover.isOpen()) { popover.close(); } mentionAt = -1; return; }
				mentionAt = q.start;
				suggestions.destroyItems();
				matches.slice(0, 6).forEach(function (p) {
					suggestions.addItem(new StandardListItem({ title: p.name, description: p.role || "", icon: "sap-icon://person-placeholder",
						type: "Active" }).data("person", p));
				});
				if (!popover.isOpen()) { popover.openBy(feed); }
			}
			function insertMention(p) {
				var ta = textarea();
				var value = ta ? ta.value : feed.getValue();
				var caret = ta ? ta.selectionStart : value.length;
				var start = mentionAt >= 0 ? mentionAt : caret;
				var next = value.slice(0, start) + "@" + p.name + " " + value.slice(caret);
				feed.setValue(next);
				if (ta) { ta.value = next; ta.dispatchEvent(new Event("input", { bubbles: true })); }
				mentionAt = -1;
				popover.close();
				focusInput();
			}
			feed.addEventDelegate({ onAfterRendering: function () {
				var ta = textarea();
				if (!ta || ta.__accMentions) { return; }
				ta.__accMentions = true;
				ta.addEventListener("input", suggest);
				ta.addEventListener("keydown", function (e) {
					if (!popover.isOpen()) { return; }
					if (e.key === "ArrowDown") {
						e.preventDefault();
						var first = suggestions.getItems()[0];
						if (first) { first.focus(); }
					} else if (e.key === "Escape") {
						e.preventDefault();
						popover.close();
					}
				});
			} });

			/* ---------- rendering ---------- */
			function textHtml(text) {
				var html = escape(text);
				// Names of people in the list, written after @, are shown in bold.
				people.forEach(function (p) {
					var n = escape("@" + p.name);
					html = html.split(n).join("<strong>" + n + "</strong>");
				});
				return html;
			}

			function item(c, reply) {
				var author = person(c.author);
				var own = c.author === me;
				var info = [];
				if (reply) { var parent = byId(c.parent); if (parent) { info.push(t("commentThread.replyTo", person(parent.author).name)); } }
				if (c.edited) { info.push(t("commentThread.edited")); }
				var actions = [new FeedListItemAction({ key: "reply", text: t("commentThread.reply"), icon: "sap-icon://comment",
					press: function () { setReply(reply ? byId(c.parent) : c); } })];
				if (own) {
					actions.push(new FeedListItemAction({ key: "edit", text: t("commentThread.edit"), icon: "sap-icon://edit",
						press: function () { edit(c); } }));
					actions.push(new FeedListItemAction({ key: "delete", text: t("commentThread.delete"), icon: "sap-icon://delete",
						press: function () { remove(c); } }));
				}
				var li = new FeedListItem({
					sender: own ? t("commentThread.byYou", author.name) : author.name,
					iconInitials: initials(author.name),
					showIcon: true,
					senderActive: false,
					iconActive: false,
					text: textHtml(c.text),
					timestamp: when.ago(c.at, clock()),
					info: info.join(" · "),
					tooltip: t("commentThread.postedAt", when.exact(c.at)),
					actions: actions
				});
				if (reply) { li.addStyleClass("sapUiLargeMarginBegin"); }
				return li;
			}

			function draw() {
				list.destroyItems();
				var top = comments.filter(function (c) { return !c.parent || !byId(c.parent); })
					.sort(function (a, b) { return when.ms(b.at) - when.ms(a.at); });
				top.forEach(function (c) {
					list.addItem(item(c, false));
					comments.filter(function (r) { return r.parent === c.id; })
						.sort(function (a, b) { return when.ms(a.at) - when.ms(b.at); })
						.forEach(function (r) { list.addItem(item(r, true)); });
				});
				title.setText(t("commentThread.title", comments.length));
				feed.setIconInitials(initials(person(me).name));
			}

			function changed(kind, c) { draw(); if (o.onChange) { o.onChange(comments.slice(), { kind: kind, comment: c }); } }

			function setReply(c) {
				replyTo = c || null;
				replying.setVisible(!!replyTo);
				if (replyTo) {
					replying.setText(t("commentThread.replying", person(replyTo.author).name));
					feed.setPlaceholder(t("commentThread.replyPlaceholder", person(replyTo.author).name));
					setTimeout(focusInput, 0);
				} else {
					feed.setPlaceholder(t("commentThread.placeholder"));
				}
			}

			function post(value) {
				var text = String(value || "").trim();
				if (!text) { return; }
				seq += 1;
				var c = { id: "new" + seq + "-" + Date.now(), author: me, text: text, at: clock() };
				if (replyTo) { c.parent = replyTo.id; }
				comments = comments.concat([c]);
				var kind = replyTo ? "reply" : "add";
				setReply(null);
				changed(kind, c);
			}

			function edit(c) {
				var area = new TextArea({ value: c.text, width: "100%", rows: 4, growing: true,
					liveChange: function () { save.setEnabled(!!area.getValue().trim()); } });
				var save = new Button({ text: t("commentThread.save"), type: "Emphasized", press: function () {
					var text = area.getValue().trim();
					comments = comments.map(function (x) { return x.id === c.id ? Object.assign({}, x, { text: text, edited: true }) : x; });
					dialog.close();
					changed("edit", byId(c.id));
				} });
				var dialog = new Dialog({
					title: t("commentThread.editTitle"),
					contentWidth: "28rem",
					stretch: Device.system.phone,
					content: [new VBox({ renderType: "Bare", items: [new Label({ text: t("commentThread.editLabel"), labelFor: area }), area] })],
					beginButton: save,
					endButton: new Button({ text: t("commentThread.cancel"), press: function () { dialog.close(); } }),
					initialFocus: area,
					afterClose: function () { dialog.destroy(); }
				}).addStyleClass("sapUiContentPadding");
				dialog.open();
			}

			function remove(c) {
				var replies = comments.filter(function (r) { return r.parent === c.id; }).length;
				ConfirmAction.ask({
					verb: t("commentThread.delete"),
					object: t("commentThread.deleteObject"),
					consequence: replies ? t("commentThread.deleteReplies", replies) : t("commentThread.deleteOne"),
					danger: true
				}).then(function (yes) {
					if (!yes) { return; }
					comments = comments.filter(function (x) { return x.id !== c.id && x.parent !== c.id; });
					if (replyTo && (replyTo.id === c.id)) { setReply(null); }
					Messages.add({ type: "Success", text: t("commentThread.deleted"), group: t("commentThread.group") });
					changed("delete", c);
				});
			}

			var part = Part.make({
				key: "comment-thread",
				content: box,
				empty: t("commentThread.none"),
				render: function (data) {
					me = data.me;
					people = data.people || [];
					comments = (data.comments || []).slice();
					setReply(null);
					draw();
				}
			});
			part.comments = function () { return comments.slice(); };
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function () {
			var tasks = sampleWork.tasks(7);
			function data(seed) {
				var task = tasks[seed % tasks.length];
				return { me: sampleWork.me().id, people: sampleWork.people(seed), comments: sampleWork.comments(task) };
			}
			return {
				options: { now: sampleWork.now, data: data(7) },
				next: data
			};
		}
	};
});
