---
description: Clean up old Pi sessions, keeping only the N most recent per project
---
# Sessions Garbage Collection

Clean up old Pi sessions, keeping only the N most recent sessions per project.

Usage: `/sessions-gc [count]` — default: 2

---

Run the following bash script with argument: `$@`

```bash
#!/bin/bash
# Keep only the last N sessions per project in Pi

SESSIONS_DIR="$HOME/.pi/agent/sessions"
KEEP_COUNT="${1:-2}"

# Validate KEEP_COUNT is a positive integer
if ! [[ "$KEEP_COUNT" =~ ^[1-9][0-9]*$ ]]; then
    echo "Error: Keep count must be a positive integer (got: $KEEP_COUNT)"
    exit 1
fi

if [ ! -d "$SESSIONS_DIR" ]; then
    echo "Sessions directory not found: $SESSIONS_DIR"
    exit 1
fi

total_removed=0
empty_removed=0

# Check if a session file is empty (no user messages)
is_empty_session() {
    ! grep -q '"role":"user"' "$1" 2>/dev/null
}

for project_dir in "$SESSIONS_DIR"/*/; do
    [ -d "$project_dir" ] || continue

    project_name=$(basename "$project_dir")

    # Find session .jsonl files, sorted by modification time (newest first)
    mapfile -t all_sessions < <(find "$project_dir" -maxdepth 1 -name '*.jsonl' -printf '%T@ %f\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)

    [ ${#all_sessions[@]} -eq 0 ] && continue

    valid_sessions=()
    project_empty_removed=0

    # First pass: remove empty sessions
    for session in "${all_sessions[@]}"; do
        session_file="$project_dir$session"

        if is_empty_session "$session_file"; then
            echo "  Removing (empty): $session"
            rm -f "$session_file"
            ((empty_removed++))
            ((project_empty_removed++))
            continue
        fi

        valid_sessions+=("$session")
    done

    if [ $project_empty_removed -gt 0 ]; then
        echo "Project: $project_name — Removed $project_empty_removed empty sessions"
    fi

    # Second pass: keep only KEEP_COUNT valid sessions
    if [ ${#valid_sessions[@]} -le $KEEP_COUNT ]; then
        [ ${#valid_sessions[@]} -gt 0 ] && echo "Project: $project_name — ${#valid_sessions[@]} sessions (keeping all)"
        continue
    fi

    echo "Project: $project_name (${#valid_sessions[@]} valid sessions, keeping $KEEP_COUNT)"

    for ((i=KEEP_COUNT; i<${#valid_sessions[@]}; i++)); do
        session_file="$project_dir${valid_sessions[i]}"
        echo "  Removing: ${valid_sessions[i]}"
        rm -f "$session_file"
        ((total_removed++))
    done

    # Remove project directory if now empty
    rmdir "$project_dir" 2>/dev/null && echo "  Removed empty project directory: $project_name"
done

echo ""
echo "Cleanup complete! Removed $total_removed old sessions, $empty_removed empty sessions."
```
