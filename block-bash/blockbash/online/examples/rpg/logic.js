// --- DEBUG: Confirm logic.js is loaded and running ---
if (typeof appendRPGDebugLog === 'function') {
  appendRPGDebugLog('[RPG] logic.js loaded and running');
} else {
  document.body.insertAdjacentHTML('afterbegin', '<div style="color:red;font-weight:bold;">[RPG] logic.js loaded but appendRPGDebugLog missing</div>');
}

// Enhanced RPG logic for step 1 with typing effect and avatar support
window.rpgStep = 1;

// Typing effect for RPG dialogue
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
    } // <-- closes the else
  } // <-- closes typeChar
  typeChar();
} // <-- closes typeText

function renderAvatar(characterName) {
  const avatarContainer = document.getElementById('rpg-avatar');
  if (avatarContainer) {
    avatarContainer.innerHTML = `
      <div class="avatar-frame">
        <img src="/assets/workshop/avatars/${characterName.toLowerCase()}/${characterName.toLowerCase()}.png" alt="${characterName}" />
      </div>
    `;
  }
}

function renderLogoAndLaptop() {
  let panel = document.querySelector('.rpg-panel');
  // Remove any previous laptop image to avoid duplicates
  const oldLaptop = document.getElementById('rpg-laptop-bg');
  if (oldLaptop) oldLaptop.remove();

  // Only handle the laptop image here, not the logo or title!
  if (panel && !document.getElementById('rpg-laptop-bg')) {
    const laptopBg = document.createElement('img');
    laptopBg.src = '/assets/workshop/laptop.png';
    laptopBg.alt = 'Laptop';
    laptopBg.id = 'rpg-laptop-bg';
    laptopBg.className = 'rpg-laptop rpg-loading-anim';
    laptopBg.style.position = 'absolute';
    laptopBg.style.bottom = '60px';
    laptopBg.style.left = '50%';
    laptopBg.style.transform = 'translateX(-50%)';
    laptopBg.style.zIndex = '1.5';
    laptopBg.style.opacity = '0.85';
    laptopBg.onload = () => console.log('Loaded laptop.png from /assets/workshop/laptop.png');
    laptopBg.onerror = () => console.log('Failed to load laptop.png from /assets/workshop/laptop.png');
    panel.appendChild(laptopBg);
    setTimeout(() => laptopBg.classList.add('rpg-laptop-animate'), 100);
  }
}

function renderLogoAndTitleAtTop() {
  const panel = document.querySelector('.rpg-panel');
  // Remove any previous topbar/logo/title to avoid duplicates
  let topbar = document.getElementById('rpg-topbar');
  if (topbar) topbar.remove();

  // Create topbar container
  topbar = document.createElement('div');
  topbar.id = 'rpg-topbar';
  topbar.className = 'rpg-topbar';

  // Logo
  const logo = document.createElement('img');
  logo.src = '/assets/workshop/text/logo.png';
  logo.alt = 'Logo';
  logo.id = 'rpg-logo';
  logo.className = 'rpg-logo rpg-loading-anim';
  logo.onload = () => console.log('Loaded logo.png from /assets/workshop/text/logo.png');
  logo.onerror = () => console.log('Failed to load logo.png from /assets/workshop/text/logo.png');
  topbar.appendChild(logo);

  // Animated title (Inspector RPG)
  const animatedTitle = document.createElement('div');
  animatedTitle.id = 'rpg-animated-title';
  animatedTitle.className = 'rpg-animated-title rpg-loading-anim';
  animatedTitle.innerHTML = `
    <span class="rpg-title-layer rpg-title-main">BLOCK BASH RPG</span>
    <span class="rpg-title-layer rpg-title-red">BLOCK BASH RPG</span>
    <span class="rpg-title-layer rpg-title-blue">BLOCK BASH RPG</span>
  `;
  topbar.appendChild(animatedTitle);

  // Insert topbar as the very first child of the panel
  if (panel.firstChild) {
    panel.insertBefore(topbar, panel.firstChild);
  } else {
    panel.appendChild(topbar);
  }

  // Ensure the animated title does not cover menu/content: set pointer-events:none and a high z-index only for the animation duration
  animatedTitle.style.pointerEvents = 'none';
  animatedTitle.style.zIndex = '999';

  setTimeout(() => {
    animatedTitle.classList.add('rpg-title-animate');
    logo.classList.add('rpg-logo-animate');
    // After animation, replace animated title with static image
    setTimeout(() => {
      if (animatedTitle.parentNode) {
        animatedTitle.parentNode.removeChild(animatedTitle);
        // Insert static image just under the logo
        const staticTitle = document.createElement('img');
        staticTitle.src = '/assets/workshop/text/blockbashrpg.png';
        staticTitle.alt = 'BlockBash RPG';
        staticTitle.className = 'rpg-title-img';
        staticTitle.style.display = 'block';
        staticTitle.style.margin = '12px auto 0 auto';
        staticTitle.style.maxWidth = '320px';
        staticTitle.style.width = '90vw';
        staticTitle.style.height = 'auto';
        staticTitle.style.zIndex = '202';
        staticTitle.style.position = 'static';
        logo.parentNode.insertBefore(staticTitle, logo.nextSibling);
      }
    }, 1200); // match the animation duration
  }, 100);
}

function renderCharacters() {
  // Show character images (avatars) below the dialogue if available
  let panel = document.querySelector('.rpg-panel');
  if (!document.getElementById('rpg-characters')) {
    const chars = document.createElement('div');
    chars.id = 'rpg-characters';
    chars.className = 'rpg-characters';
    chars.innerHTML = `
      <img src="/assets/workshop/avatars/alex/alex.png" alt="Alex" onerror="this.style.display='none'" />
      <img src="/assets/workshop/avatars/mira/mira.png" alt="Mira" onerror="this.style.display='none'" />
      <img src="/assets/workshop/avatars/james/james.png" alt="James" onerror="this.style.display='none'" />
      <img src="/assets/workshop/avatars/zara/zara.png" alt="Zara" onerror="this.style.display='none'" />
    `;
    panel.appendChild(chars);
  }
}

// Prevent multiple listeners
if (!window._rpgValidatedListenerAdded) {
// Listen for direct rpg-validated events
window.addEventListener('rpg-validated', async function(e) {
  appendRPGDebugLog('[RPG] rpg-validated event received: ' + JSON.stringify(e.detail));
  console.log('[RPG] rpg-validated event received:', e.detail);
  handleRPGValidation(e.detail);
});

// Listen for cross-window messages (from terminal iframe)
window.addEventListener('message', async function(e) {
  if (e.data && e.data.type === 'rpg-validated') {
    appendRPGDebugLog('[RPG] rpg-validated message received: ' + JSON.stringify(e.data.detail));
    console.log('[RPG] rpg-validated message received:', e.data.detail);
    handleRPGValidation(e.data.detail);
  }
});

async function handleRPGValidation(detail) {
  if (detail && detail.pass) {
    // If validation provides new achievements, update progress on the server
    const toAdd = [];
    if (Array.isArray(detail.achievements)) toAdd.push(...detail.achievements);
    if (detail.achievement) toAdd.push(detail.achievement);
    if (toAdd.length && window.userId) {
      try {
        const res = await fetch(`/user/progress?userId=${encodeURIComponent(window.userId)}`);
        const data = res.ok ? await res.json() : {};
        const current = Array.isArray(data.achievements) ? data.achievements : [];
        toAdd.forEach(a => { if (!current.includes(a)) current.push(a); });
        await fetch('/ws/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: window.userId, achievements: current })
        });
        document.dispatchEvent(new Event('achievement-update'));
      } catch (err) { console.error('Achievement update failed', err); }
    }

    // Always render logo and title at the top after validation
    renderLogoAndTitleAtTop();
    
    // Patch: Rename "Skill Tree" to "Progress" in menu
    if (detail.menu && Array.isArray(detail.menu)) {
      const menu = detail.menu.map(item => item === "Skill Tree" ? "Progress" : item);
      // --- Add a stack to track previous screens ---
      const menuStack = [];

      function renderMainMenu() {
        appendRPGDebugLog('[RPG] renderMainMenu() called');
        console.log('[RPG] renderMainMenu() called');
        // Always ensure logo/topbar is at the top before rendering menu
        renderLogoAndTitleAtTop();
        typeText('rpg-text', "You see a glowing terminal menu:", 30, () => {
          // Remove any previous menu overlay
          let oldOverlay = document.getElementById('rpg-menu-overlay');
          if (oldOverlay) oldOverlay.remove();

          // Create overlay for menu buttons INSIDE the RPG panel
          const panel = document.querySelector('.rpg-panel');
          const overlay = document.createElement('div');
          overlay.id = 'rpg-menu-overlay';
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100%';
          overlay.style.height = '100%';
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          overlay.style.zIndex = '10';

          // Menu container
          const menuDiv = document.createElement('div');
          menuDiv.className = 'rpg-menu-container';
          menuDiv.style.borderRadius = '16px';
          menuDiv.style.padding = '32px 40px 24px 40px';
          menuDiv.style.display = 'flex';
          menuDiv.style.flexDirection = 'column';
          menuDiv.style.alignItems = 'center';
          menuDiv.style.gap = '18px';
          menuDiv.style.minWidth = '260px';

          // --- Add visible MENU heading for test robustness ---
          const menuHeading = document.createElement('div');
          menuHeading.textContent = '--- MENU ---';
          menuHeading.style.fontWeight = 'bold';
          menuHeading.style.fontSize = '1.3rem';
          menuHeading.style.letterSpacing = '2px';
          menuHeading.style.color = '#ffe066';
          menuHeading.style.marginBottom = '12px';
          menuDiv.appendChild(menuHeading);

          // Add menu buttons
          menu.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'rpg-menu-btn rpg-menu-banner';
            button.id = `rpg-btn-${btn.replace(/\s+/g, '').toLowerCase()}`;
            button.textContent = btn;
            button.onclick = () => {
              // Push current menu to stack before rendering next
              menuStack.push(renderMainMenu);
              if (btn === 'Start') {
                renderStartMenu(menuDiv);
              } else if (btn === 'Options') {
                renderOptionsMenu(menuDiv);
              } else if (btn === 'Progress') {
                renderProgressMenu(menuDiv);
              } else {
                typeText('rpg-text', `${btn} selected. (Demo: implement action here)`);
                overlay.remove();
              }
            };
            menuDiv.appendChild(button);
          });
          overlay.appendChild(menuDiv);
          panel.appendChild(overlay);
          appendRPGDebugLog('[RPG] Menu overlay appended to panel: ' + (panel ? 'found' : 'not found'));
          // Only insert the laptop image (not the logo)
          renderLogoAndLaptop();
          // Animate menu overlay and buttons
          setTimeout(() => {
            overlay.classList.add('rpg-loading-anim', 'rpg-ui-animate');
            menuDiv.querySelectorAll('.rpg-menu-btn').forEach(btn => {
              setTimeout(() => btn.classList.add('rpg-ui-animate'), 100);
            });
          }, 100);
        });
      }

      function renderStartMenu(menuDiv) {
        menuDiv.innerHTML = '';
        ['Story Mode', 'Task Mode', 'Sandbox Mode', 'Battle Mode'].forEach(mode => {
          const modeBtn = document.createElement('button');
          modeBtn.className = 'rpg-menu-btn rpg-menu-banner';
          modeBtn.textContent = mode;
          if (mode === 'Battle Mode') {
            // Add battle icon
            const icon = document.createElement('img');
            icon.src = '/assets/achievements/battle.svg';
            icon.alt = 'Battle';
            icon.style.width = '28px';
            icon.style.height = '28px';
            icon.style.marginRight = '10px';
            modeBtn.prepend(icon);
            modeBtn.onclick = () => {
              menuStack.push(() => renderStartMenu(menuDiv));
              renderBattleModeMenu(menuDiv);
            };
          } else {
            modeBtn.onclick = () => {
              menuStack.push(() => renderStartMenu(menuDiv));
              if (mode === 'Story Mode') {
                renderStoryModeMenu(menuDiv);
              } else if (mode === 'Task Mode') {
                renderTaskModeMenu(menuDiv);
              } else if (mode === 'Sandbox Mode') {
                window.location.href = '/examples/demorpg/workshop_sandbox.html';
              }
            };
          }
          menuDiv.appendChild(modeBtn);
        });
        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => {
          if (menuStack.length > 0) {
            menuStack.pop()();
          }
        };
        menuDiv.appendChild(backBtn);
      }

      async function loadBattleWorkshop(url, name) {
        typeText('rpg-text', `Loading event: ${name}...`);
        const container = window.parent && window.parent.document.getElementById('workshop-container')
          ? window.parent.document.getElementById('workshop-container')
          : document.getElementById('workshop-container');
        if (!container) return;

        function ensureJSZip() {
          return new Promise(res => {
            if (window.JSZip) return res();
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = () => res();
            document.head.appendChild(s);
          });
        }

        try {
          await ensureJSZip();
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('download failed');
          const blob = await resp.blob();
          const zip = await JSZip.loadAsync(blob);
          const findFile = suf => {
            const lower = suf.toLowerCase();
            return Object.values(zip.files).find(f => f.name.toLowerCase().endsWith(lower));
          };
          const indexFile = findFile('index.html');
          const indexHtml = indexFile ? await indexFile.async('string') : '<div>index.html missing</div>';
          container.innerHTML = indexHtml;
          // Remove any previously injected RPG CSS/JS
          document.querySelectorAll('link[data-rpg-style],script[data-rpg-logic]').forEach(e => e.remove());
          const styleFile = findFile('style.css');
          const logicFile = findFile('logic.js');
          if (styleFile || logicFile) {
            // Use the helper for consistency, but pass blob URLs
            setTimeout(() => {
              (async () => {
                if (styleFile) {
                  const cssBlob = urlStyle || URL.createObjectURL(await styleFile.async('blob'));
                  const link = document.createElement('link');
                  link.rel = 'stylesheet';
                  link.href = cssBlob;
                  link.setAttribute('data-rpg-style','1');
                  document.head.appendChild(link);
                }
                if (logicFile) {
                  const jsBlob = urlJs || URL.createObjectURL(await logicFile.async('blob'));
                  const script = document.createElement('script');
                  script.src = jsBlob;
                  script.setAttribute('data-rpg-logic','1');
                  document.body.appendChild(script);
                }
              })();
            }, 0);
          }
        } catch (err) {
          container.innerHTML = '<div>Event load error.</div>';
        }
      }

      async function renderBattleModeMenu(menuDiv) {
        menuDiv.innerHTML = '<b>Battle Mode: Multiplayer Events & Community Workshops</b><br><div id="battle-list" style="max-height:340px;overflow-y:auto;margin-top:18px;"></div>';
        const listDiv = menuDiv.querySelector('#battle-list');
        listDiv.innerHTML = '<div style="color:#888;">Loading events...</div>';
        try {
          const res = await fetch('https://api.github.com/repos/jakkuazzo/inspectoronline/contents/events');
          if (!res.ok) throw new Error('fetch failed');
          const files = await res.json();
          listDiv.innerHTML = '';
          files.forEach(file => {
            if (file.type !== 'file') return;
            const item = document.createElement('div');
            item.className = 'battle-event-item';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.margin = '12px 0';
            item.style.padding = '10px 16px';
            item.style.background = '#f8f8f8';
            item.style.borderRadius = '8px';
            item.style.cursor = 'pointer';
            item.innerHTML = `<img src='/assets/achievements/battle.svg' style='width:32px;height:32px;'> <b>${file.name}</b>`;
            item.onclick = () => {
              if (!file.download_url) return alert('No download URL for this event.');
              loadBattleWorkshop(file.download_url, file.name);
            };
            listDiv.appendChild(item);
          });
        } catch (e) {
          listDiv.innerHTML = '<div style="color:#c00;">Failed to load events. Please try again later.</div>';
        }
      }

      function renderStoryModeMenu(menuDiv) {
        menuDiv.innerHTML = '<b>Select a Story</b><br>';
        const avatars = [
          { name: 'mira', label: 'Mira', unlocked: true, img: '/assets/workshop/avatars/mira/mira.png' },
          { name: 'alex', label: 'Alex', unlocked: false, img: '/assets/workshop/avatars/alex/alex.png' },
          { name: 'james', label: 'James', unlocked: false, img: '/assets/workshop/avatars/james/james.png' },
          { name: 'zara', label: 'Zara', unlocked: false, img: '/assets/workshop/avatars/zara/zara.png' }
        ];
        let currentIdx = 0;

        function renderAvatarScroll() {
          menuDiv.innerHTML = '<b>Select a Story</b><br>';
          const avatarRow = document.createElement('div');
          avatarRow.style.display = 'flex';
          avatarRow.style.gap = '32px';
          avatarRow.style.justifyContent = 'center';
          avatarRow.style.margin = '24px 0';
          avatarRow.style.alignItems = 'center';
          // Left scroll button
          const leftBtn = document.createElement('button');
          leftBtn.textContent = '<';
          leftBtn.className = 'rpg-menu-btn rpg-menu-banner';
          leftBtn.style.minWidth = '40px';
          leftBtn.onclick = () => {
            currentIdx = (currentIdx - 1 + avatars.length) % avatars.length;
            renderAvatarScroll();
          };
          avatarRow.appendChild(leftBtn);
          // Show 1 avatar at a time (centered)
          const av = avatars[currentIdx];
          const avDiv = document.createElement('div');
          avDiv.style.display = 'flex';
          avDiv.style.flexDirection = 'column';
          avDiv.style.alignItems = 'center';
          avDiv.style.opacity = av.unlocked ? '1' : '0.4';
          avDiv.style.cursor = av.unlocked ? 'pointer' : 'not-allowed';
          const img = document.createElement('img');
          img.src = av.img;
          img.alt = av.label;
          img.style.maxHeight = '90px';
          img.style.border = av.unlocked ? '3px solid #ffe066' : '3px solid #888';
          img.style.borderRadius = '12px';
          img.onclick = () => {
            if (!av.unlocked) {
              showLockedPopup(av.label);
              return;
            }
            typeText('rpg-text', `Loading story for ${av.label}...`);
            // Dynamically load the corresponding .TildeSec workshop in the activity window
            const workshopContainer = window.parent && window.parent.document.getElementById('workshop-container')
              ? window.parent.document.getElementById('workshop-container')
              : document.getElementById('workshop-container');
            if (workshopContainer) {
              fetch(`/ws/workshop?lesson_id=${av.name}`)
                .then(res => res.json())
                .then(data => {
                  if (data.indexHtml) {
                    // Remove any previously injected RPG CSS/JS
                    document.querySelectorAll('link[data-rpg-style],script[data-rpg-logic]').forEach(e => e.remove());
                    // Replace the workshop container HTML
                    workshopContainer.innerHTML = data.indexHtml;
                    // Wait for DOM update before injecting assets
                    setTimeout(() => {
                      // Only inject style if present
                      if (data.hasStyle) {
                        const style = document.createElement('link');
                        style.rel = 'stylesheet';
                        style.href = `/ws/workshop_asset?lesson_id=${av.name}&file=style.css`;
                        style.setAttribute('data-rpg-style', '1');
                        document.head.appendChild(style);
                      }
                      // Only inject logic if present
                      if (data.hasLogic) {
                        const script = document.createElement('script');
                        script.src = `/ws/workshop_asset?lesson_id=${av.name}&file=logic.js`;
                        script.setAttribute('data-rpg-logic', '1');
                        document.body.appendChild(script);
                      }
                    }, 0);
                  } else {
                    workshopContainer.innerHTML = '<div>Failed to load story workshop.</div>';
                  }
                })
                .catch(() => {
                  workshopContainer.innerHTML = '<div>Workshop load error.</div>';
                });
            }
          };
          avDiv.appendChild(img);
          const lbl = document.createElement('span');
          lbl.textContent = av.label;
          avDiv.appendChild(lbl);
          avatarRow.appendChild(avDiv);
          // Right scroll button
          const rightBtn = document.createElement('button');
          rightBtn.textContent = '>';
          rightBtn.className = 'rpg-menu-btn rpg-menu-banner';
          rightBtn.style.minWidth = '40px';
          rightBtn.onclick = () => {
            currentIdx = (currentIdx + 1) % avatars.length;
            renderAvatarScroll();
          };
          avatarRow.appendChild(rightBtn);
          menuDiv.appendChild(avatarRow);
          const info = document.createElement('div');
          info.style.marginTop = '12px';
          info.textContent = 'Click an unlocked character to begin their story.';
          menuDiv.appendChild(info);
          // Back button
          const backBtn = document.createElement('button');
          backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
          backBtn.textContent = 'Back';
          backBtn.onclick = () => {
            if (menuStack.length > 0) {
              menuStack.pop()();
            }
          };
          menuDiv.appendChild(backBtn);
        }
        // Helper: Show popup for locked story
        function showLockedPopup(label) {
          // Remove any existing popup
          const existing = document.getElementById('rpg-locked-popup');
          if (existing) existing.remove();
          const popup = document.createElement('div');
          popup.id = 'rpg-locked-popup';
          popup.style.position = 'fixed';
          popup.style.top = '0';
          popup.style.left = '0';
          popup.style.width = '100vw';
          popup.style.height = '100vh';
          popup.style.background = 'rgba(0,0,0,0.6)';
          popup.style.display = 'flex';
          popup.style.alignItems = 'center';
          popup.style.justifyContent = 'center';
          popup.style.zIndex = '9999';
          popup.innerHTML = `
            <div style="background:#222;padding:32px 48px;border-radius:16px;box-shadow:0 0 24px #000a;text-align:center;">
              <div style="font-size:1.3rem;color:#ffe066;margin-bottom:18px;">You haven't unlocked this story yet</div>
              <button style="padding:10px 32px;font-size:1.1rem;background:#ffe066;color:#222;border:none;border-radius:8px;cursor:pointer;" id="rpg-locked-close">Close</button>
            </div>
          `;
          document.body.appendChild(popup);
          document.getElementById('rpg-locked-close').onclick = () => popup.remove();
        }
        renderAvatarScroll();
      }

      function renderTaskModeMenu(menuDiv) {
        menuDiv.innerHTML = '<b>Select a Topic</b><br>';
        Promise.all([
          fetch('/ws/list_topics').then(res => res.json()),
          fetch('/examples/tasks.json').then(res => res.json())
        ]).then(([topicList, tasksJson]) => {
          // Defensive: ensure topicList is an array
          if (!Array.isArray(topicList) || topicList.length === 0) {
            // Show a message if no topics are available
            const msg = document.createElement('div');
            msg.style.color = '#ffe066';
            msg.style.margin = '32px 0';
            msg.style.fontSize = '1.15rem';
            msg.style.textAlign = 'center';
            msg.textContent = 'No tasks are available at this time.';
            menuDiv.appendChild(msg);
            // Back button
            const backBtn = document.createElement('button');
            backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
            backBtn.textContent = 'Back';
            backBtn.onclick = () => {
              if (typeof menuStack !== 'undefined' && menuStack.length > 0) {
                menuStack.pop()();
              }
            };
            menuDiv.appendChild(backBtn);
            return;
          }

          // Container for topic buttons
          const topicsContainer = document.createElement('div');
          topicsContainer.style.display = 'flex';
          topicsContainer.style.flexDirection = 'column';
          topicsContainer.style.alignItems = 'center';
          topicsContainer.style.gap = '18px';
          topicsContainer.style.width = '100%';

          let topicCount = 0;
          topicList.forEach(topicFile => {
            // Remove .TildeSec extension for display and lookup
            const topicName = topicFile.name.replace(/\.TildeSec$/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const topicKey = topicFile.name.replace(/\.TildeSec$/i, '');
            // Find details in tasks.json (case-insensitive match)
            let details = '';
            let foundKey = Object.keys(tasksJson.DragBlockTasks || {}).find(k =>
              k.toLowerCase().replace(/[\s&]+/g, '_').replace(/[^a-z0-9_]/g, '') === topicKey.toLowerCase()
            );
            if (foundKey) {
              const tasks = tasksJson.DragBlockTasks[foundKey];
              if (Array.isArray(tasks) && tasks.length) {
                details = tasks.map(t => t.scenario || t.hint || t.hints?.[0] || t.name).join('\n');
              }
            }
            // Truncate details for overlay
            const truncated = details ? details.split('\n').slice(0, 3).join('\n') : 'No details available.';

            // Topic button container
            const topicDiv = document.createElement('div');
            topicDiv.style.position = 'relative';
            topicDiv.style.margin = '18px 0';
            topicDiv.style.padding = '18px 18px 18px 32px';
            topicDiv.style.border = '2px solid #ffe066';
            topicDiv.style.borderRadius = '12px';
            topicDiv.style.background = 'rgba(30,30,40,0.92)';
            topicDiv.style.cursor = 'pointer';
            topicDiv.style.minWidth = '220px';
            topicDiv.style.maxWidth = '420px';
            topicDiv.style.display = 'flex';
            topicDiv.style.alignItems = 'center';
            topicDiv.style.justifyContent = 'flex-start';
            topicDiv.style.fontWeight = 'bold';
            topicDiv.style.fontSize = '1.1rem';

            // Info icon
            const infoBtn = document.createElement('div');
            infoBtn.textContent = 'i';
            infoBtn.style.position = 'absolute';
            infoBtn.style.top = '8px';
            infoBtn.style.right = '12px';
            infoBtn.style.width = '24px';
            infoBtn.style.height = '24px';
            infoBtn.style.background = '#ffe066';
            infoBtn.style.color = '#222';
            infoBtn.style.borderRadius = '50%';
            infoBtn.style.display = 'flex';
            infoBtn.style.alignItems = 'center';
            infoBtn.style.justifyContent = 'center';
            infoBtn.style.fontWeight = 'bold';
            infoBtn.style.cursor = 'pointer';
            infoBtn.style.zIndex = '2';
            infoBtn.title = 'More info';
            infoBtn.onclick = (e) => {
              e.stopPropagation();
              // Overlay for topic info
              let overlay = document.getElementById('topic-info-overlay');
              if (overlay) overlay.remove();
              overlay = document.createElement('div');
              overlay.id = 'topic-info-overlay';
              overlay.style.position = 'fixed';
              overlay.style.top = '0';
              overlay.style.left = '0';
              overlay.style.width = '100vw';
              overlay.style.height = '100vh';
              overlay.style.background = 'rgba(0,0,0,0.7)';
              overlay.style.display = 'flex';
              overlay.style.alignItems = 'center';
              overlay.style.justifyContent = 'center';
              overlay.style.zIndex = '9999';
              overlay.innerHTML = `
                <div style="background:#232946;padding:32px 40px;border-radius:16px;max-width:480px;box-shadow:0 0 24px #000a;text-align:left;">
                  <div style="font-size:1.4rem;color:#ffe066;margin-bottom:18px;">${topicName}</div>
                  <div style="color:#fff;white-space:pre-line;font-size:1.05rem;margin-bottom:18px;">${truncated}</div>
                  <button style="padding:10px 32px;font-size:1.1rem;background:#ffe066;color:#222;border:none;border-radius:8px;cursor:pointer;" id="topic-info-close">Close</button>
                </div>
              `;
              document.body.appendChild(overlay);
              document.getElementById('topic-info-close').onclick = () => overlay.remove();
            };

            // Topic button text
            const title = document.createElement('span');
            title.textContent = topicName;
            title.style.flex = '1';
            title.style.pointerEvents = 'none';

            topicDiv.appendChild(title);
            topicDiv.appendChild(infoBtn);

            // On click, load the topic's .TildeSec into the activity window
            topicDiv.onclick = () => {
              typeText('rpg-text', `Loading topic: ${topicName}...`);
              const workshopContainer = window.parent && window.parent.document.getElementById('workshop-container')
                ? window.parent.document.getElementById('workshop-container')
                : document.getElementById('workshop-container');
              if (workshopContainer) {
                fetch(`/ws/workshop?lesson_id=Topics/${topicKey}`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.indexHtml) {
                      workshopContainer.innerHTML = data.indexHtml;
                      injectWorkshopAssets(`Topics/${topicKey}`, data.hasStyle, data.hasLogic);
                    } else {
                      workshopContainer.innerHTML = '<div>Failed to load topic workshop.</div>';
                    }
                  })
                  .catch(() => {
                    workshopContainer.innerHTML = '<div>Workshop load error.</div>';
                  });
              }
            };

            topicsContainer.appendChild(topicDiv);
            topicCount++;
          });

          // Remove any previous topics container before appending
          const prev = menuDiv.querySelector('.topics-container');
          if (prev) prev.remove();
          topicsContainer.className = 'topics-container';
          menuDiv.appendChild(topicsContainer);

          // If no topic buttons were created, show a message
          if (topicCount === 0) {
            const msg = document.createElement('div');
            msg.style.color = '#ffe066';
            msg.style.margin = '32px 0';
            msg.style.fontSize = '1.15rem';
            msg.style.textAlign = 'center';
            msg.textContent = 'No tasks are available at this time.';
            menuDiv.appendChild(msg);
          }

          // Back button
          const backBtn = document.createElement('button');
          backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
          backBtn.textContent = 'Back';
          backBtn.onclick = () => {
            if (typeof menuStack !== 'undefined' && menuStack.length > 0) {
              menuStack.pop()();
            }
          };
          menuDiv.appendChild(backBtn);
        });
      }

      function renderOptionsMenu(menuDiv) {
        menuDiv.innerHTML = '';
        // Theme section
        const themeTitle = document.createElement('div');
        themeTitle.style.fontWeight = 'bold';
        themeTitle.style.marginBottom = '8px';
        themeTitle.textContent = 'Theme Settings';
        menuDiv.appendChild(themeTitle);
        // Icon style selector
        const iconStyleLabel = document.createElement('label');
        iconStyleLabel.textContent = 'Icon Style: ';
        const iconStyleSelect = document.createElement('select');
        ['Default', 'Outline', 'Filled', 'Minimal'].forEach(style => {
          const opt = document.createElement('option');
          opt.value = style.toLowerCase();
          opt.textContent = style;
          iconStyleSelect.appendChild(opt);
        });
        iconStyleSelect.onchange = (e) => {
          document.body.setAttribute('data-icon-style', e.target.value);
        };
        iconStyleLabel.appendChild(iconStyleSelect);
        menuDiv.appendChild(iconStyleLabel);
        // Icon size selector
        const iconSizeLabel = document.createElement('label');
        iconSizeLabel.textContent = 'Icon Size: ';
        const iconSizeSelect = document.createElement('select');
        ['Small', 'Medium', 'Large'].forEach(size => {
          const opt = document.createElement('option');
          opt.value = size.toLowerCase();
          opt.textContent = size;
          iconSizeSelect.appendChild(opt);
        });
        iconSizeSelect.onchange = (e) => {
          document.body.setAttribute('data-icon-size', e.target.value);
        };
        iconSizeLabel.appendChild(iconSizeSelect);
        menuDiv.appendChild(iconSizeLabel);
        // Font family selector
        const fontLabel = document.createElement('label');
        fontLabel.textContent = 'Font Family: ';
        const fontSelect = document.createElement('select');
        ['Kanit', 'Tomorrow', 'Fira Code', 'Arial', 'Monospace'].forEach(font => {
          const opt = document.createElement('option');
          opt.value = font;
          opt.textContent = font;
          fontSelect.appendChild(opt);
        });
        fontSelect.onchange = (e) => {
          document.body.style.fontFamily = e.target.value;
        };
        fontLabel.appendChild(fontSelect);
        menuDiv.appendChild(fontLabel);
        // Divider
        menuDiv.appendChild(document.createElement('hr'));
        // Progress section
        const progressTitle = document.createElement('div');
        progressTitle.style.fontWeight = 'bold';
        progressTitle.style.margin = '8px 0';
        progressTitle.textContent = 'Progress & Achievements';
        menuDiv.appendChild(progressTitle);
        // View completed stories
        const storiesBtn = document.createElement('button');
        storiesBtn.className = 'rpg-menu-btn rpg-menu-banner';
        storiesBtn.textContent = 'View Completed Stories';
        storiesBtn.onclick = () => {
          typeText('rpg-text', 'Completed Stories:\n(Demo: show list here)');
          overlay.remove();
        };
        menuDiv.appendChild(storiesBtn);
        // View skills achieved
        const skillsBtn = document.createElement('button');
        skillsBtn.className = 'rpg-menu-btn rpg-menu-banner';
        skillsBtn.textContent = 'View Skills Achieved';
        skillsBtn.onclick = () => {
          typeText('rpg-text', 'Skills Achieved:\n(Demo: show skills here)');
          overlay.remove();
        };
        menuDiv.appendChild(skillsBtn);
        // Reset progress
        const resetBtn = document.createElement('button');
        resetBtn.className = 'rpg-menu-btn rpg-menu-banner';
        resetBtn.textContent = 'Reset Progress';
        resetBtn.onclick = () => {
          if (confirm('Are you sure you want to reset your progress?')) {
            typeText('rpg-text', 'Progress reset! (Demo: implement reset logic)');
            overlay.remove();
          }
        };
        menuDiv.appendChild(resetBtn);
        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
        backBtn.id = 'rpg-btn-back';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => {
          if (menuStack.length > 0) {
            menuStack.pop()();
          }
        };
        menuDiv.appendChild(backBtn);
      }

      function renderProgressMenu(menuDiv) {
        menuDiv.innerHTML = '';
        // Two tabs: Skills and Stories
        const tabContainer = document.createElement('div');
        tabContainer.style.display = 'flex';
        tabContainer.style.gap = '24px';
        tabContainer.style.marginBottom = '18px';
        const skillsTab = document.createElement('button');
        skillsTab.textContent = 'Skills';
        skillsTab.className = 'rpg-menu-btn rpg-menu-banner';
        skillsTab.style.fontWeight = 'bold';
        skillsTab.onclick = () => {
          // --- Load skill_tree.TildeSec and replace RPG workshop in the tab ---
          const workshopContainer = window.parent && window.parent.document.getElementById('workshop-container')
            ? window.parent.document.getElementById('workshop-container')
            : document.getElementById('workshop-container');
          if (workshopContainer) {
            fetch('/ws/workshop?lesson_id=skill_tree')
              .then(res => res.json())
              .then(data => {
                if (data.indexHtml) {
                  workshopContainer.innerHTML = data.indexHtml;
                  injectWorkshopAssets('skill_tree', data.hasStyle, data.hasLogic);
                } else {
                  workshopContainer.innerHTML = '<div>Failed to load skill tree workshop.</div>';
                }
              })
              .catch(() => {
                workshopContainer.innerHTML = '<div>Skill tree load error.</div>';
              });
          }
        };
        tabContainer.appendChild(skillsTab);
        const storiesTab = document.createElement('button');
        storiesTab.textContent = 'Stories';
        storiesTab.className = 'rpg-menu-btn rpg-menu-banner';
        storiesTab.onclick = () => showStoriesView();
        tabContainer.appendChild(storiesTab);
        menuDiv.appendChild(tabContainer);
        // Content area
        const contentDiv = document.createElement('div');
        contentDiv.id = 'progress-content';
        menuDiv.appendChild(contentDiv);
        // Show skills view by default
        showSkillsView();
        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
        backBtn.id = 'rpg-btn-back';
        backBtn.textContent = 'Back';
        backBtn.onclick = () => {
          if (menuStack.length > 0) {
            menuStack.pop()();
          }
        };
        menuDiv.appendChild(backBtn);
        // --- Helper functions for progress views ---
        function showSkillsView() {
          contentDiv.innerHTML = '<b>Your Skills</b><br>';
          // Fetch user progress from backend (or use dummy data for demo)
          fetch('/ws/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: window.userId, lesson_id: 'rpg', get: true })
          })
          .then(async res => {
            if (!res.ok) {
              contentDiv.innerHTML += '<div style="color:#ffb;">Failed to load skills (server error).</div>';
              return { achievements: [] };
            }
            try {
              return await res.json();
            } catch {
              contentDiv.innerHTML += '<div style="color:#ffb;">Failed to parse skills data.</div>';
              return { achievements: [] };
            }
          })
          .then(progress => {
            const skills = (progress && progress.achievements) || ['Linux Basics', 'Networking', 'Scripting'];
            skills.forEach(skill => {
              const skillDiv = document.createElement('div');
              skillDiv.style.margin = '8px 0';
              skillDiv.style.display = 'flex';
              skillDiv.style.alignItems = 'center';
              skillDiv.style.gap = '10px';
              const skillBtn = document.createElement('button');
              skillBtn.className = 'rpg-menu-btn rpg-menu-banner';
              skillBtn.textContent = skill;
              skillBtn.onclick = () => {
                // Show requirements for this skill
                showSkillRequirements(skill);
              };
              skillDiv.appendChild(skillBtn);
              // Delete skill button
              const delBtn = document.createElement('button');
              delBtn.textContent = 'Delete';
              delBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
              delBtn.style.background = '#c0392b';
              delBtn.style.color = '#fff';
              delBtn.onclick = () => {
                if (confirm(`Delete skill "${skill}"?`)) {
                  // Remove skill from user progress
                  fetch('/ws/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: window.userId, lesson_id: 'rpg', removeSkill: skill })
                  }).then(() => {
                    showSkillsView();
                  });
                }
              };
              skillDiv.appendChild(delBtn);
              contentDiv.appendChild(skillDiv);
            });
            if (!skills.length) {
              contentDiv.innerHTML += '<i>No skills achieved yet.</i>';
            }
          });
        }

        async function showSkillRequirements(skill) {
          // Fetch requirements from backend
          const contentDiv = document.getElementById('skill-requirements-content');
          contentDiv.innerHTML = `<b>Requirements for "${skill}"</b><br>`;
          try {
            const res = await fetch(`/api/skill_requirements?skill=${encodeURIComponent(skill)}`);
            const requirements = await res.json();
            if (requirements.length === 0) {
              contentDiv.innerHTML += '<i>No requirements found for this skill.</i>';
            } else {
              const ul = document.createElement('ul');
              requirements.forEach(req => {
                const li = document.createElement('li');
                li.textContent = req;
                ul.appendChild(li);
              });
              contentDiv.appendChild(ul);
            }
          } catch (e) {
            contentDiv.innerHTML += '<i>Error loading requirements.</i>';
          }
        }

        function showStoriesView() {
          contentDiv.innerHTML = '<b>Completed Stories</b><br>';
          fetch('/ws/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: window.userId, lesson_id: 'rpg', get: true })
          })
          .then(async res => {
            if (!res.ok) {
              contentDiv.innerHTML += '<div style="color:#ffb;">Failed to load stories (server error).</div>';
              return { storyCompletions: [] };
            }
            try {
              return await res.json();
            } catch {
              contentDiv.innerHTML += '<div style="color:#ffb;">Failed to parse stories data.</div>';
              return { storyCompletions: [] };
            }
          })
          .then(progress => {
            const stories = (progress && progress.storyCompletions) || ['Awakening'];
            stories.forEach(story => {
              const storyDiv = document.createElement('div');
              storyDiv.style.margin = '8px 0';
              storyDiv.style.display = 'flex';
              storyDiv.style.alignItems = 'center';
              storyDiv.style.gap = '10px';
              const storyBtn = document.createElement('button');
              storyBtn.className = 'rpg-menu-btn rpg-menu-banner';
              storyBtn.textContent = story;
              storyDiv.appendChild(storyBtn);
              // Reset story progress button
              const resetBtn = document.createElement('button');
              resetBtn.textContent = 'Reset';
              resetBtn.className = 'rpg-menu-btn rpg-menu-banner rpg-back-btn';
              resetBtn.style.background = '#c0392b';
              resetBtn.style.color = '#fff';
              resetBtn.onclick = () => {
                if (confirm(`Reset progress for "${story}"?`)) {
                  fetch('/ws/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: window.userId, lesson_id: 'rpg', resetStory: story })
                  }).then(() => {
                    showStoriesView();
                  });
                }
              };
              storyDiv.appendChild(resetBtn);
              contentDiv.appendChild(storyDiv);
            });
            if (!stories.length) {
              contentDiv.innerHTML += '<i>No stories completed yet.</i>';
            }
          });
        }
      }
      // Initial call to render main menu - call immediately after validation
      appendRPGDebugLog('[RPG] About to call renderMainMenu() after validation');
      renderMainMenu();
    } else {
      // Remove menu overlay if present
      let oldOverlay = document.getElementById('rpg-menu-overlay');
      if (oldOverlay) oldOverlay.remove();
      // Remove logo/title if present (if user goes back to pre-validation state)
      const oldLogo = document.getElementById('rpg-logo');
      if (oldLogo) oldLogo.remove();
      const oldTitle = document.getElementById('rpg-animated-title');
      if (oldTitle) oldTitle.remove();
      typeText('rpg-text', "You see a passage leading out. Well done!\nClick 'Next' to continue.", 30, () => {
        document.getElementById('rpg-hints').innerHTML = "<button id='rpg-next-btn'>Next</button>";
        document.getElementById('rpg-next-btn').onclick = () => {
          typeText('rpg-text', "To be continued...");
          document.getElementById('rpg-hints').innerHTML = "";
        };
      });
    }
  } else {
    // Remove menu overlay if present
    let oldOverlay = document.getElementById('rpg-menu-overlay');
    if (oldOverlay) oldOverlay.remove();
    document.getElementById('rpg-hints').innerHTML = `<span class="hint-content">Hint: Try <code>ls</code> in the terminal below.</span>`;
  }
}

window._rpgValidatedListenerAdded = true;
} // <-- closes the if (!window._rpgValidatedListenerAdded) block

// Ensure the RPG workshop is set for backend validation
if (!document.cookie.includes('lesson_id=rpg')) {
  document.cookie = 'lesson_id=rpg; path=/';
}

// Utility: Load user info and progress (shared for all .TildeSec workshops)
async function loadUserProgressAndName() {
  let userId = window.userId || localStorage.getItem('userId');
  let username = '';
  let progress = {};
  let achievements = [];
  try {
    // Try to get username from DOM or cookie
    username = document.querySelector('.client-id')?.textContent || '';
    if (!username) {
      // Try cookie
      const match = document.cookie.match(/username=([^;]+)/);
      if (match) username = decodeURIComponent(match[1]);
    }
    // Try to get userId from window or localStorage
    if (!userId) {
      userId = localStorage.getItem('userId');
    }
    // Fetch progress/achievements from backend if userId is available
    if (userId) {
      const res = await fetch(`/user/progress?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        progress = data.progress || {};
        achievements = data.achievements || [];
      }
    }
  } catch (e) {
    // fallback: leave progress/achievements empty
  }
  return { userId, username, progress, achievements };
}
// Add loading animation to main UI elements on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.querySelectorAll('.rpg-dialogue-banner, .rpg-hint-banner, .rpg-menu-btn, .rpg-characters').forEach(el => {
      el.classList.add('rpg-loading-anim');
      setTimeout(() => el.classList.add('rpg-ui-animate'), 150);
    });
  }, 200);
});
// In your main app's HTML/JS:
const style = document.createElement('link');
style.rel = "stylesheet";
// Remove or update this line to NOT load a global /style.css:
style.href = `/ws/workshop_asset?lesson_id=rpg&file=style.css`;
document.head.appendChild(style);
// Example usage on load:
document.addEventListener('DOMContentLoaded', async () => {
  const user = await loadUserProgressAndName();
  // Optionally display username somewhere in the RPG UI
  if (user.username) {
    let panel = document.querySelector('.rpg-panel');
    if (panel && !document.getElementById('rpg-username')) {
      const nameDiv = document.createElement('div');
      nameDiv.id = 'rpg-username';
      nameDiv.style.position = 'absolute';
      nameDiv.style.top = '12px';
      nameDiv.style.right = '24px';
      nameDiv.style.color = '#ffe066';
      nameDiv.style.fontWeight = 'bold';
      nameDiv.style.fontSize = '1.1rem';
      nameDiv.style.textShadow = '1px 1px 2px #222';
      nameDiv.textContent = `User: ${user.username}`;
      panel.appendChild(nameDiv);
    }
  }
  // Optionally use user.progress and user.achievements in your RPG logic
  typeText('rpg-text', "You wake up in a dimly lit cave. A terminal glows nearby.\n\nObjective: Type ls in the terminal to look around.");
  // Do NOT call renderLogoAndLaptop() here
  renderCharacters();
});
window.addEventListener('DOMContentLoaded', () => {
  const hints = document.getElementById('rpg-hints');
  hints.style.display = 'none';
  const logo = document.getElementById('rpg-logo');
  logo.style.position = 'absolute';
  logo.style.top = '10px';
  logo.style.left = '50%';
  logo.style.transform = 'translateX(-50%)';
  logo.style.zIndex = '100';
  logo.innerHTML = `<img src="/assets/workshop/text/logo.png" alt="TildeSec Logo" style="max-width:180px;max-height:80px;">`;
});
// --- RPG Validation Integration ---
// Note: validate.js is handled server-side, not client-side
// The validation happens via the /ws/validate endpoint
let validateInputAsync = null;

// Validation is handled server-side, not client-side
// Remove the dynamic import that was causing 404 errors
appendRPGDebugLog('[RPG] Validation ready - server-side validation via /ws/validate endpoint');

// Example usage: validate a command and update UI accordingly
async function handleUserCommand(command) {
  if (!validateInputAsync) {
    appendRPGDebugLog('[RPG] validateInputAsync not ready, cannot validate command');
    return { pass: false, hint: 'Validation not ready.' };
  }
  try {
    const result = await validateInputAsync(command);
    appendRPGDebugLog('[RPG] validateInputAsync result: ' + JSON.stringify(result));
    // Update UI/menu based on result
    if (result.pass) {
      renderMainMenu();
    } else if (result.hint) {
      const hints = document.getElementById('rpg-hints');
      if (hints) {
        hints.innerHTML = `<span class="hint-content">Hint: ${result.hint}</span>`;
        hints.style.display = '';
      }
    }
    return result;
  } catch (e) {
    appendRPGDebugLog('[RPG] Error in validateInputAsync: ' + e);
    return { pass: false, hint: 'Validation error.' };
  }
}

// Validate input and control hint/menu display
function validateInput(command) {
  console.log('Validating command:', command);
  const trimmedCommand = command.trim();
  const hints = document.getElementById('rpg-hints');
  if (trimmedCommand === 'ls') {
    hints.style.display = 'none';
    removeDialogueAndHints();
    renderMainMenu();
    return { pass: true };
  }
  hints.style.display = 'none';
  return { pass: false, hint: "Try typing 'ls' in the terminal." };
}

// Remove dialogue and hint banners
function removeDialogueAndHints() {
  const dialogueBanner = document.getElementById('dialogue-banner');
  const hints = document.getElementById('rpg-hints');
  if (dialogueBanner) dialogueBanner.style.display = 'none';
  if (hints) hints.style.display = 'none';
}

// Render avatars for story mode
function loadAvatars() {
  const avatarContainer = document.getElementById('rpg-avatar');
  avatarContainer.innerHTML = `
    <img src="/assets/workshop/avatars/mira/mira.png" alt="Mira" style="max-height:90px; border-radius:12px; border:3px solid #ffe066;" onerror="this.style.display='none'">
    <img src="/assets/workshop/avatars/alex/alex.png" alt="Alex" style="max-height:90px; border-radius:12px; border:3px solid #ffe066;" onerror="this.style.display='none'">
    <img src="/assets/workshop/avatars/james/james.png" alt="James" style="max-height:90px; border-radius:12px; border:3px solid #ffe066;" onerror="this.style.display='none'">
    <img src="/assets/workshop/avatars/zara/zara.png" alt="Zara" style="max-height:90px; border-radius:12px; border:3px solid #ffe066;" onerror="this.style.display='none'">
  `;
}
// Render tasks for task mode with info icons
function loadTasks() {
  fetch('/examples/tasks.json')
    .then(response => response.json())
    .then(data => {
      const topics = Object.keys(data.DragBlockTasks);
      const taskContainer = document.getElementById('task-container');
      taskContainer.innerHTML = topics.map(topic => `
        <div class='task-item'>
          <span>${topic}</span>
          <span class='info-icon' onclick='showTaskInfo("${topic}")'>i</span>
        </div>
      `).join('');
    });
}
// Show task info popup
function showTaskInfo(topic) {
  fetch('/examples/tasks.json')
    .then(response => response.json())
    .then(data => {
      const desc = data.DragBlockTasks[topic]?.[0]?.scenario || "No description.";
      alert(desc);
    });
}

// Debug log utility
function appendRPGDebugLog(msg) {
  // Prefer the overlay container if present
  let logDiv = document.getElementById('rpg-debug-log');
  if (!logDiv) {
    logDiv = document.createElement('div');
    logDiv.id = 'rpg-debug-log';
    // If overlay exists, insert into overlay panel
    const overlayPanel = document.querySelector('#rpg-debug-overlay .rpg-debug-panel');
    if (overlayPanel) {
      logDiv.className = 'rpg-debug-log';
      overlayPanel.appendChild(logDiv);
    } else {
      // Fallback legacy styling/placement
      logDiv.style.background = '#222';
      logDiv.style.color = '#ffe066';
      logDiv.style.fontSize = '12px';
      logDiv.style.padding = '6px 10px';
      logDiv.style.margin = '8px 0';
      logDiv.style.borderRadius = '6px';
      logDiv.style.maxHeight = '120px';
      logDiv.style.overflowY = 'auto';
      logDiv.style.zIndex = '9999';
      let container = window.parent && window.parent.document.getElementById('workshop-container')
        ? window.parent.document.getElementById('workshop-container')
        : document.getElementById('workshop-container');
      if (container) container.prepend(logDiv);
    }
  }
  logDiv.innerHTML += `<div>${new Date().toLocaleTimeString()} - ${msg}</div>`;
}

// Listen for rpg-validated via postMessage (from terminal window)
window.addEventListener('message', function(event) {
  // --- DEBUG: Log all message events visibly and to console ---
  const logMsg = '[RPG] postMessage received: ' + JSON.stringify(event.data) + ' (origin: ' + event.origin + ')';
  appendRPGDebugLog(logMsg);
  console.log(logMsg, event);
  if (event && event.data && event.data.type === 'rpg-validated') {
    appendRPGDebugLog('[RPG] rpg-validated postMessage received, re-dispatching as CustomEvent');
    // Re-dispatch as a CustomEvent in this window context
    window.dispatchEvent(new CustomEvent('rpg-validated', { detail: event.data.detail }));
  }
});

// --- Listen for rpg-validated via BroadcastChannel (cross-tab/panel robust) ---
if (window.BroadcastChannel) {
  try {
    const bc = new BroadcastChannel('inspector-rpg');
    bc.onmessage = function(event) {
      const logMsg = '[RPG] BroadcastChannel received: ' + JSON.stringify(event.data);
      appendRPGDebugLog(logMsg);
      console.log(logMsg, event);
      if (event && event.data && event.data.type === 'rpg-validated') {
        appendRPGDebugLog('[RPG] rpg-validated BroadcastChannel received, re-dispatching as CustomEvent');
        window.dispatchEvent(new CustomEvent('rpg-validated', { detail: event.data.detail }));
      }
    };
  } catch (e) {
    appendRPGDebugLog('[RPG] BroadcastChannel error: ' + e);
    console.error('[RPG] BroadcastChannel error:', e);
  }
}

// --- Helper: Inject logic.js and style.css for a workshop after HTML injection ---
async function injectWorkshopAssets(lessonId, hasStyle, hasLogic) {
  // Remove any previously injected RPG CSS/JS
  document.querySelectorAll('link[data-rpg-style],script[data-rpg-logic]').forEach(e => e.remove());
  // Inject style.css if present
  if (hasStyle) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = `/ws/workshop_asset?lesson_id=${lessonId}&file=style.css`;
    style.setAttribute('data-rpg-style', '1');
    document.head.appendChild(style);
  }
  // Inject logic.js if present
  if (hasLogic) {
    const script = document.createElement('script');
    script.src = `/ws/workshop_asset?lesson_id=${lessonId}&file=logic.js`;
    script.setAttribute('data-rpg-logic', '1');
    script.onload = () => {
      // Add visible debug output to confirm logic.js loaded
      let dbg = document.getElementById('rpg-debug-logic-loaded');
      if (!dbg) {
        dbg = document.createElement('div');
        dbg.id = 'rpg-debug-logic-loaded';
        dbg.style.background = '#222';
        dbg.style.color = '#0f0';
        dbg.style.fontWeight = 'bold';
        dbg.style.padding = '6px 10px';
        dbg.style.margin = '6px 0';
        dbg.style.borderRadius = '6px';
        dbg.style.zIndex = '9999';
        document.body.prepend(dbg);
      }
      dbg.innerHTML = '[RPG DEBUG] logic.js loaded for ' + lessonId + ' at ' + new Date().toLocaleTimeString();
    };
    document.body.appendChild(script);
  }
}

// --- Helper: Inject logic.js and style.css after HTML injection ---
async function injectWorkshopAssets({ hasStyle, hasLogic, lessonId, container }) {
  // This function is now async-safe: returns a Promise
  async function doInject() {
    // Remove any previously injected RPG CSS/JS
    document.querySelectorAll('link[data-rpg-style],script[data-rpg-logic]').forEach(e => e.remove());
    // Only inject style if present
    if (hasStyle) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = `/ws/workshop_asset?lesson_id=${lessonId}&file=style.css`;
      style.setAttribute('data-rpg-style', '1');
      document.head.appendChild(style);
    }
    // Only inject logic if present
    if (hasLogic) {
      const script = document.createElement('script');
      script.src = `/ws/workshop_asset?lesson_id=${lessonId}&file=logic.js`;
      script.setAttribute('data-rpg-logic', '1');
      document.body.appendChild(script);
    }
  }
  // Always call the async function, but don't require the caller to be async
  doInject();
}

// Example for story mode:
// workshopContainer.innerHTML = data.indexHtml;
// injectWorkshopAssets(lessonId, data.hasStyle, data.hasLogic);

// Example for task mode, skill tree, battle mode: same pattern.
