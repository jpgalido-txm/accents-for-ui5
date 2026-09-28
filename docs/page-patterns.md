# Page patterns

Every screen is one of these sixteen patterns. Choose the pattern before choosing controls. A screen that
seems to need two patterns is two screens; a dialog over a page is not a second pattern.

Each pattern arranges regions you give it; it fetches nothing. Open the gallery entry for a live
example, and read the comment above `compose()` in the pattern's file for its full list of regions.

| Pattern | Use it when | Do not use it when | What `compose()` returns |
|---|---|---|---|
| **Scoreboard landing** | A review cycle starts, and each area comes down to one figure with agreed bands | Bands are not agreed (colour would be invented), or items need comparing | `{ control, update(scores) }` |
| **Review board** | Several questions about one scope are reviewed together | Figures are being changed (use the planning desk) | `{ control }` |
| **Planning desk** | A planner changes values by period and must see the consequences at once | Pure review, or searching many combinations (use run and rank) | `{ control, setModified(n) }` |
| **Run and rank** | A calculation takes parameters and returns ranked options: optimisers, sweeps, prioritising | A single recalculation of one plan | `{ control, showResults(on), setRunning(on) }` |
| **Exception triage** | Exceptions come from written rules and are worked one by one | The list has no rules behind it (use the item register) | a control with `show(level)`, `setTitles()` and `level()` |
| **Item register** | People scan a set, filter it and pick items to act on | A rule defines the items (use exception triage) | a control |
| **Lifecycle object** | One object moves through dated steps: workflows, approvals, cycles | Many objects on one calendar | a control |
| **Cause map** | Why one object is held back is a chain of dependencies | The causes are an unlinked ranking (use ranked bars) | a control |
| **Glance dialog** | Someone needs the shape of a set without leaving a list | Anything the person acts on inside the dialog | `{ button, dialog }`: place the button; the dialog is never placed |
| **Editable object** | One object is read, edited, kept as a draft, then saved or discarded | Many objects changed at once (use mass edit in an item register) | a control |
| **Create wizard** | A new object needs a few ordered steps and a review before it exists | A record that fits one short form (use quick entry) | a control |
| **Quick entry** | One record is entered quickly, again and again | Anything needing a review step | a control |
| **Analytical list** | Someone must find the items behind a number: KPIs, a chart and a table filter each other | A fixed report to share or print (use report page) | a control |
| **Report page** | A report is filtered, saved as a view, exported or printed | Figures are being changed | a control |
| **Approval inbox** | People decide on tasks one after another | A single case with many parts (use case workspace) | a control |
| **Case workspace** | Everything about one case sits in one place: facts, steps, process, comments, history | A queue of many cases (use approval inbox) | a control |

## How each pattern behaves on a narrow screen

| Pattern | Below tablet width |
|---|---|
| Scoreboard landing | Score cards stack; the guide follows them |
| Review board | Filters move into a popover opened by a Filters button |
| Planning desk | The grid shows one item at a time from a picker; the actions bar stays pinned in view |
| Run and rank | Parameters and results become "Step 1" and "Step 2"; the Run bar stays pinned |
| Exception triage | Three columns become two, then one, with Back buttons |
| Item register | Secondary columns drop below each row |
| Lifecycle object | The timeline becomes a dated list |
| Cause map | The factor list comes first; the map opens full screen on demand |
| Glance dialog | The dialog fills the screen |
| Editable object | Sections stack; Save and Cancel stay pinned at the bottom |
| Create wizard | One step at a time, each with its own Next button |
| Quick entry | Fields stack; Save and "Save and new" stay in view |
| Analytical list | KPI tags wrap; the chart comes before the table |
| Report page | Filters open from a button; export and print stay in the toolbar |
| Approval inbox | Inbox, then task, then decision, with Back buttons |
| Case workspace | Sections stack; notifications open in a popover |

## Page frames underneath

Patterns sit inside the shell's main area. Use `Layout.page()` for the title and lead sentence,
`Layout.band()` for each band of cards, and `Layout.card()` for each card. Every card declares both how
many columns and how many rows it spans, so cards in a band end on the same line; the audit checks this.
