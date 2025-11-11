const IP_ADDRESS = "10.0.0.42";
let steps = [];
let currentStep = 0;
let validated = false;

async function loadSteps() {
  steps = [];
  for (let i = 0; i <= 6; ++i) {
    const res = await fetch(`chapters/demo/step${i}.json`);
    if (res.ok) steps.push(await res.json());
  }
}

function setMiraSprite(frameIdx) {
  const mira = document.getElementById('mira-sprite');
  if (mira) mira.style.backgroundPosition = `-${frameIdx * 96}px 0px`;
}

function clearScene() {
  const scene = document.getElementById('demo-scene');
  scene.innerHTML = '';
}

function renderStep(idx) {
  clearScene();
  validated = false;
  const s = steps[idx];
  const scene = document.getElementById('demo-scene');

  // Dialogue box and Mira sprite
  const dialogueBox = document.createElement('div');
  dialogueBox.className = 'rpg-dialogue-banner';
  dialogueBox.style.display = 'flex';
  dialogueBox.style.alignItems = 'flex-start';
  dialogueBox.style.margin = '0 auto 24px auto';
  dialogueBox.style.maxWidth = '540px';
  dialogueBox.style.minWidth = '320px';

  const miraSprite = document.createElement('div');
  miraSprite.className = 'demo-mira-sprite';
  miraSprite.id = 'mira-sprite';
  dialogueBox.appendChild(miraSprite);

  const dialogueDiv = document.createElement('div');
  dialogueDiv.id = 'demo-dialogue';
  dialogueDiv.className = 'demo-dialogue-text';
  dialogueDiv.innerHTML = s.dialogue;
  dialogueBox.appendChild(dialogueDiv);

  scene.appendChild(dialogueBox);

  // Terminal area (for steps with terminal)
  let terminalDiv = null;
  if (s.hasOwnProperty('terminal')) {
    terminalDiv = document.createElement('div');
    terminalDiv.id = 'demo-terminal';
    terminalDiv.className = 'demo-terminal';
    terminalDiv.textContent = s.terminal || '';
    scene.appendChild(terminalDiv);
  }

  // Table/music
  if (s.showTable) {
    const tableHacker = document.createElement('div');
    tableHacker.id = 'demo-table-hacker';
    tableHacker.className = 'demo-table-hacker';
    scene.appendChild(tableHacker);
    if (s.showMusic) {
      const music = document.createElement('div');
      music.id = 'demo-music';
      music.className = 'demo-music';
      scene.appendChild(music);
    }
  }

  // Hint
  if (s.hint) {
    const hint = document.createElement('div');
    hint.id = 'demo-hint';
    hint.className = 'demo-hint';
    hint.innerHTML = s.hint;
    scene.appendChild(hint);
  }

  // Input for validation steps
  let inputForm = null;
  if ([1,2,3,4].includes(idx)) {
    inputForm = document.createElement('form');
    inputForm.id = 'demo-input-form';
    inputForm.style.margin = '18px 0';
    inputForm.innerHTML = `
      <input id="demo-input" type="text" autocomplete="off" style="font-size:1.1rem; padding:6px 12px; width:260px; border-radius:6px; border:1px solid #ffe066;">
      <button class="demo-btn" type="submit">Run</button>
      <span id="demo-input-feedback" style="margin-left:12px; color:#ffe066;"></span>
    `;
    scene.appendChild(inputForm);
  }

  // Next button (always at the bottom of the scene)
  if (idx < steps.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'demo-btn';
    nextBtn.id = 'demo-next-btn';
    nextBtn.textContent = 'Next';
    nextBtn.onclick = (e) => {
      e.preventDefault();
      currentStep++;
      renderStep(currentStep);
    };
    scene.appendChild(nextBtn);
  } else {
    // Last step: show Done or Finish button
    const doneBtn = document.createElement('button');
    doneBtn.className = 'demo-btn';
    doneBtn.id = 'demo-done-btn';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = (e) => {
      e.preventDefault();
      // Optionally, show a message or close the demo
      clearScene();
      const msg = document.createElement('div');
      msg.className = 'demo-terminal';
      msg.textContent = 'Demo complete! You are ready for the next mission.';
      scene.appendChild(msg);
    };
    scene.appendChild(doneBtn);
  }

  // Table click for step 5
  if (idx === 5 && document.getElementById('demo-table-hacker')) {
    document.getElementById('demo-table-hacker').onclick = function() {
      if (currentStep === 5) {
        currentStep++;
        renderStep(currentStep);
      }
    };
  }

  // Set sprite frame
  setMiraSprite(s.miraFrame || 1);

  // Flash
  if (s.flash) {
    miraSprite.classList.add('demo-mira-flash');
    setTimeout(() => miraSprite.classList.remove('demo-mira-flash'), 600);
  }

  // Glossary popups
  dialogueDiv.addEventListener('click', function(e) {
    if (e.target.classList.contains('demo-glossary')) {
      const key = e.target.dataset.gloss;
      let gloss = "";
      if (s.glossary && s.glossary[key]) gloss = s.glossary[key];
      else if (key === 'ip') gloss = "A unique numerical address identifying a device on the network.";
      if (gloss) {
        const popup = document.getElementById('demo-popup');
        popup.innerHTML = gloss + '<br><button class="demo-btn" onclick="document.getElementById(\'demo-popup\').style.display=\'none\'">Close</button>';
        popup.style.display = 'block';
      }
    }
  });
  document.body.addEventListener('click', function(e) {
    const popup = document.getElementById('demo-popup');
    if (popup.style.display === 'block' && !popup.contains(e.target) && !e.target.classList.contains('demo-glossary')) {
      popup.style.display = 'none';
    }
  });

  // Validation logic for steps 1-4
  if ([1,2,3,4].includes(idx) && inputForm) {
  inputForm.onsubmit = async function(ev) {
      ev.preventDefault();
      const val = document.getElementById('demo-input').value.trim();
      // Validate via validate.js endpoint
      const resp = await fetch('/ws/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: val, step: idx, lesson_id: 'mira', chapter: 'demo' })
      });
      const result = await resp.json();
      const feedback = document.getElementById('demo-input-feedback');
      if (result.pass) {
        validated = true;
        feedback.textContent = "✔️";
        // Show terminal output if present
        if (terminalDiv && steps[idx].terminal) terminalDiv.textContent = steps[idx].terminal;
        // Remove input and show next button
        setTimeout(() => {
          renderStep(idx); // re-render to show next button and clear input
        }, 500);
      } else {
        feedback.textContent = result.hint || "Try again.";
      }
    };
  }
}

async function initDemo() {
  await loadSteps();
  try { window.currentWorkshopActivity = 'mira'; window.currentChapter = 'demo'; } catch {}
  try { if (window.socket && window.socket.readyState === 1) {
    window.socket.send(JSON.stringify({ type: 'set-activity', activity: 'mira' }));
    window.socket.send(JSON.stringify({ type: 'set-chapter', chapter: 'demo' }));
  } } catch {}
  renderStep(currentStep);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemo);
} else {
  initDemo();
}

const root = document.querySelector('.workshop-root');
const dialogueContainer = root.querySelector('#demo-dialogue-container');
const nextBtn = root.querySelector('#demo-next-btn');
const bgDiv = root.querySelector('#workshop-bg');

const dialogueLines = [
  "Mira: \"Hey, can you help me? Alice just got some weird pop-ups after using the café Wi-Fi.\"",
  "Mira: \"She thought she was on the real 'CoffeeShopWifi', but something's off. I checked and there are two networks with the same name!\"",
  "Mira: \"I'm worried one is a fake. Can you help me find out which one is the imposter and shut it down? Alice is counting on us!\""
];
const emotionIcons = [
  "/assets/workshop/avatars/mira/mira_irritated.png",
  "/assets/workshop/avatars/mira/mira_shocked.png",
  "/assets/workshop/avatars/mira/mira_smile.png"
];

let dialogueIdx = 0;

function renderDialogue(idx) {
  dialogueContainer.innerHTML = `
    <div class="demo-dialogue-box">
      <img class="demo-dialogue-emotion" src="${emotionIcons[idx]}" alt="Mira">
      <div class="demo-dialogue-text">${dialogueLines[idx]}</div>
    </div>
  `;
  if (idx >= dialogueLines.length - 1) {
    nextBtn.textContent = "Start Mission";
  } else {
    nextBtn.textContent = "Next";
  }
}

renderDialogue(dialogueIdx);

nextBtn.onclick = function() {
  if (dialogueIdx < dialogueLines.length - 1) {
    dialogueIdx++;
    renderDialogue(dialogueIdx);
  } else {
    // Change background to inside the coffee shop
    bgDiv.classList.add('inside');
    // Hide the dialogue and button or load the next part of the demo
    dialogueContainer.innerHTML = "";
    nextBtn.style.display = "none";
    // You could trigger the main demo logic here
  }
};
