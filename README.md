# pi-agent-stuff

Prompt templates and skills for the [pi coding agent](https://github.com/badlogic/pi-mono).

## Acknowledgments

- Code review prompt (`hodor`) adapted from [mr-karan/hodor](https://github.com/mr-karan/hodor)
- Pi extensions and skills setup inspired by [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff)

## Installation

Add to your `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "/path/to/pi-agent-stuff"
  ]
}
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
| `logchef` | Query application logs via [LogChef](https://github.com/logchefhq/logchef) CLI. |

## License

Apache License 2.0 — see [LICENSE](LICENSE).
