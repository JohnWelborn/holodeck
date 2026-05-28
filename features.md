# Holodeck Features

## Project Files

- holodeck.html — page structure, static markup for panels, modals, and input area
- holodeck.js — all application logic: state, rendering, API calls, event handling (~2200 lines)
- holodeck-data.js — data definitions: default program, library of environments/scenarios/participants/traits, programsStore
- holodeck.css — styles and animations
- launch.py — local dev server launcher
- config.example.yaml — template for API configuration (base URL, model, token)
- mistral-v7-tekken-roleplay-guide.v3.md — prompt engineering reference for the default model
- assets/tabler-icons/ — icon font used throughout the UI

---

## Configuration

- API base URL — live input, defaults to `http://localhost:1337/v1`
- Model name — live input
- API token — password field, live input
- Test Connection — fires a real request and reports success/failure in the status bar
- Export to file — downloads a JSON snapshot of all programs, library, and settings (token excluded)
- Import from file — restores from an exported file; keeps current API token, then reloads
- Reset to defaults — clears all saved data and reloads with defaults; API settings are preserved

---

## Programs Panel

- New Program — opens a dialog to choose manual or AI-generated creation
  - Manual — creates an empty program immediately
  - AI-generated — opens the AI Brief form; streams an LLM response that populates a full program (participants, environments, scenarios) from a premise, optional setting/genre, tone chips, character sketches, and inspirations
- New Folder — creates a folder and enters inline rename mode
- Select program — loads the full program state into the scene
- Folder expand/collapse
- Inline rename — double-click; confirmed on Enter or blur, cancelled on Escape
- Delete folder — confirm dialog; only available on empty folders
- Delete program — confirm dialog
- New program inside folder
- New subfolder
- Drag & drop reorder — before/after/into drop targets with circular-nesting prevention

---

## Modals

Environments & Scenarios — shared library/form pattern:
- Library view with add-to-scene and edit actions
- Create new or edit existing (name + description)
- Remove from current scene

Participants:
- Create/edit form — name, role, personality, speech, knowledge, perspectives on other participants
- Avatar color palette — preset swatches
- Optional photo URL — falls back to initials if image fails

Traits:
- Library with add-to-participant action
- Create/edit form — name + description
- Remove from participant (chip X in right panel)

Confirm dialog — used for all destructive actions

---

## Message Area

Message row actions (appear on hover):
- Edit — opens an inline textarea pre-filled with the current text; saving pushes a new generation (same as Regenerate), Escape or Cancel closes without changes, Ctrl+Enter saves
- Delete — removes the current generation; if others remain, switches to the previous one; if it was the only generation, removes the message entirely
- Star — 🚧 placeholder, no handler
- Fork — creates a new copy of the current program in the tree immediately below the original, keeping only messages up to and including the clicked one (all generation variants and current selection preserved). New program is named with a ` #N` suffix (e.g. "My Scene #1"), auto-incrementing to avoid collisions. Switches to the fork immediately.
- Regenerate — re-calls the LLM with only the transcript up to this message; streams a new variant into the bubble
- Prev / Next generation — navigate between variants; arrows dim at boundaries; counter (e.g. 2/3) hidden until 2+ generations exist

Input:
- Persona chip — shows active speaker; click cycles to next participant
- Textarea — auto-height; Enter sends, Shift+Enter newline, ArrowUp navigates suggestions
- Send button

Modes:
- CYOA — generates clickable suggestion options after each message
- Expand / Wand — expands draft text via LLM, presents result as a suggestion
- Auto — bolt button opens a popup to select one of three auto-play modes:
  - Manual Trigger — no automation; characters only respond when manually triggered via ▶
  - AI Choice — after each user message, an LLM call picks which AI participant speaks next and triggers them
  - Everyone Gets Turn — after each user message, all present non-user participants speak in order of the participants list
- Reply length — text-size button opens a popup to select one of five response length levels; each sets both a system-prompt instruction and the `max_tokens` cap for the next LLM call:
  - One sentence (50 tokens)
  - A few sentences (100 tokens)
  - Short paragraph (175 tokens)
  - Full paragraph (300 tokens)
  - Full response (450 tokens) — default; aims to fill the screen

Suggestions — clickable buttons that send the option as a message; arrow-key navigable

---

## The Arch (Right Panel)

Direction — collapsible section (default collapsed) with three clickable cards, each opening a modal for editing:
- **System prompt** (`systemPromptBase`) — the full character system prompt template. Use `{name}` where the character's display name should be inserted. Defaults to the standard 4-line author/character framing.
- **Closing instruction** (`closingInstruction`) — the final line of the user turn telling the LLM what to write. Use `{name}` for the character's name. Defaults to "Write {name}'s next response. Narrative prose — action and dialogue. Stop when their contribution is complete."
- **Content policy** (`contentPolicy`) — appended to the system prompt on every character turn. Defaults to a PG-13 restriction. Leave empty to disable. The edit pencil icon is hidden when `apiSettings.censor` is `true` (the default), preventing modification. Set `censor: false` in `config.yaml` to allow editing.

All three are saved per-program.

Environments & Scenarios — add (opens library modal), edit, remove from scene

Participants:
- Add — opens participant modal
- Trigger response (▶) — generates that character's next line via LLM; disabled while generating
- Speak as — sets active user persona; updates chip, input placeholder, and message indicators
- Presence toggle — adds/removes character from scene; logs a system message; filters their context from future prompts
- Remove — confirm dialog; auto-switches persona if the active speaker is deleted
- Add trait — opens trait modal
- Edit — opens full edit form
