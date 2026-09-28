/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Time in words for the workflow elements: "3 hours ago", "Overdue by 2 days", "Due tomorrow". Every
 * word comes from the workflow translation file; exact times go through core/Format. It is a helper
 * for this group, not a catalogue entry.
 *
 * Every function takes "now" from the caller, so a demo or a test gives the same words every time.
 */
sap.ui.define(["accents/core/I18n", "accents/core/Format"], function (I18n, Format) {
	"use strict";

	var t = I18n.use("accents.elements.workflow.i18n.i18n");
	var MINUTE = 60000, HOUR = 3600000, DAY = 86400000;

	function ms(d) { return d instanceof Date ? d.getTime() : typeof d === "number" ? d : Date.parse(d); }
	/** Midnight of the local calendar day, so "today" means the person's today. */
	function dayStart(v) { var d = new Date(ms(v)); d.setHours(0, 0, 0, 0); return d.getTime(); }
	function days(a, b) { return Math.round((dayStart(b) - dayStart(a)) / DAY); }

	var when = {
		ms: ms,
		DAY: DAY,
		HOUR: HOUR,

		/** "Just now", "5 minutes ago", "3 hours ago", "Yesterday", "4 days ago", or the date after two weeks. */
		ago: function (at, now) {
			var d = ms(now) - ms(at);
			if (d < MINUTE) { return t("time.justNow"); }
			if (d < HOUR) { var m = Math.floor(d / MINUTE); return m === 1 ? t("time.minuteAgo") : t("time.minutesAgo", m); }
			if (d < DAY && days(at, now) === 0) { var h = Math.floor(d / HOUR); return h === 1 ? t("time.hourAgo") : t("time.hoursAgo", h); }
			var n = days(at, now);
			if (n <= 1) { return t("time.yesterday"); }
			if (n < 14) { return t("time.daysAgo", n); }
			return when.day(at);
		},

		/** The exact date and time, for tooltips and tables. */
		exact: function (at) { return Format.when(new Date(ms(at))); },

		/** A date without the time: "14 Aug 2026". */
		day: function (at) {
			return new Date(ms(at)).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
		},

		/**
		 * Where a due date stands against now, in words, with a value state and an icon so colour is
		 * never the only signal. Returns { text, state, icon, overdue, today }.
		 */
		due: function (due, now) {
			var d = ms(due) - ms(now);
			if (d < 0) {
				var late = -d;
				var h = Math.floor(late / HOUR), n = Math.floor(late / DAY);
				var text = late < HOUR ? t("time.overdueMinutes") : late < DAY ? (h === 1 ? t("time.overdueHour") : t("time.overdueHours", h))
					: n === 1 ? t("time.overdueDay") : t("time.overdueDays", n);
				return { text: text, state: "Error", icon: "sap-icon://alert", overdue: true, today: false };
			}
			var ahead = days(now, due);
			if (ahead === 0) { return { text: t("time.dueToday"), state: "Warning", icon: "sap-icon://pending", overdue: false, today: true }; }
			if (ahead === 1) { return { text: t("time.dueTomorrow"), state: "None", icon: "sap-icon://appointment-2", overdue: false, today: false }; }
			return { text: t("time.dueInDays", ahead), state: "None", icon: "sap-icon://appointment-2", overdue: false, today: false };
		}
	};
	return when;
});
