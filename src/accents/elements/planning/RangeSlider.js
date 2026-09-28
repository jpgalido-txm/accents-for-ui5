/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * Range slider: one continuous setting, such as a price change, that the model trusts only inside a
 * safe range. It has tick marks, a field for typing an exact value, and the safe range marked under
 * the track and stated in words. Moving outside the safe range shows a warning at once, while
 * dragging; the figures are recomputed only when the handle is released or a value is typed, never
 * for every pixel of a drag.
 */
sap.ui.define([
	"sap/m/VBox",
	"sap/m/Label",
	"sap/m/Text",
	"sap/m/Slider",
	"sap/m/StepInput",
	"sap/m/ResponsiveScale",
	"sap/m/ObjectStatus",
	"sap/m/FlexItemData",
	"sap/m/FlexBox",
	"accents/core/Part",
	"accents/core/Format",
	"accents/core/Tokens",
	"accents/core/I18n"
], function (VBox, Label, Text, Slider, StepInput, ResponsiveScale, ObjectStatus, FlexItemData, FlexBox, Part, Format, Tokens, I18n) {
	"use strict";

	var t = I18n.use("accents.elements.planning.i18n.i18n");

	return {
		info: {
			controls: ["sap.m.Slider", "sap.m.StepInput", "sap.m.ObjectStatus"],
			motion: "None. The handle follows the pointer; the warning appears at once and never animates.",
			still: true
		},

		/**
		 * options:
		 *   label    short noun ("Price change")
		 *   unit     unit after the value ("%")
		 *   min, max, step, digits   the slider's limits, step and decimals
		 *   safe     { min, max }  the range the model was built for; outside it results are less reliable
		 *   data     { value }
		 *   onChange(value)   called on release or typed entry: recompute here
		 */
		create: function (o) {
			var digits = o.digits || 0;
			var unit = o.unit || "";
			var safe = o.safe || { min: o.min, max: o.max };
			function show(v) { return Format.number(v, digits) + (unit ? (unit === "%" ? "" : " ") + unit : ""); }

			var label = new Label({ text: o.label, showColon: false });
			// The end labels use the same number format as every other figure (a true minus sign).
			var scale = new ResponsiveScale({ tickmarksBetweenLabels: 0 });
			scale.getLabel = function (v) { return Format.number(v, digits); };
			var slider = new Slider({ min: o.min, max: o.max, step: o.step || 1, enableTickmarks: true, width: "100%",
				showAdvancedTooltip: false, inputsAsTooltips: false, scale: scale });
			// The scale labels hang below the track; keep what follows clear of them.
			slider.addStyleClass("sapUiMediumMarginBottom");
			// The slider takes the free width; on a phone the field wraps under it rather than squeezing it.
			slider.setLayoutData(new FlexItemData({ growFactor: 1, baseSize: "12rem", minWidth: "0" }));
			var field = new StepInput({ min: o.min, max: o.max, step: o.step || 1, displayValuePrecision: digits, width: unit ? "9.5rem" : "8rem",
				description: unit, fieldWidth: unit ? "80%" : "100%", textAlign: "End" });
			field.addStyleClass("sapUiSmallMarginEnd");
			label.setLabelFor(field);
			slider.addAriaLabelledBy(label);
			var range = new Text({ text: t("rangeSlider.safeRange", show(safe.min), show(safe.max)) }).addStyleClass("accLabel");
			var warn = new ObjectStatus({ state: "Warning", icon: "sap-icon://alert", visible: false,
				text: t("rangeSlider.outside") });

			function outside(v) { return v < safe.min || v > safe.max; }
			function flag(v) {
				var out = outside(v);
				warn.setVisible(out);
				field.setValueState(out ? "Warning" : "None");
				field.setValueStateText(out ? t("rangeSlider.outsideField", show(safe.min), show(safe.max)) : "");
			}

			slider.attachLiveChange(function (e) {
				var v = e.getParameter("value");
				field.setValue(v);
				flag(v);
			});
			slider.attachChange(function (e) {
				var v = e.getParameter("value");
				field.setValue(v);
				flag(v);
				if (o.onChange) { o.onChange(v); }
			});
			field.attachChange(function (e) {
				var v = e.getParameter("value");
				if (typeof v !== "number" || isNaN(v)) { return; }
				slider.setValue(v);
				flag(v);
				if (o.onChange) { o.onChange(v); }
			});

			/*
			 * The safe range drawn under the track. sap.m.Slider has no way to mark part of its range, so a
			 * thin bar is placed in the slider's track after each render. Its colour comes from the theme.
			 */
			function markSafe() {
				var el = slider.getDomRef();
				var inner = el && el.querySelector(".sapMSliderInner");
				if (!inner) { return; }
				var bar = inner.querySelector(".accSafeBand");
				if (!bar) {
					bar = document.createElement("div");
					bar.className = "accSafeBand";
					bar.setAttribute("aria-hidden", "true");
					inner.appendChild(bar);
				}
				var span = (o.max - o.min) || 1;
				var from = Math.max(0, (safe.min - o.min) / span) * 100;
				var to = Math.min(1, (safe.max - o.min) / span) * 100;
				var s = bar.style;
				s.position = "absolute";
				s.left = from + "%";
				s.width = Math.max(0, to - from) + "%";
				s.top = "calc(100% + 0.25rem)";
				s.height = "0.25rem";
				s.borderRadius = "0.125rem";
				s.pointerEvents = "none";
				s.backgroundColor = Tokens.status("good");
			}
			slider.addEventDelegate({ onAfterRendering: markSafe });
			var stopTheme = Tokens.onChange(markSafe);

			var content = new VBox({ renderType: "Bare", items: [
				label,
				new FlexBox({ renderType: "Bare", alignItems: "Center", wrap: "Wrap", items: [slider, field] }),
				range,
				warn.addStyleClass("sapUiTinyMarginTop")
			] });
			var destroy = content.destroy;
			content.destroy = function () { stopTheme(); return destroy.apply(this, arguments); };

			var part = Part.make({
				key: "range-slider",
				content: content,
				empty: t("rangeSlider.empty"),
				render: function (d) {
					slider.setValue(d.value);
					field.setValue(d.value);
					flag(d.value);
				}
			});
			if (o.data) { part.update(o.data); }
			return part;
		},

		example: function (Data) {
			function make(seed) {
				var r = Data.rng(seed);
				return { value: Math.round(-10 + r() * 30) };
			}
			return {
				options: { label: t("rangeSlider.demo.label"), unit: "%", min: -20, max: 20, step: 1, safe: { min: -5, max: 10 },
					data: { value: 12 }, onChange: function () {} },
				next: function (seed) { return make(seed); }
			};
		}
	};
});
