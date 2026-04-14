# Lessons Learned

Updated after every user correction. Reviewed at session start.

## Format
**Problem:** What went wrong.
**Fix:** What the correct behaviour is.
**Rule:** The generalised rule going forward.

---

## Lessons

---

**Problem:** After applying a bug fix, CHANGELOG.md was not updated and the fix was pushed without logging it.
**Fix:** Add the item to the `[Unreleased]` table in CHANGELOG.md (status `In dev`) before or immediately after committing.
**Rule:** Every code change — including single-line bug fixes — must be logged in CHANGELOG.md as part of the same commit batch. The changelog update is not optional and is not a “release-only” step.

---

**Problem:** The empty-files guard in `handlePhoto()` called `goHome()` unconditionally for both camera and library modes. Mobile browsers fire a phantom empty-files `change` event on `<input multiple>` when `event.target.value = ''` is set inside the handler. This phantom event arrived while FileReaders were still running, making `pendingPhotos` appear empty and triggering `goHome()`.
**Fix:** Scope the `goHome()` guard to `mode === 'camera'` only. Library mode silently returns on empty-files events; the user navigates back via the back button if needed.
**Rule:** `<input type="file" multiple>` on mobile can fire a second empty-files `change` event immediately after the real one. Never make navigation decisions inside an empty-files guard for multi-file inputs without confirming no async processing is in flight.

---

**Problem:** When falling back to `mcp__github__push_files`, multiple files were batched into a single MCP call.
**Fix:** Push one file per `mcp__github__push_files` call, as specified in CLAUDE.md.
**Rule:** Each `mcp__github__push_files` fallback call must contain exactly one file. After all files are pushed, run `git fetch origin dev && git reset --hard origin/dev` to sync local HEAD.

---
