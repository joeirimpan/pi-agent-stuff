# pi-agent-stuff

My prompt templates and skills for the [pi coding agent](https://github.com/badlogic/pi-mono).

## Acknowledgments

This project is heavily inspired by [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff) by [Armin Ronacher](https://github.com/mitsuhiko). The code review prompt (`hodor`) and project memory workflow were built on top of patterns from that repo. If you're looking for excellent pi extensions, skills, and themes, check out his package — it's the gold standard.

## Installation

Add to your `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "/path/to/pi-agent-stuff"
  ]
}
```

Or clone and reference:

```bash
git clone https://github.com/joeirimpan/pi-agent-stuff.git ~/Development/pi-agent-stuff
```

## What's Included

### Prompt Templates (`/command` in pi)

| Command | Description |
|---------|-------------|
| `/hodor [branch]` | Automated code review for current branch against a target branch (default: master). Strict bug criteria, priority levels, structured output. |
| `/init-mem` | Initialize a project memory structure — scans the codebase and generates a `project-mem.md` with stack, patterns, conventions, and key files. |
| `/load-context [feature] [days]` | Load project memory and recent session notes for context before starting work. |
| `/save-session <name>` | Save the current session as a compressed memory file with goal, changes, decisions, gotchas, and a resume prompt. |
| `/update-mem [section]` | Upsert learnings from the current session into the master project memory. |
| `/analyze-session [area]` | Analyze the session transcript to extract learnings — confusion patterns, dead ends, gotchas — and suggest improvements to project memory. |
| `/sessions-gc [count]` | Clean up old pi sessions, keeping only the N most recent per project (default: 2). Removes empty sessions first. |

### Skills

| Skill | Description |
|-------|-------------|
| `logchef` | Query application logs via [LogChef](https://github.com/logchefhq/logchef) CLI. SQL and filter queries, time-series analysis, cross-service correlation. Includes data safety rules to avoid flooding LLM context. |

## Project Memory Workflow

The prompt templates form a lightweight project memory system:

1. **`/init-mem`** — Run once per project to create `$HOME/claude-mem/<project>/project-mem.md`
2. **`/load-context`** — Start of session: load project memory + recent session notes
3. **Work normally** — code, debug, iterate
4. **`/save-session feat-name`** — End of session: compress what happened into a session file
5. **`/update-mem`** — Upsert new learnings into the master memory
6. **`/analyze-session`** — Periodically review sessions for patterns and dead ends

All memory files are stored in `$HOME/claude-mem/` with local git tracking (no push).

## License

Apache License 2.0 — see [LICENSE](LICENSE).
