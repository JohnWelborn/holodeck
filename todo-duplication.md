# Code duplication to address in holodeck.js

1. **`streamCompletion` vs `streamNarratorCompletion`** (~90 lines each, lines 1755-1844 & 2638-2723) — nearly identical SSE-streaming loops (fetch, reader, decode, parse `data:` lines, handle `finish_reason`, render bubble). Differences: character-streaming tracks `lastUsage`/calls `updateArchTokenUsage()`, narrator doesn't, and the console group label differs. Could extract a shared `streamChatCompletion(prompt, bubble, container, opts)` helper.

2. **`createMsgRow` vs `createDescriptionMsgRow`** (~90 lines each, lines 1526-1618 & 2768-2844) — both build a message row with avatar, name row, and the identical block of action icons (edit/delete/fork/regen/prev/next/genCount). Could extract a shared `buildMsgActions()` and/or `buildMsgRowShell()`.

3. **Tree rendering: `renderLevel` vs `renderCharacterLevel`** (~60 lines each, lines 3547-3606 & 3612-3675) — nearly identical drag/drop, rename, folder-toggle logic, just operating on `treeData`/programs vs `characterTreeData`/characters. Could parameterize with a config object (data array, item type names, click handlers).

4. **Prompt-context building** repeated 3x in `buildPrompt`, `buildUserSuggestionPrompt`, and `buildDescribePrompt` (lines ~1429-1499, 2394-2473, 2602-2636) — `envText`, `scenText`, `stateBlock`, `castLines`, transcript-text formatting are copy-pasted. Could extract `buildEnvScenText()`, `buildCharacterStateBlock(target)`, `buildCastLines(target, targetId)`, `buildTranscriptText(transcript, targetId)`.

5. ~~**`renderArchEnvironments` vs `renderArchScenarios`** (lines 1329-1405) — identical except for the data array and modal type string (`'env'`/`'scen'`). Easy win: one `renderArchList(containerId, items, modalType, removeFn)`.~~ DONE — extracted shared `renderArchList(containerId, items, modalType, removeFn, emptyText)`.

6. **`renderEnvForm` vs `renderScenForm`** (lines 599-635) — identical structure, just different placeholder copy. Could merge into one `renderNameDescForm(container, prefill, placeholders)`.

7. **`addEnvToScene`/`addScenToScene`** (1204-1223) and **`deleteEnvFromLibrary`/`deleteScenFromLibrary`/`deleteTraitFromLibrary`** (902-916) — tiny near-duplicates, easy to collapse with a generic helper but low payoff.
