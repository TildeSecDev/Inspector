import os
import json

# Configuration: set the range of chapters to generate
CHAPTER_RANGE = range(1, 13)  # 1 to 12 inclusive

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MIRA_CHAPTERS_DIR = os.path.join(BASE_DIR, '..', 'examples', 'mira', 'chapters')

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mira - Chapter {n} Intro</title>
  <link rel="stylesheet" href="chapter{n}_intro.css">
</head>
<body>
  <div class="chapter-intro">
    <h1 id="chapter-title"></h1>
    <p id="chapter-description"></p>
    <div id="chapter-dialogue"></div>
  </div>
  <script src="chapter{n}_intro.js"></script>
</body>
</html>
"""

CSS_TEMPLATE = """.chapter-intro {{
  max-width: 600px;
  margin: 60px auto;
  padding: 32px;
  background: rgba(30,30,40,0.92);
  border-radius: 16px;
  border: 2px solid #ffe066;
  color: #ffe066;
  font-family: 'Kanit', 'Tomorrow', monospace;
  box-shadow: 0 2px 12px #0005;
}}
#chapter-title {{
  font-size: 2rem;
  margin-bottom: 18px;
}}
#chapter-description {{
  font-size: 1.15rem;
  margin-bottom: 24px;
  color: #fff;
}}
#chapter-dialogue {{
  color: #fff;
  font-size: 1.1rem;
  margin-top: 18px;
}}
"""

JS_TEMPLATE = """fetch('chapter{n}_intro.json')
  .then(res => res.json())
  .then(data => {{
    document.getElementById('chapter-title').textContent = data.title || `Chapter {n}`;
    document.getElementById('chapter-description').textContent = data.description || '';
    if (Array.isArray(data.dialogue)) {{
      document.getElementById('chapter-dialogue').innerHTML = data.dialogue.map(line => `<div>${{line}}</div>`).join('');
    }}
  }});
"""

JSON_TEMPLATE = {
    "type": "chapter",
    "chapter": None,
    "title": "Chapter {n} Title",
    "description": "Short description for Chapter {n}.",
    "dialogue": [
        "Mira: \"Welcome to Chapter {n}!\""
    ]
}

def main():
    for n in CHAPTER_RANGE:
        chapter_dir = os.path.join(MIRA_CHAPTERS_DIR, f'chapter{n}')
        os.makedirs(chapter_dir, exist_ok=True)

        # HTML
        html_path = os.path.join(chapter_dir, f'chapter{n}_intro.html')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(HTML_TEMPLATE.format(n=n))

        # CSS
        css_path = os.path.join(chapter_dir, f'chapter{n}_intro.css')
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(CSS_TEMPLATE)

        # JS
        js_path = os.path.join(chapter_dir, f'chapter{n}_intro.js')
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(JS_TEMPLATE.format(n=n))

        # JSON (only create if not exists)
        json_path = os.path.join(chapter_dir, f'chapter{n}_intro.json')
        if not os.path.exists(json_path):
            json_data = JSON_TEMPLATE.copy()
            json_data["chapter"] = n
            json_data["title"] = f"Chapter {n} Title"
            json_data["description"] = f"Short description for Chapter {n}."
            json_data["dialogue"] = [f"Mira: \"Welcome to Chapter {n}!\""]
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, indent=2)

        print(f"Generated templates for chapter {n}")

if __name__ == "__main__":
    main()
