window.addEventListener('DOMContentLoaded', () => {
  // Mira RPG logic: dialogue, validation, flag submission, and menu

  function typeText(elementId, text, speed = 30, callback) {
    const el = document.getElementById(elementId);
    el.innerHTML = '<span class="rpg-typing"></span>';
    let i = 0;
    function typeChar() {
      if (i <= text.length) {
        el.querySelector('.rpg-typing').textContent = text.slice(0, i);
        i++;
        setTimeout(typeChar, speed);
      } else {
        el.innerHTML = text;
        if (callback) callback();
      }
    }
    typeChar();
  }

  // --- Mira Story Progression Logic ---
  function renderStep(stepNum) {
    fetch(`chapters/chapter1/step${stepNum}.json`)
      .then(res => res.json())
      .then(step => {
        // Inform terminal backend which activity and step we're on
        try { window.currentWorkshopActivity = 'mira'; window.currentChapter = 'chapter1'; } catch {}
        try { if (window.socket && window.socket.readyState === 1) {
          window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
          window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: 'chapter1' }));
          window.socket.send(JSON.stringify({ type: 'set-step', step: stepNum }));
        } } catch {}
        const panel = document.querySelector('.rpg-panel') || document.body;
        panel.innerHTML = `
          <div class="rpg-dialogue-banner" style="margin-top:32px;">
            <b>${step.title}</b><br><br>
            <span>${step.description || ''}</span>
          </div>
          <div class="rpg-hint-banner" id="rpg-hints">
            <span>${(step.hints && step.hints.length) ? step.hints.join('<br>') : ''}</span>
          </div>
          <div style="margin:24px 0 0 0; text-align:center;">
            <button class="rpg-menu-btn rpg-menu-banner" id="next-step-btn">Next</button>
          </div>
        `;
        document.getElementById('next-step-btn').onclick = () => {
          fetch(`chapters/chapter1/step${stepNum + 1}.json`)
            .then(r => {
              if (r.ok) renderStep(stepNum + 1);
              else showEndOfStory();
            });
        };
      });
  }

  function showEndOfStory() {
    const panel = document.querySelector('.rpg-panel') || document.body;
    panel.innerHTML = `
      <div class="rpg-dialogue-banner" style="margin-top:32px;">
        <b>The End</b><br><br>
        <span>Congratulations! You've completed Mira's story.</span>
      </div>
    `;
  }

  function renderAvatar(characterName, facing = 'front') {
    const avatarContainer = document.getElementById('rpg-avatar');
    if (avatarContainer) {
      let imgSrc = '/assets/workshop/avatars/' + characterName.toLowerCase();
      if (characterName.toLowerCase() === 'mira') {
        imgSrc = facing === 'back'
          ? '/assets/workshop/avatars/mira/mira_6_back.png'
          : '/assets/workshop/avatars/mira/mira_6.png';
      } else if (characterName.toLowerCase() === 'alex') {
        imgSrc = '/assets/workshop/avatars/alex/alex.png';
      } else if (characterName.toLowerCase() === 'james') {
        imgSrc = '/assets/workshop/avatars/james/james.png';
      } else if (characterName.toLowerCase() === 'zara') {
        imgSrc = '/assets/workshop/avatars/zara/zara.png';
      } else {
        imgSrc += '.png';
      }
      avatarContainer.innerHTML = `
        <div class="avatar-frame">
          <img src="${imgSrc}" alt="${characterName}" />
        </div>
      `;
    }
  }

  window.addEventListener('rpg-validated', function(e) {
    const detail = e.detail || {};
    if (detail.pass && detail.flagRequired) {
      // Show flag submission input
      document.getElementById('rpg-hints').innerHTML = `
        <form id="flag-form">
          <input type="text" id="flag-input" placeholder="Enter flag here" autocomplete="off" />
          <button type="submit" class="rpg-menu-btn">Submit Flag</button>
        </form>
        <span class="hint-content">Submit the flag you found to complete this step.</span>
      `;
      document.getElementById('flag-form').onsubmit = function(ev) {
        ev.preventDefault();
        const flag = document.getElementById('flag-input').value.trim();
        fetch('/ws/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lesson_id: 'mira', flag, step: detail.stepNumber, chapter: (window.currentChapter || null) })
        })
        .then(res => res.json())
        .then(result => {
          if (result.pass) {
            typeText('rpg-text', "Correct flag! Step complete.");
            document.getElementById('rpg-hints').innerHTML = "";
          } else {
            document.getElementById('rpg-hints').innerHTML += "<div style='color:#ffb;'>Incorrect flag. Try again.</div>";
          }
        });
      };
    } else if (detail.pass) {
      typeText('rpg-text', "Step complete! Well done.");
      document.getElementById('rpg-hints').innerHTML = "";
    } else {
      document.getElementById('rpg-hints').innerHTML = `<span class="hint-content">Hint: ${detail.hint || "Try the required command or process."}</span>`;
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    renderStep(1);
  });

  // Example: Dynamically load and display Mira's steps
  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.mira-story-container');
    if (!container) return;
    // Example: Load step6.json and display its title/description
    try {
      const res = await fetch('/examples/mira/step6.json');
      const step = await res.json();
      const stepDiv = document.createElement('div');
      stepDiv.innerHTML = `<h3>${step.title}</h3><p>${step.description}</p>`;
      container.appendChild(stepDiv);
    } catch (e) {
      // Ignore if not found
    }
  });

  // --- Dropdown logic ---
  const dropdownLabel = document.getElementById('dropdown-label');
  const dropdownList = document.getElementById('chapter-list');
  const chapterDropdown = document.getElementById('chapter-dropdown');
  let dropdownOpen = false;
  dropdownLabel.onclick = () => {
    dropdownOpen = !dropdownOpen;
    dropdownList.classList.toggle('open', dropdownOpen);
    dropdownLabel.textContent = dropdownOpen ? 'Pick a Chapter ▲' : 'Pick a Chapter ▼';
  };
  document.addEventListener('click', (e) => {
    if (!chapterDropdown.contains(e.target)) {
      dropdownOpen = false;
      dropdownList.classList.remove('open');
      dropdownLabel.textContent = 'Pick a Chapter ▼';
    }
  });

  // --- Chapter list logic (unified) ---
  // Discover chapters/steps either via manifest.json or by probing chapter folders
  async function fetchChapters() {
    const result = [];
    // Preferred: derive from top-level manifest.json steps
    try {
      const mres = await fetch('/ws/workshop_asset?lesson_id=mira&file=manifest.json');
      if (mres.ok) {
        const mf = await mres.json();
        if (Array.isArray(mf.steps)) {
          for (const s of mf.steps) {
            const m = s.match(/chapters\/(chapter[^/]+)\/step(\d+)\.json$/i);
            if (m) result.push(`${m[1]}_step${parseInt(m[2], 10)}`);
          }
          return [...new Set(result)];
        }
      }
    } catch {}
    // Fallback: scan chapter1..chapter12, step1..20
    for (let c = 1; c <= 12; c++) {
      const folder = `chapter${c}`;
      for (let i = 1; i <= 20; i++) {
        for (const name of [`${folder}_step${i}`, `step${i}`]) {
          for (const ext of ['json', 'html']) {
            try {
              const res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/${name}.${ext}`);
              if (res.ok) { result.push(`${folder}_step${i}`); break; }
            } catch {}
          }
        }
      }
    }
    return [...new Set(result)];
  }

  async function fetchChapterDetails(chapter) {
    try {
      const folder = chapter.split('_')[0];
      // Prefer chapter JSON (chapter_stepN.json) then stepN.json, then parse HTML
      let res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/${chapter}.json`);
      if (!res.ok) {
        const stepNum = chapter.match(/\d+$/) ? chapter.match(/\d+$/)[0] : '1';
        res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/step${stepNum}.json`);
      }
      if (res.ok) return await res.json();
      // Try HTML
      let htmlRes = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/${chapter}.html`);
      if (!htmlRes.ok) {
        const stepNum = chapter.match(/\d+$/) ? chapter.match(/\d+$/)[0] : '1';
        htmlRes = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/step${stepNum}.html`);
      }
      if (!htmlRes.ok) return {};
      const html = await htmlRes.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const titleEl = doc.querySelector('h1, h2');
      const paraEl = doc.querySelector('p');
      return { title: titleEl ? titleEl.textContent : chapter, description: paraEl ? paraEl.textContent : '' };
    } catch { return {}; }
  }
  async function getUnlockedChapters() {
    // Try to get userId from window or localStorage
    let userId = window.userId || localStorage.getItem('userId');
    if (!userId) return ["chapter1_step1"]; // fallback: only first step unlocked

    try {
      // Fetch user progress from backend
      const res = await fetch('/ws/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lesson_id: 'mira', get: true })
      });
      if (!res.ok) return ["chapter1_step1"];
      const data = await res.json();
      // Assume progress is an object like { unlockedChapters: [...] }
      if (data.progress && Array.isArray(data.progress.unlockedChapters)) {
        return data.progress.unlockedChapters.length > 0
          ? data.progress.unlockedChapters
          : ["chapter1_step1"];
      }
      // Fallback: if achievements contains chapter names, use those
      if (Array.isArray(data.achievements) && data.achievements.length > 0) {
        return data.achievements;
      }
      // Fallback: only first step unlocked
      return ["chapter1_step1"];
    } catch (e) {
      return ["chapter1_step1"];
    }
  }
  async function renderChapterList() {
    dropdownList.innerHTML = '';
    const chapters = await fetchChapters();
    const unlocked = await getUnlockedChapters();
    for (const chapter of chapters) {
      const li = document.createElement('li');
      li.style.listStyle = 'none';
      li.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'chapter-btn' + (unlocked.includes(chapter) ? ' unlocked' : ' locked');
      btn.innerHTML = `<span class="chapter-btn-content">${chapter.replace(/_/g, ' ').replace(/chapter(\d+)_step(\d+)/i, 'Chapter $1 - Step $2')}</span>`;
      btn.style.position = 'relative';
      const infoIcon = document.createElement('span');
      infoIcon.className = 'info-icon';
      infoIcon.textContent = 'i';
      infoIcon.title = 'More info';
      infoIcon.onclick = async (e) => {
        e.stopPropagation();
        const details = await fetchChapterDetails(chapter);
        let desc = details.description || 'No description available.';
        let title = details.title || chapter.replace(/_/g, ' ');
        let dialogue = details.dialogue ? `<br><b>Dialogue:</b><br>${details.dialogue.join('<br>')}` : '';
        let hints = details.hints ? `<br><b>Hints:</b><br>${(Array.isArray(details.hints) ? details.hints.join('<br>') : details.hints)}` : '';
        const popup = document.createElement('div');
        popup.className = 'chapter-info-popup';
        popup.innerHTML = `
          <div class="chapter-info-content">
            <div style="font-size:1.3rem;color:#ffe066;margin-bottom:12px;">${title}</div>
            <div style="color:#fff;white-space:pre-line;font-size:1.05rem;margin-bottom:12px;">${desc}</div>
            ${dialogue}
            ${hints}
            <button id="close-info-btn">Close</button>
          </div>
        `;
        document.body.appendChild(popup);
        document.getElementById('close-info-btn').onclick = () => popup.remove();
      };
      btn.appendChild(infoIcon);
      btn.onclick = async () => {
        if (btn.classList.contains('locked')) {
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 400);
        } else {
          // Use nested path for chapter HTML (derive folder from chapter id), fallback to stepN.html
          const folder = chapter.split('_')[0];
          let res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/${chapter}.html`);
          if (!res.ok) {
            const stepNum = chapter.match(/\d+$/) ? chapter.match(/\d+$/)[0] : '1';
            res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/step${stepNum}.html`);
          }
          if (res.ok) {
            const html = await res.text();
            let container = null;
            if (window.parent && window.parent.document) {
              container = window.parent.document.getElementById('workshop-container');
            }
            if (!container) container = document.getElementById('workshop-container');
            if (container) {
              container.innerHTML = html;
              // Notify backend of activity/chapter/step context
              try { window.currentWorkshopActivity = 'mira'; } catch {}
              const parts = chapter.split('_');
              const chapterName = parts[0];
              const stepNum = parseInt((parts[1]||'').replace(/[^0-9]/g,''), 10) || parseInt((chapter.match(/\d+$/)||[''])[0], 10) || null;
              try { window.currentChapter = chapterName; } catch {}
              try { if (window.socket && window.socket.readyState === 1) {
                window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
                window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: chapterName }));
                if (stepNum) window.socket.send(JSON.stringify({ type: 'set-step', step: stepNum }));
              } } catch {}
            } else {
              alert('Failed to find workshop container.');
            }
          } else {
            alert('Failed to load chapter.');
          }
        }
      };
      li.appendChild(btn);
      dropdownList.appendChild(li);
    }
    // Make dropdown scrollable (ensure CSS is applied)
    dropdownList.style.maxHeight = '260px';
    dropdownList.style.overflowY = 'auto';
  }

  document.getElementById('begin-btn').onclick = async () => {
    startMiraStory();
  };
  document.getElementById('back-btn').onclick = async () => {
    let container = null;
    if (window.parent && window.parent.document) {
      container = window.parent.document.getElementById('workshop-container');
    }
    if (!container) {
      container = document.getElementById('workshop-container');
    }
    if (container) {
      try {
        const res = await fetch('/ws/workshop?lesson_id=rpg');
        const data = await res.json();
        if (data.indexHtml) {
          // Remove all children from the container
          container.innerHTML = '';

          // Remove previously injected RPG style/script tags from head/body
          document.querySelectorAll('link[data-rpg-style],script[data-rpg-script]').forEach(e => e.remove());

          // Parse and inject RPG HTML, but only the inner .workshop-root (avoid <html>/<body> nesting)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = data.indexHtml;

          // Remove <style> and <script> tags from the fragment to avoid redeclaration
          tempDiv.querySelectorAll('style,script').forEach(tag => tag.remove());

          // Find .workshop-root and inject only its outerHTML
          const root = tempDiv.querySelector('.workshop-root');
          if (root) {
            container.innerHTML = root.outerHTML;
          } else {
            container.innerHTML = tempDiv.innerHTML;
          }

          // Dynamically load RPG style.css if not already present
          if (data.hasStyle && !document.querySelector('link[data-rpg-style]')) {
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = `/ws/workshop_asset?lesson_id=rpg&file=style.css`;
            style.setAttribute('data-rpg-style', '1');
            document.head.appendChild(style);
          }
          // Dynamically load RPG logic.js in a closure to avoid global redeclaration
          if (data.hasLogic && !document.querySelector('script[data-rpg-script]')) {
            const script = document.createElement('script');
            script.src = `/ws/workshop_asset?lesson_id=rpg&file=logic.js`;
            script.setAttribute('data-rpg-script', '1');
            // Use type="module" to avoid polluting global scope and redeclaration errors
            script.type = 'module';
            document.body.appendChild(script);
          }
        } else {
          container.innerHTML = '<div>Failed to load RPG workshop.</div>';
        }
      } catch (e) {
        container.innerHTML = '<div>Workshop load error.</div>';
      }
    } else {
      window.location.href = '/editor';
    }
  };
  renderChapterList();
});

// Replace startMiraStory to load demo.html and the demo project
async function startMiraStory() {
  // Always load the demo.html for the demo project
  let res = await fetch('/ws/workshop_asset?lesson_id=mira&file=chapters/demo/demo.html');
  if (res.ok) {
    const html = await res.text();
    let container = null;
    if (window.parent && window.parent !== window && window.parent.document.getElementById('workshop-container')) {
      container = window.parent.document.getElementById('workshop-container');
    } else if (document.getElementById('workshop-container')) {
      container = document.getElementById('workshop-container');
    }
    if (container) {
      container.innerHTML = html;
      // Dynamically inject demo.css and logic.js if not already present
      // Remove any previous demo style/script
      document.querySelectorAll('link[data-demo-style],script[data-demo-logic]').forEach(e => e.remove());
      // Add demo.css
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/ws/workshop_asset?lesson_id=mira&file=chapters/demo/demo.css';
      style.setAttribute('data-demo-style', '1');
      document.head.appendChild(style);
      // Add logic.js
      const script = document.createElement('script');
      script.src = '/ws/workshop_asset?lesson_id=mira&file=chapters/demo/logic.js';
      script.setAttribute('data-demo-logic', '1');
      document.body.appendChild(script);
      // Tell backend we're in the demo chapter
      try { window.currentWorkshopActivity = 'mira'; window.currentChapter = 'demo'; } catch {}
      try { if (window.socket && window.socket.readyState === 1) {
        window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
        window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: 'demo' }));
      } } catch {}
    } else {
      // Standalone: replace document
      const container = document.getElementById('workshop-container') || document.body;
      container.innerHTML = html;
      try { window.currentWorkshopActivity = 'mira'; window.currentChapter = 'demo'; } catch {}
      try { if (window.socket && window.socket.readyState === 1) {
        window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
        window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: 'demo' }));
      } } catch {}
    }
  } else {
    alert('Failed to load Mira demo.');
  }
}

function miraSetup() {
  // --- Begin Button ---
  const beginBtn = document.getElementById('begin-btn');
  if (beginBtn) {
    beginBtn.onclick = async () => {
      // Try chapter1_step1.html first, then fallback to demo.html
      let res = await fetch('/ws/workshop_asset?lesson_id=mira&file=chapters/demo/demo.html');
      if (!res.ok) {
        res = await fetch('/ws/workshop_asset?lesson_id=mira&file=chapters/demo/demo.html');
      }
      if (res.ok) {
        const html = await res.text();
        const cont = document.getElementById('workshop-container');
        cont.innerHTML = html;
        try { window.currentWorkshopActivity = 'mira'; window.currentChapter = 'demo'; } catch {}
        try { if (window.socket && window.socket.readyState === 1) {
          window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
          window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: 'demo' }));
        } } catch {}
      } else {
        alert('Failed to load chapter.');
      }
    };
  }

  // --- Back Button ---
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.onclick = async () => {
      // Always use the top-level #workshop-container in the main editor
      let container = null;
      if (window.parent && window.parent.document) {
        container = window.parent.document.getElementById('workshop-container');
      }
      if (!container) {
        container = document.getElementById('workshop-container');
      }
      if (container) {
        try {
          const res = await fetch('/ws/workshop?lesson_id=rpg');
          const data = await res.json();
          if (data.indexHtml) {
            // Remove all children from the container
            container.innerHTML = '';

            // Remove previously injected RPG style/script tags from head/body
            document.querySelectorAll('link[data-rpg-style],script[data-rpg-script]').forEach(e => e.remove());

            // Parse and inject RPG HTML, but only the inner .workshop-root (avoid <html>/<body> nesting)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.indexHtml;

            // Remove <style> and <script> tags from the fragment
            tempDiv.querySelectorAll('style,script').forEach(tag => tag.remove());

            // Find .workshop-root and inject only its outerHTML
            const root = tempDiv.querySelector('.workshop-root');
            if (root) {
              container.innerHTML = root.outerHTML;
            } else {
              container.innerHTML = tempDiv.innerHTML;
            }

            // Add RPG style.css if not already present
            if (data.hasStyle && !document.querySelector('link[data-rpg-style]')) {
              const style = document.createElement('link');
              style.rel = 'stylesheet';
              style.href = `/ws/workshop_asset?lesson_id=rpg&file=style.css`;
              style.setAttribute('data-rpg-style', '1');
              document.head.appendChild(style);
            }
            // Add RPG logic.js if not already present
            if (data.hasLogic && !document.querySelector('script[data-rpg-script]')) {
              const script = document.createElement('script');
              script.src = `/ws/workshop_asset?lesson_id=rpg&file=logic.js`;
              script.setAttribute('data-rpg-script', '1');
              document.body.appendChild(script);
            }
          } else {
            container.innerHTML = '<div>Failed to load RPG workshop.</div>';
          }
        } catch (e) {
          container.innerHTML = '<div>Workshop load error.</div>';
        }
      } else {
        window.location.href = '/editor';
      }
    };
  }

  // --- Chapter Dropdown ---
  const dropdownLabel = document.getElementById('dropdown-label');
  const dropdownList = document.getElementById('chapter-list');
  const chapterDropdown = document.getElementById('chapter-dropdown');
  let dropdownOpen = false;
  if (dropdownLabel && dropdownList && chapterDropdown) {
    dropdownLabel.onclick = () => {
      dropdownOpen = !dropdownOpen;
      dropdownList.classList.toggle('open', dropdownOpen);
      dropdownLabel.textContent = dropdownOpen ? 'Pick a Chapter ▲' : 'Pick a Chapter ▼';
    };
    document.addEventListener('click', (e) => {
      if (!chapterDropdown.contains(e.target)) {
        dropdownOpen = false;
        dropdownList.classList.remove('open');
        dropdownLabel.textContent = 'Pick a Chapter ▼';
      }
    });
  }

  // --- Chapter List Logic ---
  // Hardcode the chapters for now
  function fetchChapters() {
    // List your chapters here
    return [
      "chapter1_step1"
      // Add more steps if you have them, e.g. "chapter1_step2", ...
    ];
  }
  async function fetchChapterDetails(chapter) {
    try {
      // Try both possible file names for JSON
      let res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/chapter1/${chapter}.json`);
      if (!res.ok) {
        // fallback: try step1.json, step2.json, etc.
        const stepNum = chapter.match(/\d+$/) ? chapter.match(/\d+$/)[0] : "1";
        res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/chapter1/step${stepNum}.json`);
      }
      if (!res.ok) return {};
      const data = await res.json();
      return data;
    } catch {
      return {};
    }
  }
  async function getUnlockedChapters() {
    // Try to get userId from window or localStorage
    let userId = window.userId || localStorage.getItem('userId');
    if (!userId) return ["chapter1_step1"]; // fallback: only first step unlocked

    try {
      // Fetch user progress from backend
      const res = await fetch('/ws/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lesson_id: 'mira', get: true })
      });
      if (!res.ok) return ["chapter1_step1"];
      const data = await res.json();
      // Assume progress is an object like { unlockedChapters: [...] }
      if (data.progress && Array.isArray(data.progress.unlockedChapters)) {
        return data.progress.unlockedChapters.length > 0
          ? data.progress.unlockedChapters
          : ["chapter1_step1"];
      }
      // Fallback: if achievements contains chapter names, use those
      if (Array.isArray(data.achievements) && data.achievements.length > 0) {
        return data.achievements;
      }
      // Fallback: only first step unlocked
      return ["chapter1_step1"];
    } catch (e) {
      return ["chapter1_step1"];
    }
  }
  async function renderChapterList() {
    if (!dropdownList) return;
    dropdownList.innerHTML = '';
    const chapters = fetchChapters();
    const unlocked = await getUnlockedChapters();
    for (const chapter of chapters) {
      const li = document.createElement('li');
      li.style.listStyle = 'none';
      li.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'chapter-btn' + (unlocked.includes(chapter) ? ' unlocked' : ' locked');
      btn.innerHTML = `<span class="chapter-btn-content">${chapter.replace(/_/g, ' ').replace(/chapter(\d+)_step(\d+)/i, 'Chapter $1 - Step $2')}</span>`;
      btn.style.position = 'relative';
      const infoIcon = document.createElement('span');
      infoIcon.className = 'info-icon';
      infoIcon.textContent = 'i';
      infoIcon.title = 'More info';
      infoIcon.onclick = async (e) => {
        e.stopPropagation();
        const details = await fetchChapterDetails(chapter);
        let desc = details.description || 'No description available.';
        let title = details.title || chapter.replace(/_/g, ' ');
        let dialogue = details.dialogue ? `<br><b>Dialogue:</b><br>${details.dialogue.join('<br>')}` : '';
        let hints = details.hints ? `<br><b>Hints:</b><br>${(Array.isArray(details.hints) ? details.hints.join('<br>') : details.hints)}` : '';
        const popup = document.createElement('div');
        popup.className = 'chapter-info-popup';
        popup.innerHTML = `
          <div class="chapter-info-content">
            <div style="font-size:1.3rem;color:#ffe066;margin-bottom:12px;">${title}</div>
            <div style="color:#fff;white-space:pre-line;font-size:1.05rem;margin-bottom:12px;">${desc}</div>
            ${dialogue}
            ${hints}
            <button id="close-info-btn">Close</button>
          </div>
        `;
        document.body.appendChild(popup);
        document.getElementById('close-info-btn').onclick = () => popup.remove();
      };
      btn.appendChild(infoIcon);
      btn.onclick = async () => {
        if (btn.classList.contains('locked')) {
          btn.classList.add('shake');
          setTimeout(() => btn.classList.remove('shake'), 400);
        } else {
          // Derive folder and try chapter html then stepN.html
          const folder = chapter.split('_')[0];
          let res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/${chapter}.html`);
          if (!res.ok) {
            const stepNum = chapter.match(/\d+$/) ? chapter.match(/\d+$/)[0] : '1';
            res = await fetch(`/ws/workshop_asset?lesson_id=mira&file=chapters/${folder}/step${stepNum}.html`);
          }
          if (res.ok) {
            const html = await res.text();
            const cont = document.getElementById('workshop-container') || document.body;
            cont.innerHTML = html;
            // Notify backend of chapter/step
            try { window.currentWorkshopActivity = 'mira'; window.currentChapter = chapter.split('_')[0]; } catch {}
            try { if (window.socket && window.socket.readyState === 1) {
              window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
              window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: window.currentChapter }));
              const sn = parseInt((chapter.match(/\d+$/) || ['1'])[0], 10) || 1;
              window.socket.send(JSON.stringify({ type: 'set-step', step: sn }));
            } } catch {}
          } else {
            alert('Failed to load chapter.');
          }
        }
      };
      li.appendChild(btn);
      dropdownList.appendChild(li);
    }
  }
  renderChapterList();
}

// Attach miraSetup either immediately or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', miraSetup);
} else {
  miraSetup();
}
