# Colour, charts and motion

## Colour meanings

| What | How it is drawn |
|---|---|
| Actual | Solid |
| Plan, prediction, scenario | The same colour as actual, hatched (bars) or dashed (lines) |
| Base against scenario | Bars: base solid, scenario hatched. Lines: the reference dashed, the thing being built solid |
| Target | A marker or a reference line, never an ordinary bar |
| A change | Coloured by whether it is good or bad for that key figure (its polarity), not by its sign |
| A key figure | The same colour in the chart and in the grid label |
| Fixed categories | One colour each, on every screen, registered once with `Tokens.categories({...})` |
| Heat maps | Built from the theme: `diverge` (bad, neutral, good), `error` (both directions are a warning) or `magnitude`. Always with a legend showing the end values |

Numbers align right and text aligns left. Negatives use a true minus sign (−), never brackets or colour
alone. Deltas carry a sign and an arrow.

## One chart per question

Each chart card names its question as a short title, with the unit and source in the subtitle.

| Question | Chart |
|---|---|
| On plan? | Plan against target |
| How has it moved? | Line |
| What is it made of? | Stacked columns |
| Which are worst? | Sorted bars |
| Where are the hot spots? | Heat map |
| What is large and doing badly? | Treemap |
| Three measures per item | Bubble |
| How far from the bands? | Banded gauge |
| What share? | Ring with few slices |
| From gross to net | Waterfall |
| Which lever contributed? | Driver mix bar |

Data labels show only when a series has twelve points or fewer. A chart is selectable only when
selecting it goes somewhere. Every chart has an accessible name.

## Motion

There are two kinds of motion, and nothing else moves.

| Kind | What moves | How long |
|---|---|---|
| Quiet | Cards rise in the first time a page shows; pressable cards lift on hover | 350 to 450 ms; hover about 180 ms |
| Data | Figures count to new values and flash once in the tone of the change; grid cells update left to right; bars grow; ranked results arrive in rank order; a changed count pulses once | Up to about 1.2 seconds in total per action |

- Motion happens only when data really changes, and only on what changed.
- Nothing loops except a busy indicator while a request is pending.
- A new change cancels the one in progress and starts from what is on screen.
- Labels, legends, axes, table headers, navigation, source lines, messages and empty states never move.
- Screen readers get the final value, not the frames in between.
- Reduced motion, from the operating system or `?motion=reduced`, turns all of it off.
- Gradients are used only on the AI surface, never behind data or text.
