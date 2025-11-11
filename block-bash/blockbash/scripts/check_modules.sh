#!/bin/bash

REQUIRED_MODULES=("express" "express-ws" "cookie-parser" "mongoose" "jszip" "sqlite3" "bcrypt")
MISSING=0

for mod in "${REQUIRED_MODULES[@]}"; do
  node -e "require('${mod}')" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "Missing Node.js module: $mod"
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "Some modules are missing. Running npm install..."
  npm install
else
  echo "All required Node.js modules are installed."
fi
