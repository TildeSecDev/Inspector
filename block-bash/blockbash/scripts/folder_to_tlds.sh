#!/bin/bash

EXAMPLES_DIR="../examples"

echo "==== Pre-made .tlds files in $EXAMPLES_DIR ===="
find "$EXAMPLES_DIR" -maxdepth 1 -type f -name "*.tlds" -exec basename {} \;

echo ""
echo "==== Folders in $EXAMPLES_DIR ===="
find "$EXAMPLES_DIR" -maxdepth 1 -type d ! -name "." ! -name ".." -exec basename {} \;

echo ""
echo "Options:"
echo "1) Create a .tlds file from an existing folder"
echo "2) Create a new .tlds folder template"
echo "3) Convert a .tlds file back into a folder for editing"
echo "q) Quit"
read -p "Choose an option (1/2/3/q): " option

if [[ "$option" == "1" ]]; then
  read -p "Enter the folder name (from above) to convert to .tlds: " FOLDER
  FOLDER_PATH="$EXAMPLES_DIR/$FOLDER"
  if [ ! -d "$FOLDER_PATH" ]; then
    echo "Folder does not exist: $FOLDER_PATH"
    exit 1
  fi
  read -p "Use folder name '$FOLDER.tlds' for the .tlds file? (y/n): " yn
  if [[ "$yn" == "y" || "$yn" == "Y" ]]; then
    TLDS_NAME="$FOLDER"
  else
    read -p "Enter the name for the .tlds file (without extension): " TLDS_NAME
  fi
  ZIP_PATH="$EXAMPLES_DIR/$TLDS_NAME.tlds"
  CURDIR=$(pwd)
  cd "$EXAMPLES_DIR/$FOLDER"
  zip -r "../$TLDS_NAME.tlds" .
  cd "$CURDIR"
  echo "Created $ZIP_PATH"
  exit 0
elif [[ "$option" == "2" ]]; then
  read -p "Enter the name for the new .tlds folder: " NEWFOLDER
  NEWFOLDER_PATH="$EXAMPLES_DIR/$NEWFOLDER"
  mkdir -p "$NEWFOLDER_PATH"
  cat > "$NEWFOLDER_PATH/manifest.json" <<EOF
{
  "title": "$NEWFOLDER Workshop",
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
  cat > "$NEWFOLDER_PATH/step1.json" <<EOF
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
  touch "$NEWFOLDER_PATH/logic.js"
  touch "$NEWFOLDER_PATH/style.css"
  touch "$NEWFOLDER_PATH/validate.js"
  mkdir -p "$NEWFOLDER_PATH/assets"
  echo "Template folder created at $NEWFOLDER_PATH. Edit files before converting to .tlds."
  exit 0
elif [[ "$option" == "3" ]]; then
  read -p "Enter the .tlds file name (without .tlds extension): " TLDS
  TLDS_PATH="$EXAMPLES_DIR/$TLDS.tlds"
  if [ ! -f "$TLDS_PATH" ]; then
    echo "File does not exist: $TLDS_PATH"
    exit 1
  fi
  read -p "Enter the folder name to extract to (default: $TLDS): " EXTRACTFOLDER
  if [ -z "$EXTRACTFOLDER" ]; then
    EXTRACTFOLDER="$TLDS"
  fi
  EXTRACT_PATH="$EXAMPLES_DIR/$EXTRACTFOLDER"
  mkdir -p "$EXTRACT_PATH"
  unzip -o "$TLDS_PATH" -d "$EXTRACT_PATH"
  echo "Extracted $TLDS_PATH to $EXTRACT_PATH"
  exit 0
else
  echo "Exiting."
  exit 0
fi
