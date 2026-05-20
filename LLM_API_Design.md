# Holodeck — LLM API Integration Design
### Decisions & Reference for Implementation

---

## Architecture

**One API call per character per turn (Path B).**

When the user sends a message, each active AI character that should respond gets its own independent API call with its own system prompt and context. Characters are never batched into a single call.

- Produces dramatically better voice consistency per character
- Makes muting, spotlighting, and @mention targeting trivial
- Typical scenes have 2–4 characters, so 2–3 extra calls per turn is acceptable
- Sequential chaining (see below) means characters can react to each other naturally

---

## The Author Frame

The model is always positioned as **an author writing a character**, not as the character itself.

- Reduces character drift in long sessions
- Gives the model the right cognitive stance — craft, not identity
- Keeps the model from breaking into meta-commentary

---

## API Format

**OpenAI-compatible API.** The outer call is JSON (required by the API transport). The `content` fields inside each message are **prose strings with markdown** — not nested JSON.

LLMs trained on natural language comprehend prose and markdown naturally. JSON inside a prompt is semantically flat and hurts tone and nuance. Never embed JSON in prompt content.

```json
{
  "model": "your-model-here",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user",   "content": "..." }
  ],
  "max_tokens": 400,
  "temperature": 0.8
}
```

---

## Prompt Structure

Each API call is composed of two parts: a **system prompt** and a **user message**. All substantive context goes in the user message — character sheet, environment, scenario, cast, and transcript. The system prompt is kept minimal.

### System Prompt

Short. Establishes the author frame and the single hard rule.

```
You are the author of an ongoing collaborative fiction.
You are currently writing the role of [CHARACTER NAME].
Write only [CHARACTER NAME]'s contributions to the scene —
their actions, dialogue, and reactions. Never write for
any other character.
```

Keep under ~60 tokens. Do not put character or scene details here.

---

### User Message

Assembled fresh on every call. Sections in this order:

```
## Environment
[Name] — [2–4 sentence description. Physical space, atmosphere, 
sensory detail. Enough for the model to render the setting 
without improvising.]

## Scenario
[Name] — [2–4 sentence description. What is happening, what the 
stakes are, what needs to happen next in the world of the scene.]

## Your Character
**Name:** [Full name]
**Role:** [e.g., Chief Medical Officer]
**Personality:** [3–5 sentences. Disposition, values, how they 
behave under pressure, what drives them.]
**Speech:** [How they talk. Formal/informal, terse/verbose, 
jargon, habits, things they'd never say.]
**What they know about this scene:** [Knowledge state specific 
to this moment — what they've seen, heard, calculated, or felt 
since the scene began. This is distinct from their general 
backstory.]

## The Other Participants
**[Name]** — [1–2 sentences from this character's perspective. 
What your character thinks of them, how much they trust them, 
relevant history. Not an objective bio.]
**[Name]** — [Same.]

## Scene Transcript
[Speaker Name]: [Their contribution — dialogue and/or action beats]

[Speaker Name]: [Their contribution]

[Speaker Name]: [Their contribution]

---
Write [CHARACTER NAME]'s next response. Narrative prose — action 
and dialogue. Stop when their contribution is complete.
```

---

## Transcript Format

The transcript is a **flat labeled log**. Speaker name, colon, their content. No role annotations, no JSON, no special markup for the user's character.

```
Dr. Vasquez: Decompression is accelerating — we have maybe four 
minutes before the bridge is uninhabitable. Her eyes swept the 
room, waiting for a volunteer.

Cmdr. Reyes: Kira, you're the closest to the junction. Can you 
get there in time?

Kira: Already moving. Vasquez — what's the override code?
```

**Action beats** go inline, set apart from dialogue with em-dashes or enclosed in brackets — pick one convention and use it consistently throughout the project. The model will mirror whatever convention it sees.

**The user's character is not labeled or flagged differently.** Their messages appear in the transcript exactly like any other participant. The target model only writes its own character and will not write for others regardless.

---

## Key Design Principles

**Characters are described from the target character's point of view.** The cast list entries are not objective character bios — they are what the target character knows and thinks about each person. This produces more naturalistic inter-character behavior.

**"What they know" is a first-class field.** A character's knowledge state at the current moment in the scene (what they've witnessed, calculated, or been told) is explicitly written out. Do not assume the model will infer it from the transcript alone. This is also the mechanism for handling the future feature: *if a character was not in the scene when something happened, that information is omitted from their "What they know" field and from the portion of the transcript they were present for.*

**Every call is a cold start.** The model has no memory between calls. Environment, scenario, character sheet, and transcript must be included in full on every single call. Nothing can be assumed to persist.

**The closing instruction is explicit.** End every user message with the two-line directive. "Stop when their contribution is complete" is important — without it, models tend to over-generate or bleed into writing another character's reaction.

---

## Sequential Chaining for Multi-Character Responses

When multiple characters respond to a single user message, **call them sequentially, not in parallel.**

1. Determine response order (see Who Responds Next, below)
2. Generate Character A's response
3. Append Character A's generated response to the transcript
4. Generate Character B's response with the updated transcript
5. Continue for each additional character

This way each character can react to what the previous character just said, producing an ensemble that feels genuinely reactive. Parallel calls are faster but produce characters talking past each other.

---

## Who Responds Next

Three modes, all valid:

**Automatic** — A lightweight heuristic or a separate small LLM call determines which characters should respond and in what order. Heuristics to consider: who was directly addressed, who has the highest narrative stake, who has been silent longest. A full LLM call for ordering is worth it for ambiguous ensemble moments; a heuristic covers most cases cheaply.

**Spotlight** — The user selects a specific character in the Arch. Only that character's API call is made. The UI mechanism for this exists in the current mockup (the eye/target icon per participant).

**@mention** — Parse the user's message for `@CharacterName`. Call only the mentioned character. Include the mention in the transcript for all characters so they know it occurred.

---

## Internal Data Model

Store Program state as JSON on the client. The prompt is assembled from this data on every call — it is never stored as a prompt.

```json
{
  "programId": "bridge-emergency",
  "programName": "Bridge Emergency",
  "environments": [
    {
      "name": "Enterprise Bridge",
      "description": "Main command center of the USS Meridian..."
    }
  ],
  "scenarios": [
    {
      "name": "Emergency decompression",
      "description": "A microfracture in the forward hull is venting atmosphere..."
    }
  ],
  "participants": [
    {
      "id": "vasquez",
      "name": "Dr. Elena Vasquez",
      "role": "Chief Medical Officer",
      "personality": "...",
      "speech": "...",
      "perspectives": {
        "reyes": "Trusts his judgment completely. He tends to assign rather than volunteer.",
        "kira": "Seen her work fast under pressure. Respects it."
      }
    },
    {
      "id": "reyes",
      "name": "Cmdr. Reyes",
      "role": "First officer",
      "personality": "...",
      "speech": "...",
      "perspectives": {
        "vasquez": "...",
        "kira": "..."
      }
    }
  ],
  "userPersonaId": "kira",
  "transcript": [
    {
      "speaker": "Dr. Vasquez",
      "participantId": "vasquez",
      "text": "Decompression is accelerating...",
      "timestamp": "2026-05-10T14:00:00Z"
    }
  ]
}
```

`userPersonaId` identifies which participant the user is currently speaking as. This is used by the prompt builder to skip that participant's API call — it is never passed to the model or flagged in the transcript.

---

## Prompt Builder (Implementation Note)

Write a single `buildPrompt(targetParticipantId, programState)` function that:

1. Looks up the target participant's full sheet
2. Assembles the environment and scenario descriptions
3. Builds the cast list from the target's `perspectives` entries, excluding themselves
4. Filters the transcript if needed (future: presence-based visibility)
5. Returns a `{ systemPrompt, userMessage }` object

Swap backends by writing a thin adapter per API target:
- `callOpenAICompatible({ systemPrompt, userMessage, model, options })`
- `callClaude(...)` if needed later

The prompt builder is backend-agnostic. The adapters are purely transport.

