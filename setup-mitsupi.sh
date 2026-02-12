#!/usr/bin/env bash
# Consolidate everything into ~/.pi/agent/packages/mitsupi-custom/:
#   - Selected extensions, skills, themes from mitsuhiko/agent-stuff (upstream)
#   - Our own custom extensions, skills, and prompts from this repo
#
# Re-run to update.

set -euo pipefail

REPO_URL="https://github.com/mitsuhiko/agent-stuff.git"
CLONE_DIR="/tmp/mitsupi-clone"
DEST="$HOME/.pi/agent/packages/mitsupi-custom"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Custom extensions (from this repo's extensions/ dir)
if [[ -d "$SCRIPT_DIR/extensions" ]]; then
  echo "Installing custom extensions..."
  for ext in "$SCRIPT_DIR"/extensions/*.ts; do
    [[ -f "$ext" ]] || continue
    name="$(basename "$ext")"
    cp "$ext" "$DEST/extensions/$name"
    echo "  ext (custom): $name"
  done
fi

# Custom skills (from this repo's skills/ dir)
if [[ -d "$SCRIPT_DIR/skills" ]]; then
  echo "Installing custom skills..."
  for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    name="$(basename "$skill_dir")"
    rm -rf "$DEST/skills/$name"
    cp -r "$skill_dir" "$DEST/skills/$name"
    echo "  skill (custom): $name"
  done
fi

# Custom prompts (from this repo's prompts/ dir)
mkdir -p "$DEST/prompts"
if [[ -d "$SCRIPT_DIR/prompts" ]]; then
  echo "Installing custom prompts..."
  for prompt in "$SCRIPT_DIR"/prompts/*.md; do
    [[ -f "$prompt" ]] || continue
    name="$(basename "$prompt")"
    cp "$prompt" "$DEST/prompts/$name"
    echo "  prompt (custom): $name"
  done
fi

# Package manifest
cat > "$DEST/package.json" <<'EOF'
{
  "name": "mitsupi-custom",
  "version": "1.0.0",
  "description": "Extensions, skills, prompts, and themes — upstream (mitsuhiko) + custom",
  "type": "module",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
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
