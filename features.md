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

- API endpoints — a dropdown next to the gear icon shows the active endpoint's name and lists all configured endpoints; each entry has a pencil (edit) and, when more than one endpoint exists, a trash (delete) icon, plus a "+ Add endpoint" row
- Adding/editing an endpoint opens a modal with Name, Base URL, Model, API Token (password field), and Max tokens (number, defaults to 1500, used as the `max_tokens` cap on all LLM calls for that endpoint)
- Test Connection — inside the endpoint modal; fires a real request using the form's current values and reports success/failure below the button
- Selecting an endpoint from the dropdown makes it active immediately for all LLM calls
- Settings (gear icon) — Export to file, Import from file, Reset to defaults, and a status line for general API errors
- Export to file — downloads a JSON snapshot of all programs, library, and endpoints (tokens excluded)
- Import from file — restores from an exported file; preserves existing tokens for endpoints with matching IDs, then reloads
- Reset to defaults — clears all saved data and reloads with defaults; API endpoints are preserved
- `?session=name` query parameter — namespaces the localStorage key to `holodeck_v1_name`, giving that URL an independent data store; omitting the parameter uses the default `holodeck_v1` key as before

---

## Left Panel

The left panel is split into two independently collapsible sections: Programs and Characters. Clicking a section's header (chevron + label) collapses/expands its tree, the same way a folder collapses its children.

### Programs Section

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

### Characters Section

UI for organizing reusable, program-independent characters into folders, backed by `characterLibrary`. Ships with 16 ready-made characters harvested from the default programs (Dr. Vasquez, Cmdr. Reyes, Kira, Lt. Torres, Prof. Aldric, Captain Osei, Ambassador Sael, Maren, Povik, Karathos, Syrath, Priya, Rahul, John, Stew, Cleverly), each with full personality/speech/knowledge/traits data. Also includes **The Narrator** — a special non-character persona (id: `narrator`) that produces omniscient third-person prose narration when triggered, rather than in-character dialogue. Intended for tabletop/GM-style scene-setting and plot events. Not pre-loaded into any programs; added to a program manually like any other library character.

- New Character — creates a character entry (default fields, next unused avatar color) and enters inline rename mode
- New Folder — creates a folder and enters inline rename mode
- Folder expand/collapse
- Inline rename — double-click; confirmed on Enter or blur, cancelled on Escape; syncs the character's display name and initials, and live-updates the editor if that character is currently open
- Delete folder — confirm dialog; only available on empty folders
- Delete character — confirm dialog; removes the entry from `characterLibrary` and closes the editor if it was the active character
- New character inside folder
- New subfolder
- Drag & drop reorder — before/after/into drop targets with circular-nesting prevention
- Import character card — accepts PNG files with embedded V2 (or V1) chara metadata (same parser as the participant import); creates a new character entry named after the card, with personality, speech, photo, and traits populated directly in `characterLibrary`
- Click a character — replaces the center panel (chat transcript + message input) with an edit form for that character, using the same fields as the participant edit form (display name, full name, role, avatar color, photo, personality, private personality, speech patterns, knowledge), plus a "Perspectives on Other Characters" section. The clicked character is highlighted in the tree. Save writes changes back to `characterLibrary` and updates the tree label. Selecting a program in PROGRAMS restores the normal chat view.
- Perspectives on Other Characters — pick any other library character from a "+ Add perspective on…" dropdown and write how this character views them, from their own point of view. Stored on the library character keyed by the other character's library id. Each entry can be removed with its × button. The default characters (c1-c16) come pre-populated with perspectives mirroring the ones already written for them in their source programs.
- Add to current program (square-plus icon) — deep-copies the character into the active program's participants with a fresh id, presence enabled, and empty program-specific perspectives. The character's library-level "Perspectives on Other Characters" are copied along as default perspectives, tagged with the source library id. The copy is fully independent: editing it in the Arch does not affect `characterLibrary`, and later edits to the library character do not retroactively change copies already added to programs.

---

## Modals

Environments & Scenarios — shared library/form pattern:
- Library view with add-to-scene, edit, and delete-from-library actions
- Create new or edit existing (name + description)
- Remove from current scene
- Delete from library — confirm dialog; programs that already added the item keep their copy

Participants:
- Create/edit form — name, role, personality, speech, knowledge, private personality (optional), perspectives on other participants
- Perspective textareas show the character's library-level default perspective (if any, based on the other participant's source library character) as placeholder text when no per-program override has been written; a written override takes precedence
- Private fields (knowledge, private personality, perspectives) are only included in that participant's own LLM prompts — not visible to other participants' AI
- A character's perspective on another participant is only sent to the LLM if that other character is actually present in the program (resolved at prompt-build time, not at copy time)
- Avatar color palette — preset swatches
- Optional photo URL — falls back to initials if image fails
- Import character card — "+ Import character card" button and drag-and-drop zone in the library tab; accepts PNG files with embedded V2 (or V1) chara metadata; pre-fills the participant form with name, personality (description + personality fields concatenated), speech (from mes_example), photo (PNG converted to data: URL), and traits (from tags); role must be filled in manually before saving; fields with no Holodeck equivalent (scenario, system_prompt, post_history_instructions, first_mes, alternate_greetings, character_book, creator, creator_notes, character_version) are silently skipped

Traits:
- Library with add-to-participant, edit, and delete-from-library actions
- Create/edit form — name + description
- Remove from participant (chip X in right panel)
- Delete from library — confirm dialog; participants that already have the trait keep their copy

Confirm dialog — used for all destructive actions

---

## Message Area

Message row actions (appear on hover):
- Edit — opens an inline textarea pre-filled with the current text; saving pushes a new generation (same as Regenerate), Escape or Cancel closes without changes, Ctrl+Enter saves
- Delete — removes the current generation; if others remain, switches to the previous one; if it was the only generation, removes the message entirely
- Fork — creates a new copy of the current program in the tree immediately below the original, keeping only messages up to and including the clicked one (all generation variants and current selection preserved). New program is named with a ` #N` suffix (e.g. "My Scene #1"), auto-incrementing to avoid collisions. Switches to the fork immediately.
- Regenerate — re-calls the LLM with only the transcript up to this message; streams a new variant into the bubble
- Prev / Next generation — navigate between variants; arrows dim at boundaries; counter (e.g. 2/3) hidden until 2+ generations exist

Input:
- Persona chip — shows active speaker; click cycles to next participant; when the active program has no participants (or no persona selected), the chip clears and the input placeholder resets to "Type a message..."
- Textarea — auto-height; Enter sends, Shift+Enter newline, ArrowUp navigates suggestions
- Send button
- Collapse toggle — a ⌄/⌃ button after Send collapses or expands the row above the textarea containing the persona chip and all four mode buttons; when collapsed, Send also hides (use Enter to send); starts expanded
- Layout: left side of the extra-buttons row holds persona chip, CYOA, Expand, and Describe; right side (pushed by flex spacer) holds Reply Length and Auto-reply mode

Modes:
- Choose your own adventure — makes 3 parallel full LLM calls (using the same prompt as "Trigger to respond") and presents the 3 complete responses as clickable choices; clicking one sends it as the user persona's message; quoted text in suggestions is colorized with the same `.dialogue` styling used in the conversation frame
- Expand / Wand — expands draft text via LLM, presents result as a suggestion
- Describe / Eye — opens a dialog pre-filled with "Describe the scene from {active persona}'s point of view"; user can edit before sending; prompts the LLM with the full scene context and the instruction; response appears as a special "Scene" message (eye icon, italic text, no character) stored in the transcript as `type:'description'`; included in future character prompts as `[Scene]: <text>` in the transcript section; supports regen/edit/delete like regular messages
- Auto — bolt button opens a popup to select one of three auto-play modes:
  - Manual Trigger — no automation; characters only respond when manually triggered via ▶
  - AI Choice — after each user message, an LLM call picks which AI participant speaks next and triggers them
  - Everyone Gets Turn — after each user message, all present non-user participants speak in order of the participants list
- Reply length — text-size button opens a popup to select one of five response length levels; each adds a system-prompt instruction shaping the reply; the active endpoint's `max_tokens` cap applies to all levels:
  - One sentence
  - A few sentences (default)
  - Short paragraph
  - Full paragraph
  - Full response — aims to fill the screen

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

Token usage — pinned footer at the bottom of the Arch, hidden until the first character reply completes. Shows `total_tokens (prompt / completion)` from the most recent character reply. Updated after every `streamCompletion` call; CYOA suggestion calls do not update it.
