# The assistant

Every Accents app has an assistant from its first release. It is **off until someone chooses where a
model runs**, and the app works fully without it.

## Two ways in, one conversation

- **The assistant button in the top bar** knows which page the person is on, so a question asked from
  there is always about something.
- **An object button** sits on a thing a person acts on: a worklist row, an alert, a recommendation, an
  option, a case or an object header. It opens the same conversation, already about that object, with a
  starter question filled in. The person still presses Send.

**Where an object button never goes:** charts, KPI figures, legends, column headers, counts, page titles
and decoration. The test: if you cannot say what the button would ask, it does not belong there. Too
many AI buttons become noise, and people stop reading the ones that matter.

## Honest states

| State | What the person sees |
|---|---|
| No model chosen | A screen saying no model is set up, that the page works on its own rules, and a button to open Settings |
| Model chosen but not ready | The one sentence saying what is missing: a key, an address or a model name |
| First use in a visit | What the assistant does and cannot do, where requests go, and that answers can be wrong, with an "I understand" button |
| Answering | "Thinking" until the first words arrive, then the answer appearing as it comes |
| Answered | A label under the answer: which provider and model wrote it, and that it is model output, not a system fact |

## Where the model runs

Settings always offers these choices, and always says in plain words where requests go:

| Choice | Where requests go | Needs |
|---|---|---|
| Off | Nowhere | Nothing |
| This app's AI service | The app's own server. The app registers it with `Providers.usePlatform(transport)` | The app's own setup |
| Anthropic Claude | api.anthropic.com, straight from the browser | The person's key |
| OpenAI | api.openai.com, straight from the browser | The person's key |
| Google Gemini | generativelanguage.googleapis.com, straight from the browser | The person's key |
| Your own model | An address the person enters, on their machine or network, with an OpenAI-compatible interface | An address |

## Keys

- A key someone types is held in memory for that visit only. It is never written to storage, never
  logged, never shown again, and gone when the page closes.
- Settings shows where the key in use comes from (none, typed this visit, or not needed), never the
  key itself.
- A key is only ever sent to its own provider.
- For production, use "This app's AI service" so keys stay on your server and never reach a browser.
- A self-hosted address must have no user name, password, `?` or `#`. Plain http is accepted only for
  this computer (localhost).

## Rules for model output

- It sits on the AI surface: a plum tint that is the same in every theme, so it is never mistaken for
  system data. Override `--acc-ai-ink`, `--acc-ai-edge` and `--acc-ai-tint` to rebrand it.
- Its label appears only once the answer is complete.
- It explains figures; it never replaces them and never sits in a KPI slot.
- Nothing it writes is final, and nothing is sent back to a system without a person acting on it.
- A provider that returns the whole answer at once (Gemini, as used here) is shown at reading pace.
  The words are always the model's; nothing is invented to fill time.
