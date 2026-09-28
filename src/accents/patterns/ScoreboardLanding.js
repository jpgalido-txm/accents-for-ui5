/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Scoreboard landing: the start of a review cycle. A title with saved views, a grid of a few large
 * scores, and a guide beside them saying what each score means and what to do next. Each score's
 * figure is coloured by the band it falls in, and a banded gauge shows where it sits. A score whose
 * bands have not been agreed is left uncoloured, with no gauge, and its card says so. Pressing a score
 * card opens the screen behind it.
 *
 * Use it as the first screen of a review. Do not use it to change figures; that is the planning desk.
 * The pattern arranges regions only; it fetches nothing.
 */
sap.ui.define([
	"sap/ui/Device",
	"sap/m/VBox",
	"sap/m/HBox",
	"sap/m/FlexBox",
	"sap/m/Title",
	"sap/m/Text",
	"sap/m/Label",
	"sap/m/Select",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"sap/ui/core/Item",
	"accents/core/Layout",
	"accents/core/Format",
	"accents/core/Motion",
	"accents/elements/monitoring/BandedGauge",
	"accents/elements/common/SourceLine",
	"accents/core/I18n"
], function (Device, VBox, HBox, FlexBox, Title, Text, Label, Select, ObjectStatus, FlexItemData, Item, Layout, Format, Motion,
	BandedGauge, SourceLine, I18n) {
	"use strict";

	var t = I18n.use("accents.patterns.i18n.ScoreboardLanding");

	/**
	 * The figure's theme text colour for each band status; colour is paired with the band's name on the
	 * gauge. The accFigure--good/bad/warn classes lose to ".sapMText.accFigure" on specificity, so the
	 * theme variable is set on the figure's own node instead.
	 */
	var FIGURE_COLOUR = { good: "var(--sapPositiveTextColor)", bad: "var(--sapNegativeTextColor)", critical: "var(--sapCriticalTextColor)" };
	var NO_BANDS = t("scoreboardLanding.noBands");

	function bandOf(bands, v) {
		for (var i = 0; i < bands.length; i++) { if (v <= bands[i].to) { return bands[i]; } }
		return bands[bands.length - 1];
	}
	function hasBands(d) { return !!(d && d.bands && d.bands.length); }

	/** One score card: a large figure, then its gauge or the sentence saying bands are not agreed. */
	function scoreCard(s) {
		var fmt = s.format || function (v) { return Format.number(v); };
		var figure = new Text({ text: "" }).addStyleClass("accFigure");
		var noBands = new ObjectStatus({ text: t("scoreboardLanding.noBandsShort"), icon: "sap-icon://hint", state: "None", visible: false });
		var noBandsText = new Text({ text: NO_BANDS, visible: false }).addStyleClass("accLabel sapUiTinyMarginTop");
		var gauge = null;
		var holder = new VBox({ renderType: "Bare" });
		var current = null;

		var colour = "";
		function paint() {
			var el = figure.getDomRef();
			if (el) { el.style.color = colour; }
		}
		figure.addEventDelegate({ onAfterRendering: function () {
			if (current) { figure.getDomRef().textContent = fmt(current.actual); }
			paint();
		} });

		function apply(d) {
			var prev = current;
			current = d;
			var banded = hasBands(d);
			var band = banded && d.actual !== null && d.actual !== undefined ? bandOf(d.bands, d.actual) : null;
			colour = band ? FIGURE_COLOUR[band.status] || "" : "";
			paint();
			figure.setTooltip(band ? t("scoreboardLanding.figureTooltip", band.name, fmt(d.actual)) : fmt(d.actual));
			figure.setProperty("text", fmt(d.actual), true);
			var el = figure.getDomRef();
			if (el && prev && typeof prev.actual === "number" && prev.actual !== d.actual) {
				Motion.countTo(el, prev.actual, d.actual, fmt, 600);
				Motion.flash(el, Format.tone(d.actual - prev.actual, s.polarity || "up"));
			} else if (el) {
				el.textContent = fmt(d.actual);
			}
			noBands.setVisible(!banded);
			noBandsText.setVisible(!banded);
			if (banded) {
				if (!gauge) {
					gauge = BandedGauge.create({ label: s.label, format: fmt, axisFormat: s.axisFormat, height: "6rem", data: d });
					holder.addItem(gauge.root);
				} else {
					gauge.update(d);
				}
				gauge.root.setVisible(true);
			} else if (gauge) {
				gauge.root.setVisible(false);
			}
		}

		var content = new VBox({ renderType: "Bare", items: [
			new HBox({ renderType: "Bare", alignItems: "Baseline", wrap: "Wrap", items: [figure.addStyleClass("sapUiSmallMarginEnd"), noBands] }),
			noBandsText,
			holder
		] });
		// The whole card body drills, not only its header; the header carries the keyboard press.
		if (s.press) {
			content.attachBrowserEvent("click", function () { s.press(); });
			content.addStyleClass("sapUiCursorPointer");
		}
		var cardSettings = { title: s.label, subtitle: s.subtitle, content: content, cols: 8, rows: 3 };
		if (s.press) { cardSettings.press = s.press; }
		var card = Layout.card(cardSettings);
		if (s.press) { card.setTooltip(s.pressText || t("scoreboardLanding.pressText", s.label)); }
		apply(s.data);
		return { card: card, update: apply };
	}

	/** One guide entry: the score's name, what it means, and the next step. */
	function guideEntry(s) {
		var meaning = new Text({ text: s.meaning || "" });
		var next = new Text({ text: "" }).addStyleClass("sapUiTinyMarginTop");
		var box = new VBox({ renderType: "Bare", items: [
			new Title({ text: s.label, level: "H3", titleStyle: "H6", wrapping: true }), meaning, next
		] }).addStyleClass("sapUiSmallMarginBottom");
		function apply(x) {
			meaning.setText(x.meaning || "");
			next.setText(x.next ? t("scoreboardLanding.nextStep", x.next) : "");
			next.setVisible(!!x.next);
		}
		apply(s);
		return { box: box, update: apply };
	}

	/**
	 * regions:
	 *   title, lead  page heading and one sentence
	 *   views        optional saved views: { label, items: [{ key, text }], selected, onChange(key) }
	 *   scores       two to six scores: [{ key, label, subtitle, format, axisFormat, polarity,
	 *                  data: { actual, target, min, bands },   bands null or [] when not agreed
	 *                  meaning, next,                          sentences for the guide
	 *                  press, pressText }]                     the drill behind the card
	 *   guideTitle   heading of the guide (default "Score guide (n)")
	 *   source       the source line control
	 *
	 * Returns { control, update(scores) }. update() takes the same scores, by key, with new data,
	 * meaning and next step; figures count to their new values and gauges move.
	 */
	function compose(r) {
		var scores = r.scores || [];
		if (scores.length > 6) { throw new Error("A scoreboard holds at most six scores. Put the rest on a review board."); }
		var cards = {}, guide = {};
		var cardList = scores.map(function (s) { cards[s.key] = scoreCard(s); return cards[s.key].card; });
		var guideItems = scores.map(function (s) { guide[s.key] = guideEntry(s); return guide[s.key].box; });

		var grid = Layout.band({ cards: cardList });
		grid.setLayoutData(new FlexItemData({ growFactor: 1, minWidth: "0" }));
		var guideCard = Layout.card({ title: r.guideTitle || t("scoreboardLanding.guideTitle", scores.length),
			subtitle: t("scoreboardLanding.guideSubtitle"),
			content: new VBox({ renderType: "Bare", items: guideItems }).addStyleClass("sapUiSmallMargin") });
		var guideBox = new VBox({ renderType: "Bare", items: [guideCard],
			layoutData: new FlexItemData({ shrinkFactor: 0 }) });
		var body = new FlexBox({ renderType: "Bare", alignItems: "Start", items: [grid, guideBox] });

		// Wide: the guide sits beside the scores. Below desktop width there is no room for both, so the
		// guide moves under the scores.
		function adapt() {
			var narrow = Layout.narrower("desktop");
			body.setDirection(narrow ? "Column" : "Row");
			body.setAlignItems(narrow ? "Stretch" : "Start");
			guideBox.setWidth(narrow ? "100%" : "22rem");
			guideBox.toggleStyleClass("sapUiSmallMarginBegin", !narrow);
			guideBox.toggleStyleClass("sapUiSmallMarginTop", narrow);
		}
		adapt();
		Device.resize.attachHandler(adapt);

		var headItems = [new Title({ text: r.title, level: "H1", titleStyle: "H3", wrapping: true }).addStyleClass("sapUiSmallMarginEnd")];
		if (r.views) {
			var select = new Select({ selectedKey: r.views.selected, width: "14rem",
				items: r.views.items.map(function (v) { return new Item({ key: v.key, text: v.text }); }) });
			if (r.views.onChange) { select.attachChange(function (e) { r.views.onChange(e.getParameter("selectedItem").getKey()); }); }
			var viewLabel = new Label({ text: r.views.label || t("scoreboardLanding.view"), labelFor: select, showColon: true }).addStyleClass("sapUiTinyMarginEnd");
			headItems.push(new HBox({ renderType: "Bare", alignItems: "Center", items: [viewLabel, select] }));
		}
		var head = new FlexBox({ renderType: "Bare", justifyContent: "SpaceBetween", alignItems: "Center", wrap: "Wrap", items: headItems });

		var items = [head];
		if (r.lead) { items.push(new Text({ text: r.lead }).addStyleClass("accPageLead")); }
		items.push(body);
		if (r.source) { items.push(r.source); }
		var control = new VBox({ renderType: "Bare", items: items });
		var destroy = control.destroy;
		control.destroy = function () { Device.resize.detachHandler(adapt); return destroy.apply(this, arguments); };

		return {
			control: control,
			update: function (list) {
				list.forEach(function (s) {
					if (cards[s.key]) { cards[s.key].update(s.data); }
					if (guide[s.key]) { guide[s.key].update(s); }
				});
			}
		};
	}

	return {
		info: {
			controls: ["sap.f.GridContainer", "sap.f.Card", "sap.m.Select", "sap.m.Text", "banded-gauge"],
			motion: "Cards rise in once, the first time the page shows. Each figure counts to its new value and its gauge moves when the view or the data changes.",
			still: false
		},
		compose: compose,

		example: function (Data, ctx) {
			var pct = function (v) { return t("scoreboardLanding.demo.percent", Format.number(v, 1)); };
			var axisPct = function (v) { return t("scoreboardLanding.demo.percent", Format.number(v)); };
			var GROUPS = [{ key: "all", text: t("scoreboardLanding.demo.all"), group: null }, { key: "bev", text: t("scoreboardLanding.demo.beverages"), group: "Beverages" },
				{ key: "fresh", text: t("scoreboardLanding.demo.fresh"), group: "Fresh" }, { key: "pantry", text: t("scoreboardLanding.demo.pantry"), group: "Pantry" }];
			var view = "all", seed = 7;

			function scope(sd, key) {
				var g = GROUPS.find(function (x) { return x.key === key; }).group;
				return Data.sample(sd).items.filter(function (i) { return !g || i.group === g; });
			}
			function sum(items, k) { return items.reduce(function (a, i) { return a + i[k]; }, 0); }

			/**
			 * Four scores, each calculated from the sample items in the view:
			 *  - Sales against plan: actual ÷ plan, year to date. Target: the sample target ÷ plan.
			 *  - Growth on last year: actual ÷ last year − 1.
			 *  - Margin: revenue-weighted average margin.
			 *  - Months on plan: past category-months with actual at or above plan, as a share.
			 * The bands are the ones agreed for this sample review; months on plan has none agreed yet.
			 */
			function scores(sd, key) {
				var items = scope(sd, key);
				var plan = sum(items, "plan"), actual = sum(items, "actual");
				var sales = Data.round(actual / plan * 100, 1);
				var growth = Data.round((actual / sum(items, "prior") - 1) * 100, 1);
				var margin = Data.round(items.reduce(function (a, i) { return a + i.actual * i.margin; }, 0) / actual * 100, 1);
				var past = [], onPlan = 0;
				items.forEach(function (i) { i.months.forEach(function (m) { if (m.actual !== null) { past.push(m); if (m.actual >= m.plan) { onPlan += 1; } } }); });
				var months = past.length ? Data.round(onPlan / past.length * 100, 1) : null;

				function next(band, words) { return words[band.status]; }
				var salesBands = [{ to: 95, status: "bad", name: t("scoreboardLanding.demo.bandPoor") }, { to: 100, status: "critical", name: t("scoreboardLanding.demo.bandWatch") }, { to: 110, status: "good", name: t("scoreboardLanding.demo.bandGood") }];
				var growthBands = [{ to: 0, status: "bad", name: t("scoreboardLanding.demo.bandDown") }, { to: 3, status: "critical", name: t("scoreboardLanding.demo.bandSlow") }, { to: 15, status: "good", name: t("scoreboardLanding.demo.bandGrowing") }];
				var marginBands = [{ to: 10, status: "bad", name: t("scoreboardLanding.demo.bandThin") }, { to: 20, status: "critical", name: t("scoreboardLanding.demo.bandWatch") }, { to: 40, status: "good", name: t("scoreboardLanding.demo.bandHealthy") }];
				return [
					{ key: "sales", label: t("scoreboardLanding.demo.salesLabel"), subtitle: t("scoreboardLanding.demo.salesSubtitle"), format: pct, axisFormat: axisPct, polarity: "up",
						data: { actual: sales, target: Data.round(sum(items, "target") / plan * 100, 1), min: 80, bands: salesBands },
						meaning: t("scoreboardLanding.demo.salesMeaning"),
						next: next(bandOf(salesBands, sales), { bad: t("scoreboardLanding.demo.salesBad"),
							critical: t("scoreboardLanding.demo.salesCritical"),
							good: t("scoreboardLanding.demo.salesGood") }),
						press: function () { ctx.go("plan-vs-target"); }, pressText: t("scoreboardLanding.demo.salesPress") },
					{ key: "growth", label: t("scoreboardLanding.demo.growthLabel"), subtitle: t("scoreboardLanding.demo.growthSubtitle"), format: function (v) { return Format.delta(v / 100, "percent", 1); },
						axisFormat: axisPct, polarity: "up",
						data: { actual: growth, target: null, min: -10, bands: growthBands },
						meaning: t("scoreboardLanding.demo.growthMeaning"),
						next: next(bandOf(growthBands, growth), { bad: t("scoreboardLanding.demo.growthBad"),
							critical: t("scoreboardLanding.demo.growthCritical"),
							good: t("scoreboardLanding.demo.growthGood") }),
						press: function () { ctx.go("ranked-bars"); }, pressText: t("scoreboardLanding.demo.growthPress") },
					{ key: "margin", label: t("scoreboardLanding.demo.marginLabel"), subtitle: t("scoreboardLanding.demo.marginSubtitle"), format: pct, axisFormat: axisPct, polarity: "up",
						data: { actual: margin, target: null, min: 0, bands: marginBands },
						meaning: t("scoreboardLanding.demo.marginMeaning"),
						next: next(bandOf(marginBands, margin), { bad: t("scoreboardLanding.demo.marginBad"),
							critical: t("scoreboardLanding.demo.marginCritical"),
							good: t("scoreboardLanding.demo.marginGood") }),
						press: function () { ctx.go("exposure-treemap"); }, pressText: t("scoreboardLanding.demo.marginPress") },
					{ key: "months", label: t("scoreboardLanding.demo.monthsLabel"), subtitle: t("scoreboardLanding.demo.monthsSubtitle"), format: pct, polarity: "up",
						data: { actual: months, target: null, min: 0, bands: null },
						meaning: t("scoreboardLanding.demo.monthsMeaning"),
						next: t("scoreboardLanding.demo.monthsNext"),
						press: function () { ctx.go("review-board"); }, pressText: t("scoreboardLanding.demo.monthsPress") }
				];
			}

			var board = compose({
				title: t("scoreboardLanding.demo.title"),
				lead: t("scoreboardLanding.demo.lead"),
				views: { label: t("scoreboardLanding.view"), selected: view,
					items: GROUPS.map(function (g) { return { key: g.key, text: t("scoreboardLanding.demo.viewCount", g.text, scope(seed, g.key).length) }; }),
					onChange: function (key) { view = key; board.update(scores(seed, view)); } },
				scores: scores(seed, view),
				source: SourceLine.create({ data: Data.sampleMeta() }).root
			});
			return {
				control: board.control,
				next: function (sd) { return function () { seed = sd; board.update(scores(seed, view)); }; }
			};
		}
	};
});
