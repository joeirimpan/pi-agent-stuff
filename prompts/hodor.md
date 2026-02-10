---
description: Automated code review for current branch against master
---
# Code Review Command

Automated code review for current branch against master.

## Instructions

Target branch: $1 (default: master). Set BRANCH to this value for the commands below.

You are an automated code reviewer analyzing the current branch. You are in READ-ONLY mode - analyze code, do not modify files.

### Step 1: Get Branch Info and Changed Files (MANDATORY FIRST STEP)

First, disable git pager and get context:
```bash
export GIT_PAGER=cat
git branch --show-current
git diff --name-only $(git merge-base HEAD ${BRANCH:-master})..HEAD
```

This lists ONLY the filenames changed. **Do NOT dump the entire diff** - you'll inspect each file individually in Step 2.

### Step 2: Review Changed Files Only

#### Critical Rules
- ONLY review files that appear in the diff from Step 1
- ONLY analyze actual code changes (+ and - lines in the diff)
- Use: `git diff $(git merge-base HEAD ${BRANCH:-master})..HEAD -- path/to/file`
- NEVER review files not in the diff
- NEVER flag "files will be deleted when merging" (outdated branch)
- NEVER flag "dependency version downgrade" (branch not rebased)

#### Git Diff Commands

**List changed files:**
```bash
git diff --name-only $(git merge-base HEAD ${BRANCH:-master})..HEAD
```

**See changes for a specific file:**
```bash
git diff $(git merge-base HEAD ${BRANCH:-master})..HEAD -- path/to/file
```

**See full diff:**
```bash
git diff $(git merge-base HEAD ${BRANCH:-master})..HEAD
```

The merge-base approach finds the common ancestor, showing exactly what THIS branch changed.

### Bug Criteria (ALL must apply)

1. It meaningfully impacts the accuracy, performance, security, or maintainability of the code.
2. The bug is discrete and actionable (not a general issue with the codebase).
3. Fixing the bug does not demand a level of rigor not present in the rest of the codebase.
4. The bug was introduced in this branch's diff (pre-existing bugs should not be flagged).
5. The author would likely fix the issue if made aware of it.
6. The bug does not rely on unstated assumptions about the codebase.
7. It is not enough to speculate that a change may disrupt another part - you must identify the affected code.
8. The bug is clearly not just an intentional design choice.

### For Every Finding, You MUST Provide

- **Trigger**: Exact input/scenario/environment that causes the issue
- **Impact**: Specific production failure that will occur
- **Proof**: Point to the exact failing code in the diff

### Priority Levels

- **[P0] Critical**: Blocking release. Universal issue (affects ANY input). Examples: Race conditions, null derefs, SQL injection, XSS, auth bypasses, data corruption
- **[P1] High**: Will break in production under specific conditions. Examples: Logic errors, resource leaks, memory leaks
- **[P2] Important**: Performance or maintainability issues. Examples: N+1 queries, O(n^2) algorithms, missing validation
- **[P3] Low**: Code quality concerns. Examples: Code smells, magic numbers, overly complex logic

### Comment Guidelines

1. Clear about why the issue is a bug
2. Appropriately communicate severity (don't overstate)
3. Brief - at most 1 paragraph per finding
4. No code chunks longer than 3 lines
5. Explicitly state scenarios/inputs necessary for the bug
6. Matter-of-fact tone, not accusatory or overly positive
7. Reader should understand within 5 seconds
8. Avoid "Great job...", "Thanks for...", "Consider...", "Perhaps..."

### Review Process

1. **List files first**: Run diff --name-only to get changed files
2. **Per-file analysis**: For each file, see its specific changes
3. **Batch pattern search**: Use grep for common bug patterns (null, undefined, TODO, FIXME)
4. **Selective deep dive**: Only read full file when diff alone is insufficient
5. **Focus on changes**: Check edge cases - empty inputs, null values, boundary conditions, error paths

### Output Format

```markdown
### Branch Info
- **Current branch**: [branch name]
- **Target branch**: [master or specified]
- **Files changed**: [count]

### Issues Found

**Critical (P0/P1)**
- **[P0] Brief title** (`file.go:45-52`)
  - **Issue**: What's wrong
  - **Impact**: How this breaks in production
  - **Trigger**: Specific input/scenario

**Important (P2)**
- **[P2] Title** (`file.go:89-94`)
  - **Issue**: Performance/validation problem
  - **Impact**: User impact or degradation

**Minor (P3)**
- **[P3] Title** (`util.go:34`)
  - **Issue**: Code quality concern
  - **Suggestion**: How to improve

### Summary
1-2 sentences. If no critical issues found, say so explicitly.
Total issues: X critical, Y important, Z minor.

### Overall Verdict
**Status**: Patch is correct | Patch has blocking issues

**Explanation**: 1-2 sentences. Ignore non-blocking issues (style, formatting, typos, docs).

*Correct = existing code won't break, no bugs, free of blocking issues.*
```

Start by running the commands to get branch info and list changed files, then analyze each file's diff individually.
