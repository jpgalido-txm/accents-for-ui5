/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Data discipline. One adapter per app talks to the backend and keeps track of whether what came back
 * is live or sample. Rules that apply everywhere (such as never showing actuals for periods that have
 * not happened) are applied here, once.
 *
 * Also ships a small, seeded sample dataset for a fictional retailer, "Harbor & Pine", so the gallery
 * and demos are repeatable. Sample data is always declared as sample on screen.
 */
sap.ui.define(["accents/core/I18n"], function (I18n) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	/** Deterministic random numbers from a seed (mulberry32). */
	function rng(seed) {
		var a = (seed >>> 0) || 1;
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var x = a;
			x = Math.imul(x ^ (x >>> 15), x | 1);
			x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}

	function round(v, digits) {
		var f = Math.pow(10, digits || 0);
		return Math.round(v * f) / f;
	}

	/** n month keys ("2026-01") starting at start. */
	function periods(start, n) {
		var m = /^(\d{4})-(\d{2})$/.exec(start);
		var y = +m[1], mo = +m[2] - 1, out = [];
		for (var i = 0; i < n; i++) {
			var d = new Date(Date.UTC(y, mo + i, 1));
			out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"));
		}
		return out;
	}

	/** A random walk: n values from start with a drift per step and relative noise. */
	function walk(random, n, start, drift, noise) {
		var out = [], v = start;
		for (var i = 0; i < n; i++) {
			v = Math.max(0, v * (1 + (drift || 0) + ((random() - 0.5) * 2 * (noise || 0.05))));
			out.push(v);
		}
		return out;
	}

	// Names are shown on screen, so they come from the translation file. Groups stay as they are: page
	// patterns filter by them.
	var ITEMS = [
		{ id: "COF", group: "Beverages" },
		{ id: "TEA", group: "Beverages" },
		{ id: "JUI", group: "Beverages" },
		{ id: "SNK", group: "Pantry" },
		{ id: "BAK", group: "Fresh" },
		{ id: "DAI", group: "Fresh" },
		{ id: "FRZ", group: "Frozen" },
		{ id: "PAN", group: "Pantry" }
	].map(function (it) { return { id: it.id, name: t("data.item." + it.id), group: it.group }; });

	var Data = {
		rng: rng,
		round: round,
		periods: periods,
		walk: walk,

		/** The "today" the sample data treats as now. Periods after it have no actuals. */
		SAMPLE_TODAY: "2026-08",

		/** Source-line facts for sample data. */
		sampleMeta: function (extra) {
			return Object.assign({ mode: "sample", source: t("data.source"), model: null, readAt: new Date() }, extra || {});
		},

		/**
		 * Wraps a live loader and a sample loader into one source. load() resolves to
		 * { data, meta } where meta.mode is "live" or "sample". Sample is used only when asked for
		 * (?data=sample) or when no live loader exists — never silently after a live failure.
		 */
		source: function (o) {
			var wantSample = /[?&]data=sample\b/.test(window.location.search);
			return {
				load: function () {
					if (wantSample || !o.live) {
						return Promise.resolve({ data: o.sample(), meta: Data.sampleMeta(o.sampleMeta) });
					}
					return Promise.resolve(o.live()).then(function (res) {
						return { data: res.data, meta: Object.assign({ mode: "live", readAt: new Date() }, res.meta || {}) };
					});
				}
			};
		},

		/** Removes actual values for periods later than today. Apply once, in the adapter. */
		hideFutureActuals: function (rows, today, periodKey, actualKey) {
			return rows.map(function (r) {
				if (r[periodKey || "period"] > (today || Data.SAMPLE_TODAY)) {
					var copy = Object.assign({}, r);
					copy[actualKey || "actual"] = null;
					return copy;
				}
				return r;
			});
		},

		/**
		 * The shared sample dataset. seed changes the numbers so "replay motion" has something new to show.
		 * Returns { meta, periods, today, items[] } where each item has
		 * { id, name, group, polarity, actual, plan, target, prior, months: [{ period, actual, plan, forecast }] }.
		 */
		sample: function (seed) {
			var random = rng(seed || 7);
			var ps = periods("2026-01", 12);
			var today = Data.SAMPLE_TODAY;
			var items = ITEMS.map(function (it, i) {
				var base = 180 + random() * 420;
				var plan = walk(random, 12, base, 0.012, 0.03);
				var actual = plan.map(function (p) { return p * (0.9 + random() * 0.18); });
				var months = ps.map(function (p, k) {
					var past = p <= today;
					return { period: p, plan: round(plan[k], 1), actual: past ? round(actual[k], 1) : null,
						forecast: past ? null : round(plan[k] * (0.95 + random() * 0.1), 1) };
				});
				var sumActual = months.reduce(function (s, m) { return s + (m.actual || 0); }, 0);
				var sumPlan = months.filter(function (m) { return m.period <= today; }).reduce(function (s, m) { return s + m.plan; }, 0);
				return Object.assign({}, it, {
					polarity: "up",
					actual: round(sumActual, 1),
					plan: round(sumPlan, 1),
					target: round(sumPlan * 1.03, 1),
					prior: round(sumActual * (0.88 + random() * 0.2), 1),
					margin: round(0.18 + random() * 0.2 - (i === 6 ? 0.25 : 0), 3),
					months: months
				});
			});
			return { meta: Data.sampleMeta(), periods: ps, today: today, items: items };
		}
	};
	return Data;
});
