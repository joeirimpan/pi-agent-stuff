---
description: Initialize project memory structure for a new project
---
# Initialize Project Memory Command

Set up memory structure for a new project.

## Instructions

1. **Get project name** from current working directory

2. **Create structure**:
   ```bash
   mkdir -p $HOME/claude-mem/<project>/sessions
   ```

3. **Analyze the project** - scan for:
   - package.json, Cargo.toml, go.mod, requirements.txt, etc.
   - README.md
   - Directory structure
   - Config files

4. **Generate initial** `project-mem.md`:
   ```markdown
   # <project>
   > Last updated: $(date +%Y-%m-%d)

   ## Overview
   [Infer from README or ask user]

   ## Stack
   [Detected from package files]

   ## Structure
   ```
   [Key dirs, max 15 lines]
   ```

   ## Patterns
   - [Detected patterns]

   ## Conventions
   - [Inferred from codebase]

   ## Key Files
   - [Entry points, configs]

   ## Gotchas
   - [TBD]

   ## Common Tasks
   - **dev**: [start command]
   - **build**: [build command]
   - **test**: [test command]
   ```

5. **Initialize git** (if not exists):
   ```bash
   cd $HOME/claude-mem
   git init 2>/dev/null || true
   git add <project>/
   git commit -m "init(<project>): project memory"
   ```
   **Note: Never run `git push` - local commits only.**

6. **Output** the generated project-mem.md for review