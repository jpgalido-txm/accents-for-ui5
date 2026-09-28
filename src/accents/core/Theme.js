/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Theme and density: the person's choice, remembered in their browser. boot.js applies it before
 * the first paint; this module changes it afterwards.
 */
sap.ui.define(["sap/ui/core/Theming"], function (Theming) {
	"use strict";

	var boot = window.AccentsBoot || { themes: {}, theme: "sap_horizon", density: "compact" };

	function store(key, value) {
		try { window.localStorage.setItem(key, value); } catch (e) { /* private window: choice lasts this visit */ }
	}

	function applyDensity(density) {
		var body = document.body;
		body.classList.toggle("sapUiSizeCompact", density === "compact");
		body.classList.toggle("sapUiSizeCozy", density !== "compact");
		document.documentElement.setAttribute("data-acc-density", density);
	}

	var Theme = {
		/** The themes a person may choose, as [{ id, label }]. */
		list: function () {
			return Object.keys(boot.themes).map(function (id) {
				return { id: id, label: boot.themes[id].label };
			});
		},
		current: function () { return Theming.getTheme(); },
		isDark: function () {
			var t = boot.themes[Theming.getTheme()];
			return !!t && t.scheme === "dark";
		},
		set: function (id) {
			if (!boot.themes[id]) { return; }
			store("accents.theme", id);
			var root = document.documentElement;
			root.style.backgroundColor = boot.themes[id].bg;
			root.style.colorScheme = boot.themes[id].scheme;
			root.setAttribute("data-acc-scheme", boot.themes[id].scheme);
			Theming.setTheme(id);
		},
		density: function () { return document.documentElement.getAttribute("data-acc-density") || boot.density; },
		setDensity: function (density) {
			store("accents.density", density);
			applyDensity(density);
		},
		/** Call once when the app starts, after the body exists. */
		start: function () {
			applyDensity(boot.density);
			document.body.classList.add("accNoMouseRing");
		}
	};
	return Theme;
});
