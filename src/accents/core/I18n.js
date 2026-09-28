/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Every word on screen comes from a translation file, never from code. Each module group has its own
 * file, so groups can be translated (and edited) independently:
 *
 *   accents/i18n/i18n.properties                      core, shell, assistant
 *   accents/elements/<group>/i18n/i18n.properties     one element group
 *   accents/patterns/i18n/i18n.properties             page patterns
 *   i18n_de.properties, i18n_ar.properties ...        translations, next to the English file
 *
 *   var t = I18n.use("accents.elements.review.i18n.i18n");
 *   t("rankedBars.seeAll", 12)          // "See all ({0})" -> "See all (12)"
 *
 * A key with no text is shown as ⟦key⟧ and recorded, so the audit fails on missing text instead of a
 * screen quietly showing a code. Right-to-left languages switch the whole page direction.
 */
sap.ui.define([
	"sap/base/i18n/ResourceBundle",
	"sap/base/i18n/Localization"
], function (ResourceBundle, Localization) {
	"use strict";

	/** Languages Accents itself ships. Apps may add their own. */
	var LANGUAGES = [
		{ code: "en", label: "English" },
		{ code: "de", label: "Deutsch" },
		{ code: "ar", label: "العربية", rtl: true }
	];

	var bundles = {};           // name -> ResourceBundle
	// name -> locales the bundle ships ("" is the English base file). Accents' own translated bundles
	// are listed here once, so every module that uses them gets the same list.
	var declared = {
		"accents.i18n.i18n": ["", "de", "ar"]
	};
	var missing = new Set();

	function url(name) { return sap.ui.require.toUrl(name.replace(/\./g, "/")) + ".properties"; }

	function settings(name, async) {
		return {
			url: url(name),
			async: async,
			supportedLocales: declared[name] || [""],
			fallbackLocale: "",
			locale: Localization.getLanguage()
		};
	}

	function lookup(name) {
		if (!bundles[name]) { bundles[name] = ResourceBundle.create(settings(name, false)); }
		return bundles[name];
	}

	var I18n = {
		/**
		 * Declares which translations a bundle ships, e.g. I18n.declare("accents.i18n.i18n", ["", "de", "ar"]).
		 * Undeclared bundles are English only, so no requests are made for files that do not exist.
		 */
		declare: function (name, locales) { declared[name] = locales; },

		/** Loads bundles ahead of time so the first screen never waits. Resolves when all are loaded. */
		preload: function (names) {
			return Promise.all(names.map(function (name) {
				if (bundles[name]) { return bundles[name]; }
				return ResourceBundle.create(settings(name, true)).then(function (b) { bundles[name] = b; });
			}));
		},

		/** Returns t(key, ...args) for one bundle. */
		use: function (name) {
			var t = function (key) {
				var args = Array.prototype.slice.call(arguments, 1);
				var text = lookup(name).getText(key, args, true);
				if (text === undefined) {
					missing.add(name + ": " + key);
					return "⟦" + key + "⟧";
				}
				return text;
			};
			t.has = function (key) { return lookup(name).hasText(key); };
			return t;
		},

		languages: function () { return LANGUAGES.slice(); },
		language: function () { return (Localization.getLanguage() || "en").split("-")[0]; },
		isRtl: function () { return Localization.getRTL(); },

		/** Saves the person's language and reloads, which is how UI5 applies a new language everywhere. */
		setLanguage: function (code) {
			try { window.localStorage.setItem("accents.language", code); } catch (e) { /* this visit only */ }
			var u = new URL(window.location.href);
			u.searchParams.delete("lang");
			window.location.href = u.toString();
		},

		/** Keys that were asked for but have no text: the audit fails when this is not empty. */
		missing: function () { return Array.from(missing); }
	};
	return I18n;
});
