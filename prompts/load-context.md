---
description: Load project memory and recent sessions for context
---
# Load Context Command

Load project memory and recent sessions for context.

## Arguments
- $1: (optional) Specific feature/fix to load history for
- $2: (optional) How many days back to load (default: 7)

## Instructions

1. **Get project** from current working directory

2. **Load project memory**:
   ```bash
   cat $HOME/claude-mem/<project>/project-mem.md
   ```

3. **Load recent sessions** (last $2 days):
   ```bash
   find $HOME/claude-mem/<project>/sessions -name "*.md" -mtime -$2
   ```

4. **If $1 specified**, prioritize:
   ```bash
   find $HOME/claude-mem/<project>/sessions -name "*$1*"
   ```

5. **Summarize context**:
   ```
   📁 Project: <project>
   📅 Sessions loaded: [count] from last [days] days
   
   ## Project Context
   [Key points from project-mem.md]
   
   ## Recent Work
   - [date]: [feature] - [one-line summary]
   - [date]: [feature] - [one-line summary]
   
   ## Resume Points
   [Any "Resume Prompt" sections from recent sessions]
   ```

6. **Confirm** ready to continue work