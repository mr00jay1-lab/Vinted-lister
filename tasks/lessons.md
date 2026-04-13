# Lessons Learned

Updated after every user correction. Reviewed at session start.

## Format
**Problem:** What went wrong.
**Fix:** What the correct behaviour is.
**Rule:** The generalised rule going forward.

---

## Lessons

---

### Git Push — SSH Unavailable, Use MCP push_files with Per-File Commits

**Problem:** `git push` fails with "could not read Username" because the git HTTPS proxy is not running in this environment. Attempting SSH fails because the `ssh` binary is not installed and no keys exist. A local `git commit` then leaves an unpushed commit that triggers the stop hook.

**Fix:** Use `mcp__github__push_files` to push changed files directly to the remote. After pushing via MCP, run `git fetch origin <branch> && git reset --hard origin/<branch>` to sync the local branch to the remote state and clear the unpushed commit.

**Rule:** When `git push` fails due to missing credentials/proxy:
1. Use `mcp__github__create_branch` if the branch doesn't exist on the remote yet.
2. Push each changed file as a **separate** `mcp__github__push_files` commit (one file per commit).
3. After all files are pushed, run `git fetch origin <branch> && git reset --hard origin/<branch>` to align local with remote.
4. Never leave a local commit unpushed — the stop hook will flag it.

---
