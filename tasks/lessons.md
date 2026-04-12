# Lessons Learned

Updated after every user correction. Reviewed at session start.

## Format
**Problem:** What went wrong.
**Fix:** What the correct behaviour is.
**Rule:** The generalised rule going forward.

---

## Lessons

---

**Problem:** Session harness specified a feature branch (`claude/setup-graphify-package-N0sO3`) and commits were pushed there instead of `dev`.
**Fix:** Cherry-picked commits onto `dev` and pushed.
**Rule:** CLAUDE.md branch rules always override session harness branch suggestions. Always commit to `dev`; never to feature branches or `main` unless explicitly instructed by the user.

---

**Problem:** After running `/graphify`, `graphify claude install` was not run, so Claude had no automatic instruction to use the graph and no PreToolUse hook was registered.
**Fix:** Ran `graphify claude install` manually after the fact.
**Rule:** Always run `graphify claude install` immediately after the first `/graphify .` pipeline completes on a project. It wires up CLAUDE.md and the PreToolUse hook automatically.
