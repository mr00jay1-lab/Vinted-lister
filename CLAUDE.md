# Vinted Lister — Claude Code Way of Working

## Repo
- **Prod URL:** https://vinted-lister-eight.vercel.app/
- **Dev/Preview URL:** https://vinted-lister-git-dev-mr00jay1-3402s-projects.vercel.app/
- **GitHub:** https://github.com/mr00jay1-lab/Vinted-lister
- modular build

## Branch Rules
- All changes go to `dev` branch — never commit directly to `main`
- Only merge to `main` when the user explicitly says to push/release
- When merging to main: bump version number, finalise changelog, tag the release

## Change Lifecycle
Every change follows this status flow:

| Status | Meaning |
|--------|---------|
| **Raised** | User has described the change — logged only, no action taken |
| **Analysed** | User has asked for analysis — approach discussed and agreed |
| **In dev** | User has asked to implement — code written and committed to dev |
| **In prod** | User has asked to release — merged to main and deployed |

## IMPORTANT — Do Not Self-Trigger
- When the user describes a change, bug or suggestion: **log it to the changelog as Raised and stop**
- **Never move an item to the next status without the user explicitly asking**
- The user controls all progression through the lifecycle
- Changes batch together and deploy as a sprint when the user decides

## Changelog Rules (`CHANGELOG.md`)
- Keep an `[Unreleased] — dev` section at the top for all changes currently in dev
- Add each change to the unreleased section as soon as it is coded
- When releasing to main: rename `[Unreleased]` to the new version number + date, create a fresh `[Unreleased]` section

## Version Numbering
- Format: `v{major}.{minor}` — e.g. v1.2, v1.3
- Minor bump for new features or fixes in a release
- Major bump only for full rebuilds or breaking changes
- Tag every release: `git tag v{version} && git push origin v{version}`

## Git Credentials
- PAT stored in `~/.git-credentials` — pushes work without re-authenticating
- Remote: `https://github.com/mr00jay1-lab/Vinted-lister.git`

## Vercel
- Project ID: `prj_pjmrN0tUpDgTsQTv6808AwYfa8dy`
- Team ID: `team_8wum7h9ziS5nFZazqEQljQlh`
- Vercel auto-deploys on every push to any branch
