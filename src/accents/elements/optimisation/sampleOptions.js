/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Demo data for the optimisation elements only: a seeded optimiser run over four levers for the
 * fictional retailer in core/Data.js. It is not part of the catalogue and no app should import it.
 *
 * The calculation, written out so no figure is typed in:
 *  - each option draws its settings from the seed: price change (−5% to +5%), display weeks (0–4),
 *    feature (yes or no) and promotion depth (10–40%);
 *  - each lever's contribution to added return (USD thousands) follows from its setting:
 *    price (5 − change) × 6, display weeks × 12, feature 40, promotion depth × 2.2, each times a
 *    seeded factor between 0.8 and 1.2;
 *  - cost (USD thousands) is 50 + display weeks × 15 + 35 for a feature + depth × 3.5 + 10 per point
 *    of price cut;
 *  - return is the starting return plus the contributions; the target is the starting return + 150.
 */
sap.ui.define(["accents/core/Tokens", "accents/core/I18n"], function (Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.optimisation.i18n.i18n");

	var LEVERS = [
		{ key: "price", name: t("sampleOptions.lever.price") },
		{ key: "display", name: t("sampleOptions.lever.display") },
		{ key: "feature", name: t("sampleOptions.lever.feature") },
		{ key: "promotion", name: t("sampleOptions.lever.promotion") }
	];
	var NAME = {};
	LEVERS.forEach(function (l) { NAME[l.key] = l.name; });
	// Lever colours are fixed across every screen; this is the one place the demo maps them.
	Tokens.categories({ price: 0, display: 1, feature: 2, promotion: 3 });

	function round(v, d) { var f = Math.pow(10, d || 0); return Math.round(v * f) / f; }

	function run(Data, seed, n) {
		var random = Data.rng(seed || 7);
		var start = { id: "start", name: t("sampleOptions.start"), cost: round(80 + random() * 40, 1), ret: round(300 + random() * 60, 1) };
		var target = round(start.ret + 150, 1);
		var options = [];
		for (var i = 0; i < (n || 24); i++) {
			var price = round((random() - 0.5) * 10, 1);
			var weeks = Math.floor(random() * 5);
			var feature = random() > 0.5;
			var depth = Math.round(10 + random() * 30);
			var f = function () { return 0.8 + random() * 0.4; };
			var mix = [
				{ lever: "price", name: NAME.price, value: round((5 - price) * 6 * f(), 1) },
				{ lever: "display", name: NAME.display, value: round(weeks * 12 * f(), 1) },
				{ lever: "feature", name: NAME.feature, value: round((feature ? 40 : 0) * f(), 1) },
				{ lever: "promotion", name: NAME.promotion, value: round(depth * 2.2 * f(), 1) }
			];
			var added = mix.reduce(function (s, m) { return s + m.value; }, 0);
			var cost = round(50 + weeks * 15 + (feature ? 35 : 0) + depth * 3.5 + Math.max(0, -price) * 10, 1);
			options.push({
				id: "OPT-" + String(i + 1).padStart(2, "0"),
				name: t("sampleOptions.option", i + 1),
				settings: { price: price, display: weeks, feature: feature, promotion: depth },
				cost: cost,
				ret: round(start.ret + added, 1),
				mix: mix
			});
		}
		options.sort(function (a, b) { return b.ret - a.ret; });
		options.forEach(function (o, i) { o.rank = i + 1; o.met = o.ret >= target; });
		return { start: start, target: target, options: options, levers: LEVERS };
	}

	return { run: run, LEVERS: LEVERS };
});
