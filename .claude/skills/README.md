# Skills

## Graphify

Builds a persistent knowledge graph of the codebase so Claude understands the import graph and module relationships without re-reading files each session.

### Install (run once after cloning)
```bash
pip install graphifyy
graphify install
/graphify .
```

Re-run `/graphify .` after each sprint is completed.

Files generated (gitignored):
- `graph.json`
- `GRAPH_REPORT.md`
- `.graphify/`
