# TODO

need to test save file loading

## Significant gaps

**Delete message** is a placeholder. Edit and regenerate soften this — a bad message doesn't pollute future prompts if you regenerate it — but you can't excise a message from the visible story entirely. If two messages fired when you only wanted one, or you want to trim the transcript, you're stuck.

**No context length management.** As a roleplay runs long, the full transcript gets sent to the model every turn. Eventually it hits the model's context limit and starts failing or truncating. No way to summarize older exchanges, set a rolling window, or pin certain messages as always-include.

**Fork is a placeholder.** Branching the story at a pivot point — "what if this went differently" — is central to collaborative fiction. The icon is there but does nothing.

---

## Minor annoyances

- No way to clear the transcript without deleting the whole program (losing all participant/environment/scenario setup).
- No export — no way to save a session as readable text.
