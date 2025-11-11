fetch('chapter4_intro.json')
  .then(res => res.json())
  .then(data => {
    document.getElementById('chapter-title').textContent = data.title || `Chapter 4`;
    document.getElementById('chapter-description').textContent = data.description || '';
    if (Array.isArray(data.dialogue)) {
      document.getElementById('chapter-dialogue').innerHTML = data.dialogue.map(line => `<div>${line}</div>`).join('');
    }
  });
