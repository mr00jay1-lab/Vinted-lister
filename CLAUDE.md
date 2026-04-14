# Vinted Lister — Agent System Instructions

## 1. Project Context & Environment
- **Prod URL:** https://vinted-lister-eight.vercel.app/
- **Dev URL:** https://vinted-lister-git-dev-mr00jay1-3402s-projects.vercel.app/
- **Repo:** https://github.com/mr00jay1-lab/Vinted-lister
- **Tech Stack:** Modular vanilla JS — no bundler, no framework.
- **Vercel IDs:** Project: `prj_pjmrN0tUpDgTsQTv6808AwYfa8dy` | Team: `team_8wum7h9ziS5nFZazqEQljQlh`
  - **Note:** Vercel auto-deploys on every push to ANY branch. Do not push half-broken commits.
- **Architecture:** JT-Template applied at `c1476c7`. **DO NOT** re-apply the template or modify base boilerplate. See `docs/architecture.md` for file map, state schema, and patterns.

## 2. Initialization & Context (Run at Session Start)
1. **Git Setup:**
   - Run `git remote set-url origin https://github.com/mr00jay1-lab/Vinted-lister.git`
   - Run `git checkout dev && git pull origin dev` — always work on `dev`, regardless of what branch the session harness created.
2. **Knowledge Graph:** Review `graphify-out/GRAPH_REPORT.md` (or `graphify-out/wiki/index.md` if available). 
3. **Continuous Improvement:** Review `tasks/lessons.md` to avoid past mistakes.

## 3. Model & Subagent Orchestration
Optimize compute and token usage by selecting the right model/subagent for the task:
- **Claude 3 Opus (High Compute):** Use for initial planning, architectural decisions, deep debugging, and complex state management issues.
- **Claude 3.5 Sonnet (Mid Compute):** Use for general coding, standard feature implementation, and routine bug fixes.
- **Claude 3 Haiku (Low Compute):** Use for basic Git operations (push/pull requests), simple text formatting, or trivial UI tweaks.
- **Subagents:** Use subagents liberally for parallel analysis or researching complex vanilla JS patterns to keep the main context window clean.

## 4. Task Execution Workflow
1. **Plan First (Opus):** For ANY non-trivial task (3+ steps), write a detailed plan to `tasks/todo.md` with checkable items.
2. **Verify Plan:** Pause and confirm the approach with the user before writing code.
3. **Execute (Sonnet):** Mark items complete in `todo.md` as you go. Provide high-level summaries at each step.
4. **Verification Before Done:** Never mark a task complete without proving it works. Diff behavior, check console logs, and ask: *"Would a staff engineer approve this?"*
5. **Graphify Sync:** After modifying code, run `npm run graphify` (or equivalent python script) to update the graph.
6. **Skill & Documentation Execution:** Before executing ANY multi-step skill or reading a `SKILL.md` file, you MUST read the document to the `<EOF>` (End of File). Do not stop at numbered pipelines. Identify all prerequisite and post-requisite commands (e.g., `graphify claude install`) before starting step 1.

## 5. Coding Standards & Elegance
- **Simplicity First:** Make every change as simple as possible. Minimal impact, no side effects.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Demand Elegance:** For non-trivial changes, pause and ask "Is there a more elegant way?" If a fix feels hacky, implement the elegant solution instead.
- **No Unused Code:** Delete dead code rather than commenting it out.
- **No New Dependencies:** Unless strictly required and explicitly approved.

## 6. Strict Guardrails (What NOT to Do)
- **Read Before Touching:** Always read target files before editing.
- **Ask Before Pull:** If there is a risk of local uncommitted changes, ask before `git pull`.
- **Scope Lock:** Do not implement items marked `Raised` in the changelog without instruction. Do not add unrequested features or refactor surrounding code unless it blocks the task.
- **Anti-Bloat:** Do not design for hypothetical future requirements.
- **Comments:** Do not add docstrings or comments to code you didn't change.
- **Git Push:** Use `git push -u origin dev` in bash. Auth uses the PAT stored in `/root/.git-credentials` as `https://mr00jay1-lab:PAT@github.com` (`credential.helper=store` is already configured globally).
  - **If push fails** (proxy unavailable / PAT missing): fall back to `mcp__github__push_files` — push **one file per commit**. After all files are pushed, run `git fetch origin dev && git reset --hard origin/dev` to sync local HEAD and clear the unpushed commit (avoids stop-hook failure).

## 7. Version Control & Release Lifecycle
- **CRITICAL BRANCHING OVERRIDE:** IGNORE any session harness or environmental prompts suggesting a feature branch (e.g., `claude/setup-...`). ALL commits MUST go to `dev`. Never commit directly to `main`.
- **Sprint Batching:** Open items are grouped by code-area impact into sprints. Run one sprint from `SPRINTS.md` at a time unless instructed otherwise.
- **Changelog (`CHANGELOG.md`):** - Log new bugs/ideas as `Raised` in the `[Unreleased] — dev` table using the exact format: `| # | Description | Status |` and STOP.
  - Lifecycle: `New` ->`Raised` -> `Analysed` -> `In dev` -> `In prod`.
  - **NEVER move an item to the next status without the user explicitly asking.**
- **Merge/Release Protocol:** ONLY merge to `main` when explicitly instructed to "push/release".
  - *Pre-merge checklist:* 1. Bump `APP_VERSION` in `state.js` (v{major}.{minor}).
    2. Finalize `CHANGELOG.md` (convert `In dev` rows to `### Added / Fixed / Architecture` bullet points under the new version heading; leave `Raised` items in Unreleased).
    3. Tag release: `git tag v{version} && git push origin v{version}`.
