// Onboarding logic for Inspector

(function() {
  // Core onboarding sequence
  function runOnboarding() {
    // Blur everything except overlay
    document.body.classList.add('onboarding-active');
    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboarding-overlay';
    document.body.appendChild(overlay);
    // Overlay should always be fixed and cover the app
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '20000';
    overlay.style.pointerEvents = 'auto';
    overlay.style.background = 'rgba(20, 20, 30, 0.65)';
    const steps = getOnboardingSteps();
    let stepIdx = 0;
    showStep(stepIdx);

    function showStep(idx) {
      overlay.innerHTML = '';
      removeHighlight();
      const step = steps[idx];
      if (!step) return finishOnboarding();
      // Highlight
      if (step.selector) highlightElement(step.selector, step.arrowDir);
      // Step box
      const box = document.createElement('div');
      box.className = 'onboarding-step-box';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('tabindex', '-1');
      box.innerHTML = step.html;
      if (step.themeSelect) {
        const themeDiv = document.createElement('div');
        themeDiv.className = 'onboarding-theme-select';
        themeDiv.innerHTML = `<label for='onboarding-theme'>Choose a theme:</label>` +
          `<select id='onboarding-theme' aria-label='Theme selection'><option value='light'>Light</option><option value='neon'>Neon</option><option value='dark'>Dark</option></select>`;
        box.appendChild(themeDiv);
        setTimeout(() => {
          const sel = document.getElementById('onboarding-theme');
          sel.value = document.body.getAttribute('data-theme') || 'light';
          sel.onchange = e => {
            document.body.setAttribute('data-theme', e.target.value);
            localStorage.setItem('theme', e.target.value);
          };
        }, 0);
      }
      // Add navigation buttons
      const btnWrap = document.createElement('div');
      btnWrap.style.display = 'flex';
      btnWrap.style.gap = '12px';
      const backBtn = document.createElement('button');
      backBtn.className = 'onboarding-step-btn';
      backBtn.textContent = 'Back';
      backBtn.disabled = stepIdx === 0;
      backBtn.onclick = () => { stepIdx = Math.max(0, stepIdx-1); showStep(stepIdx); };
      btnWrap.appendChild(backBtn);

      const skipBtn = document.createElement('button');
      skipBtn.className = 'onboarding-step-btn onboarding-skip-btn';
      skipBtn.textContent = 'Skip';
      skipBtn.setAttribute('aria-label', 'Skip onboarding');
      skipBtn.onclick = finishOnboarding;
      btnWrap.appendChild(skipBtn);

      // Add Next/Finish button
      const btn = document.createElement('button');
      btn.className = 'onboarding-step-btn';
      btn.textContent = stepIdx < steps.length-1 ? 'Next' : 'Finish';
      btn.setAttribute('aria-label', btn.textContent + ' onboarding step');
      btn.onclick = () => {
        if (step.themeSelect) {
          const sel = document.getElementById('onboarding-theme');
          localStorage.setItem('theme', sel.value);
          document.body.setAttribute('data-theme', sel.value);
        }
        stepIdx++;
        showStep(stepIdx);
      };
      btnWrap.appendChild(btn);
      box.appendChild(btnWrap);
      overlay.appendChild(box);
      // Position box near highlighted element if present
      if (step.selector) {
        const el = document.querySelector(step.selector);
        if (el) {
          const rect = el.getBoundingClientRect();
          const boxRect = box.getBoundingClientRect();
          overlay.style.alignItems = 'flex-start';
          overlay.style.justifyContent = 'flex-start';
          let top = rect.bottom + 12;
          let left = rect.left;
          if (step.arrowDir === 'up') top = rect.top - boxRect.height - 12;
          if (step.arrowDir === 'left') { left = rect.left - boxRect.width - 12; top = rect.top; }
          if (step.arrowDir === 'right') { left = rect.right + 12; top = rect.top; }
          if (step.arrowDir === 'down') { top = rect.bottom + 12; }
          box.style.position = 'absolute';
          box.style.top = window.scrollY + top + 'px';
          box.style.left = window.scrollX + left + 'px';
        }
      } else {
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
      }
      // Focus for accessibility
      setTimeout(() => box.focus(), 0);
      // Section click validation
      if (step.selector && step.detailSteps) {
        const el = document.querySelector(step.selector);
        if (el) {
          const handler = (e) => {
            e.stopPropagation();
            // Show detail step
            box.innerHTML = step.detailSteps.html;
            // Add back button
            const backBtn = document.createElement('button');
            backBtn.className = 'onboarding-step-btn';
            backBtn.textContent = 'Back';
            backBtn.onclick = () => showStep(idx);
            box.appendChild(backBtn);
            // Add Skip button
            const skipBtn2 = document.createElement('button');
            skipBtn2.className = 'onboarding-step-btn onboarding-skip-btn';
            skipBtn2.textContent = 'Skip';
            skipBtn2.onclick = finishOnboarding;
            box.appendChild(skipBtn2);
            overlay.appendChild(box);
          };
          el.addEventListener('click', handler, { once: true });
        }
      }
    }
    function finishOnboarding() {
      document.body.classList.remove('onboarding-active');
      removeHighlight();
      overlay.remove();
      localStorage.setItem('onboardingComplete', '1');
    }
    function highlightElement(selector, arrowDir) {
      const el = document.querySelector(selector);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'onboarding-highlight';
      highlight.style.top = rect.top + window.scrollY - 6 + 'px';
      highlight.style.left = rect.left + window.scrollX - 6 + 'px';
      highlight.style.width = rect.width + 12 + 'px';
      highlight.style.height = rect.height + 12 + 'px';
      highlight.id = 'onboarding-highlight';
      document.body.appendChild(highlight);
      // Arrow
      if (arrowDir) {
        const arrow = document.createElement('img');
        arrow.src = '/assets/images/arrow-right.svg';
        arrow.className = 'onboarding-arrow';
        if (arrowDir === 'down') arrow.style.transform = 'rotate(90deg)';
        if (arrowDir === 'left') arrow.style.transform = 'rotate(180deg)';
        if (arrowDir === 'up') arrow.style.transform = 'rotate(-90deg)';
        // Position arrow
        if (arrowDir === 'right') {
          arrow.style.top = (rect.top + rect.height/2 - 28) + 'px';
          arrow.style.left = (rect.right + 12) + 'px';
        } else if (arrowDir === 'down') {
          arrow.style.top = (rect.bottom + 12) + 'px';
          arrow.style.left = (rect.left + rect.width/2 - 28) + 'px';
        } else if (arrowDir === 'left') {
          arrow.style.top = (rect.top + rect.height/2 - 28) + 'px';
          arrow.style.left = (rect.left - 68) + 'px';
        } else if (arrowDir === 'up') {
          arrow.style.top = (rect.top - 68) + 'px';
          arrow.style.left = (rect.left + rect.width/2 - 28) + 'px';
        }
        arrow.style.position = 'absolute';
        document.body.appendChild(arrow);
      }
      // Blur all except overlay and highlight
      Array.from(document.body.children).forEach(child => {
        if (!['onboarding-overlay','onboarding-highlight'].includes(child.id)) {
          child.classList.add('onboarding-blur');
        }
      });
    }
    function removeHighlight() {
      const h = document.getElementById('onboarding-highlight');
      if (h) h.remove();
      document.querySelectorAll('.onboarding-arrow').forEach(a => a.remove());
      Array.from(document.body.children).forEach(child => {
        child.classList.remove('onboarding-blur');
      });
    }
  }

  // Auto-start onboarding on the main page if not completed
  if (!localStorage.getItem('onboardingComplete') &&
      window.location.pathname === '/pages/index.html') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runOnboarding, 400);
    });
  }

  function getOnboardingSteps() {
    return [
      {
        html: `<b>Welcome to Inspector!</b><br><br>This quick tour will help you get started. Click Next to begin.<br><br><em>Inspector is a gamified, block-based editor for learning hacking and cybersecurity. You'll learn by building scripts and solving challenges!</em>`
      },
      {
        selector: 'header',
        arrowDir: 'down',
        html: `<b>This is the main navigation bar.</b><br>Here you can access settings, achievements, help, and more.<br><br><em>Click the settings (cog) icon to customize your experience, or explore your achievements and profile.</em>`,
        detailSteps: {
          html: `<b>Settings Menu</b><br>Here you can change your theme, username, and more. Explore the options to personalize your experience!`
        }
      },
      {
        selector: '.sidebar',
        arrowDir: 'right',
        html: `<b>This is the block category sidebar.</b><br>Click a category to explore blocks for hacking, networking, and more.<br><br><em>Each category contains blocks for different types of tasks. Try clicking one!</em>`,
        detailSteps: {
          html: `<b>Sidebar Categories</b><br>Each category contains blocks for a specific area, like networking or file analysis. Click a category to see its blocks!`
        }
      },
      {
        selector: '.block-container[data-category="general"]',
        arrowDir: 'right',
        html: `<b>This is the block workspace.</b><br>Drag blocks here to build your scripts and solve challenges!<br><br><em>You can rearrange, connect, and delete blocks as you build your solution.</em>`,
        detailSteps: {
          html: `<b>Block Workspace</b><br>This is where you build your scripts. Drag blocks from the sidebar, connect them, and run your code!`
        }
      },
      {
        selector: '#output-terminal',
        arrowDir: 'up',
        html: `<b>This is your terminal.</b><br>Run your scripts and see output here. Try running <code>ls</code>!<br><br><em>The terminal shows the results of your code. You can also type commands directly.</em>`,
        detailSteps: {
          html: `<b>Terminal Details</b><br>Use the terminal to test commands, debug your scripts, and see output. Try typing <code>ls</code> or <code>echo Hello</code>!`
        }
      },
      {
        selector: '.button-container button img[alt="Settings Button"]',
        arrowDir: 'down',
        html: `<b>Theme & Settings</b><br>Click the cog to open settings and customize your experience.<br><br><em>Change your theme, username, and more in the settings menu.</em>`,
        detailSteps: {
          html: `<b>Settings Details</b><br>In the settings, you can choose your favorite theme, update your username, and reset your progress if needed.`
        }
      },
      {
        themeSelect: true,
        html: `<b>Choose your default theme!</b><br>You can always change it later via the settings (cog) button.<br><br><em>Pick the look that feels best for you: Light, Neon, or Dark.</em>`
      },
      {
        html: `<b>You're all set!</b><br>Have fun learning and hacking with Inspector!<br><br><em>Remember, you can revisit settings anytime via the cog icon.</em>`
      }
    ];
  }

  // Expose onboarding for manual start (ensure global scope)
  window.startOnboarding = function(force) {
    if (!force && localStorage.getItem('onboardingComplete')) return;
    // Remove any existing overlay
    const old = document.getElementById('onboarding-overlay');
    if (old) old.remove();
    // Remove blur/highlight
    Array.from(document.body.children).forEach(child => child.classList.remove('onboarding-blur'));
    // Actually start onboarding
    // If onboarding.js is loaded as a module, 'startOnboarding' may not be in scope yet.
    // Use setTimeout to ensure the function is available.
    setTimeout(() => runOnboarding(), 0);
  };
})();
