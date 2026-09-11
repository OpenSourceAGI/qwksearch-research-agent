# CLAUDE.md — `use-voice-control`

**Read [`skills/ask-use-voice-control`](../../skills/ask-use-voice-control/SKILL.md)
first.**

React voice control: speech transcription, vocalization, and voice commands.
Published.

## It captures a user's microphone — that governs everything

- **Recording is always explicit and visible.** Never start capture implicitly,
  never keep the mic open after the interaction ends, and make the active state
  obvious in the UI.
- **Never send audio or transcripts anywhere the consumer didn't ask for**, and
  never log them. Speech is personal data and often captures bystanders.
- Permission can be denied or revoked mid-session, and the browser may drop the
  stream when the tab is backgrounded. Both are normal — recover without losing
  the surrounding UI state.
- Speech APIs vary a lot by browser. Feature-detect; degrade to a usable
  keyboard path rather than breaking.

```bash
cd packages/use-voice-control && bun run test
```
