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
**Root cause:** The skill SKILL.md lists `graphify claude install` in a separate section ("For native CLAUDE.md integration") outside the numbered pipeline steps (1–9). I followed only the numbered steps and did not read the full skill documentation beyond them.
**Fix:** Ran `graphify claude install` manually after the fact.
**Rule:** When executing a skill, read the *entire* SKILL.md — not just the numbered steps — before starting. Sections outside the pipeline steps may contain mandatory setup commands. Always run `graphify claude install` immediately after the first `/graphify .` on any project.
