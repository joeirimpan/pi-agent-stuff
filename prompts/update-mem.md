---
description: Update project memory with learnings from current session
---
# Update Project Memory Command

Upsert learnings from current session into the master project memory.

## Arguments
- $1: (optional) Specific section to update (e.g., "stack", "patterns", "gotchas")

## Instructions

1. **Identify project** from current working directory

2. **Read existing** `$HOME/claude-mem/<project>/project-mem.md`

3. **Upsert** - merge new learnings into existing sections (don't duplicate):

   ```markdown
   # <project>
   > Last updated: $(date +%Y-%m-%d)

   ## Overview
   [1-2 sentences: what this project does]

   ## Stack
   - [tech]: [version/notes]

   ## Structure
   ```
   [key directories/files tree, max 15 lines]
   ```

   ## Patterns
   - [Pattern name]: [how it's used here]

   ## Conventions
   - [Naming, formatting, architecture rules]

   ## Key Files
   - [file]: [what it does, when to touch it]

   ## Gotchas
   - [Thing that will bite you]

   ## Common Tasks
   - **[task]**: [how to do it]

   ## Dependencies
   - [Notable deps and why]

   ## Environment
   - [Env vars, setup notes]
   ```

4. **Keep it tight**: 
   - Max 200 lines total
   - Remove stale/outdated info
   - Merge duplicates
   - Prefer terse over verbose

5. **Git commit**:
   ```bash
   cd $HOME/claude-mem
   git add <project>/project-mem.md
   git commit -m "mem(<project>): update $(date +%Y-%m-%d)"
   ```
   **Note: Never run `git push` - local commits only.**