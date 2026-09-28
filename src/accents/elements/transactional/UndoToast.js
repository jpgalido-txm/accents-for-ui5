/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Undo message: after an action that can be taken back, the action happens at once and a short
 * message at the bottom of the screen offers Undo for about five seconds. That is kinder than asking
 * "Are you sure?" first. It is announced to screen readers, it can be reached with the Tab key, the
 * timer waits while the pointer or the focus is on it, and Ctrl+Z (Cmd+Z on a Mac) undoes it while it
 * shows, unless the focus is in a text field.
 *
 *   UndoToast.show({ text: "Order 4711 archived.", onUndo: function () { restore(); } });
 *
 * Built from sap.ui.core.Popup and sap.m.MessageStrip because sap.m.MessageToast cannot hold a button.
 */
sap.ui.define([
	"sap/ui/core/Popup",
	"sap/ui/core/InvisibleMessage",
	"sap/ui/core/library",
	"sap/m/MessageStrip",
	"sap/m/Link",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/VBox",
	"accents/core/Part",
	"accents/core/I18n"
], function (Popup, InvisibleMessage, coreLibrary, MessageStrip, Link, Button, Text, VBox, Part, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");
	var DURATION = 5000;
	var current = null;

	function editable(el) {
		return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
	}

	/**
	 * Shows the message. o: { text, onUndo, onExpire, duration (ms, default 5000) }.
	 * Returns { close(), undo() }. A new message ends the one before it (which then counts as kept).
	 */
	function show(o) {
		if (current) { current.expire(); }
		var done = false, timer = null, left = o.duration || DURATION, started = 0;
		var width = Math.min(window.innerWidth - 32, 448);

		function finish(undone) {
			if (done) { return; }
			done = true;
			clearTimeout(timer);
			document.removeEventListener("keydown", onKey, true);
			popup.close(0);
			setTimeout(function () { popup.destroy(); box.destroy(); }, 0);
			if (current === handle) { current = null; }
			if (undone) {
				InvisibleMessage.getInstance().announce(t("undo.undone"), coreLibrary.InvisibleMessageMode.Polite);
				if (o.onUndo) { o.onUndo(); }
			} else if (o.onExpire) { o.onExpire(); }
		}
		function run() { started = Date.now(); timer = setTimeout(function () { finish(false); }, left); }
		function pause() { if (timer) { clearTimeout(timer); timer = null; left = Math.max(1500, left - (Date.now() - started)); } }
		function runOnce() { if (!timer) { run(); } }
		function onKey(e) {
			if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z") && !editable(e.target)) {
				e.preventDefault();
				finish(true);
			}
		}

		var strip = new MessageStrip({
			text: o.text,
			type: "Information",
			showIcon: true,
			showCloseButton: true,
			link: new Link({ text: t("undo.undo"), tooltip: t("undo.undoTip"), press: function () { finish(true); } }),
			close: function () { finish(false); }
		});
		var box = new VBox({ renderType: "Bare", width: width + "px", items: [strip] });
		var popup = new Popup(box, false, false, false);
		// The timer waits while the pointer or the keyboard focus is on the message.
		var inside = function (e) { var el = box.getDomRef(); return !!el && !!e.relatedTarget && el.contains(e.relatedTarget); };
		box.addEventDelegate({
			onfocusin: pause,
			onmouseover: pause,
			onfocusout: function (e) { if (!done && !inside(e)) { runOnce(); } },
			onmouseout: function (e) { var el = box.getDomRef(); if (!done && !inside(e) && !(el && el.contains(document.activeElement))) { runOnce(); } }
		});
		popup.open(0, Popup.Dock.CenterBottom, Popup.Dock.CenterBottom, window, "0 -24", "none");
		document.addEventListener("keydown", onKey, true);
		InvisibleMessage.getInstance().announce(t("undo.announce", o.text), coreLibrary.InvisibleMessageMode.Polite);
		run();

		var handle = {
			close: function () { finish(false); },
			undo: function () { finish(true); },
			expire: function () { finish(false); },
			strip: strip
		};
		current = handle;
		return handle;
	}

	function create(o) {
		var status = new Text({ text: "" }).addStyleClass("accLabel sapUiTinyMarginTop");
		var button = new Button({ text: o.text, icon: o.icon, press: function () {
			var d = o.act ? o.act() : {};
			part.update({ status: d.status || "" });
			show({ text: d.message || o.message || "", onUndo: function () {
				var back = o.undo ? o.undo() : {};
				part.update({ status: back.status || "" });
			} });
		} });
		var part = Part.make({
			key: "undo-toast",
			content: new VBox({ renderType: "Bare", alignItems: "Start", items: [button, status] }),
			render: function (d) { status.setText(d && d.status || ""); status.setVisible(!!(d && d.status)); }
		});
		part.show = show;
		part.button = button;
		part.update({});
		return part;
	}

	return {
		show: show,
		/** The message showing now, or null. */
		current: function () { return current; },

		info: {
			controls: ["sap.ui.core.Popup", "sap.m.MessageStrip", "sap.m.Link", "sap.ui.core.InvisibleMessage"],
			motion: "None. The message appears and goes without animation; it stays while the pointer or focus is on it.",
			still: true
		},

		/**
		 * A button whose action can be undone. options: { text, icon, act() -> { status, message }, undo() -> { status } }.
		 * For your own actions, call UndoToast.show(...) directly after doing the action.
		 */
		create: create,

		example: function () {
			var archived = false;
			return {
				options: {
					text: t("undo.demo.button"),
					icon: "sap-icon://inbox",
					act: function () { archived = true; return { status: t("undo.demo.status"), message: t("undo.demo.message") }; },
					undo: function () { archived = false; return { status: t("undo.demo.back") }; }
				},
				next: function () { return { status: archived ? t("undo.demo.status") : "" }; }
			};
		}
	};
});
