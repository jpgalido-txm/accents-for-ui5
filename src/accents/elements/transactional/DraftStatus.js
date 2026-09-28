/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Draft status: says in plain words where an object's changes stand. Saved (everyone sees this
 * version), draft (changes kept for you, not yet saved, with how long ago they were kept), locked
 * (someone else is changing it, who and since when), or unsaved changes (on this screen only). A
 * status word with an icon carries the state; the sentence beside it says what it means.
 */
sap.ui.define([
	"sap/m/ObjectStatus",
	"sap/m/Text",
	"sap/m/HBox",
	"sap/ui/core/format/DateFormat",
	"accents/core/Part",
	"accents/core/Motion",
	"accents/core/I18n"
], function (ObjectStatus, Text, HBox, DateFormat, Part, Motion, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.transactional.i18n.i18n");

	var LOOK = {
		saved: { state: "Success", icon: "sap-icon://sys-enter-2" },
		draft: { state: "Information", icon: "sap-icon://user-edit" },
		locked: { state: "Warning", icon: "sap-icon://locked" },
		unsaved: { state: "Warning", icon: "sap-icon://pending" }
	};

	/** "2 minutes ago", in the person's language. */
	function ago(when) {
		return when ? DateFormat.getDateTimeInstance({ relative: true, relativeScale: "auto" }).format(new Date(when)) : "";
	}

	/** "4:45 PM" today, or a short date and time on another day: used after "since". */
	function since(when) {
		var d = new Date(when), now = new Date();
		var today = d.toDateString() === now.toDateString();
		return today ? DateFormat.getTimeInstance({ style: "short" }).format(d) : DateFormat.getDateTimeInstance({ style: "short" }).format(d);
	}

	function create(o) {
		var status = new ObjectStatus({ inverted: false });
		var sentence = new Text({ wrapping: true }).addStyleClass("accLabel sapUiSmallMarginBegin");
		var row = new HBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [status, sentence] });
		var timer = null;
		var last = null;

		function describe(d) {
			switch (d.state) {
			case "draft": return d.keptAt ? t("draft.draftKept", ago(d.keptAt)) : t("draft.draftNotKept");
			case "locked": return d.by ? t("draft.lockedBy", d.by, since(d.since)) : t("draft.lockedSomeone");
			case "unsaved": return d.count === 1 ? t("draft.unsavedOne") : d.count ? t("draft.unsavedCount", d.count) : t("draft.unsaved");
			default: return d.savedAt ? (d.by ? t("draft.savedBy", d.by, ago(d.savedAt)) : t("draft.savedAt", ago(d.savedAt))) : t("draft.savedPlain");
			}
		}

		function write(d) {
			var look = LOOK[d.state] || LOOK.saved;
			status.setText(t("draft.state." + (LOOK[d.state] ? d.state : "saved")));
			status.setState(look.state);
			status.setIcon(look.icon);
			sentence.setText(describe(d));
		}

		var part = Part.make({
			key: "draft-status",
			content: row,
			onDestroy: function () { if (timer) { clearInterval(timer); } },
			render: function (d) {
				d = d || { state: "saved" };
				write(d);
				if (last && last !== d.state && status.getDomRef()) { Motion.pulse(status); }
				last = d.state;
				// Keep "2 minutes ago" true while the page stays open.
				if (!timer) { timer = setInterval(function () { if (part.data()) { write(part.data()); } }, 30000); }
			}
		});
		part.status = status;
		part.update(o.data || { state: "saved" });
		return part;
	}

	return {
		info: {
			controls: ["sap.m.ObjectStatus", "sap.m.Text", "sap.ui.core.format.DateFormat (relative time)"],
			motion: "The status word pulses once when the state changes. The time sentence updates quietly every 30 seconds.",
			still: false
		},

		/**
		 * options.data:
		 *   state    "saved" | "draft" | "locked" | "unsaved"
		 *   savedAt  when the saved version was saved (saved); by: who saved it
		 *   keptAt   when the draft was last kept (draft)
		 *   by       who holds the lock (locked); since: since when
		 *   count    how many fields are changed (unsaved), optional
		 */
		create: create,

		example: function () {
			var min = 60000;
			function data(seed) {
				var now = Date.now();
				var states = [
					{ state: "draft", keptAt: now - 2 * min },
					{ state: "locked", by: t("sample.person.2"), since: now - 25 * min },
					{ state: "unsaved", count: 1 + seed % 4 },
					{ state: "saved", savedAt: now - 3 * 60 * min, by: t("sample.person.1") }
				];
				return states[seed % states.length];
			}
			return { options: { data: data(0) }, next: data };
		}
	};
});
