# Skills

## Graphify

Builds a persistent knowledge graph of the codebase so Claude understands module relationships and architecture without re-reading every file each session.

### Why this file exists

The graphify skill is installed **globally** on the developer's machine at `~/.claude/skills/graphify/SKILL.md`. It is not tracked in this repo because it is a system-level tool, not project source code. This README documents what needs to be set up so any new machine or contributor can replicate it.

### Install (run once per machine after cloning)

```bash
pip install graphifyy      # installs the graphify CLI and Python library
graphify install           # installs the skill to ~/.claude/skills/graphify/SKILL.md
graphify claude install    # wires up CLAUDE.md + PreToolUse hook in .claude/settings.json
/graphify .                # builds the knowledge graph for this project
```

### Output

All generated files land in `graphify-out/` at the **project root** (not inside `.claude/`). This is graphify's default convention and all references in `CLAUDE.md` and `.claude/settings.json` point there.

| File | Tracked in git | Notes |
|------|---------------|-------|
| `graphify-out/graph.html` | Yes | Interactive browser graph |
| `graphify-out/graph.json` | No (gitignored) | Rebuild with `/graphify .` |
| `graphify-out/GRAPH_REPORT.md` | No (gitignored) | Rebuild with `/graphify .` |
| `graphify-out/cache/` | Yes | Per-file extraction cache — speeds up incremental reruns |
| `graphify-out/manifest.json` | Yes | File manifest for `--update` flag |
| `graphify-out/cost.json` | Yes | Cumulative token usage tracker |

### Ongoing use

- **After any sprint:** re-run `/graphify . --update` to re-extract only changed files
- **Architecture questions:** Claude will check the graph automatically via the PreToolUse hook before searching raw files
