---
description: Analyze session transcript to extract learnings and improve project memory
---
# Analyze Session Command

Analyze the current session transcript to extract learnings and suggest improvements to project memory.

## Arguments
- $1: (optional) Specific area to focus on (e.g., "gotchas", "patterns", "commands")

## Instructions

1. **Identify the project** from current working directory

2. **Read existing project memory**:
   ```bash
   cat $HOME/claude-mem/<project>/project-mem.md
   ```

3. **Analyze the current session** by reviewing the full conversation history. Look for:

   ### Confusion Patterns
   - Where did we retry or change approach?
   - What took multiple attempts to get right?
   - Where did we go down the wrong path first?

   ### Missing Information
   - What context would have helped earlier?
   - What assumptions were wrong?
   - What wasn't in project-mem.md but should be?

   ### Discovered Gotchas
   - What broke unexpectedly?
   - What edge cases appeared?
   - What subtle bugs or issues came up?

   ### Successful Patterns
   - What worked well?
   - What shortcuts or techniques were effective?
   - What commands were particularly useful?

   ### Dead Ends
   - What approaches were tried and abandoned?
   - Why didn't they work? (so we don't try again)

4. **Generate improvement report**:
   ```markdown
   # Session Analysis: <project>
   > Analyzed: $(date +%Y-%m-%d %H:%M)

   ## Summary
   [One paragraph: what was attempted, what was learned]

   ## Suggested Additions to project-mem.md

   ### Gotchas
   - [ ] [New gotcha to add]
   - [ ] [New gotcha to add]

   ### Patterns
   - [ ] [New pattern to document]

   ### Key Files
   - [ ] [File that should be documented]

   ### Commands
   - [ ] [Useful command to add to Common Tasks]

   ## Dead Ends (for reference)
   - [Approach]: [Why it didn't work]

   ## Confusion Points
   - [What was confusing]: [How it was resolved]
   ```

5. **Ask user** which suggestions to apply:
   - "Apply all suggestions to project-mem.md?"
   - "Apply selected suggestions?" (list them)
   - "Save report only?" (write to `/tmp/session-analysis-<project>.md`)

6. **If applying**, use the update-mem logic:
   - Read existing project-mem.md
   - Merge new items into appropriate sections
   - Keep it under 200 lines
   - Remove duplicates

7. **Git commit** (if changes made):
   ```bash
   cd $HOME/claude-mem
   git add <project>/project-mem.md
   git commit -m "mem(<project>): analyze session $(date +%Y-%m-%d)"
   ```
   **Note: Never run `git push` - local commits only.**
