/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The shell every Accents app starts from. The same parts, in the same order, in every app:
 *
 *   top bar     menu · the organisation's own mark (never an invented logo) · app name · search ·
 *               notifications · help · assistant · the person's avatar
 *   left panel  the app's pages on top; a fixed group at the bottom that is the same in every app:
 *               customize home, settings, help, feedback, legal, service status
 *   user menu   who is signed in (read from the identity, never typed), account, personal settings,
 *               what's new, and sign out last
 *
 * Each part appears only when it works. Customize home and Settings are always there because the shell
 * owns them. The rest appear when the app supplies a destination; leaving one out is a decision the
 * app writes down, not an accident. A button that does nothing is a defect.
 *
 * Width: the panel is open on wide screens, an icon rail on medium ones, and off-canvas on phones,
 * where choosing a page closes it. Search is hidden below tablet width rather than squeezed.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/tnt/ToolPage",
	"sap/tnt/ToolHeader",
	"sap/tnt/SideNavigation",
	"sap/tnt/NavigationList",
	"sap/tnt/NavigationListItem",
	"sap/m/Button",
	"sap/m/Image",
	"sap/m/Text",
	"sap/m/Title",
	"sap/m/Label",
	"sap/m/Avatar",
	"sap/m/SearchField",
	"sap/m/ToolbarSpacer",
	"sap/m/OverflowToolbarLayoutData",
	"sap/m/ScrollContainer",
	"sap/m/ResponsivePopover",
	"sap/m/List",
	"sap/m/StandardListItem",
	"sap/m/CustomListItem",
	"sap/m/CheckBox",
	"sap/m/HBox",
	"sap/m/VBox",
	"sap/m/Dialog",
	"sap/m/Select",
	"sap/m/SegmentedButton",
	"sap/m/SegmentedButtonItem",
	"sap/m/IllustratedMessage",
	"sap/ui/core/Item",
	"accents/core/Theme",
	"accents/core/I18n",
	"accents/ai/Assistant"
], function (Device, ToolPage, ToolHeader, SideNavigation, NavigationList, NavigationListItem, Button, Image, Text, Title,
	Label, Avatar, SearchField, ToolbarSpacer, OverflowToolbarLayoutData, ScrollContainer, ResponsivePopover, List,
	StandardListItem, CustomListItem, CheckBox, HBox, VBox, Dialog, Select, SegmentedButton, SegmentedButtonItem,
	IllustratedMessage, Item, Theme, I18n, Assistant) {
	"use strict";

	var t = I18n.use("accents.i18n.i18n");

	function go(dest) {
		if (typeof dest === "function") { dest(); } else if (dest) { window.open(dest, "_blank", "noopener"); }
	}

	function initials(name) {
		return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
	}

	function create(o) {
		var links = o.links || {};
		var pages = {};
		var built = {};
		var currentKey = null;
		var homeId = "accents.home." + (o.homeSections && o.homeSections.id || "app");

		(function index(list) {
			list.forEach(function (p) { pages[p.key] = p; if (p.items) { index(p.items); } });
		})(o.pages);

		Theme.start();

		/* ---------- assistant ---------- */
		var settingsDialog = null;
		var assistant = o.ai === false ? null : Assistant.create({
			app: o.app.title,
			pageContext: function () {
				var p = pages[currentKey];
				if (!p) { return null; }
				return p.context ? p.context() : { title: p.title };
			},
			onSettings: function () { openSettings(); }
		});

		/* ---------- header ---------- */
		var menuBtn = new Button({ icon: "sap-icon://menu2", type: "Transparent", tooltip: t("shell.menu"),
			press: function () { page.setSideExpanded(!page.getSideExpanded()); } });
		var headerContent = [menuBtn];
		if (o.app.mark) {
			headerContent.push(new Image({ src: o.app.mark.src, alt: o.app.mark.alt || o.app.title, decorative: false,
				press: function () { navigate(o.home); } }).addStyleClass("accShellMark"));
		}
		headerContent.push(new Title({ text: o.app.title, level: "H1", wrapping: false }).addStyleClass("accShellTitle"));
		headerContent.push(new ToolbarSpacer());
		var search = null;
		if (o.search) {
			search = new SearchField({ width: "22rem", placeholder: o.search.placeholder || t("shell.search"),
				search: function (e) { var q = e.getParameter("query"); if (q) { o.search.onSearch(q); } },
				layoutData: new OverflowToolbarLayoutData({ priority: "NeverOverflow", shrinkable: true, minWidth: "12rem" }) });
			headerContent.push(search, new ToolbarSpacer());
		}
		if (o.notifications) {
			headerContent.push(new Button({ icon: "sap-icon://bell", type: "Transparent", tooltip: t("shell.notifications"),
				press: o.notifications.press }));
		}
		if (links.help) {
			headerContent.push(new Button({ icon: "sap-icon://sys-help", type: "Transparent", tooltip: t("shell.help"),
				press: function () { go(links.help); } }));
		}
		if (assistant) { headerContent.push(assistant.headerButton()); }
		var avatar = new Avatar({
			initials: o.user ? initials(o.user.name) : undefined,
			src: o.user ? undefined : "sap-icon://person-placeholder",
			displaySize: "XS",
			tooltip: o.user ? o.user.name : t("shell.notSignedIn"),
			press: function (e) { userMenu().openBy(e.getSource()); }
		});
		headerContent.push(avatar);

		/* ---------- user menu ---------- */
		var menu = null;
		function userMenu() {
			if (menu) { return menu; }
			var who = o.user
				? new VBox({ renderType: "Bare", items: [
					new Title({ text: o.user.name, level: "H3", titleStyle: "H5", wrapping: true }),
					new Text({ text: [o.user.id, o.user.email].filter(Boolean).join(" · ") }),
					o.user.org ? new Text({ text: o.user.org }) : null
				].filter(Boolean) })
				: new Text({ text: t("shell.notSignedInSentence") });
			var entries = [];
			if (links.account) { entries.push([t("shell.account"), "sap-icon://account", links.account]); }
			entries.push([t("shell.personalSettings"), "sap-icon://action-settings", function () { menu.close(); openSettings(); }]);
			if (links.whatsNew) { entries.push([t("shell.whatsNew"), "sap-icon://notification-2", links.whatsNew]); }
			var list = new List({ items: entries.map(function (e) {
				return new StandardListItem({ title: e[0], icon: e[1], type: "Active", press: function () { go(e[2]); } });
			}) });
			var content = [new VBox({ items: [who], renderType: "Bare" }).addStyleClass("accUserBlock"), list];
			if (o.signOut) {
				content.push(new VBox({ renderType: "Bare", items: [new Button({ text: t("shell.signOut"), icon: "sap-icon://log",
					width: "100%", press: o.signOut })] }).addStyleClass("accPopPad accHairline"));
			}
			menu = new ResponsivePopover({ showHeader: false, placement: "Bottom", contentWidth: "18rem", content: content });
			return menu;
		}

		/* ---------- settings ---------- */
		function openSettings() {
			if (!settingsDialog) {
				var themeSelect = new Select({ width: "100%", selectedKey: Theme.current(),
					// A theme's name comes from the translation file when it has one there, else from boot.js.
					items: Theme.list().map(function (th) { return new Item({ key: th.id, text: t.has("shell.theme." + th.id) ? t("shell.theme." + th.id) : th.label }); }),
					change: function (e) { Theme.set(e.getParameter("selectedItem").getKey()); } });
				var density = new SegmentedButton({ selectedKey: Theme.density(), width: "100%",
					items: [new SegmentedButtonItem({ key: "compact", text: t("shell.density.compact") }), new SegmentedButtonItem({ key: "cozy", text: t("shell.density.cozy") })],
					selectionChange: function (e) { Theme.setDensity(e.getParameter("item").getKey()); } });
				// Changing language reloads the page, which is how UI5 applies a language everywhere.
				var language = new Select({ width: "100%", selectedKey: I18n.language(),
					items: I18n.languages().map(function (l) { return new Item({ key: l.code, text: l.label }); }),
					change: function (e) { I18n.setLanguage(e.getParameter("selectedItem").getKey()); } });
				var densityLabel = new Label({ text: t("shell.density"), labelFor: density });
				var items = [
					new Title({ text: t("shell.appearance"), level: "H3", titleStyle: "H5" }),
					new Label({ text: t("shell.theme"), labelFor: themeSelect }).addStyleClass("sapUiSmallMarginTop"), themeSelect,
					densityLabel.addStyleClass("sapUiSmallMarginTop"), density,
					new Label({ text: t("shell.language"), labelFor: language }).addStyleClass("sapUiSmallMarginTop"), language
				];
				// A segmented button renders as a list box; its label names it only through aria-labelledby.
				density.addAriaLabelledBy(densityLabel);
				if (assistant) {
					items.push(new Title({ text: t("shell.assistant"), level: "H3", titleStyle: "H5" }).addStyleClass("sapUiMediumMarginTop"),
						assistant.settingsContent());
				}
				settingsDialog = new Dialog({ title: t("shell.settings"), contentWidth: "26rem", stretch: Device.system.phone,
					content: [new VBox({ items: items, renderType: "Bare" }).addStyleClass("accPopPad")],
					endButton: new Button({ text: t("shell.close"), press: function () { settingsDialog.close(); } }) });
			}
			settingsDialog.open();
		}

		/* ---------- customize home ---------- */
		function readHome() {
			var saved = null;
			try { saved = JSON.parse(window.localStorage.getItem(homeId)); } catch (e) { saved = null; }
			var all = o.homeSections ? o.homeSections.sections.map(function (s) { return s.key; }) : [];
			var order = saved && saved.order ? saved.order.filter(function (k) { return all.indexOf(k) >= 0; }) : [];
			all.forEach(function (k) { if (order.indexOf(k) < 0) { order.push(k); } });
			return { order: order, hidden: saved && saved.hidden ? saved.hidden : [] };
		}
		function writeHome(h) {
			try { window.localStorage.setItem(homeId, JSON.stringify(h)); } catch (e) { /* ignore */ }
			if (o.homeSections.onChange) { o.homeSections.onChange(api.homeLayout()); }
		}
		var homeDialog = null, homeList = null;
		function fillHomeList() {
			var h = readHome();
			var byKey = {};
			o.homeSections.sections.forEach(function (s) { byKey[s.key] = s; });
			homeList.destroyItems();
			h.order.forEach(function (k, i) {
				var box = new CheckBox({ text: byKey[k].title, selected: h.hidden.indexOf(k) < 0,
					select: function (e) {
						var cur = readHome();
						cur.hidden = cur.hidden.filter(function (x) { return x !== k; });
						if (!e.getParameter("selected")) { cur.hidden.push(k); }
						writeHome(cur);
					} });
				function move(d) {
					var cur = readHome();
					var at = cur.order.indexOf(k);
					cur.order.splice(at, 1);
					cur.order.splice(at + d, 0, k);
					writeHome(cur);
					fillHomeList();
				}
				homeList.addItem(new CustomListItem({ content: [new HBox({ justifyContent: "SpaceBetween", alignItems: "Center", items: [
					box,
					new HBox({ items: [
						new Button({ icon: "sap-icon://navigation-up-arrow", type: "Transparent", tooltip: t("shell.moveUp"), enabled: i > 0, press: function () { move(-1); } }),
						new Button({ icon: "sap-icon://navigation-down-arrow", type: "Transparent", tooltip: t("shell.moveDown"), enabled: i < h.order.length - 1, press: function () { move(1); } })
					] })
				] }).addStyleClass("sapUiTinyMarginBeginEnd")] }));
			});
		}
		function openHome() {
			if (!homeDialog) {
				homeList = new List();
				homeDialog = new Dialog({ title: t("shell.customizeHome"), contentWidth: "24rem", stretch: Device.system.phone,
					content: [new VBox({ renderType: "Bare", items: [
						new Text({ text: t("shell.customizeHome.lead") }).addStyleClass("accPopPad"),
						homeList] })],
					beginButton: new Button({ text: t("shell.reset"), press: function () {
						try { window.localStorage.removeItem(homeId); } catch (e) { /* ignore */ }
						writeHome(readHome());
						fillHomeList();
					} }),
					endButton: new Button({ text: t("shell.done"), type: "Emphasized", press: function () { homeDialog.close(); } }) });
			}
			fillHomeList();
			homeDialog.open();
		}

		/* ---------- side navigation ---------- */
		function navItem(p) {
			return new NavigationListItem({ key: p.key, text: p.title, icon: p.icon, expanded: false,
				items: (p.items || []).map(navItem) });
		}
		var fixed = [];
		if (o.homeSections) { fixed.push(["home", t("shell.customizeHome"), "sap-icon://customize", openHome]); }
		fixed.push(["settings", t("shell.settings"), "sap-icon://action-settings", openSettings]);
		if (links.help) { fixed.push(["help", t("shell.help"), "sap-icon://sys-help", links.help]); }
		if (links.feedback) { fixed.push(["feedback", t("shell.feedback"), "sap-icon://feedback", links.feedback]); }
		if (links.legal) { fixed.push(["legal", t("shell.legal"), "sap-icon://document-text", links.legal]); }
		if (links.status) { fixed.push(["status", t("shell.serviceStatus"), "sap-icon://heart-2", links.status]); }
		var fixedActions = {};
		fixed.forEach(function (f) { fixedActions["fixed:" + f[0]] = f[3]; });

		var side = new SideNavigation({
			item: new NavigationList({ items: o.pages.map(navItem) }),
			fixedItem: new NavigationList({ items: fixed.map(function (f) {
				return new NavigationListItem({ key: "fixed:" + f[0], text: f[1], icon: f[2], selectable: false });
			}) }),
			itemSelect: function (e) {
				var key = e.getParameter("item").getKey();
				if (fixedActions[key]) { go(fixedActions[key]); return; }
				navigate(key);
				if (Device.system.phone || window.innerWidth < 600) { page.setSideExpanded(false); }
			}
		});

		/* ---------- main area ---------- */
		var main = new ScrollContainer({ vertical: true, horizontal: false, height: "100%", width: "100%" });
		var page = new ToolPage({
			header: new ToolHeader({ content: headerContent }),
			sideContent: side,
			mainContents: [main]
		});

		function show(key) {
			var p = pages[key];
			if (!p) { return false; }
			if (!p.build && p.items && p.items.length) { return show(p.items[0].key); }
			currentKey = key;
			if (!built[key]) { built[key] = p.build(); }
			main.removeAllContent();
			main.addContent(built[key]);
			main.scrollTo(0, 0);
			side.setSelectedKey(key);
			document.title = t("shell.pageTitle", p.title, o.app.title);
			if (o.onShow) { o.onShow(key, built[key]); }
			return true;
		}
		function navigate(key) {
			if (window.location.hash !== "#/" + key) { window.location.hash = "#/" + key; } else { show(key); }
		}
		window.addEventListener("hashchange", function () {
			var key = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
			if (!show(key)) { show(o.home); }
		});

		/* ---------- adaptive width ---------- */
		function adapt() {
			var w = window.innerWidth;
			if (search) { search.setVisible(w >= 768); }
			return w;
		}
		Device.resize.attachHandler(adapt);
		var startWidth = adapt();
		page.setSideExpanded(startWidth >= 1024);

		var api = {
			root: page,
			assistant: assistant,
			/** Shows a page by key, updating the address so it can be bookmarked. */
			go: navigate,
			current: function () { return currentKey; },
			/** Rebuilds a page the next time it is shown (use after its data changes shape). */
			invalidate: function (key) { if (built[key]) { built[key].destroy(); delete built[key]; } },
			/** Rebuilds and re-shows the current page. */
			refresh: function () { if (currentKey) { api.invalidate(currentKey); show(currentKey); } },
			/** Starts the shell: shows the page in the address, or home. */
			start: function (placeAt) {
				page.placeAt(placeAt || "content");
				var key = decodeURIComponent(window.location.hash.replace(/^#\/?/, ""));
				if (!show(key)) { show(o.home); }
			},
			/** The home sections the person wants, in their order: [{ key, title }]. */
			homeLayout: function () {
				if (!o.homeSections) { return []; }
				var h = readHome();
				var byKey = {};
				o.homeSections.sections.forEach(function (s) { byKey[s.key] = s; });
				return h.order.filter(function (k) { return h.hidden.indexOf(k) < 0; }).map(function (k) { return byKey[k]; });
			},
			/** What home shows when every section is hidden: a way back, never blank space. */
			emptyHome: function () {
				return new IllustratedMessage({ illustrationType: "sapIllus-EmptyPlanningCalendar", illustrationSize: "Scene",
					title: t("shell.emptyHome.title"), description: t("shell.emptyHome.description"),
					enableDefaultTitleAndDescription: false,
					additionalContent: [new Button({ text: t("shell.customizeHome"), type: "Emphasized", press: openHome })] });
			},
			openSettings: openSettings,
			openHome: openHome
		};
		return api;
	}

	return { create: create };
});
