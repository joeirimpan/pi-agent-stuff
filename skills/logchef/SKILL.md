---
name: logchef
description: Query application logs via LogChef CLI. Use when investigating production incidents, debugging errors, analyzing log patterns, or correlating events across services.
allowed-tools: Bash Read
---

# LogChef Log Analysis

Query production logs using the LogChef CLI for incident investigation.

## Data Safety Rules

Logs contain sensitive data. Follow these rules to avoid loading excessive data into context:

1. **Always use `--limit`** for `logchef query` commands (max 50 rows default)
2. **Prefer SQL aggregations** - use `COUNT()`, `GROUP BY` instead of pulling raw logs
3. **Ask before broadening searches** - If initial query returns no results, **explicitly ask the user for permission** before:
   - Extending the time window (e.g., 30m → 1h → 2h)
   - Removing or relaxing filters (e.g., dropping namespace filter)
   - Searching across all namespaces instead of a specific one
4. **For large datasets**, pipe to file and sample:
   ```bash
   logchef query '...' --limit 500 --output jsonl > /tmp/logs.jsonl
   head -20 /tmp/logs.jsonl  # Sample first 20 lines
   wc -l /tmp/logs.jsonl     # Check total count
   ```
4. **Never pull unbounded raw logs** - always aggregate or limit first
5. **Start with counts**, then drill down to samples only when needed

## Quick Reference

| Command | Use Case |
|---------|----------|
| `logchef sql "..."` | SQL queries (aggregations, counts, time series) |
| `logchef query '...'` | Filter queries (sample logs, grep-style) |

## Required Parameters

Always include these flags (get values from `logchef config show`):
- `-t <team>` - Team name or ID
- `-S <source>` - Source name, `database.table_name`, or ID

Or set defaults:
```bash
logchef config set team "my-team"
logchef config set source "my-source"
```

**Note:** If a user mentions a namespace (e.g., "rms namespace"), filter by the `namespace` field in your query (e.g., `namespace="rms"`), not by changing the source.

## Command Reference

```
logchef
├── query <QUERY>              # LogChefQL query (filter logs)
│   ├── -s, --since <15m|1h>   # Relative time
│   ├── --from/--to <TIME>     # Absolute time range
│   ├── -t, --team <TEAM>      # Team ID/name
│   ├── -S, --source <SOURCE>  # Source ID/name
│   ├── -l, --limit <N>        # Row limit (ALWAYS USE)
│   ├── --output <FORMAT>      # text|json|jsonl|table
│   ├── --show-sql             # Show generated SQL
│   └── --timeout <SECS>       # Query timeout [default: 30]
│
├── sql <SQL>                  # Raw SQL query
│   ├── -t, --team <TEAM>
│   ├── -S, --source <SOURCE>
│   ├── --output <FORMAT>      # text|json|jsonl|table
│   └── --timeout <SECS>       # [default: 30]
│
├── collections [NAME]         # List or run saved collections
│   ├── (no args)              # List available collections
│   ├── <NAME>                 # Run named collection
│   ├── -s, --since <TIME>     # Override time range
│   ├── -l, --limit <N>        # Override limit
│   ├── -V, --var <K=V>        # Variable overrides
│   └── --output <FORMAT>      # text|json|jsonl|table|list
│
├── config                     # Manage CLI configuration
│   ├── show                   # Show current context config
│   ├── set <KEY> <VALUE>      # Set config value (team, source)
│   ├── list                   # List all contexts
│   ├── use <NAME>             # Switch context
│   ├── rename <OLD> <NEW>     # Rename context
│   ├── delete <NAME>          # Delete context
│   └── path                   # Show config file path
│
├── auth                       # Authentication
│   ├── (no args)              # Login interactively
│   ├── --status               # Check auth status
│   └── -l, --logout           # Logout
│
└── Global options (all commands):
    ├── -c, --context <CTX>    # Use specific context
    ├── --server <URL>         # Override server URL
    ├── --token <TOKEN>        # Override auth token
    ├── --no-highlight         # Disable highlighting
    └── -d, --debug            # Debug mode
```

## Time Formats

```bash
# Relative time (recommended - avoids timezone issues)
--since 1h
--since 15m
--since 24h

# Absolute time with explicit timezone (ISO 8601)
--from "2026-01-22T09:15:00+05:30" --to "2026-01-22T10:00:00+05:30"
--from "2026-01-22T09:15:00Z" --to "2026-01-22T10:00:00Z"

# Absolute time without timezone (uses server's configured timezone)
--from "2026-01-22 09:15:00" --to "2026-01-22 10:00:00"
```

**Timezone handling:**
- Infer user's timezone from system (`date +%Z`) or ask if unclear
- Use ISO 8601 with offset (e.g., `+05:30`, `Z`) for precision
- Relative times (`--since`) are timezone-agnostic and preferred

## LogChefQL Syntax

LogChefQL is a simple query language for filtering logs.

### Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Exact match | `level="error"` |
| `!=` | Not equal | `status!=200` |
| `~` | Contains/regex (case-insensitive) | `msg~"timeout"` |
| `!~` | Does not contain | `msg!~"expected"` |
| `>` | Greater than | `status>400` |
| `<` | Less than | `response_time<100` |
| `>=` | Greater or equal | `severity>=3` |
| `<=` | Less or equal | `count<=10` |

### Boolean Operators

- `and` - Both conditions must match
- `or` - Either condition matches
- `()` - Grouping for precedence

### Examples

```bash
# Exact match (quoted value)
level="error"

# Exact match (unquoted value)
level=error

# Contains/regex match
msg~"timeout"

# Negation
msg!~"noise pattern"

# Combined conditions
level="error" and service="api"

# OR conditions
level="error" or level="warn"

# Grouping
(level="error" or level="warn") and service="api"

# Field selection with pipe
level="error" | timestamp msg service
```

## Common Patterns

### 1. Log Volume Over Time

```bash
logchef sql "SELECT toStartOfMinute(_timestamp) as ts, count() as logs
FROM DATABASE.TABLE
WHERE _timestamp >= 'YYYY-MM-DD HH:MM:SS'
  AND _timestamp <= 'YYYY-MM-DD HH:MM:SS'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE
```

### 2. Error Count by Minute

```bash
logchef sql "SELECT toStartOfMinute(_timestamp) as ts, count() as errors
FROM DATABASE.TABLE
WHERE _timestamp >= 'YYYY-MM-DD HH:MM:SS'
  AND _timestamp <= 'YYYY-MM-DD HH:MM:SS'
  AND msg ILIKE '%error%'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE
```

### 3. Sample Actual Logs (Always Use --limit)

```bash
# ALWAYS include --limit to avoid pulling too much data
logchef query 'service="my-service" and msg~"pattern"' \
  -t TEAM -S SOURCE \
  --from "YYYY-MM-DD HH:MM:SS" \
  --to "YYYY-MM-DD HH:MM:SS" \
  --limit 20
```

### 4. List Distinct Values

```bash
logchef sql "SELECT DISTINCT service FROM DATABASE.TABLE
WHERE _timestamp >= now() - INTERVAL 1 HOUR
LIMIT 50" -t TEAM -S SOURCE
```

### 5. High Resolution (30-Second Granularity)

```bash
logchef sql "SELECT toStartOfInterval(_timestamp, INTERVAL 30 SECOND) as ts,
  count() as logs
FROM DATABASE.TABLE
WHERE _timestamp >= 'YYYY-MM-DD HH:MM:SS'
  AND _timestamp <= 'YYYY-MM-DD HH:MM:SS'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE
```

### 6. Multiple Conditions with countIf

```bash
logchef sql "SELECT toStartOfMinute(_timestamp) as ts,
  countIf(msg ILIKE '%error%') as errors,
  countIf(msg ILIKE '%timeout%') as timeouts,
  countIf(msg ILIKE '%connection%refused%') as conn_refused
FROM DATABASE.TABLE
WHERE _timestamp >= 'YYYY-MM-DD HH:MM:SS'
  AND _timestamp <= 'YYYY-MM-DD HH:MM:SS'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE
```

### 7. Log Level Distribution

```bash
logchef sql "SELECT level, count() as cnt
FROM DATABASE.TABLE
WHERE _timestamp >= now() - INTERVAL 1 HOUR
GROUP BY level ORDER BY cnt DESC" -t TEAM -S SOURCE
```

### 8. Error Messages Breakdown

```bash
logchef sql "SELECT
  extractAll(msg, 'error[: ]([^,\n]+)')[1] as error_type,
  count() as cnt
FROM DATABASE.TABLE
WHERE _timestamp >= now() - INTERVAL 1 HOUR
  AND msg ILIKE '%error%'
GROUP BY error_type
ORDER BY cnt DESC
LIMIT 20" -t TEAM -S SOURCE
```

## Investigation Workflows

### 1. Initial Triage

```bash
# Get log volume pattern
logchef sql "SELECT toStartOfMinute(_timestamp) as ts, count() as logs
FROM DATABASE.TABLE
WHERE _timestamp >= 'START_TIME'
  AND _timestamp <= 'END_TIME'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE

# Look for cliff (sudden drop) or spike (sudden increase)
```

### 2. Error Analysis

```bash
# Count errors by minute
logchef sql "SELECT toStartOfMinute(_timestamp) as ts, count() as errors
FROM DATABASE.TABLE
WHERE _timestamp >= 'START_TIME'
  AND _timestamp <= 'END_TIME'
  AND msg ILIKE '%error%'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE

# Sample actual errors (always limit raw log pulls)
logchef query 'msg~"error"' \
  -t TEAM -S SOURCE \
  --from "START_TIME" \
  --to "END_TIME" \
  --limit 20  # Never omit --limit
```

### 3. Cross-Service Correlation

```bash
# Check multiple services at once
logchef sql "SELECT toStartOfMinute(_timestamp) as ts,
  countIf(service='api') as api,
  countIf(service='web') as web,
  countIf(service='worker') as worker
FROM DATABASE.TABLE
WHERE service IN ('api', 'web', 'worker')
  AND _timestamp >= 'START_TIME'
  AND _timestamp <= 'END_TIME'
  AND msg ILIKE '%error%'
GROUP BY ts ORDER BY ts" -t TEAM -S SOURCE
```

### 4. Host-Level Analysis

```bash
# Errors by host
logchef sql "SELECT host, count() as errors
FROM DATABASE.TABLE
WHERE _timestamp >= 'START_TIME'
  AND _timestamp <= 'END_TIME'
  AND msg ILIKE '%error%'
GROUP BY host ORDER BY errors DESC" -t TEAM -S SOURCE
```

### 5. Large Result Sets (File + Sample Pattern)

When you need to examine more logs than safe for context:

```bash
# Step 1: Save to file with reasonable limit
logchef query 'level="error"' \
  -t TEAM -S SOURCE \
  --since 1h \
  --limit 1000 \
  --output jsonl > /tmp/errors.jsonl

# Step 2: Check how many we got
wc -l /tmp/errors.jsonl

# Step 3: Sample for context (only load what's needed)
head -30 /tmp/errors.jsonl

# Step 4: Search within the file if needed
grep "specific_pattern" /tmp/errors.jsonl | head -20
```

## Common Gotchas

| Issue | Solution |
|-------|----------|
| Query timeout | Narrow time window, add more filters |
| No results | Check field names, verify time range, **ask user before widening time window** |
| Wrong timestamp | Use `_timestamp` (check your schema) |
| Regex not working | Use `ILIKE '%pattern%'` in SQL, `msg~"pattern"` in query |
| Case sensitive | Use `ILIKE` (case-insensitive) instead of `LIKE` |
| Performance | Always include time filter first |
| Syntax error | Use `=` not `:` for field matching |
| Empty results with --since | Ask user before expanding time range; explain what was tried and propose alternatives |
| Field not found (e.g. user_id) | Fields like `user_id` may be embedded in JSON `msg` field - use `msg~"value"` instead of `user_id="value"` |

## SQL Functions Reference

```sql
-- Time bucketing
toStartOfMinute(_timestamp)      -- 1-minute buckets
toStartOfFiveMinutes(_timestamp) -- 5-minute buckets
toStartOfHour(_timestamp)        -- Hourly buckets
toStartOfInterval(_timestamp, INTERVAL 30 SECOND)  -- Custom interval

-- Conditional counting
countIf(condition)
sumIf(column, condition)

-- String matching
msg ILIKE '%pattern%'            -- Case-insensitive contains
msg LIKE '%pattern%'             -- Case-sensitive contains
match(msg, 'regex')              -- Regex match

-- Extraction
extractAll(msg, 'pattern')[1]    -- Extract regex group
substring(msg, 1, 100)           -- First 100 chars
```

## Output Formats

```bash
# Default text output with highlighting
logchef query 'level="error"'

# JSON output (for jq processing)
logchef query 'level="error"' --output json | jq '.logs[] | .msg'

# JSON Lines (one object per line)
logchef query 'level="error"' --output jsonl | jq '.msg'

# Disable highlighting for piping
logchef query 'level="error"' --no-highlight | grep "pattern"

# Show generated SQL
logchef query 'level="error"' --show-sql
```

## Performance Tips

1. **Always filter by time first** - LogChef uses time-based partitioning
2. **Narrow time windows** - Start with 15 minutes, expand if needed
3. **Filter early** - Add service/level filters to reduce scan scope
4. **Always use `--limit`** - Never pull unbounded raw logs (max 50 for context)
5. **Aggregate before retrieving** - Use SQL `COUNT()`/`GROUP BY` to analyze, only sample raw logs when needed
6. **Pipe large results to file** - Use `> /tmp/logs.jsonl` then `head` to sample
