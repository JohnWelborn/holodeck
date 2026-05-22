# TODO

need to test save file loading

## Significant gaps

**~~Delete message~~** ✅ Fixed.

**No context length management.** As a roleplay runs long, the full transcript gets sent to the model every turn. Eventually it hits the model's context limit and starts failing or truncating. No way to summarize older exchanges, set a rolling window, or pin certain messages as always-include.

**Fork is a placeholder.** Branching the story at a pivot point — "what if this went differently" — is central to collaborative fiction. The icon is there but does nothing.

---

## Minor annoyances

- No way to clear the transcript without deleting the whole program (losing all participant/environment/scenario setup).
- No export — no way to save a session as readable text.
