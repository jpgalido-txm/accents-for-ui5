/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Colour comes from the running theme, never from app code. Tokens reads the theme's CSS variables,
 * derives the few values the theme does not ship (soft status backgrounds, heat-map ramps), publishes
 * those as --acc-* variables, and tells listeners when the theme changes so charts can redraw.
 */
sap.ui.define(["sap/ui/core/Theming"], function (Theming) {
	"use strict";

	var cache = {};
	var listeners = [];
	var categories = {};

	function raw(name) {
		return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	/** Parses #rgb, #rrggbb, rgb() and rgba() into [r, g, b, a]. Returns null for anything else. */
	function parse(colour) {
		if (!colour) { return null; }
		var c = colour.trim();
		var m;
		if (c[0] === "#") {
			var hex = c.slice(1);
			if (hex.length === 3) { hex = hex.split("").map(function (h) { return h + h; }).join(""); }
			if (hex.length !== 6 && hex.length !== 8) { return null; }
			return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16),
				hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1];
		}
		m = c.match(/^rgba?\(([^)]+)\)$/i);
		if (m) {
			var p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
			return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
		}
		return null;
	}

	function toCss(rgba) {
		var r = Math.round(rgba[0]), g = Math.round(rgba[1]), b = Math.round(rgba[2]);
		return rgba[3] === undefined || rgba[3] >= 1 ? "rgb(" + r + ", " + g + ", " + b + ")"
			: "rgba(" + r + ", " + g + ", " + b + ", " + Math.round(rgba[3] * 1000) / 1000 + ")";
	}

	/** Mixes colour a towards colour b; t = 0 gives a, t = 1 gives b. */
	function mix(a, b, t) {
		var x = parse(a), y = parse(b);
		if (!x || !y) { return a || b; }
		return toCss([0, 1, 2, 3].map(function (i) { return x[i] + (y[i] - x[i]) * t; }));
	}

	var Tokens = {
		/** A theme variable, with or without the leading "--". */
		get: function (name) {
			var key = name.indexOf("--") === 0 ? name : "--" + name;
			if (!(key in cache)) { cache[key] = raw(key); }
			return cache[key];
		},
		/** The nth colour of the theme's ordered chart palette (0-based, wraps after 12). */
		series: function (n) {
			var slot = (((n % 12) + 12) % 12) + 1;
			return Tokens.get("--sapChart_OrderedColor_" + slot);
		},
		/** Status colours for marks: "good", "bad", "critical", "neutral", "info". */
		status: function (kind) {
			return Tokens.get({
				good: "--sapChart_Good", bad: "--sapChart_Bad", critical: "--sapChart_Critical",
				neutral: "--sapChart_Neutral", info: "--sapInformativeElementColor"
			}[kind] || "--sapChart_Neutral");
		},
		/** Status colours for text, which the theme makes darker than marks so they pass contrast. */
		statusText: function (kind) {
			return Tokens.get({
				good: "--sapPositiveTextColor", bad: "--sapNegativeTextColor", critical: "--sapCriticalTextColor",
				neutral: "--sapContent_LabelColor", info: "--sapInformativeTextColor"
			}[kind] || "--sapTextColor");
		},
		text: function () { return Tokens.get("--sapTextColor"); },
		label: function () { return Tokens.get("--sapContent_LabelColor"); },
		background: function () { return Tokens.get("--sapGroup_ContentBackground") || Tokens.get("--sapBackgroundColor"); },
		line: function () { return Tokens.get("--sapList_BorderColor"); },
		font: function () { return Tokens.get("--sapFontFamily"); },
		mix: mix,
		parse: parse,

		/**
		 * Fixed categories keep one colour on every screen. Register them once, in one place:
		 * Tokens.categories({ price: 0, display: 1, feature: 2 }) maps each key to a palette slot.
		 */
		categories: function (map) { Object.assign(categories, map); },
		category: function (key) {
			if (!(key in categories)) { categories[key] = Object.keys(categories).length; }
			return Tokens.series(categories[key]);
		},

		/**
		 * A heat-map ramp of n colours, all derived from the theme.
		 *  - "diverge": bad → neutral → good, symmetric about zero
		 *  - "error":   critical → neutral → critical, where both directions are a warning
		 *  - "magnitude": neutral → the first palette colour
		 */
		ramp: function (kind, n) {
			n = Math.max(3, n || 7);
			var bg = Tokens.background();
			var mid = mix(bg, Tokens.status("neutral"), 0.12);
			var lo, hi;
			if (kind === "error") { lo = hi = Tokens.status("critical"); }
			else if (kind === "magnitude") { lo = mid; hi = Tokens.series(0); }
			else { lo = Tokens.status("bad"); hi = Tokens.status("good"); }
			var out = [];
			for (var i = 0; i < n; i++) {
				var t = i / (n - 1);
				if (kind === "magnitude") { out.push(mix(lo, hi, t)); }
				else if (t < 0.5) { out.push(mix(lo, mid, t * 2)); }
				else { out.push(mix(mid, hi, (t - 0.5) * 2)); }
			}
			return out;
		},

		/** Runs fn now and after every theme change. Returns a function that stops listening. */
		onChange: function (fn) {
			listeners.push(fn);
			return function () {
				var i = listeners.indexOf(fn);
				if (i >= 0) { listeners.splice(i, 1); }
			};
		}
	};

	function publish() {
		cache = {};
		var bg = Tokens.background();
		var style = document.documentElement.style;
		style.setProperty("--acc-good-soft", mix(Tokens.status("good"), bg, 0.84));
		style.setProperty("--acc-bad-soft", mix(Tokens.status("bad"), bg, 0.84));
		style.setProperty("--acc-warn-soft", mix(Tokens.status("critical"), bg, 0.84));
		style.setProperty("--acc-info-soft", mix(Tokens.status("info"), bg, 0.86));
		listeners.slice().forEach(function (fn) {
			try { fn(); } catch (e) { /* one broken listener must not stop the others */ }
		});
	}

	Theming.attachApplied(publish);
	return Tokens;
});
