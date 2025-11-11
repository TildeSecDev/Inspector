#!/bin/bash

# Test script for RPG Workshop UI fixes

echo "Testing RPG Workshop..."

# Test 1: Server health check
echo "1. Testing server health..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/editor)
if [ $response -eq 200 ]; then
    echo "✓ Server is running"
else
    echo "✗ Server is not responding (HTTP $response)"
    exit 1
fi

# Test 2: Validate endpoint with passing command
echo "2. Testing validation with 'ls' command..."
response=$(curl -s -X POST http://localhost:3000/ws/validate \
  -H "Content-Type: application/json" \
  -d '{"command": "ls", "lesson_id": "rpg"}')
if echo "$response" | grep -q '"pass":true'; then
    echo "✓ 'ls' command validation passes"
else
    echo "✗ 'ls' command validation failed: $response"
fi

# Test 3: Validate endpoint with failing command
echo "3. Testing validation with 'pwd' command..."
response=$(curl -s -X POST http://localhost:3000/ws/validate \
  -H "Content-Type: application/json" \
  -d '{"command": "pwd", "lesson_id": "rpg"}')
if echo "$response" | grep -q '"pass":false'; then
    echo "✓ 'pwd' command validation fails as expected"
else
    echo "✗ 'pwd' command validation unexpectedly passed: $response"
fi

# Test 4: Check if workshop assets are accessible
echo "4. Testing workshop assets..."
response=$(curl -s "http://localhost:3000/ws/workshop_asset?lesson_id=rpg&file=style.css" | head -1)
if echo "$response" | grep -q "html, body"; then
    echo "✓ Workshop assets are accessible"
else
    echo "✗ Workshop assets not accessible: $response"
fi

# Test 5: Check if logic.js loads
echo "5. Testing logic.js..."
response=$(curl -s "http://localhost:3000/ws/workshop_asset?lesson_id=rpg&file=logic.js" | head -1)
if echo "$response" | grep -q "DEBUG.*logic.js"; then
    echo "✓ logic.js is accessible"
else
    echo "✗ logic.js not accessible: $response"
fi

echo "All tests completed!"
