/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Number and period formatting. Negatives use a true minus sign (U+2212), never brackets; deltas
 * always carry a sign; colour follows the key figure's polarity, not the arithmetic sign.
 */
sap.ui.define([], function () {
	"use strict";

	var MINUS = "−";
	var DASH = "–";
	var locale = (navigator.languages && navigator.languages[0]) || "en-US";

	function nf(opts) { return new Intl.NumberFormat(locale, opts); }
	/** Adds + or − to a formatted value, but no sign when it rounds to zero ("0%", never "−0%"). */
	function signed(text, v) { return /[1-9]/.test(text) ? (v > 0 ? "+" : v < 0 ? MINUS : "") + text : text; }
	function missing(v) { return v === null || v === undefined || (typeof v === "number" && isNaN(v)); }

	var Format = {
		MINUS: MINUS,
		DASH: DASH,
		setLocale: function (l) { locale = l; },

		/** 1234.5 -> "1,234.5"; digits defaults to 0. Missing values render as an en dash. */
		number: function (v, digits) {
			if (missing(v)) { return DASH; }
			var text = nf({ maximumFractionDigits: digits || 0, minimumFractionDigits: digits || 0 }).format(Math.abs(v));
			return v < 0 ? MINUS + text : text;
		},
		/** 1234567 -> "1.2M". Use for tiles; put the full value in the tooltip with Format.number. */
		short: function (v) {
			if (missing(v)) { return DASH; }
			var text = nf({ notation: "compact", maximumFractionDigits: Math.abs(v) < 1000 ? 0 : 1 }).format(Math.abs(v));
			return v < 0 ? MINUS + text : text;
		},
		money: function (v, currency, compact) {
			if (missing(v)) { return DASH; }
			var text = nf({ style: "currency", currency: currency || "USD", notation: compact ? "compact" : "standard",
				maximumFractionDigits: compact ? 1 : 0 }).format(Math.abs(v));
			return v < 0 ? MINUS + text : text;
		},
		/** A fraction as a percent: 0.123 -> "12.3%". */
		percent: function (v, digits) {
			if (missing(v)) { return DASH; }
			var text = nf({ style: "percent", maximumFractionDigits: digits === undefined ? 1 : digits }).format(Math.abs(v));
			return v < 0 ? MINUS + text : text;
		},
		/** A signed delta. kind: "number" (default), "percent" (fraction in) or "points" (percentage points in). */
		delta: function (v, kind, digits) {
			if (missing(v)) { return DASH; }
			if (kind === "percent") { return signed(Format.percent(Math.abs(v), digits), v); }
			if (kind === "points") { return signed(Format.number(Math.abs(v), digits === undefined ? 1 : digits) + " pp", v); }
			if (kind === "short") { return signed(Format.short(Math.abs(v)), v); }
			return signed(Format.number(Math.abs(v), digits), v);
		},
		/** Percent change from base to value, or null when it would mislead (base is zero, or the sign flips). */
		change: function (value, base) {
			if (missing(value) || missing(base) || base === 0 || (base < 0) !== (value < 0)) { return null; }
			return (value - base) / Math.abs(base);
		},
		/**
		 * Whether a delta is good or bad for a key figure. polarity: "up" (higher is better) or
		 * "down" (lower is better). Returns "good", "bad" or "none".
		 */
		tone: function (delta, polarity) {
			if (missing(delta) || delta === 0 || !polarity) { return "none"; }
			return (delta > 0) === (polarity !== "down") ? "good" : "bad";
		},
		/** The UI5 value state for a tone. */
		state: function (tone) { return { good: "Success", bad: "Error", warn: "Warning" }[tone] || "None"; },
		/** The UI5 icon name for a delta's direction. */
		arrow: function (delta) { return delta > 0 ? "sap-icon://trend-up" : delta < 0 ? "sap-icon://trend-down" : "sap-icon://less"; },
		/** "2026-07" -> "Jul 2026" (or "Jul" with short=true). */
		period: function (p, short) {
			var m = /^(\d{4})-(\d{2})$/.exec(p || "");
			if (!m) { return p || DASH; }
			var d = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
			return d.toLocaleDateString(locale, short ? { month: "short", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" });
		},
		/** A date-time for source lines: "27 Sep 2026, 14:05". */
		when: function (date) {
			var d = date instanceof Date ? date : new Date(date);
			return d.toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
		}
	};
	return Format;
});
