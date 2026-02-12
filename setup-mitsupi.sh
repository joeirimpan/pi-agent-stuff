#!/usr/bin/env bash
# Clone mitsuhiko/agent-stuff and copy selected extensions, skills, and themes
# into ~/.pi/agent/packages/mitsupi-custom/
#
# Re-run to update from latest upstream.

set -euo pipefail

REPO_URL="https://github.com/mitsuhiko/agent-stuff.git"
CLONE_DIR="/tmp/mitsupi-clone"
DEST="$HOME/.pi/agent/packages/mitsupi-custom"

# What to copy
EXTENSIONS=(
  answer.ts
  context.ts
  control.ts
  files.ts
  loop.ts
  prompt-editor.ts
  review.ts
  session-breakdown.ts
  todos.ts
  whimsical.ts
)

SKILLS=(
  commit
  tmux
)

THEMES=(
  nightowl.json
)

echo "Cloning $REPO_URL → $CLONE_DIR"
rm -rf "$CLONE_DIR"
git clone --depth 1 "$REPO_URL" "$CLONE_DIR"

# Extensions
mkdir -p "$DEST/extensions"
for ext in "${EXTENSIONS[@]}"; do
  src="$CLONE_DIR/pi-extensions/$ext"
  if [[ -f "$src" ]]; then
    cp "$src" "$DEST/extensions/$ext"
    echo "  ext: $ext"
  else
    echo "  ext: $ext (NOT FOUND, skipping)"
  fi
done

# Skills
mkdir -p "$DEST/skills"
for skill in "${SKILLS[@]}"; do
  src="$CLONE_DIR/skills/$skill"
  if [[ -d "$src" ]]; then
    rm -rf "$DEST/skills/$skill"
    cp -r "$src" "$DEST/skills/$skill"
    echo "  skill: $skill"
  else
    echo "  skill: $skill (NOT FOUND, skipping)"
  fi
done

# Themes
mkdir -p "$DEST/themes"
for theme in "${THEMES[@]}"; do
  src="$CLONE_DIR/pi-themes/$theme"
  if [[ -f "$src" ]]; then
    cp "$src" "$DEST/themes/$theme"
    echo "  theme: $theme"
  else
    echo "  theme: $theme (NOT FOUND, skipping)"
  fi
done

# Package manifest
cat > "$DEST/package.json" <<'EOF'
{
  "name": "mitsupi-custom",
  "version": "1.0.0",
  "description": "Selected extensions and skills from mitsuhiko/agent-stuff",
  "type": "module",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "themes": ["./themes"]
  },
  "peerDependencies": {
    "@mariozechner/pi-coding-agent": "*",
    "@mariozechner/pi-ai": "*",
    "@mariozechner/pi-tui": "*"
  }
}
EOF

# Cleanup
rm -rf "$CLONE_DIR"

echo ""
echo "Done. Updated $DEST"
echo "Make sure ~/.pi/agent/settings.json has:"
echo '  "packages": ["'"$DEST"'"]'
