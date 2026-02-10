---
description: Save current session as a compressed memory file
---
# Save Session Command

Save the current session as a compressed memory file.

## Arguments
- $1: Feature or fix name (e.g., "feat-user-auth", "fix-api-timeout")

## Instructions

1. **Identify the project**: Get the current working directory name as `<project>`

2. **Check for existing sessions** with the same feature name:
   ```bash
   find $HOME/claude-mem/<project>/sessions -name "$1.md" 2>/dev/null
   ```
   - If older session(s) exist, read their content to merge into the new session
   - Note which files were found for later cleanup

3. **Analyze before writing**: Wrap your analysis in `<analysis>` tags to ensure thorough capture:
   ```
   <analysis>
   1. Chronologically review what happened this session
   2. Identify key decisions and their rationale
   3. Note what would be lost if not captured (commands, gotchas, dead ends)
   4. What was I working on RIGHT BEFORE this save request?
   5. Are there any unresolved blockers or open questions?
   6. Draft a Resume Prompt that is specific and actionable
   </analysis>
   ```

4. **Create session file** at:
   ```
   $HOME/claude-mem/<project>/sessions/$(date +%Y-%m-%d)/$1.md
   ```

5. **Compress the session** into this format:
   ```markdown
   # $1
   > Session: $(date +%Y-%m-%d %H:%M)

   ## Goal
   [One line: what we were trying to achieve]

   ## Current State
   [Exactly what was happening right before this save - the specific file,
   function, or task being worked on. Include a code snippet if mid-implementation.]

   ## Blockers
   [Anything unresolved - failing tests, unclear requirements, waiting on info.
   Write "None" if no blockers.]

   ## Changes
   - [file]: [what changed and why]
   - [file]: [what changed and why]

   ## Decisions
   - [Key decision made and rationale]

   ## Gotchas
   - [Pitfalls discovered, edge cases, things that broke]

   ## Commands
   ```bash
   [Any useful commands run]
   ```

   ## Resume Prompt
   [2-3 specific, actionable sentences to resume this work. Include:
   - What to do next (not vague "continue working")
   - Any context needed (branch, file, function name)
   - What to watch out for]

   ---
   ## Previous Sessions
   [If older sessions were found, append their content here, preserving the original dates]
   ```

6. **Delete old session files** (if any were merged):
   ```bash
   rm $HOME/claude-mem/<project>/sessions/<old-date>/$1.md
   # Remove empty directories
   rmdir $HOME/claude-mem/<project>/sessions/<old-date> 2>/dev/null || true
   ```

7. **Git commit**:
   ```bash
   cd $HOME/claude-mem
   git add <project>/sessions/
   git commit -m "session(<project>): $1 $(date +%Y-%m-%d)"
   ```
   **Note: Never run `git push` - local commits only.**

8. **Confirm** with path, merged files (if any), and git status
