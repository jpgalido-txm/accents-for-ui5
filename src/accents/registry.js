/*!
 * Accents for UI5. Copyright 2026 JP Galido. Licensed under the Apache License, Version 2.0.
 *
 * The catalogue: every page pattern and element, in one list. A new element is added here, with its
 * key, name and purpose, before any page uses it. Each module also exports `info` with the controls
 * it uses and how it moves; the gallery reads both.
 */
sap.ui.define([], function () {
	"use strict";

	var GROUPS = [
		{ key: "patterns", title: "Page patterns", icon: "sap-icon://grid" },
		{ key: "planning", title: "Planning", icon: "sap-icon://edit" },
		{ key: "simulation", title: "Simulation", icon: "sap-icon://process" },
		{ key: "forecasting", title: "Forecasting", icon: "sap-icon://line-chart" },
		{ key: "monitoring", title: "Monitoring", icon: "sap-icon://alert" },
		{ key: "review", title: "Review", icon: "sap-icon://bar-chart" },
		{ key: "optimisation", title: "Optimisation", icon: "sap-icon://target-group" },
		{ key: "collaboration", title: "Collaboration", icon: "sap-icon://collaborate" },
		{ key: "transactional", title: "Transactional", icon: "sap-icon://form" },
		{ key: "reporting", title: "Reporting", icon: "sap-icon://table-view" },
		{ key: "workflow", title: "Workflow", icon: "sap-icon://workflow-tasks" },
		{ key: "common", title: "Common", icon: "sap-icon://puzzle" }
	];

	function P(key, file, name, purpose) {
		return { key: key, kind: "pattern", group: "patterns", module: "accents/patterns/" + file, name: name, purpose: purpose };
	}
	function E(group, key, file, name, purpose) {
		return { key: key, kind: "element", group: group, module: "accents/elements/" + group + "/" + file, name: name, purpose: purpose };
	}

	var ENTRIES = [
		P("scoreboard-landing", "ScoreboardLanding", "Scoreboard landing", "The start of a review cycle: a few large scores, each on agreed bands, with a panel explaining what each means and what to do next."),
		P("review-board", "ReviewBoard", "Review board", "One review meeting on one page: filters, a KPI band, bands of single-chart cards, and a call-out pointing to where the fix happens."),
		P("planning-desk", "PlanningDesk", "Planning desk", "Where a plan is changed: a version bar, settings, a chart and a key-figure grid that move together, with simulate, save and discard."),
		P("run-and-rank", "RunAndRank", "Run and rank", "A calculation that takes parameters and returns ranked results: parameters on one side, results on the other after a run."),
		P("exception-triage", "ExceptionTriage", "Exception triage", "Work through rule-based exceptions: types, then items of a type, then one item with its evidence and the way to fix it."),
		P("item-register", "ItemRegister", "Item register", "Find and act on items in a set: saved views, counted filters and a dense table that opens each item."),
		P("lifecycle-object", "LifecycleObject", "Lifecycle object", "One object moving through dated steps: its header, a steps table and a timeline of the same steps."),
		P("cause-map", "CauseMap", "Cause map", "Why one object is held back, drawn as a chain of dependencies with the failing path marked."),
		P("glance-dialog", "GlanceDialog", "Glance dialog", "A quick look at how a set is distributed, without leaving the list."),
		P("editable-object", "EditableObject", "Editable object", "One object shown for reading, switched to editing, kept as a draft, then saved or discarded, with every problem listed."),
		P("create-wizard", "CreateWizard", "Create wizard", "A new object created in a few ordered steps, with a review step before anything is saved."),
		P("quick-entry", "QuickEntry", "Quick entry", "A short form for entering one record quickly, with values suggested and checked as you type."),
		P("analytical-list", "AnalyticalList", "Analytical list", "Key figures, one chart and one table that filter each other, for finding the items behind a number."),
		P("report-page", "ReportPage", "Report page", "A report: filters with saved views, a table or chart of the results, and export and print."),
		P("approval-inbox", "ApprovalInbox", "Approval inbox", "Tasks waiting for a decision, the object each task is about, and the decision itself."),
		P("case-workspace", "CaseWorkspace", "Case workspace", "Everything about one case in one place: its facts, its steps, its comments and its history."),

		E("planning", "headline-figure", "HeadlineFigure", "Headline figure", "One key figure with its base and its change, coloured by whether the change is good or bad."),
		E("planning", "version-bar", "VersionBar", "Version bar", "Says which version the figures belong to, holds the open scenarios, and warns while changes are not simulated or saved."),
		E("planning", "scenario-actions", "ScenarioActions", "Scenario actions", "Simulate, save and discard, with an optional live mode, each enabled only when it would do something."),
		E("planning", "key-figure-grid", "KeyFigureGrid", "Key-figure grid", "Items by key figure by period, with distinct looks for read-only, editable, changed, saved, actual and not-applicable cells."),
		E("planning", "key-figure-toggle", "KeyFigureToggle", "Key-figure toggle", "Shows or hides key figures in the chart and grid together; the last visible one cannot be hidden."),
		E("planning", "workspace-chart", "WorkspaceChart", "Workspace chart", "The chart above the grid: the same figures and periods, base against scenario, selection shared with the grid."),
		E("planning", "range-slider", "RangeSlider", "Range slider", "A continuous setting with typed entry and the safe range marked; warns at once when outside it."),
		E("planning", "mode-choice", "ModeChoice", "Mode choice", "A choice between two to five modes that exclude each other."),
		E("planning", "override-amount", "OverrideAmount", "Override amount", "An on-off override with a precise amount."),
		E("planning", "applied-settings", "AppliedSettings", "Applied settings", "States exactly which settings produced the figures on screen, and warns when the controls no longer match."),

		E("simulation", "parameter-panel", "ParameterPanel", "Parameter panel", "Required and optional parameters with plain-sentence validation and run and reset kept in view."),
		E("simulation", "scenario-delta-table", "ScenarioDeltaTable", "Scenario delta table", "Per item: scenario, base, and the change as a bar centred on zero."),
		E("simulation", "base-vs-scenario", "BaseVsScenario", "Base against scenario", "Paired columns: base solid, scenario in the same colour, hatched."),
		E("simulation", "sensitivity-view", "SensitivityView", "Sensitivity view", "How one outcome moves across one setting, split by another, as a heat map or lines."),

		E("forecasting", "history-uplift-line", "HistoryUpliftLine", "History and uplift", "History and forecast on one time axis, with event uplift as its own series."),
		E("forecasting", "predicted-vs-actual", "PredictedVsActual", "Predicted against actual", "Predicted dashed, actual solid, only for periods that have happened."),
		E("forecasting", "forecast-error-heatmap", "ForecastErrorHeatmap", "Forecast error map", "Items by period, coloured by how far actual was from the forecast in either direction."),
		E("forecasting", "bias-error-bubble", "BiasErrorBubble", "Bias and error", "Items placed by forecast bias and error, sized by volume, against reference lines."),

		E("monitoring", "exception-types", "ExceptionTypes", "Exception types", "Each rule-based exception type with its count, its rule and its severity."),
		E("monitoring", "exception-items", "ExceptionItems", "Exception items", "The items of one exception type, with the figure that broke the rule and a way to hand them on."),
		E("monitoring", "banded-gauge", "BandedGauge", "Banded gauge", "An actual against coloured bands and a target marker."),
		E("monitoring", "next-step-callout", "NextStepCallout", "Next-step call-out", "One sentence saying what needs doing, with one link to the screen where it is done."),

		E("review", "plan-vs-target", "PlanVsTarget", "Plan against target", "Plan bars with the gap to target stacked on, and the target as a marker."),
		E("review", "ranked-bars", "RankedBars", "Ranked bars", "Items sorted by one measure, with the exceptions coloured."),
		E("review", "composition-columns", "CompositionColumns", "Composition columns", "Stacked columns showing what a total is made of."),
		E("review", "share-ring", "ShareRing", "Share ring", "A share of a whole, with small slices merged into a named remainder."),
		E("review", "heatmap-2d", "Heatmap2d", "Two-way heat map", "Where value is made or lost across two dimensions."),
		E("review", "exposure-treemap", "ExposureTreemap", "Exposure treemap", "Size by volume, colour by result, to find what is both large and doing badly."),
		E("review", "waterfall", "Waterfall", "Waterfall", "How a starting amount turns into a result, step by step."),
		E("review", "in-cell-bar", "InCellBar", "In-cell bar", "A small bar inside a table cell."),

		E("optimisation", "run-stats", "RunStats", "Run statistics", "How many options were tried and how many met the target."),
		E("optimisation", "ranked-options", "RankedOptions", "Ranked options", "The options a run found, best first, with their settings and result."),
		E("optimisation", "driver-mix", "DriverMix", "Driver mix", "A compact bar showing how much each lever contributes."),
		E("optimisation", "options-scatter", "OptionsScatter", "Options scatter", "Every option and the starting point on cost against return."),
		E("optimisation", "driver-graph", "DriverGraph", "Driver graph", "Levers linked to outcomes, with the weakest link marked."),

		E("collaboration", "steps-table", "StepsTable", "Steps table", "Steps with owner, period, status and open tasks."),
		E("collaboration", "timeline-calendar", "TimelineCalendar", "Timeline", "Objects as bars on a time axis, grouped, with one today marker."),
		E("collaboration", "object-insight", "ObjectInsight", "Object insight", "The assistant button on an object, and the labelled explanation it produces."),

		E("common", "source-line", "SourceLine", "Source line", "Where the data came from, whether it is live or sample, and when it was read."),
		E("common", "version-context", "VersionContext", "Version context", "A read-only statement of the version above a list or diagnostic page."),
		E("common", "period-range", "PeriodRange", "Period range", "A range of periods, limited to the periods the data has."),
		E("common", "look-ahead", "LookAhead", "Look-ahead", "How many periods forward to consider, with the default stated."),
		E("common", "member-filter", "MemberFilter", "Member filter", "A checklist with an All entry and search when the list is long."),
		E("common", "counted-switch", "CountedSwitch", "Counted switch", "A view switch where each option shows its count."),
		E("common", "empty-state", "EmptyState", "Empty state", "What an absence means, and the action that fills it."),
		E("common", "messages-button", "MessagesButton", "Messages button", "How many messages the screen has, coloured by the most serious, opening the list."),

		E("transactional", "form-section", "FormSection", "Form section", "A group of labelled fields that switches between reading and editing, with required fields and checks."),
		E("transactional", "value-help-field", "ValueHelpField", "Value-help field", "A field that suggests values as you type and opens a searchable list to pick from."),
		E("transactional", "amount-field", "AmountField", "Amount field", "An amount or quantity with its currency or unit, entered and shown in the person's number format."),
		E("transactional", "date-field", "DateField", "Date field", "A date or date range, typed or picked, with limits and relative choices such as \"last month\"."),
		E("transactional", "draft-status", "DraftStatus", "Draft status", "Whether an object is saved, a draft, or being changed by someone else, and when it was last kept."),
		E("transactional", "edit-footer", "EditFooter", "Edit footer", "Save and Cancel kept in view while editing, with the number of problems that stop a save."),
		E("transactional", "confirm-action", "ConfirmAction", "Confirm action", "Asks before anything that deletes, sends or cannot be undone, naming the object and the consequence."),
		E("transactional", "undo-toast", "UndoToast", "Undo message", "A short message after an action, with a way to undo it for a few seconds."),
		E("transactional", "attachment-list", "AttachmentList", "Attachment list", "Files attached to an object: add, open, rename and remove, with type and size limits."),
		E("transactional", "mass-edit", "MassEdit", "Mass edit", "Changes the same fields on several selected items at once, showing what will change first."),
		E("transactional", "change-history", "ChangeHistory", "Change history", "Who changed which field, from what to what, and when."),

		E("reporting", "filter-bar", "FilterBar", "Filter bar", "The filters for a report with saved views, stating which filters are active."),
		E("reporting", "report-table", "ReportTable", "Report table", "A table for reporting: sort, group, totals and subtotals, and a choice of columns."),
		E("reporting", "export-menu", "ExportMenu", "Export", "Downloads what is on screen as a spreadsheet or CSV file, with the filters that produced it."),
		E("reporting", "print-view", "PrintView", "Print view", "A clean, paged version of a report for printing or saving as PDF."),
		E("reporting", "kpi-tag", "KpiTag", "KPI tag", "A small key figure in a page header, coloured by its state, opening its detail."),
		E("reporting", "chart-table-switch", "ChartTableSwitch", "Chart and table", "The same results shown as a chart or as a table, one at a time."),

		E("workflow", "task-inbox", "TaskInbox", "Task inbox", "Tasks waiting for a person, with due date, priority and time overdue."),
		E("workflow", "decision-panel", "DecisionPanel", "Decision panel", "Approve or reject, with a required reason for rejecting and a preview of what the decision changes."),
		E("workflow", "comment-thread", "CommentThread", "Comments", "Comments on an object, newest first, with mentions and replies."),
		E("workflow", "audit-trail", "AuditTrail", "Audit trail", "Every step taken on an object: who, what, when, and the decision's reason."),
		E("workflow", "assignee-picker", "AssigneePicker", "Assignee picker", "Chooses who a task goes to, showing each person's current load."),
		E("workflow", "process-flow", "ProcessFlow", "Process flow", "Where an object is in a process: steps done, current, waiting and blocked."),
		E("workflow", "notification-list", "NotificationList", "Notifications", "Messages sent to a person, grouped, with the action each one needs.")
	];

	return {
		groups: GROUPS,
		entries: ENTRIES,
		get: function (key) { return ENTRIES.find(function (e) { return e.key === key; }); },
		inGroup: function (group) { return ENTRIES.filter(function (e) { return e.group === group; }); }
	};
});
