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
