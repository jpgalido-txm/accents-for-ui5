# Principles

These twenty rules apply to every screen built with Accents. Most can be checked by looking; the ones
marked **(checked)** are also checked by a script.

## Before you design

1. **Measure the system you are building for.** Read the UI5 version, the libraries it loads, its theme
   and its icon font from the running system. Write down where and when you read each fact. Anything
   you did not measure is labelled as a guess.
2. **Use UI5's own controls.** Use a generated app when a suitable service exists, standard controls
   otherwise, and plain HTML only for something UI5 lacks, with the reason written down. HTML made to
   look like UI5 is not allowed.
3. **Choose the page pattern first.** Every screen is one of the page patterns. A screen that seems to
   need two patterns is two screens.

## Colour

4. **Colour comes from the theme.** App code holds no colour values **(checked)**. Where the theme lacks
   a value, such as a soft status background, Accents derives one from the theme.
5. **Colour the fact, not the container.** Cards and panels never get coloured edges, stripes or tinted
   headers. The colour goes on the word, figure, mark or icon it describes.
6. **Colour the exception, not the series.** In a one-series chart, only the points that need attention
   change colour.
7. **Colour is never the only signal.** Every colour is paired with a sign, an arrow, a word, a dash or
   hatching, so the screen still reads in greyscale.

## Theme and layout

8. **The theme is applied before the first paint.** Nobody ever sees a flash of the wrong theme.
9. **Every app offers a theme choice**: light, dark and two high-contrast themes, plus compact or
   comfortable density. The choice is remembered in the person's browser.
10. **One dominant figure per card.** Each card answers one question and names its source.
11. **No frame inside a frame.** A card has one edge. Sections inside it are divided by a hairline or
    space.
12. **Adaptive, not squeezed.** On narrow screens the shell drops what it cannot show, such as the
    search field or the expanded panel, instead of cramming it. Check at 390, 768, 1024, 1440 and
    1600 pixels wide.

## Words

13. **Labels are short nouns; explanations are sentences.** Titles, tabs, columns, menu entries and
    buttons use one to three words. Sentences go in tooltips, messages, empty states and help. Vague
    labels ("More", "Other", "Insights", "Details") are not allowed.
14. **Counts go in brackets inside the label**, on the same line: "Open (3)". A count of zero stays
    visible.

## Behaviour

15. **Focus rings are for keyboards.** Rings shown after a mouse click are hidden; rings shown after a
    key press never are.
16. **Fix it with the control before fixing it with CSS.** If a control has a setting for it, use the
    setting.
17. **Nothing inert.** A button that does nothing is a defect. A feature without working data is
    either absent or disabled with a reason.
18. **No typed figures.** Every number comes from data or from a written calculation over data. An
    unknown value is shown as unknown.

## Proof

19. **Render and audit before anyone sees it.** Serve over http and read the console. Prove every chart
    drew. Click every path. Check light and dark themes at phone, laptop and wide widths. Confirm the
    theme survives a reload, open every popup, and open the assistant with and without a model.
    `tools/check.mjs` does the mechanical part **(checked)**.
20. **Keep a list of traps.** When UI5 or a library behaves in a surprising way, write down the symptom
    and the fix in [traps.md](traps.md), and re-check the list when versions change.
