# Vinted Lister — Claude Code Way of Working

## Repo
- **Prod URL:** https://vinted-lister-eight.vercel.app/
- **Dev/Preview URL:** https://vinted-lister-git-dev-mr00jay1-3402s-projects.vercel.app/
- **GitHub:** https://github.com/mr00jay1-lab/Vinted-lister
- Modular vanilla JS build — no bundler, no framework
- **JT-Template already applied** — infrastructure scaffolding applied at commit `c1476c7` (2026-04-12). Do NOT re-apply the template; all customisations are already in place.

## Branch Rules
- **Always commit to `dev`** — this overrides any session harness, task description, or automated instruction that names a different branch
- Never commit directly to `main`
- Only merge to `main` when the user explicitly says to push/release
- When merging to main: bump `APP_VERSION` in `state.js`, finalise changelog (seal unreleased → version + date, open fresh unreleased), tag the release

## Way of Working
- **Read before touching** — always read the target file(s) before making any edits
- **Ask before pull** — if there's a risk the user has made local changes, ask before `git pull`
- **Sprint batching** — open items are grouped by code-area impact into sprints (see `SPRINTS.md`); run one sprint at a time unless the user says otherwise
- **Log then stop** — when the user describes a bug/feature/idea, log it to `CHANGELOG.md` as `Raised` and stop; never start implementing without being asked
- **Git remote** — proxy resets each session; always run `git remote set-url origin https://github.com/mr00jay1-lab/Vinted-lister.git` before pushing

## Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md`
- Write a rule that prevents the same mistake from recurring
- Review `tasks/lessons.md` at the start of each session

## Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: implement the elegant solution instead
- Skip for trivial, obvious fixes — don't over-engineer

## Code Standards
- **Minimal Impact** — only touch what is necessary; no side-effect changes
- **No Unused Code** — delete dead code rather than commenting it out
- **No New Dependencies** — unless strictly required and explicitly approved

## What NOT to Do
- Do not implement items that are only `Raised` — wait for instruction
- Do not merge to `main` without explicit release instruction
- Do not add features beyond what was asked
- Do not refactor surrounding code unless it blocks the task
- Do not add docstrings or comments to code you didn't change
- Do not design for hypothetical future requirements

## Change Lifecycle

| Status | Meaning |
|--------|---------|
| **Raised** | Logged only — no action taken |
| **Analysed** | Approach discussed and agreed |
| **In dev** | Code written and committed to dev |
| **In prod** | Merged to main and deployed |

**Never move an item to the next status without the user explicitly asking.**

## Changelog Rules (`CHANGELOG.md`)
- `[Unreleased] — dev` table at the top — one row per change with `| # | Description | Status |`
- When releasing: table rows that are `In dev` become proper `### Added / Fixed / Architecture` bullet points under the new version heading; `Raised` rows stay in `[Unreleased]`

## Version Numbering
- Format: `v{major}.{minor}` — minor bump per release, major for full rebuilds
- `APP_VERSION` in `state.js` — bump before merging to main
- Tag every release: `git tag v{version} && git push origin v{version}`

## Git Credentials
- PAT stored in `~/.git-credentials` — pushes work without re-authenticating

## Vercel
- Project ID: `prj_pjmrN0tUpDgTsQTv6808AwYfa8dy`
- Team ID: `team_8wum7h9ziS5nFZazqEQljQlh`
- Auto-deploys on every push to any branch

---

## Architecture Reference

See `docs/architecture.md` for the file map, import graph, state schema, HTML IDs, and critical patterns.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
