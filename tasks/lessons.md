# Lessons Learned

Updated after every user correction. Reviewed at session start.

## Format
**Problem:** What went wrong.
**Fix:** What the correct behaviour is.
**Rule:** The generalised rule going forward.

---

## Lessons

---

**Problem:** When falling back to `mcp__github__push_files`, multiple files were batched into a single MCP call.
**Fix:** Push one file per `mcp__github__push_files` call, as specified in CLAUDE.md.
**Rule:** Each `mcp__github__push_files` fallback call must contain exactly one file. After all files are pushed, run `git fetch origin dev && git reset --hard origin/dev` to sync local HEAD.

---
