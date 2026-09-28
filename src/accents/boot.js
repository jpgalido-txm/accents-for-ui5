/*!
 * Accents for UI5 — theme boot.
 * Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Load this plain script in <head>, before the UI5 bootstrap, and leave the theme attribute off the
 * bootstrap tag. It reads the person's saved theme and density, hands the theme to UI5, and paints the
 * page in that theme's background at once, so nobody ever sees a flash of the wrong theme.
 */
(function () {
	"use strict";

	// Background colours measured from OpenUI5 1.148.9 theme CSS (--sapBackgroundColor), 27 Sep 2026.
	// They are only the first-paint colour; everything after that is read from the running theme.
	var THEMES = {
		sap_horizon: { label: "Light", bg: "#f5f6f7", scheme: "light" },
		sap_horizon_dark: { label: "Dark", bg: "#12171c", scheme: "dark" },
		sap_horizon_hcb: { label: "High contrast black", bg: "#000000", scheme: "dark" },
		sap_horizon_hcw: { label: "High contrast white", bg: "#ffffff", scheme: "light" }
	};

	function read(key) {
		try { return window.localStorage.getItem(key); } catch (e) { return null; }
	}
	function prefers(query) {
		return !!(window.matchMedia && window.matchMedia(query).matches);
	}

	// ?theme=<id> overrides the saved choice for this load only (used by audits and demos).
	var asked = /[?&]theme=([a-z_]+)/.exec(window.location.search);
	var theme = asked && THEMES[asked[1]] ? asked[1] : read("accents.theme");
	if (!THEMES[theme]) {
		theme = prefers("(prefers-contrast: more)") ? (prefers("(prefers-color-scheme: dark)") ? "sap_horizon_hcb" : "sap_horizon_hcw")
			: prefers("(prefers-color-scheme: dark)") ? "sap_horizon_dark" : "sap_horizon";
	}
	var density = read("accents.density");
	if (density !== "compact" && density !== "cozy") {
		density = prefers("(pointer: coarse)") ? "cozy" : "compact";
	}

	// Language: ?lang=<code> for this load only, else the saved choice, else the browser's. UI5 turns the
	// whole page right-to-left for right-to-left languages.
	var langAsked = /[?&]lang=([a-z]{2}(?:-[A-Za-z]{2})?)/.exec(window.location.search);
	var language = langAsked ? langAsked[1] : read("accents.language");

	var config = window["sap-ui-config"] || {};
	config.theme = theme;
	if (language) { config.language = language; }
	window["sap-ui-config"] = config;

	var root = document.documentElement;
	root.style.backgroundColor = THEMES[theme].bg;
	root.style.colorScheme = THEMES[theme].scheme;
	root.setAttribute("data-acc-scheme", THEMES[theme].scheme);
	root.setAttribute("data-acc-density", density);

	if (language) {
		root.setAttribute("lang", language);
		if (/^(ar|he|fa|ur)\b/.test(language)) { root.setAttribute("dir", "rtl"); }
	}

	window.AccentsBoot = { themes: THEMES, theme: theme, density: density, language: language || null };
})();
