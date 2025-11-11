#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <workshop_name>"
  exit 1
fi

WORKSHOP_DIR="../examples/$1"
ASSETS_DIR="$WORKSHOP_DIR/assets"
AVATAR_DIR="$ASSETS_DIR/avatars"

mkdir -p "$WORKSHOP_DIR" "$ASSETS_DIR" "$AVATAR_DIR"

cat > "$WORKSHOP_DIR/manifest.json" <<EOF
{
  "title": "$1 Workshop",
  "author": "Your Name",
  "description": "A new workshop.",
  "steps": ["step1.json"],
  "assets": {
    "background": "assets/workshop/bg_cavestory.png",
    "css": "style.css",
    "js": "logic.js"
  },
  "startStep": 0
}
EOF

cat > "$WORKSHOP_DIR/step1.json" <<EOF
{
  "stepNumber": 1,
  "title": "Step 1",
  "description": "Describe your first step here.",
  "image": "assets/workshop/bg_cavestory.png",
  "hints": ["Hint 1", "Hint 2"],
  "validation": {
    "command": "",
    "type": "exact"
  }
}
EOF

touch "$WORKSHOP_DIR/logic.js"
touch "$WORKSHOP_DIR/style.css"
touch "$WORKSHOP_DIR/validate.js"

echo "Workshop template created at $WORKSHOP_DIR"
