#!/bin/bash

# Test if the menu appears after validation
echo "Testing RPG Menu Rendering..."

# Check if the RPG worksheet is accessible
response=$(curl -s "http://localhost:3000/ws/workshop?lesson_id=rpg")
if echo "$response" | grep -q "index.html"; then
    echo "✓ RPG worksheet is accessible"
else
    echo "✗ RPG worksheet not accessible"
    exit 1
fi

# Test the validation endpoint
echo "Testing validation endpoint..."
validation_response=$(curl -s -X POST http://localhost:3000/ws/validate \
  -H "Content-Type: application/json" \
  -d '{"command": "ls", "lesson_id": "rpg"}')

if echo "$validation_response" | grep -q '"pass":true'; then
    echo "✓ Validation passes for 'ls' command"
    if echo "$validation_response" | grep -q '"menu":\["Start","Options","Progress"\]'; then
        echo "✓ Menu items are returned: Start, Options, Progress"
    else
        echo "✗ Menu items are not correct: $validation_response"
    fi
else
    echo "✗ Validation failed for 'ls' command: $validation_response"
fi

echo ""
echo "To test menu rendering in browser:"
echo "1. Go to http://localhost:3000/editor"
echo "2. Type 'ls' in the terminal"
echo "3. Check if menu buttons appear in the RPG panel"
