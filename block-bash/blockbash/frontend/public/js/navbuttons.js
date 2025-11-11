import './notifications.js';

document.addEventListener('DOMContentLoaded', () => {
  const aboutButton = document.getElementById('nav-btn-about');
  const closeAboutButton = document.getElementById('abt-close-btn');
  const settingsButton = document.querySelector('button img[alt="Settings Button"]').parentElement;
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const themeSwitch = document.getElementById('theme-switch');
  const resetStoryBtn = document.getElementById('reset-story-btn');
  const resetTaskBtn = document.getElementById('reset-task-btn');
  const termContainer = document.getElementById('output-terminal');
  const applyTerminalStyleBtn = document.getElementById('apply-terminal-style-btn');
  const terminalBgColor = document.getElementById('terminal-bg-color');
  const terminalTextColor = document.getElementById('terminal-text-color');
  const terminalFontStyle = document.getElementById('terminal-font-style');

  aboutButton.addEventListener('click', () => {
    aboutModal.classList.remove('about-hidden');
  });

  closeAboutButton.addEventListener('click', () => {
    aboutModal.classList.add('about-hidden');
  });

  // Settings modal logic
  if (settingsButton && settingsModal) {
    settingsButton.addEventListener('click', () => {
      settingsModal.classList.remove('settings-hidden');
    });
  }
  if (closeSettingsBtn && settingsModal) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('settings-hidden');
    });
  }

  // --- Theme System: Only Dark and Light ---
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }
  
  // Patch settings theme switch
  if (themeSwitch) {
    themeSwitch.addEventListener('change', (e) => {
      const theme = e.target.value;
      applyTheme(theme);
      
      // Icon color filter for contrast
      document.querySelectorAll('header .button-container button img, .block-category .icon').forEach(img => {
        if (theme === 'dark') {
          img.style.filter = 'invert(1) brightness(2)';
        } else {
          img.style.filter = 'invert(0) brightness(0)';
        }
      });
    });
  }
  
  // On load, apply saved theme or default to Dark
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
    applyTheme(savedTheme);
  } else {
    applyTheme('dark'); // Default to dark theme
  }

  // Terminal design settings
  const termBgInput = document.getElementById('terminal-bg-color');
  const termTextInput = document.getElementById('terminal-text-color');
  const termFontSelect = document.getElementById('terminal-font-style');
  const applyTermBtn = document.getElementById('apply-terminal-style-btn');

  function applyTerminalSettings(bg, fg, font) {
    // Save to localStorage
    localStorage.setItem('terminalBg', bg);
    localStorage.setItem('terminalFg', fg);
    localStorage.setItem('terminalFont', font);
    // Apply to xterm.js if available
    if (window.term) {
      window.term.setOption('theme', { background: bg, foreground: fg });
      window.term.setOption('fontFamily', font);
      // Also update CSS for .terminal for fallback
      const terminalDiv = document.getElementById('output-terminal');
      if (terminalDiv) {
        terminalDiv.style.background = bg;
        terminalDiv.style.color = fg;
        terminalDiv.style.fontFamily = font;
      }
    }
  }

  // Restore terminal settings on DOMContentLoaded, but defer applying to xterm until it's ready
  window.addEventListener('DOMContentLoaded', () => {
    const bg = localStorage.getItem('terminalBg');
    const fg = localStorage.getItem('terminalFg');
    const font = localStorage.getItem('terminalFont');
    if (bg && fg && font) {
      if (termBgInput) termBgInput.value = bg;
      if (termTextInput) termTextInput.value = fg;
      if (termFontSelect) termFontSelect.value = font;
      // Only set input values here; actual terminal will be styled when xterm is ready
    }
  });

  // Listen for custom event from xterm.js to apply settings after terminal is ready
  window.addEventListener('xterm-ready', () => {
    const bg = localStorage.getItem('terminalBg') || '#1d1f21';
    const fg = localStorage.getItem('terminalFg') || '#c5c8c6';
    const font = localStorage.getItem('terminalFont') || 'Fira Code, monospace';
    applyTerminalSettings(bg, fg, font);
  });

  if (applyTermBtn) {
    applyTermBtn.addEventListener('click', () => {
      const bg = termBgInput.value;
      const fg = termTextInput.value;
      const font = termFontSelect.value;
      applyTerminalSettings(bg, fg, font);
    });
  }

  // Reset story/task progress stubs
  if (resetStoryBtn) {
    resetStoryBtn.addEventListener('click', () => {
  if (confirm(window.i18n?.t('reset.story.confirm','Reset story progress?'))) alert(window.i18n?.t('reset.story.done','Story progress reset!')); // TODO: Implement backend call
    });
  }
  if (resetTaskBtn) {
    resetTaskBtn.addEventListener('click', () => {
  if (confirm(window.i18n?.t('reset.task.confirm','Reset task progress?'))) alert(window.i18n?.t('reset.task.done','Task progress reset!')); // TODO: Implement backend call
    });
  }

  // Help (About) popup logic
  const helpButton = document.querySelector('button img[alt="Help Button"]')?.parentElement;
  const aboutModal = document.getElementById('about-modal');
  if (helpButton && aboutModal) {
    helpButton.addEventListener('click', () => {
      aboutModal.classList.remove('about-hidden');
      // Add onboarding button if not present
      let onboardingBtn = document.getElementById('start-onboarding-btn');
      if (!onboardingBtn) {
        onboardingBtn = document.createElement('button');
        onboardingBtn.id = 'start-onboarding-btn';
  onboardingBtn.textContent = window.i18n?.t('onboarding.showButton','Show Onboarding');
        onboardingBtn.style.margin = '18px auto 0 auto';
        onboardingBtn.style.display = 'block';
        onboardingBtn.style.background = '#ffe066';
        onboardingBtn.style.color = '#232946';
        onboardingBtn.style.fontWeight = 'bold';
        onboardingBtn.style.fontSize = '1.1em';
        onboardingBtn.style.border = 'none';
        onboardingBtn.style.borderRadius = '6px';
        onboardingBtn.style.padding = '10px 32px';
        onboardingBtn.style.cursor = 'pointer';
        onboardingBtn.onclick = () => {
          aboutModal.classList.add('about-hidden');
          localStorage.removeItem('onboardingComplete');
          window.startOnboarding(true);
        };
        // Insert before close button
        const closeBtn = aboutModal.querySelector('.abt-close');
        closeBtn.parentNode.insertBefore(onboardingBtn, closeBtn);
      }
    });
  }
});