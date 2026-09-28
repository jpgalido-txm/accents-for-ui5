/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * All motion lives here; no other module animates on its own. Two kinds only:
 *  - quiet motion: a staggered entrance the first time a page shows, and a small hover lift;
 *  - data motion: only when data really changes, and only on what changed (count up, flash, sweep,
 *    pulse, rank-order entrance).
 * One action gets at most about 1.2 seconds of motion. A new change cancels the running one and starts
 * from what is on screen. Reduced motion (the system setting, or ?motion=reduced) turns all of it off.
 */
sap.ui.define([], function () {
	"use strict";

	var BUDGET_MS = 1200;
	var running = new WeakMap();
	var seenPages = new Set();

	var forced = /[?&]motion=reduced\b/.test(window.location.search);
	if (forced) { document.documentElement.setAttribute("data-acc-motion", "reduced"); }

	function reduced() {
		return forced || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}

	function dom(target) {
		if (!target) { return null; }
		return target.getDomRef ? target.getDomRef() : target;
	}

	function restartClass(el, cls, ms) {
		el.classList.remove(cls);
		void el.offsetWidth; // restart the animation if it is already running
		el.classList.add(cls);
		setTimeout(function () { el.classList.remove(cls); }, ms);
	}

	var Motion = {
		BUDGET_MS: BUDGET_MS,
		reduced: reduced,

		/**
		 * Counts a figure from its current value up (or down) to `to`. `el` is a DOM node or a control;
		 * `write(text)` is optional and receives the formatted text for each frame (use it for controls
		 * that own their text). Screen readers get only the final value.
		 */
		countTo: function (target, from, to, format, ms, write) {
			var el = dom(target);
			var put = write || function (text) { if (el) { el.textContent = text; } };
			var key = el || target;
			var prev = running.get(key);
			if (prev) { cancelAnimationFrame(prev.frame); from = prev.current; }
			if (reduced() || typeof from !== "number" || typeof to !== "number" || from === to) {
				running.delete(key);
				put(format(to));
				return;
			}
			var dur = Math.min(ms || 600, BUDGET_MS);
			var start = performance.now();
			var state = { current: from, frame: 0 };
			if (el && el.setAttribute) { el.setAttribute("aria-label", format(to)); }
			function step(now) {
				var t = Math.min(1, (now - start) / dur);
				var eased = 1 - Math.pow(1 - t, 3);
				state.current = from + (to - from) * eased;
				put(format(t === 1 ? to : state.current));
				if (t < 1) { state.frame = requestAnimationFrame(step); } else { running.delete(key); }
			}
			running.set(key, state);
			state.frame = requestAnimationFrame(step);
		},

		/** A one-time faint wash behind a changed figure, coloured by tone ("good", "bad" or "none"). */
		flash: function (target, tone) {
			var el = dom(target);
			if (!el || reduced()) { return; }
			restartClass(el, "accFlash--" + (tone === "good" || tone === "bad" ? tone : "none"), 950);
		},

		/** A single pulse on a changed count. */
		pulse: function (target) {
			var el = dom(target);
			if (!el || reduced()) { return; }
			restartClass(el, "accPulse", 520);
		},

		/**
		 * Staggered entrance for a list of controls or nodes, the first time a page shows only.
		 * pageKey identifies the page; returning to it does not replay the entrance.
		 */
		enter: function (targets, pageKey) {
			if (reduced() || (pageKey && seenPages.has(pageKey))) { return; }
			if (pageKey) { seenPages.add(pageKey); }
			targets.slice(0, 12).forEach(function (t, i) {
				var el = dom(t);
				if (!el) { return; }
				el.style.animationDelay = (i * 45) + "ms";
				restartClass(el, "accEnter", 450 + i * 45);
			});
		},

		/** Rank-order entrance for rows or items that arrive as a result. */
		rank: function (targets) {
			if (reduced()) { return; }
			var step = Math.min(60, Math.floor(700 / Math.max(1, targets.length)));
			targets.forEach(function (t, i) {
				var el = dom(t);
				if (!el) { return; }
				el.style.animationDelay = (i * step) + "ms";
				restartClass(el, "accEnter", 450 + i * step);
			});
		},

		/**
		 * Left-to-right sweep over changed cells. cells: [{ el, column, tone }]. The whole sweep
		 * finishes inside about 0.6 seconds however many columns there are.
		 */
		sweep: function (cells) {
			if (reduced() || !cells.length) { return; }
			var maxCol = cells.reduce(function (m, c) { return Math.max(m, c.column || 0); }, 0);
			var gap = maxCol ? Math.min(60, 550 / maxCol) : 0;
			cells.forEach(function (c) {
				setTimeout(function () { Motion.flash(c.el, c.tone); }, (c.column || 0) * gap);
			});
		}
	};
	return Motion;
});
