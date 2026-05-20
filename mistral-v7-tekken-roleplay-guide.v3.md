# Mistral V7 Tekken — AI Character Roleplay API Guide

A practical implementation guide for sending and receiving multi-character roleplay
messages using the OpenAI-compatible Jan local API server with a llama.cpp + Mistral
V7 Tekken backend.

---

## Reference Links

- Mistral Tokenization Deep Dive (official, current):
  https://docs.mistral.ai/resources/cookbooks/concept-deep-dive-tokenization-readme

- Mistral Chat Templates — V7 Tekken format detail (official):
  https://docs.mistral.ai/resources/cookbooks/concept-deep-dive-tokenization-chat_templates

- Mistral Prompting Guide (official):
  https://docs.mistral.ai/studio-api/conversations/chat-completion/prompting

- mistral-common (ground truth tokenizer source):
  https://github.com/mistralai/mistral-common

- llama.cpp V7 template implementation & tests:
  https://github.com/ggml-org/llama.cpp/blob/master/tests/test-chat-template.cpp

- llama.cpp V7 template PR (mistral-v1/v3/v3-tekken/v7 support):
  https://github.com/ggml-org/llama.cpp/pull/10572

- Jan local server (OpenAI-compatible):
  https://jan.ai

---

## How V7 Tekken Handles Roles

Mistral V7 Tekken introduced dedicated control tokens for all three roles.
Unlike older Mistral versions (V1/V2/V3) which only supported user and assistant,
V7 Tekken loops through every message in the array and wraps each one correctly:

  system    →  [SYSTEM_PROMPT] ... [/SYSTEM_PROMPT]
  user      →  [INST] ... [/INST]
  assistant →  (plain content) + </s>

The full template (as implemented in llama.cpp) resolves to:

  <s>[SYSTEM_PROMPT]your system content[/SYSTEM_PROMPT][INST]user message[/INST]assistant reply</s>[INST]next user message[/INST]next reply</s>

Two important formatting notes:

1. The sequence opens with a BOS token (`<s>`). This is emitted by the server —
   you do not include it in your JSON payload.

2. V7 Tekken is based on tiktoken, not sentencepiece. There are NO spaces between
   the control tokens and content. `[/SYSTEM_PROMPT][INST]` is correct;
   `[/SYSTEM_PROMPT] [INST]` (with a space) is not. This differs from V1/V3
   templates, which padded whitespace around tokens.

Because the template iterates all messages, system role entries can appear at
ANY position in the messages array — not just position 0. Each one is wrapped
in proper [SYSTEM_PROMPT] tokens the model was trained to treat as high-authority
instructions. This is the key V7 Tekken advantage for roleplay scene management.

> **WARNING — Mid-conversation system messages are a fragile feature.**
> Whether they work depends on an unbroken chain: the GGUF file must have correct
> V7 template metadata → Jan must read and apply it → llama.cpp's V7 implementation
> must correctly wrap mid-conversation `system` role messages → the specific fine-tune
> must have been trained to respond meaningfully to `[SYSTEM_PROMPT]` tokens that
> appear after the conversation has already started. GGUF exports frequently have
> missing or incorrect metadata that silently falls back to an older template format,
> causing your scene-change text to be wrapped in `[INST]` instead of
> `[SYSTEM_PROMPT]`. Always verify template detection before relying on this feature.
> See the "Verifying Template Detection" section below.

---

## Verifying Template Detection

Before building out a full roleplay loop, confirm that Jan is actually applying
the V7 Tekken template to your GGUF. The only reliable way to do this is to
inspect the raw rendered prompt in Jan's logs — not just the API response, which
looks the same regardless of template errors.

### Enabling verbose logs in Jan

In Jan's UI: **Settings → Advanced → Log Level → Debug** (exact label may vary
by Jan version). Then open the log panel or find the log file at:

  macOS/Linux:  ~/jan/logs/app.log
  Windows:      %APPDATA%\jan\logs\app.log

Send a test request (see below), then search the log for the string `[SYSTEM_PROMPT]`
or `[INST]`. The rendered prompt string is typically logged just before the inference
run begins.

### Test request

Send this minimal two-message payload. It is designed to be unambiguous — a
system message followed by a single user turn — so the rendered prompt is short
and easy to read in the log:

```json
{
  "model": "mistral-v7-tekken",
  "max_tokens": 10,
  "stream": false,
  "messages": [
    {
      "role": "system",
      "content": "TEMPLATE-CHECK-SYSTEM"
    },
    {
      "role": "user",
      "content": "TEMPLATE-CHECK-USER"
    }
  ]
}
```

`max_tokens: 10` keeps inference fast. The response content does not matter —
you are only checking how the prompt was built.

### What to look for in the log

**Good — V7 Tekken template applied correctly:**

```
<s>[SYSTEM_PROMPT]TEMPLATE-CHECK-SYSTEM[/SYSTEM_PROMPT][INST]TEMPLATE-CHECK-USER[/INST]
```

The system content is wrapped in `[SYSTEM_PROMPT]...[/SYSTEM_PROMPT]` with no
spaces between tokens. The BOS `<s>` is present.

**Bad — fallback to older Mistral V1/V3 template:**

```
<s> [INST] TEMPLATE-CHECK-SYSTEM

TEMPLATE-CHECK-USER [/INST]
```

The system content has been merged into the first `[INST]` block, separated by
two newlines. This is the V1 sentencepiece behaviour. Your scene-change system
messages will not receive `[SYSTEM_PROMPT]` wrapping, and the model will not
treat them as high-authority narrator instructions.

If you see the bad output, the GGUF's embedded template metadata is missing or
incorrect. Your options are:

- Find a correctly exported GGUF of the same model (check the model's HuggingFace
  page for a GGUF with verified template metadata).
- Override the template manually in Jan's model settings if Jan exposes that option
  for your version. Use the following Jinja template string exactly — this is the
  confirmed V7 Tekken template as embedded in Mistral Small 24B Instruct 2501 GGUFs:

```jinja
{{ bos_token }}{% for message in messages %}{% if message['role'] == 'user' %}{{ '[INST]' + message['content'] + '[/INST]' }}{% elif message['role'] == 'system' %}{{ '[SYSTEM_PROMPT]' + message['content'] + '[/SYSTEM_PROMPT]' }}{% elif message['role'] == 'assistant' %}{{ message['content'] + eos_token }}{% else %}{{ raise_exception('Only user, system and assistant roles are supported!') }}{% endif %}{% endfor %}
```

- As a fallback, prepend scene-change content to the next user message rather
  than using a separate system role entry.

---

## Core Concepts for Roleplay

### The Three-Role System

  system    — Your world bible: characters, setting, narrator instructions.
              In V7 Tekken, can also be injected mid-conversation for scene changes
              (requires verified template detection — see above).
  user      — The player's actions, dialogue, and in-scene event notes.
  assistant — The narrator's response: NPC dialogue, descriptions, story beats.

### Character Name Prefixing

Since the API only has one assistant role, all NPC characters are written by
the narrator (the assistant) using name prefixes in the content. This is the
standard approach and keeps things compatible with any message parsing your
app needs to do.

Format:
  CharacterName: [dialogue or action]

Example in an assistant message:
  "Drek: You got coin, or are you just here for the warmth?\nAria: [doesn't look up from her map]"

The user can similarly prefix their own character name:
  "Kael: I'm looking for the south road."

### Scene Change System Messages

For significant location or situation changes, insert a new system role message
at the appropriate point in the messages array. Keep it short and directive —
it supplements the original system message, it does not replace it.

---

## Complete Example: Ongoing Roleplay JSON

This shows a full multi-turn conversation with two characters, a player character,
and a mid-conversation scene change.

```json
{
  "model": "mistral-v7-tekken",
  "temperature": 0.85,
  "max_tokens": 512,
  "stream": false,
  "messages": [

    {
      "role": "system",
      "content": "## Role\nYou are the narrator of an interactive fantasy roleplay. Write all NPC responses in third-person prose, giving each character a distinct voice. Be descriptive but concise. Never break the fourth wall or refer to yourself as an AI.\n\n## Player Character\nName: Kael\nRace: Human\nOccupation: Sellsword, former city guard\nPersonality: Blunt, distrustful of magic, loyal once earned\nMotivation: Searching for his missing sister, last seen near Ironhold\n\n## NPC Characters\nAria — An elven ranger, over two centuries old. Speaks in short, measured sentences. Rarely volunteers information. Distrusts Drek but won't say why. Always aware of exits.\nDrek — Dwarf tavern owner and black-market contact. Jovial surface, calculating underneath. Speaks in clipped sentences. Notices everything.\n\n## Character Relationships\n- Aria and Drek share a tense history. Do not elaborate on it unless Kael directly asks.\n- Both have heard rumours about missing people near Ironhold but have not mentioned it unprompted.\n\n## Starting Scene\nLocation: The Rusty Flagon tavern, Ironhold. A rough mining town on the edge of the kingdom.\nTime: Evening. Heavy rain outside.\nAtmosphere: Low candlelight, half-empty tavern, the smell of woodsmoke and wet boots."
    },

    {
      "role": "user",
      "content": "Kael: [enters the tavern, shaking rain from his cloak, and drops his coin purse on the bar] Give me something hot and tell me if there's work around here."
    },

    {
      "role": "assistant",
      "content": "Drek: [eyes the purse without moving his head] Hot food's a copper. Work depends on what kind you're after. [slides a bowl of stew across without being asked]\nAria: [seated alone near the back wall, does not look up from the map spread across her table]"
    },

    {
      "role": "user",
      "content": "Kael: The kind that pays. I'm looking for someone too — a girl, early twenties, dark hair. Passed through here maybe two weeks ago. [sits at the bar and starts eating]"
    },

    {
      "role": "assistant",
      "content": "Drek: [pauses his glass-polishing for exactly one second] Can't say I recall every face that comes through. Town's been busier than usual. [resumes polishing]\nAria: [from across the room, without looking up] Two weeks ago the south gate guard went missing on the same night. Nobody talks about it."
    },

    {
      "role": "user",
      "content": "Kael: [turns to look at the elf] You got a name? And why are you telling me this?"
    },

    {
      "role": "assistant",
      "content": "Aria: [folds the map deliberately before answering] Aria. I'm telling you because you have the look of someone who'll go looking regardless. Better you go knowing something than nothing. [finally meets his eyes] The south road has been wrong since that night. I don't mean dangerous. I mean wrong."
    },

    {
      "role": "user",
      "content": "Kael: [stands, leaves coin on the bar] Then let's go look at it now while there's still— [the tavern door bursts open]"
    },

    {
      "role": "system",
      "content": "[SCENE CHANGE] A wounded city guard has stumbled into the tavern. He is bleeding from a deep wound on his side and collapses near the entrance. He is clutching a piece of torn cloth — the same pattern as the missing girl's description. The tavern goes completely silent. Rain pours through the open door."
    },

    {
      "role": "assistant",
      "content": "Drek: [drops the glass — it shatters] Everyone back. [vaults the bar with surprising speed for a dwarf]\nAria: [already moving, hand on her bow, scanning the open door before anyone else thinks to] Door. Now. [to Kael] Is that her cloth?"
    },

    {
      "role": "user",
      "content": "Kael: [kneels beside the guard] Stay with me. Who did this to you? Where did you come from?"
    }

  ]
}
```

---

## Request Fields Reference

| Field             | Type    | Notes                                                                   |
|-------------------|---------|-------------------------------------------------------------------------|
| model             | string  | Model ID as registered in Jan                                           |
| temperature       | float   | 0.7–0.9 recommended for roleplay. Higher = more creative.               |
| max_tokens        | integer | Max length of each narrator reply. 300–600 is typical.                  |
| stream            | boolean | true = tokens arrive as they generate. false = wait for full reply.     |
| stream_options    | object  | `{"include_usage": true}` — request token usage in streaming mode.      |
| messages          | array   | Full conversation history sent every request (stateless API).           |
| frequency_penalty | float   | 0.0–0.5 range. Reduces repetition scaled by how often a token appears.  |
| presence_penalty  | float   | 0.0–0.5 range. Penalises any token that has appeared at all, once.      |

### A note on repetition penalty

llama.cpp uses a parameter called `repeat_penalty` (neutral value 1.0, typical
useful range 1.05–1.15). The OpenAI-compatible spec uses `frequency_penalty`
(neutral value 0.0, range 0–2). These are different scales — do not use
`repeat_penalty` in your JSON payload expecting it to behave like the llama.cpp
native parameter.

Jan may accept `repeat_penalty` as a non-standard extension through its API
endpoint depending on your version — check Jan's model parameter documentation
for your specific release. For portable, spec-compliant code use `frequency_penalty`
with a value of 0.1–0.2 to achieve a mild repetition reduction.

**`frequency_penalty` vs `presence_penalty`:** Both reduce repetition but work
differently. `frequency_penalty` scales with how often a token has appeared —
the more a word repeats, the harder it is penalised. `presence_penalty` applies
a flat penalty to any token that has appeared at all, regardless of frequency.
For roleplay, `presence_penalty` is better at steering characters away from
returning to the same topics and phrases; `frequency_penalty` is better at
suppressing token-level stuttering and looping. Using both at low values (0.1
each) is a reasonable starting point.

---

## Response Shape

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1716000000,
  "model": "mistral-v7-tekken",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Drek: [drops the glass...]\nAria: [already moving...]"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 412,
    "completion_tokens": 87,
    "total_tokens": 499
  }
}
```

The character reply is always at:
  response.choices[0].message.content

Check finish_reason:
  "stop"   — natural end of reply, all good
  "length" — hit max_tokens limit; reply is cut off mid-generation

When you receive `"length"`, you have two options:
1. Increase `max_tokens` and resend the request with the same history (the
   incomplete reply was not appended, so history is still clean).
2. Append the incomplete reply to history anyway, then send a short continuation
   prompt such as `[continue]` as the next user message. The model will pick up
   mid-sentence. This preserves turn parity but produces a slightly seamed reply.

### Streaming response shape

When `stream: true`, the endpoint returns Server-Sent Events instead of a single
JSON object. Each chunk arrives as:

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Drek"},"finish_reason":null}]}
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":": "},"finish_reason":null}]}
...
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

The reply text is in `choices[0].delta.content` on each chunk (may be absent on
the final chunk). Concatenate all `delta.content` values to build the full reply.
Check `finish_reason` on the final chunk the same way as the non-streaming case.

`usage` totals are not available in streaming mode by default — do not rely on
them for token tracking when streaming. To request usage in streaming mode, add
`"stream_options": {"include_usage": true}` to your request payload. Support for
this field varies by Jan version; fall back to non-streaming responses for token
tracking if it is not present in your chunks.

---

## The Stateless Loop (Implementation Pattern)

The API has no memory. You manage the full conversation history on your side.
Every request must include all previous messages.

**Only append to history after a successful response.** If the API call fails,
the history must remain unchanged — appending a failed turn corrupts the
conversation and the history grows out of sync with the model's view of events.

Pseudocode:

```
messages = [ initial system message ]

on each player turn:
  1. build next_user = { role: "user", content: "Kael: ..." }
  2. POST [...messages, next_user] to /v1/chat/completions
  3. if request fails → show error, do NOT modify messages, retry or abort
  4. extract reply = response.choices[0].message.content
  5. check finish_reason — if "length", decide whether to retry or continue
  6. append next_user to messages
  7. append { role: "assistant", content: reply } to messages
  8. display reply to player
  9. repeat

on scene change:
  - build scene_msg = { role: "system", content: "[SCENE CHANGE] ..." }
  - insert scene_msg into messages at the correct chronological position
    (usually just before step 1 of the next player turn)
  - continue the loop as normal
```

---

## Endpoint

  POST http://localhost:{PORT}/v1/chat/completions
  Content-Type: application/json
  Authorization: Bearer {YOUR_API_KEY}

Jan's default port is 1337, but use whatever port you have configured. An API key
is required — pass it in the `Authorization` header as a Bearer token. For the
template verification test request in the section above, include the same header.

Example with curl:

```bash
curl http://localhost:1337/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "model": "mistral-v7-tekken",
    "max_tokens": 10,
    "stream": false,
    "messages": [
      { "role": "system", "content": "TEMPLATE-CHECK-SYSTEM" },
      { "role": "user",   "content": "TEMPLATE-CHECK-USER"   }
    ]
  }'
```

---

## System Message Strategy

### Original system message (position 0)
Put everything stable here: narrator instructions, all character profiles,
relationships, starting location, and tone. This is your world bible.

Suggested structure:

  ## Role
  Narrator instructions and style guidance.

  ## Player Character
  Name, background, personality, current goal.

  ## NPC Characters
  One entry per character: name, personality, speech style, secrets.

  ## Character Relationships
  How characters relate to each other and what they know.

  ## Starting Scene
  Location, time of day, atmosphere, current tension.

### Mid-conversation system messages (scene changes)
Keep these short and specific. They add to the world bible; they do not
replace it. The model still has the original system message earlier in context.

Good scene change message:
  "[SCENE CHANGE] The party has left the tavern and is on the south road.
  Midnight. Forest is unnaturally silent. Aria is visibly on edge."

Bad scene change message (too vague):
  "The scene changed."

---

## Character Name Prefixing Conventions

Use a consistent format throughout so both the model and any parsing code
can reliably identify who is speaking.

  Standard dialogue:
    Aria: You should not have come here alone.

  Action beat embedded:
    Drek: [sets down his drink] That's a bold claim.

  Action only (no dialogue):
    Aria: [draws her bow and steps in front of Kael]

  Player character:
    Kael: I'm not leaving without her.

  Player action note (in-scene event, not character dialogue):
    [The candles gutter out all at once. The room goes dark.]

Keep action beats in square brackets [ ] to distinguish them from speech.
This makes it easier to parse and display them differently in your UI if needed.

---

## Context Window Management

Context window size is a property of the specific model, not of the V7 Tekken
template format. Check the model card for your GGUF's trained context length.
Common values for models using the V7 Tekken tokenizer (such as Mistral Small 24B
2501) are 32k tokens, but your usable budget in practice will be lower if you are
running with a reduced KV cache size due to VRAM constraints — Jan will typically
show the loaded context size in the model info panel.

**Important:** The context size Jan actually loads may be smaller than the model's
maximum if your hardware limits the KV cache. Always verify the loaded context size
in Jan's model info panel rather than assuming the model's maximum is in use. Your
token budget for trimming should be based on the loaded size, not the model maximum.

Track `usage.total_tokens` in each non-streaming response. As history grows you
will need to trim old turns to avoid hitting the limit and degrading response quality.

Trimming strategy:
  - Always keep the original system message (position 0)
  - Always keep any active scene-change system messages from recent turns
  - Remove the oldest user/assistant pairs first
  - Never trim the last 4–6 turns (recent context matters most)

Rough token estimates:
  A full system world-bible prompt:    600–900 tokens (detailed character sheets
                                       and scene descriptions fill this quickly)
  Each user/assistant turn pair:       100–300 tokens
  Safe working budget (32k context):   ~60–80 turns before trimming needed
                                       (lower end if your world-bible is large)

---

## Recommended Settings for Roleplay

  temperature:       0.85   (creative but coherent; try 0.7–1.0)
  max_tokens:        400    (one solid narrative beat; increase for longer scenes)
  top_p:             0.95   (slightly more focused than the default 1.0)
  min_p:             0.05   (filters tokens below 5% of the top token's probability;
                             llama.cpp extension, may not pass through all Jan versions)
  frequency_penalty: 0.1    (mild repetition reduction; OpenAI-compatible field)
  presence_penalty:  0.1    (discourages returning to already-used topics/phrases)
  stream:            true   (better UX — player sees reply appearing in real time)

**`top_p` vs `min_p`:** These can be used together. `top_p` limits the cumulative
probability mass of the candidate token pool. `min_p` removes any token whose
probability falls below a set fraction of the leading token's probability — it
adapts to the model's confidence rather than cutting at a fixed mass. Many roleplay
users find `min_p: 0.05–0.1` more effective than `top_p` alone for keeping
responses coherent without over-constraining creative outputs. `min_p` is a
llama.cpp-native parameter; whether Jan forwards it through the OpenAI-compatible
endpoint depends on your Jan version.

---

## Quick Implementation Checklist

  [ ] Jan is running with the Mistral V7 Tekken GGUF model loaded
  [ ] Local API Server is enabled in Jan's settings (Settings → Local API Server)
  [ ] Your port and API key are noted — include Authorization: Bearer header on all requests
  [ ] Verify the loaded context size in Jan's model info panel (may be less than model maximum)
  [ ] Verify template detection using the test request and log check (see above)
      before building the full roleplay loop
  [ ] If template detection fails, use the Jinja override string from the
      "Verifying Template Detection" section
  [ ] Build the initial messages array with your world-bible system message
  [ ] On each turn: build user message → POST → on success: append user + append
      assistant reply → on failure: do not append, handle error
  [ ] Handle finish_reason "length" — retry with more tokens or send a continuation
  [ ] On scene change: insert a system message before the next user turn
  [ ] Track total_tokens in non-streaming responses (or use stream_options for
      streaming) and trim old history when approaching your model's context limit
  [ ] Use consistent "Name: [action] dialogue" prefixing throughout
