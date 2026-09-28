/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * One place for every message a screen has: field validation, save results and messages sent back by
 * the server (the OData V4 model reports those here by itself). Built on UI5's own message manager, so
 * UI5 controls and the Messages button (elements/common/MessagesButton) read the same list.
 *
 *   Messages.field(input, "Enter an amount above zero.")   // marks the field and lists the message
 *   Messages.clearField(input)
 *   Messages.add({ type: "Success", text: "Saved." })
 *   Messages.count("Error")
 */
sap.ui.define([
	"sap/ui/core/Messaging",
	"sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType"
], function (Messaging, Message, MessageType) {
	"use strict";

	var owned = new Map();   // control id -> Message created by Messages.field
	var listeners = [];

	function notify() { listeners.slice().forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } }); }
	var model = Messaging.getMessageModel();
	var binding = model.bindList("/");
	binding.attachChange(notify);

	var Messages = {
		TYPES: ["Error", "Warning", "Success", "Information"],

		/** The JSON model UI5 keeps messages in; bind a MessagePopover or table to "/". */
		model: function () { return model; },

		/**
		 * Adds a message. o: { type: "Error" | "Warning" | "Success" | "Information", text, description,
		 * group (a short noun naming the section), target (a binding path, optional) }.
		 */
		add: function (o) {
			var m = new Message({
				message: o.text,
				description: o.description,
				type: MessageType[o.type] || MessageType.Information,
				additionalText: o.group,
				target: o.target,
				processor: o.processor
			});
			Messaging.addMessages(m);
			return m;
		},
		remove: function (m) { Messaging.removeMessages(m); },
		/**
		 * Removes messages UI5 marks as technical (for example "Communication error: 500"). Call it after
		 * adding a plain sentence for the same failure: technical reasons stay out of view.
		 */
		dropTechnical: function () {
			var technical = (model.getData() || []).filter(function (m) { return m.getTechnical && m.getTechnical(); });
			if (technical.length) { Messaging.removeMessages(technical); }
		},
		/** Removes every message, or only those of one group. */
		clear: function (group) {
			var all = Messaging.getMessageModel().getData() || [];
			var gone = group ? all.filter(function (m) { return m.getAdditionalText() === group; }) : all;
			Messaging.removeMessages(gone);
			if (!group) { owned.clear(); }
		},

		/**
		 * Marks a field as wrong and lists the message. Calling it again replaces the field's message;
		 * clearField removes both. Only one sentence per field, saying what to do.
		 */
		field: function (control, text, type) {
			Messages.clearField(control);
			var state = type || "Error";
			if (control.setValueState) { control.setValueState(state); control.setValueStateText(text); }
			/*
			 * UI5 1.148.9 points a field in error at a hidden sentence (aria-errormessage) that it treats as
			 * a live region but renders without aria-live, so screen readers may not announce it and axe
			 * reports a critical finding. Marking that sentence polite fixes both; the words are UI5's own.
			 */
			if (!control.__accLive && control.getValueStateMessageId) {
				control.__accLive = true;
				control.addEventDelegate({ onAfterRendering: function () {
					var sr = document.getElementById(control.getValueStateMessageId() + "-sr");
					if (sr) { sr.setAttribute("aria-live", "polite"); }
				} });
			}
			// The section a field belongs to groups its message in the list: control.data("accGroup", "Payment").
			var m = Messages.add({ type: state, text: text, group: (control.data && control.data("accGroup")) || undefined });
			m.accControl = control;
			owned.set(control.getId(), m);
			return m;
		},
		clearField: function (control) {
			if (control.setValueState) { control.setValueState("None"); control.setValueStateText(""); }
			var m = owned.get(control.getId());
			if (m) { Messaging.removeMessages(m); owned.delete(control.getId()); }
		},
		/** The control a message belongs to, when it came from Messages.field. */
		controlOf: function (m) { return m.accControl || null; },

		count: function (type) {
			var all = model.getData() || [];
			return type ? all.filter(function (m) { return m.getType() === type; }).length : all.length;
		},
		/** The most severe type present, or null: used to colour the Messages button. */
		worst: function () {
			var all = model.getData() || [];
			for (var i = 0; i < Messages.TYPES.length; i++) {
				var t = Messages.TYPES[i];
				if (all.some(function (m) { return m.getType() === t; })) { return t; }
			}
			return null;
		},
		/** Calls fn whenever the list changes. Returns a function that stops listening. */
		onChange: function (fn) {
			listeners.push(fn);
			return function () { var i = listeners.indexOf(fn); if (i >= 0) { listeners.splice(i, 1); } };
		}
	};
	return Messages;
});
