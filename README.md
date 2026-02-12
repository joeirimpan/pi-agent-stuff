# pi-agent-stuff

Prompt templates and skills for the [pi coding agent](https://github.com/badlogic/pi-mono).

## Acknowledgments

- Code review prompt (`hodor`) adapted from [mr-karan/hodor](https://github.com/mr-karan/hodor)
- Extensions, skills, and themes sourced from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)

## Installation

Add to your `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "/path/to/pi-agent-stuff"
  ]
}
```

Run the setup script to install everything into `~/.pi/agent/packages/mitsupi-custom/`:

```bash
./setup-pi.sh
```

## What's Included

### Prompt Templates

| Command | Description |
|---------|-------------|
| `/hodor [branch]` | Automated code review for current branch against a target branch (default: master). |
| `/sessions-gc [count]` | Clean up old pi sessions, keeping only the N most recent per project (default: 2). |

### Skills

| Skill | Description |
|-------|-------------|
| `logchef` | Query application logs via [LogChef](https://github.com/mr-karan/logchef) CLI. |
| `web-browser` | Browser automation via CDP. Fork of mitsuhiko's skill with cross-platform support (Linux/macOS), auto-detection of Chrome/Chromium binaries, and a `stop.js` script for graceful shutdown. |

### Custom Extensions

| Extension | Description |
|-----------|-------------|
| `move-session.ts` | `/move-session` — move sessions between project directories |

### Via upstream ([mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff))

Extensions:

| Extension | Description |
|-----------|-------------|
| `answer.ts` | Answer mode — agent responds without tools |
| `context.ts` | `/context` command for context overview |
| `control.ts` | Session control utilities |
| `prompt-editor.ts` | Prompt editor utilities |
| `files.ts` | Diff browser and changelog |
| `loop.ts` | Looping task execution |
| `review.ts` | Code review workflow |
| `session-breakdown.ts` | Interactive session breakdown |
| `todos.ts` | Todo list management |
| `whimsical.ts` | Whimsical agent personality |

Skills:

| Skill | Description |
|-------|-------------|
| `commit` | Structured git commits |
| `tmux` | Remote control tmux sessions |

Themes:

| Theme | Description |
|-------|-------------|
| `nightowl` | Night Owl color theme |

## License

Apache License 2.0 — see [LICENSE](LICENSE).
