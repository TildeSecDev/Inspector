#!/bin/bash

set -e

# Mira
mkdir -p examples/mira/chapters/chapter1
for i in {1..5}; do
    mv examples/mira/step${i}.json examples/mira/chapters/chapter1/step${i}.json 2>/dev/null || true
    mv examples/mira/step${i}.html examples/mira/chapters/chapter1/step${i}.html 2>/dev/null || true
    mv examples/mira/step${i}.js examples/mira/chapters/chapter1/step${i}.js 2>/dev/null || true
    mv examples/mira/step${i}.css examples/mira/chapters/chapter1/step${i}.css 2>/dev/null || true
done

# Additional Mira files
# Move chapter1_step1.html to chapters/chapter1 folder (ensure directory exists)
mkdir -p examples/mira/chapters/chapter1
mv examples/mira/chapter1_step1.html examples/mira/chapters/chapter1/chapter1_step1.html 2>/dev/null || true

# For every chapter[i]_intro.json, move file to chapters/chapter[i] folder
for file in examples/mira/chapter*_intro.json; do
    if [ -f "$file" ]; then
        # Extract the chapter number from the filename, expecting pattern 'chapter<number>_intro.json'
        chapter=$(echo "$file" | grep -o 'chapter[0-9]\+' | sed 's/chapter//')
        mkdir -p "examples/mira/chapters/chapter${chapter}"
        mv "$file" "examples/mira/chapters/chapter${chapter}/" 2>/dev/null || true
    fi
done

# RPG
mkdir -p examples/rpg/steps
mv examples/rpg/step1.json examples/rpg/steps/step1.json 2>/dev/null || true
mv examples/rpg/step1.html examples/rpg/steps/step1.html 2>/dev/null || true
mv examples/rpg/step1.js examples/rpg/steps/step1.js 2>/dev/null || true
mv examples/rpg/step1.css examples/rpg/steps/step1.css 2>/dev/null || true

# Information Gathering
mkdir -p examples/information_gathering/steps
for i in {1..10}; do
    mv examples/information_gathering/step${i}.json examples/information_gathering/steps/step${i}.json 2>/dev/null || true
    mv examples/information_gathering/step${i}.html examples/information_gathering/steps/step${i}.html 2>/dev/null || true
    mv examples/information_gathering/step${i}.js examples/information_gathering/steps/step${i}.js 2>/dev/null || true
    mv examples/information_gathering/step${i}.css examples/information_gathering/steps/step${i}.css 2>/dev/null || true
done

echo "Files moved to nested structure."
