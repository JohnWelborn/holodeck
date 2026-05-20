# Mistral V7 Tekken — AI Character Roleplay API Guide

A practical implementation guide for per-character roleplay using the OpenAI-compatible Jan
local API server with a llama.cpp + Mistral V7 Tekken backend.

Each AI character that speaks gets its own independent API call with its own filtered context.
This guide covers the V7 Tekken format requirements and the per-character prompt architecture.

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

### Per-Character Calls

Each AI character that speaks on a given turn gets its own independent API call with its
own system prompt and context. Characters are never batched into a single call. Each call
is a two-message payload: a short system prompt (the author frame) and a user message
containing all scene context assembled fresh for that character.

### The Author Frame

The system prompt positions the model as an author writing a specific character, not as
a narrator writing all characters. This reduces character drift in long sessions and keeps
the model from bleeding into writing other characters' reactions.

```
You are the author of an ongoing collaborative fiction.
You are currently writing the role of [CHARACTER NAME].
Write only [CHARACTER NAME]'s contributions — their actions, dialogue, and reactions.
Never write for any other character.
```

Keep the system prompt under ~60 tokens. All scene context goes in the user message.

### Character Knowledge Filtering

Each call's user message contains only what that character has witnessed. A character who
left the room before a secret was revealed does not see that exchange in their transcript.
A dedicated "What they know" field states their knowledge state at this exact moment in
the scene — not backstory, but what they've seen, heard, or calculated since the scene
began. Do not assume the model will infer this from the transcript alone; write it out
explicitly.

### Subjective Cast List

Other participants are described from the target character's point of view — what they
think and feel about each person, not objective bios. Two characters' entries for the same
person will differ. This produces more naturalistic inter-character behavior.

### Sequential Chaining

When multiple characters respond in one turn, call them one at a time. Append the first
character's reply to the shared transcript, then call the next character with the now-updated
transcript. Each character can react to what the previous character just said. Parallel calls
are faster but produce characters talking past each other.

---

## Per-Character Prompt Structure

Each API call for a character is composed of exactly two messages: a system prompt and a
user message. All substantive context goes in the user message, assembled fresh on every call.

### System Prompt

Short. Establishes the author frame and the single hard rule. Under ~60 tokens.

```
You are the author of an ongoing collaborative fiction.
You are currently writing the role of [CHARACTER NAME].
Write only [CHARACTER NAME]'s contributions — actions, dialogue, and reactions.
Never write for any other character.
```

### User Message

Assembled fresh on every call. Sections in this order:

```
## Environment
[Name] — [2–4 sentence description. Physical space, atmosphere,
sensory detail. Enough to render the setting without improvising.]

## Scenario
[2–4 sentences. What is happening, what the stakes are, what needs
to happen next in the world of the scene.]

## Your Character
**Name:** [Full name]
**Role:** [e.g. Elven ranger, over two centuries old]
**Personality:** [3–5 sentences. Disposition, values, how they
behave under pressure, what drives them.]
**Speech:** [How they talk. Register, habits, things they'd never say.]
**What they know about this scene:** [Knowledge state at this moment —
what they've witnessed, heard, or calculated since the scene began.
Omit anything they were not present for.]

## The Other Participants
**[Name]** — [1–2 sentences from this character's POV. What they
think of this person, trust level, relevant history. Not an
objective bio.]
**[Name]** — [Same.]

## Scene Transcript
[Speaker Name]: [contribution — dialogue and action beats]

[Speaker Name]: [contribution]

---
Write [CHARACTER NAME]'s next response. Narrative prose — action
and dialogue. Stop when their contribution is complete.
```

The closing directive "Stop when their contribution is complete" is important — without it,
models tend to over-generate or write another character's reaction.

---

## Complete Example: Per-Character API Call

This shows the full JSON payload for a single per-character call. The scene is three turns
into a tavern scenario. Aria is being called to respond after Kael questioned Drek about a
missing girl.

Aria was present for all turns so her transcript is unfiltered here. In a session where a
character had stepped outside, those turns would be omitted from their transcript and their
"What they know" field would not mention anything from that exchange.

```json
{
  "model": "mistral-v7-tekken",
  "temperature": 0.85,
  "max_tokens": 400,
  "stream": false,
  "messages": [
    {
      "role": "system",
      "content": "You are the author of an ongoing collaborative fiction.\nYou are currently writing the role of Aria.\nWrite only Aria's contributions — her actions, dialogue, and reactions.\nNever write for any other character."
    },
    {
      "role": "user",
      "content": "## Environment\nThe Rusty Flagon — A rough tavern in Ironhold, a mining town on the edge of the kingdom. Low candlelight, half-empty room, smell of woodsmoke and wet boots. Heavy rain outside.\n\n## Scenario\nA stranger arrived asking about a missing girl and looking for work. He has been speaking with the tavern owner and his questions are edging toward something Aria knows about — a disappearance two weeks ago that nobody in town talks about.\n\n## Your Character\n**Name:** Aria\n**Role:** Elven ranger, over two centuries old\n**Personality:** Watchful and economical with words. Always positioned near exits. Carries old knowledge she rarely shares unprompted. Acts decisively when others are still processing.\n**Speech:** Short, measured sentences. Rarely volunteers information. Asks pointed questions when she does speak. Never flustered.\n**What she knows about this scene:** She arrived early and took a table near the back wall with sightlines to both the door and the bar. She noticed the stranger enter — he moves like a soldier or former guard, not a thief. She has been watching Drek deflect the stranger's questions, which she expected. She knows that two weeks ago a south gate guard went missing on the same night as the girl the stranger is describing. She has not told anyone in this tavern.\n\n## The Other Participants\n**Drek** — Tavern owner she has known for years. Jovial on the surface, calculating underneath. He always knows more than he lets on and she has learned not to expect straight answers from him. She is watching him deflect the stranger right now.\n**Kael** — The stranger who just walked in. She does not know him. Former military bearing. He is asking about a missing girl with the urgency of someone who knows her personally. Could be dangerous or useful — too early to say.\n\n## Scene Transcript\nKael: [enters the tavern, shaking rain from his cloak, and drops his coin purse on the bar] Give me something hot and tell me if there's work around here.\n\nDrek: [eyes the purse without moving his head] Hot food's a copper. Work depends on what kind you're after. [slides a bowl of stew across without being asked]\nAria: [seated alone near the back wall, does not look up from the map spread across her table]\n\nKael: The kind that pays. I'm looking for someone too — a girl, early twenties, dark hair. Passed through here maybe two weeks ago. [sits at the bar and starts eating]\n\nDrek: [pauses his glass-polishing for exactly one second] Can't say I recall every face that comes through. Town's been busier than usual. [resumes polishing]\n\n---\nWrite Aria's next response. Narrative prose — action and dialogue. Stop when her contribution is complete."
    }
  ]
}
```

The two-message structure maps to V7 Tekken as:

```
<s>[SYSTEM_PROMPT]author frame[/SYSTEM_PROMPT][INST]full scene context + transcript[/INST]
```

The model generates Aria's contribution only. Her response is appended to the shared
transcript client-side. If Drek also needs to respond this turn, a separate call is built
for him with his own character sheet and his own perspective on the scene.

---

## Who Responds

On each player turn, one character responds (or multiple, called sequentially).

**User-selected** — The current mode. The user picks which character responds. One API call
is made for that character only.

**Spotlight** — A UI mechanism (e.g. a target icon per participant) that pins the next
response to a specific character.

**@mention** — Parse the user's message for `@CharacterName`. Call only the mentioned
character. Include the `@mention` in the transcript for all characters so they know it
occurred.

**Automatic (future)** — A separate lightweight LLM call determines which character responds
and in what order. Heuristics to consider: who was directly addressed, who has the highest
narrative stake, who has been silent longest.

---

## Request Fields Reference

| Field             | Type    | Notes                                                                   |
|-------------------|---------|-------------------------------------------------------------------------|
| model             | string  | Model ID as registered in Jan                                           |
| temperature       | float   | 0.7–0.9 recommended for roleplay. Higher = more creative.               |
| max_tokens        | integer | Max length of each reply. 300–600 is typical.                           |
| stream            | boolean | true = tokens arrive as they generate. false = wait for full reply.     |
| stream_options    | object  | `{"include_usage": true}` — request token usage in streaming mode.      |
| messages          | array   | Two messages per call: system (author frame) + user (scene context).    |
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
        "content": "Aria: [from across the room, without looking up] Two weeks ago the south gate guard went missing on the same night. Nobody talks about it."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 412,
    "completion_tokens": 38,
    "total_tokens": 450
  }
}
```

The character reply is always at:
  response.choices[0].message.content

Check finish_reason:
  "stop"   — natural end of reply, all good
  "length" — hit max_tokens limit; reply is cut off mid-generation

When you receive `"length"`, you have two options:
1. Rebuild and resend the same two-message payload with a higher max_tokens value.
   The incomplete reply was not appended to shared_transcript, so nothing is corrupted.
2. Send a one-off four-message continuation call: the standard two messages (system +
   user with full scene context), followed by the incomplete reply as an `assistant`
   turn, then `[continue]` as a second `user` turn. The model resumes mid-sentence.
   Concatenate the partial and continued text before appending to shared_transcript.
   Return to the standard two-message format for the next regular turn.

### Streaming response shape

When `stream: true`, the endpoint returns Server-Sent Events instead of a single
JSON object. Each chunk arrives as:

```
data: {"id":"chatcmpl-abc123","object":"chat.completion.chunk","choices":[{"delta":{"content":"Aria"},"finish_reason":null}]}
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

## The Per-Character Call Loop

The API has no memory. You manage the shared transcript on your side. Each call is a fresh
two-message payload — there is no growing history array to append to. Only update the shared
transcript after a successful response.

```
shared_transcript = []

on each player turn:
  1. append player message to shared_transcript:
       { speaker: "Kael", text: "...", presentCharacters: ["aria", "drek"] }
  2. determine which character responds (user picks, spotlight, or @mention)
  3. for each responding character (in order, if more than one):
     a. filter shared_transcript to turns this character was present for
     b. build the two-message payload:
          systemPrompt: author frame (~60 tokens)
          userMessage:  environment + scenario + character sheet
                        (with "what they know") + cast (subjective)
                        + filtered transcript + closing directive
     c. POST [{ role: "system", content: systemPrompt },
              { role: "user",   content: userMessage }]
        to /v1/chat/completions
     d. if request fails → show error, do NOT modify shared_transcript, retry or abort
     e. extract reply = response.choices[0].message.content
     f. check finish_reason — if "length", decide whether to retry or continue
     g. strip any content after the first non-target character name prefix
        (e.g. "Drek:" appearing in Aria's reply — truncate there before saving)
     h. append { speaker: characterName, text: reply, presentCharacters: [...] }
        to shared_transcript
     h. display reply to player
  4. repeat
```

**Sequential chaining:** If two characters both respond on a turn, step 3a for the second
character uses the shared_transcript that already includes the first character's reply
(appended in step 3g). The second character can react to what the first just said.

**Transcript filtering:** Tag each transcript entry with which characters were present when
it was added. `presentCharacters` is not who spoke — it is who was in the scene. If Aria,
Drek, and Kael are all in the tavern, every entry added during that time carries all three
IDs, even entries where only one of them speaks. Only update the list when a character
physically enters or leaves the location. When building a call for a given character,
include only entries where that character appears in `presentCharacters`. Update the "What
they know" field accordingly — omit anything from turns they missed.

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
running with a reduced KV cache size due to VRAM constraints.

**Important:** The context size Jan actually loads may be smaller than the model's
maximum if your hardware limits the KV cache. Always verify the loaded context size
in Jan's model info panel rather than assuming the model's maximum is in use. Your
token budget for trimming should be based on the loaded size, not the model maximum.

Each call is two messages (system + user), not a growing history array. Context grows
with the transcript length, not with the number of API calls made.

Track `usage.total_tokens` in each non-streaming response. As the session grows you
will need to trim old transcript entries from the user message to stay within budget.

Trimming strategy:
  - Always keep the fixed overhead: environment, scenario, character sheet, cast
  - Remove the oldest transcript entries first
  - Never trim the last 4–6 turns (recent context matters most)
  - If trimmed turns contained information the character witnessed, update their
    "What they know" field to summarize what was lost — in automated
    sessions this summarization step can be handled by a separate LLM call

Rough token estimates:
  Fixed overhead per character per call:   300–500 tokens (character sheet,
                                           environment, cast, closing directive)
  Each transcript turn:                    50–200 tokens
  Safe working budget (32k context):       ~60–120 transcript turns before
                                           trimming needed (lower if character
                                           sheets are large)

---

## Recommended Settings for Roleplay

  temperature:       0.85   (creative but coherent; try 0.7–1.0)
  max_tokens:        400    (one solid narrative beat; increase for longer scenes)
  top_p:             0.95   (slightly more focused than the default 1.0)
  min_p:             0.05   (filters tokens below 5% of the top token's probability;
                             llama.cpp extension, may not pass through all Jan versions)
  frequency_penalty: 0.1    (mild repetition reduction; OpenAI-compatible field)
  presence_penalty:  0.1    (discourages returning to already-used topics/phrases)
  stream:            false  (simpler to implement; switch to true for real-time token display)

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
  [ ] Build character data with personality, speech, and perspectives entries
      (each character's subjective views of every other character)
  [ ] Write a buildPrompt(targetCharacterId, sharedTranscript, sceneState) function
      that assembles the two-message payload (author-frame system prompt +
      full context user message)
  [ ] Implement transcript filtering — tag each entry with which characters were
      present; filter per character when building their call
  [ ] On each turn: user picks (or @mention / spotlight selects) which character responds
  [ ] For sequential responses: append each reply to shared_transcript before calling next
  [ ] Each call is exactly two messages: short author-frame system + full context user
  [ ] Handle finish_reason "length" — retry with more tokens or send a continuation
  [ ] Track total_tokens in non-streaming responses (or use stream_options for streaming)
      and trim old transcript entries when approaching your model's loaded context limit
  [ ] Use consistent "Name: [action] dialogue" prefixing throughout
