# Planning applications

Extra rules for screens where people change a plan, compare scenarios or work through exceptions.
They sit on top of [principles.md](principles.md) and [colour-and-motion.md](colour-and-motion.md).

## Versions and scenarios

- There is always one named **base version**, described by what it contains. Everything is compared to it.
- A **scenario** is a named copy of the base with some settings changed. It is always shown beside the
  base, or as the difference from it, never on its own.
- An option found by an optimiser is just another scenario. Opening it for planning re-calculates it
  with every setting that defines it; otherwise its numbers would not match.
- Objects that are finished or in the past open read-only: no simulate, no save, no enabled inputs.
- Actual values appear only for periods that have happened. The data adapter removes any others, once
  (`Data.hideFutureActuals`).

## Simulate, save, discard

| Action | Enabled when | What it says |
|---|---|---|
| Simulate | Settings differ from the last calculation (or it runs by itself in live mode) | While changes are waiting, a warning strip and a marker in the title say so |
| Save | There is something unsaved | Exactly where it was kept, for example "this browser session only; nothing was sent to any system" |
| Discard | There is something unsaved | Asks first only when more than one change would be lost |
| Send to the system | A route exists **and** a person approves | Without a route, it is shown disabled with the reason |

- Every control that changes figures changes them visibly within about a second on sample data.
- A control whose value the data cannot supply is disabled with an explanation, never hidden or faked.

## Density

- Planning screens default to compact density on pointer devices.
- Review screens show a KPI band and at least two charts above the fold on a desktop.
- The planning desk shows a useful block of rows and periods without scrolling on a wide screen.
- A KPI band holds at most four tiles. Further figures become side indicators.
- One filter surface per screen.
- Drilling goes one way, and the way back restores the filters the person left.
- The order of pages in the left panel follows the order in which the work is actually done.

## Alerts and exceptions

- An exception comes from an explicit rule over real figures, and the rule is shown with it.
- Each item shows the object, the rule, the level it was calculated at and the figure that broke the rule.
- Each item has a one-sentence reason and a link to where it can be fixed.
- Severity maps to standard states: money lost is an error, a missed target is a warning, and a model
  working outside its data is information.
- Snooze, assign and playbook features appear only when data supports them. Otherwise they are left out
  and listed as a data gap in the handover.

## Narrow screens

- Three flexible columns become two, then one, with a way back.
- Parameters and results stack below tablet width, with the run action kept in view.
- On a phone, the planning grid shows one item at a time from a picker, with a sentence saying the full
  grid needs a wider screen.

## Missing data

A figure that needs data the product does not have is marked "needs data", with the route that would
supply it. It is never drawn with invented values. Demonstration data is always labelled as sample data
in the source line.
