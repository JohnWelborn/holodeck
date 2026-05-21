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
- PG-13 censor — toggle that appends a content restriction instruction to every system prompt

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
- Edit — 🚧 placeholder, no handler
- Delete — 🚧 placeholder, no handler
- Star — 🚧 placeholder, no handler
- Fork — 🚧 placeholder, no handler
- Regenerate — re-calls the LLM with only the transcript up to this message; streams a new variant into the bubble
- Prev / Next generation — navigate between variants; arrows dim at boundaries; counter (e.g. 2/3) hidden until 2+ generations exist

Input:
- Persona chip — shows active speaker; click cycles to next participant
- Textarea — auto-height; Enter sends, Shift+Enter newline, ArrowUp navigates suggestions
- Send button

Modes:
- CYOA — generates clickable suggestion options after each message
- Expand / Wand — expands draft text via LLM, presents result as a suggestion
- Auto — automatically triggers the next character response after each message

Suggestions — clickable buttons that send the option as a message; arrow-key navigable

---

## The Arch (Right Panel)

Environments & Scenarios — add (opens library modal), edit, remove from scene

Participants:
- Add — opens participant modal
- Trigger response (▶) — generates that character's next line via LLM; disabled while generating
- Speak as — sets active user persona; updates chip, input placeholder, and message indicators
- Presence toggle — adds/removes character from scene; logs a system message; filters their context from future prompts
- Remove — confirm dialog; auto-switches persona if the active speaker is deleted
- Add trait — opens trait modal
- Edit — opens full edit form
