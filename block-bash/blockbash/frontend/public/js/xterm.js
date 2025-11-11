document.addEventListener('DOMContentLoaded', function () {
  if (typeof Terminal === 'undefined') {
    console.error('xterm.js not loaded! Terminal will not function.');
    const termContainer = document.getElementById('output-terminal');
    if (termContainer) termContainer.innerHTML = '<div style="color:red;padding:16px;">Terminal failed to load (xterm.js missing).</div>';
    return;
  }
  const dropArea = document.getElementById('drop-area');
  const termContainer = document.getElementById('output-terminal');

  // --- Prompt State Management ---
  let promptState = {
    hasPrompt: false,
    isRunning: false
  };

  function writePrompt(terminal) {
    if (!promptState.hasPrompt && !promptState.isRunning) {
      terminal.write('$ ');
      promptState.hasPrompt = true;
    }
  }

  function clearPromptState() {
    promptState.hasPrompt = false;
    promptState.isRunning = false;
  }

  function setRunning(running) {
    promptState.isRunning = running;
    if (running) {
      promptState.hasPrompt = false;
    }
  }

  // Helper function to find terminal state
  function findTerminalState(termObj) {
    if (!termObj || !termObj.xterm) return null;
    
    // Check if this is the main terminal
    if (termObj.xterm === window.term) {
      return { 
        isRunning: promptState.isRunning, 
        hasPrompt: promptState.hasPrompt,
        socket: window.socket 
      };
    }
    
    // For other terminals, look for stored state
    if (termObj.state) {
      return termObj.state;
    }
    
    return null;
  }

  // --- Persistent WebSocket for terminal ---
  let socket = null;
  let socketReady = false;
  let socketQueue = [];
  let negotiatedMode = 'interactive';
  let interactive = true; // default request
  let sandboxStatus = { ok:false };
  const statusPoll = { os: null, attempts: 0, timer: null };
  // Unified sandbox pill (status + fade updates)
  function ensureSandboxPill(){
    let pill = document.getElementById('sandbox-status-pill');
    if(!pill){
      pill = document.createElement('div');
      pill.id = 'sandbox-status-pill';
      pill.style.cssText = 'position:absolute;top:6px;right:8px;padding:4px 10px;border-radius:12px;font-size:12px;background:#444;color:#fff;opacity:0;transition:opacity .4s;z-index:20;';
      const host = document.getElementById('output-terminal') || document.body; host.style.position='relative'; host.appendChild(pill);
    }
    return pill;
  }
  function updateStatusPill(text, level){
    const pill = ensureSandboxPill();
    pill.style.background = level === 'ok' ? '#2e7d32' : (level === 'warn' ? '#f9a825' : '#6d4c41');
    pill.textContent = text;
    pill.style.opacity = '0.95';
    clearTimeout(window.__sandboxPillTimer);
    window.__sandboxPillTimer = setTimeout(()=>{ pill.style.opacity='0'; }, 4000);
  }
  function updateSandboxStatusPill(os){
    updateStatusPill('Sandbox: ' + osLabel(os), 'warn'); // treat as neutral fade
  }
  function getUsernameFromCookie(){
    try {
      const m = document.cookie.match(/(?:^|; )username=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    } catch {}
    return null;
  }
  async function pollSandboxStatus(os){
    try {
      const params = new URLSearchParams();
      params.set('os', os);
      const u = getUsernameFromCookie();
      if (u) params.set('user', u);
      const r = await fetch('/sandbox/status?'+params.toString(), { credentials:'include' });
      if (!r.ok) throw new Error('status http '+r.status);
      const j = await r.json();
      sandboxStatus = { ok:true, data:j };
      // Unified mapping for different OS flavors
      const label = os === 'osx' ? 'macOS' : (os === 'windows' ? 'Windows' : (os === 'kali' ? 'Kali' : os));
      const isFallback = j && j.fallbackFrom === os;
      const isUnavailable = j && (j.kind === 'placeholder' || j.state === 'unavailable');
      const isReady = (()=>{
        if (!j || !j.readiness) return false;
        if (os === 'osx') return !!j.readiness.ssh;
        if (os === 'windows') return !!(j.readiness.ssh || j.readiness.winrm || j.readiness.pwsh || j.readiness.rdp);
        if (os === 'kali') return !!(j.readiness.shell || j.readiness.ssh || j.readiness.ready);
        return !!(j.readiness.ready || j.readiness.shell || j.readiness.ssh);
      })();
      if (isFallback) {
        updateStatusPill(label + ': fallback active', 'warn');
      } else if (isUnavailable) {
        updateStatusPill(label + ' unavailable', 'warn');
      } else if (isReady) {
        if (os === 'osx') updateStatusPill('macOS: SSH ready', 'ok');
        else if (os === 'kali') updateStatusPill('Kali: shell ready', 'ok');
        else updateStatusPill(label + ': ready', 'ok');
      } else {
        updateStatusPill(label + ': booting…', 'warn');
      }
      return j;
    } catch(e){ sandboxStatus = { ok:false, error:e.message }; return null; }
  }
  function normalizeOs(os){
    const v = (os||'').toLowerCase();
    if (v === 'macos') return 'osx';
    return v;
  }
  function osLabel(os){
    const o = normalizeOs(os);
    return o === 'osx' ? 'macOS' : (o === 'windows' ? 'Windows' : (o === 'kali' ? 'Kali' : o));
  }
  function startStatusPolling(os){
    const o = normalizeOs(os);
    if (!o) return;
    // Stop previous loop
    if (statusPoll.timer) { clearTimeout(statusPoll.timer); statusPoll.timer = null; }
    statusPoll.os = o; statusPoll.attempts = 0;
    updateStatusPill(osLabel(o) + ': starting…', 'warn');
    const tick = async ()=>{
      // If OS changed mid-loop, stop
      if (statusPoll.os !== o) return;
      statusPoll.attempts++;
      const s = await pollSandboxStatus(o);
      // Early stop on explicit unavailable or fallback
      if (s && (s.kind === 'placeholder' || s.state === 'unavailable' || s.fallbackFrom === o)) return;
      if (statusPoll.attempts < 80) statusPoll.timer = setTimeout(tick, 2000);
      else updateStatusPill(osLabel(o) + ' unavailable', 'warn');
    };
    tick();
  }
  function connectSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    const wsProtocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    // Determine requested OS early: prefer URL ?os=, else localStorage defaultTerminalOS
    let desiredOs = null;
    try {
      const sp = new URLSearchParams(window.location.search);
      desiredOs = (sp.get('os') || localStorage.getItem('defaultTerminalOS') || '').toLowerCase();
      if (desiredOs && !['kali','windows','osx','macos'].includes(desiredOs)) desiredOs = null;
      if (desiredOs === 'macos') desiredOs = 'osx';
    } catch {}
  const osQuery = desiredOs ? `?os=${encodeURIComponent(desiredOs)}` : '';
    socket = new WebSocket(`${wsProtocol}${window.location.host}/sandbox/exec${osQuery}`);
    socketReady = false;
  // Start initial status polling for selected OS
  if (desiredOs && ['osx','windows','kali'].includes(desiredOs)) startStatusPolling(desiredOs);
  socket.onopen = () => {
      socketReady = true;
      // Negotiate preferred mode (interactive by default)
      try { socket.send(JSON.stringify({ type:'negotiate-mode', mode: interactive ? 'interactive':'exec' })); } catch{}
      // Set activity if available
      if (window.currentWorkshopActivity) {
        socket.send(JSON.stringify({ type: 'set-activity', activity: window.currentWorkshopActivity }));
      }
      // Send preferred terminal OS to backend if chosen
      const defaultOs = localStorage.getItem('defaultTerminalOS');
      if (defaultOs) {
        try { socket.send(JSON.stringify({ type: 'set-os', os: defaultOs })); } catch (e) {}
      }
      // Flush queued commands
      while (socketQueue.length) {
        socket.send(socketQueue.shift());
      }
      // Only write a prompt if the last non-empty line does not already end with one
      try {
        const buffer = term.buffer.active;
        let needsPrompt = true;
        for (let i = buffer.length - 1; i >= 0; i--) {
          const line = buffer.getLine(i);
          if (!line) continue;
          const text = line.translateToString().trimEnd();
            if (text.length === 0) continue;
            if (text.endsWith('$') || text.endsWith('$ ')) {
              needsPrompt = false;
            }
            break;
        }
        if (needsPrompt) {
          // Defer slightly to allow any immediate server banner/prompt to arrive first
          setTimeout(() => {
            // Re-evaluate last line before writing prompt
            try {
              const buffer2 = term.buffer.active;
              let stillNeeds = true;
              for (let i = buffer2.length - 1; i >= 0; i--) {
                const line = buffer2.getLine(i);
                if (!line) continue;
                const text = line.translateToString().trimEnd();
                if (!text) continue;
                if (text.endsWith('$') || text.endsWith('$ ')) stillNeeds = false;
                break;
              }
              if (stillNeeds) {
                clearPromptState();
                writePrompt(term);
              }
            } catch {
              clearPromptState();
              writePrompt(term);
            }
          }, 120);
        }
      } catch (e) {
        clearPromptState();
        writePrompt(term);
      }
      logRpgDebug('[heartbeat] socket open to /sandbox/exec');
    };
    socket.onmessage = (event) => {
      let raw = event.data;
      try {
        const json = JSON.parse(raw);
        if (json.type === 'notice') {
          // Display a lightweight toast / inline message in terminal
          if (json.code === 'os-fallback') {
            term.write(`\r\n[NOTICE] OS fallback: '${json.from}' -> '${json.to}' (sandbox not available)\r\n`);
            // Also raise a custom event for UI overlays
            window.dispatchEvent(new CustomEvent('sandbox-notice', { detail: json }));
            showToast(`Sandbox OS '${json.from}' not available; using '${json.to}' instead.`);
            // Keep pill labeled by the requested OS; poll that OS for status mapping
            if (json.from) startStatusPolling(json.from);
          } else if (json.code === 'os-provisioned') {
            const portInfo = json.ports ? ' ports: '+ JSON.stringify(json.ports) : '';
            term.write(`\r\n[NOTICE] Provisioned ${json.os} environment (${json.container || ''})${portInfo}\r\n`);
            window.dispatchEvent(new CustomEvent('sandbox-notice', { detail: json }));
            showToast(`Provisioned ${json.os} VM${portInfo}`, 'info');
            // Continue polling for the desired OS (from localStorage) to keep label stable
            try {
              const desired = localStorage.getItem('defaultTerminalOS') || json.os;
              if (desired) startStatusPolling(desired);
            } catch {
              if (json.os) startStatusPolling(json.os);
            }
          } else {
            term.write(`\r\n[NOTICE] ${json.message || 'Notice'}\r\n`);
          }
          return;
        }
        if (json.type === 'ready') {
          // Ready event: ensure prompt or rely on subsequent data
          window.dispatchEvent(new CustomEvent('sandbox-ready', { detail: json }));
          return;
        }
        if (json.type === 'mode') {
          negotiatedMode = json.mode || negotiatedMode;
          logRpgDebug('[mode] negotiated ' + negotiatedMode);
          return;
        }
        if (json.type === 'text') {
          term.write(json.data);
          return;
        }
        if (json.type === 'data') {
          term.write(json.data);
          return;
        }
        if (json.type === 'command-start') {
          setRunning(true);
          clearPromptState();
          return;
        }
        if (json.type === 'command-end') {
          setRunning(false);
          clearPromptState();
          writePrompt(term);
          return;
        }
        if (json.type === 'pong') {
          logRpgDebug('[heartbeat] pong ' + (json.ts || ''));
          return;
        }
        if (json.type === 'activity-set') {
          logRpgDebug('[activity] set to ' + json.activity);
          return;
        }
  if (json.type === 'validation') {
          // Print validation result in terminal (ensure menu/hint always shown)
          if (json.data.menu) {
            term.write('\r\n--- MENU ---\r\n');
            json.data.menu.forEach(item => term.write(item + '\r\n'));
            term.write('--------------\r\n');
          }
          if (json.data.hint) {
            term.write(`\r\nHint: ${json.data.hint}\r\n`);
          }
          window.dispatchEvent(new CustomEvent('rpg-validated', { detail: json.data }));
          // --- Cross-window messaging: also post to parent/opener if in iframe or popup ---
          let msg = { type: 'rpg-validated', detail: json.data };
          let debugMsg = '[rxvt] postMessage: sending rpg-validated to:';
          let sent = false;
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(msg, '*');
            debugMsg += ' parent';
            sent = true;
          }
          if (window.opener && window.opener !== window) {
            window.opener.postMessage(msg, '*');
            debugMsg += ' opener';
            sent = true;
          }
          term.write('\r\n[DEBUG] RPG validated message sent to' + debugMsg.replace('[rxvt] postMessage: sending rpg-validated to:', '') + '\r\n');
          if (window.DEBUG_RXVT_INPUT) console.log(debugMsg, msg);
          setRunning(false);
          // Only write a prompt if last non-empty line lacks one and terminal not already showing prompt
          try {
            const buffer = term.buffer.active;
            let needsPrompt = true;
            for (let i = buffer.length - 1; i >= 0; i--) {
              const line = buffer.getLine(i);
              if (!line) continue;
              const text = line.translateToString().trimEnd();
              if (!text) continue;
              if (text.endsWith('$') || text.endsWith('$ ')) needsPrompt = false;
              break;
            }
            clearPromptState();
            if (needsPrompt) writePrompt(term);
          } catch {
            clearPromptState();
            writePrompt(term);
          }
          return;
        }
        // Fallback for unknown json types: just write data or ignore
        if (json.data && typeof json.data === 'string') {
          term.write(json.data);
        }
      } catch (e) {
        // Non-JSON fallback (legacy server output) - write raw
        if (typeof raw === 'string') {
          term.write(raw.replace(/\$\s*$/, ''));
        } else {
          term.write(raw);
        }
      }
    };
    socket.onclose = () => {
      socketReady = false;
      setTimeout(connectSocket, 1000); // Auto-reconnect
    };
    socket.onerror = (err) => {
      clearPromptState();
      term.write('\r\n\x1b[1;37m\x1b[41mError:\x1b[0m \x1b[31m' + (err && err.message ? err.message : 'WebSocket error') + '\x1b[0m\r\n');
      writePrompt(term);
      socketReady = false;
    };
  }
  connectSocket();
  // Monitor defaultTerminalOS for changes and update polling accordingly
  setInterval(() => {
    try {
      const lsOs = normalizeOs(localStorage.getItem('defaultTerminalOS'));
      if (lsOs && lsOs !== statusPoll.os && ['osx','windows','kali'].includes(lsOs)) {
        startStatusPolling(lsOs);
      }
    } catch {}
  }, 2000);
  // Heartbeat (client -> container) & logging to rpg-debug-log
  function logRpgDebug(msg) {
    const el = document.getElementById('rpg-debug-log');
    if (!el) return; // Only log if debug log present
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    el.textContent += `[${time}] ${msg}\n`;
    el.scrollTop = el.scrollHeight;
  }
  setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try { socket.send(JSON.stringify({ type: 'heartbeat', ts: Date.now() })); } catch (e) {}
      logRpgDebug('[heartbeat] sent');
    }
  }, 15000);

  // Create rxvt-unicode-256color terminal instance
  const term = new Terminal({
    theme: {
      background: '#2e3440',       // rxvt-unicode default background 
      foreground: '#d8dee9',       // rxvt-unicode default foreground
      cursor: '#d8dee9',           // matching foreground cursor
      cursorAccent: '#2e3440',     // cursor accent 
      selection: '#434c5e',        // selection background
      black: '#3b4252',            // color0
      red: '#bf616a',              // color1
      green: '#a3be8c',            // color2
      yellow: '#ebcb8b',           // color3
      blue: '#81a1c1',             // color4
      magenta: '#b48ead',          // color5
      cyan: '#88c0d0',             // color6
      white: '#e5e9f0',            // color7
      brightBlack: '#4c566a',      // color8
      brightRed: '#bf616a',        // color9
      brightGreen: '#a3be8c',      // color10
      brightYellow: '#ebcb8b',     // color11
      brightBlue: '#81a1c1',       // color12
      brightMagenta: '#b48ead',    // color13
      brightCyan: '#8fbcbb',       // color14
      brightWhite: '#eceff4'       // color15
    },
    fontFamily: 'Liberation Mono, Consolas, monospace', // rxvt-unicode typical fonts
    fontSize: 11,                  // rxvt-unicode typical size
    cursorBlink: false,            // rxvt-unicode typically non-blinking
    cursorStyle: 'block',          // block cursor like rxvt
    allowTransparency: false,      // solid background
    drawBoldTextInBrightColors: true // rxvt-unicode behavior
  });
  window.term = term;
  // Toast container
  let toastHost = document.getElementById('toast-host');
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.id = 'toast-host';
    toastHost.style.position = 'fixed';
    toastHost.style.top = '12px';
    toastHost.style.right = '12px';
    toastHost.style.zIndex = 9999;
    toastHost.style.display = 'flex';
    toastHost.style.flexDirection = 'column';
    toastHost.style.gap = '6px';
    document.body.appendChild(toastHost);
  }
  function showToast(msg, type='warn') {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.padding = '8px 12px';
    el.style.fontSize = '12px';
    el.style.borderRadius = '4px';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  const colors = { warn: '#d35400', info: '#2980b9', error: '#c0392b' };
  el.style.background = colors[type] || '#2c3e50';
    el.style.color = '#fff';
    el.style.opacity = '0';
    el.style.transition = 'opacity .25s';
    toastHost.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity='1'; });
    setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>{ el.remove(); }, 300); }, 4000);
  }

  const fitAddon = new window.FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(termContainer);
  fitAddon.fit();

  // Notify other scripts that rxvt terminal is ready
  window.dispatchEvent(new Event('rxvt-ready'));

  // Restore terminal settings from localStorage if present (after open)
  const bg = localStorage.getItem('terminalBg');
  const fg = localStorage.getItem('terminalFg');
  const font = localStorage.getItem('terminalFont');
  if (bg && fg && font) {
    term.options.theme = { background: bg, foreground: fg };
    term.options.fontFamily = font;
    if (termContainer) {
      termContainer.style.background = bg;
      termContainer.style.color = fg;
      termContainer.style.fontFamily = font;
    }
  }

  // --- FIX: Expose a factory for new terminals ---
  window.createNewTerminal = function(termDiv) {
    const newXterm = new window.Terminal({
      theme: term.options.theme,
      fontFamily: term.options.fontFamily,
      fontSize: term.options.fontSize,
      cursorBlink: true
    });
    const fitAddon = new window.FitAddon.FitAddon();
    newXterm.loadAddon(fitAddon);
    newXterm.open(termDiv);
    fitAddon.fit();
    let currentCommand = '';
    
    // Local prompt state for this terminal instance
    let localPromptState = {
      hasPrompt: false,
      isRunning: false
    };
    
    function writePromptLocal() {
      if (!localPromptState.hasPrompt && !localPromptState.isRunning) {
        newXterm.write('$ ');
        localPromptState.hasPrompt = true;
      }
    }
    
    function clearPromptStateLocal() {
      localPromptState.hasPrompt = false;
    }
    
    function setRunningLocal(running) {
      localPromptState.isRunning = running;
      if (running) {
        localPromptState.hasPrompt = false;
      }
    }
    
    let socket = null;
    let socketReady = false;
    let socketQueue = [];
    function connectSocket() {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
      const wsProtocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
      socket = new WebSocket(`${wsProtocol}${window.location.host}/sandbox/exec`);
      socketReady = false;
      socket.onopen = () => {
        socketReady = true;
        if (window.currentWorkshopActivity) {
          socket.send(JSON.stringify({ type: 'set-activity', activity: window.currentWorkshopActivity }));
        }
        while (socketQueue.length) {
          socket.send(socketQueue.shift());
        }
        clearPromptStateLocal();
        writePromptLocal();
      };
      socket.onmessage = (event) => {
        try {
          const json = JSON.parse(event.data);
          if (json.type === 'validation') {
            // Print validation result in terminal
            if (json.data.menu) {
              newXterm.write('\r\n--- MENU ---\r\n');
              json.data.menu.forEach(item => newXterm.write(item + '\r\n'));
              newXterm.write('--------------\r\n');
            }
            if (json.data.hint) {
              newXterm.write(`\r\nHint: ${json.data.hint}\r\n`);
            }
            window.dispatchEvent(new CustomEvent('rpg-validated', { detail: json.data }));
            // --- Cross-window messaging: post to parent and opener if present, with visible debug output ---
            let msg = { type: 'rpg-validated', detail: json.data };
            let debugMsg = '[rxvt] postMessage: sending rpg-validated to:';
            let sent = false;
            if (window.parent && window.parent !== window) {
              if (window.DEBUG_RXVT_INPUT) {
                console.log('[rxvt crosswin] Posting rpg-validated to window.parent', json.data);
              }
              window.parent.postMessage(msg, '*');
              debugMsg += ' parent';
              sent = true;
            }
            if (window.opener && window.opener !== window) {
              if (window.DEBUG_RXVT_INPUT) {
                console.log('[rxvt crosswin] Posting rpg-validated to window.opener', json.data);
              }
              window.opener.postMessage(msg, '*');
              debugMsg += ' opener';
              sent = true;
            }
            // --- BroadcastChannel for robust cross-tab/panel messaging ---
            if (window.BroadcastChannel) {
              try {
                const bc = new BroadcastChannel('inspector-rpg');
                bc.postMessage(msg);
                debugMsg += ' broadcast';
                sent = true;
                if (window.DEBUG_XTERM_INPUT) console.log('[xterm crosswin] Posting rpg-validated to BroadcastChannel', msg);
                newXterm.write('\r\n[DEBUG] RPG validated message sent via BroadcastChannel\r\n');
                bc.close();
              } catch (e) {
                newXterm.write('\r\n[DEBUG] BroadcastChannel error: ' + e + '\r\n');
              }
            }
            if (sent) {
              newXterm.write('\r\n[DEBUG] RPG validated message sent to' + debugMsg.replace('[xterm] postMessage: sending rpg-validated to:', '') + '\r\n');
              if (window.DEBUG_XTERM_INPUT) console.log(debugMsg, msg);
            } else {
              newXterm.write('\r\n[DEBUG] RPG validated message NOT sent (no parent/opener/broadcast)\r\n');
              if (window.DEBUG_XTERM_INPUT) console.log('[xterm] postMessage: no parent/opener/broadcast for rpg-validated', msg);
            }
            setRunningLocal(false);
            writePromptLocal();
            return;
          }
        } catch (err) {
          // Check if the incoming data contains a prompt at the end
          let data = event.data;
          let hasServerPrompt = false;
          
          // Check for common prompt patterns at the end of messages
          if (typeof data === 'string' && (data.endsWith('$ ') || data.endsWith('$'))) {
            hasServerPrompt = true;
            // Remove the server prompt since we'll manage it client-side
            data = data.replace(/\$\s*$/, '');
          }
          
          newXterm.write(data);
          
          // If the command finished (indicated by server prompt), manage client-side prompt
          if (hasServerPrompt) {
            setRunningLocal(false);
            writePromptLocal();
          }
        }
      };
      socket.onclose = () => {
        socketReady = false;
        setTimeout(connectSocket, 1000);
      };
      socket.onerror = (err) => {
        newXterm.write('\r\n\x1b[1;37m\x1b[41mError:\x1b[0m \x1b[31m' + (err && err.message ? err.message : 'WebSocket error') + '\x1b[0m\r\n');
        clearPromptStateLocal();
        writePromptLocal();
        socketReady = false;
      };
    }
    connectSocket();
    newXterm.onData((data) => {
      if (localPromptState.isRunning) {
        if (data === '\x03' || data === '\x1b') {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send('\x03');
          }
          newXterm.write('^C\r\n');
          setRunningLocal(false);
          writePromptLocal();
        }
        return;
      }
      if (data === '\r') {
        newXterm.write('\r\n');
        if (currentCommand.trim()) {
          if (socketReady) {
            setRunningLocal(true);
            socket.send(currentCommand);
          } else {
            socketQueue.push(currentCommand);
          }
        } else {
          clearPromptStateLocal();
          writePromptLocal();
        }
        currentCommand = '';
      } else if (data === '\u007F') {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          newXterm.write('\b \b');
        }
      } else {
        currentCommand += data;
        newXterm.write(data);
      }
    });
    return newXterm;
  };

  // Always show welcome message after settings are applied
  function showWelcome() {
    let hasWelcomed = false;
    // Check if terminal's active buffer contains the welcome message
    const buffer = term.buffer.active;
    if (buffer && buffer.length) {
      for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line && line.translateToString().includes("Welcome to")) {
          hasWelcomed = true;
          break;
        }
      }
    }
    if (!hasWelcomed) {
      term.clear();
      term.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n");
      term.write("$ ");
    }
  }
  //showWelcome();

  // Interactive input handler (JSON protocol)
  let currentCommandMain = '';
  let history = [];
  let historyIndex = -1;
  term.onData(data => {
    // Interrupt (Ctrl+C)
    if (data === '\x03') {
      enqueueJson({ type:'interrupt' });
      term.write('^C');
      currentCommandMain='';
      writePrompt(term);
      return;
    }
    // Clear screen (Ctrl+L)
    if (data === '\x0c') { // form feed
      term.reset();
      clearPromptState();
      writePrompt(term);
      return;
    }
    // Interactive mode: rely on remote shell for echo to avoid double input duplication
    if (negotiatedMode === 'interactive') {
      if (data === '\r') {
        // Send newline to remote shell
        sendStdin(data);
        const cmd = currentCommandMain.trim();
        if (cmd) {
          history.unshift(cmd);
          historyIndex = -1;
          setRunning(true);
          clearPromptState();
          enqueueJson({ type:'command', command: cmd });
        }
        currentCommandMain='';
        return;
      }
      if (data === '\u007F') { // Backspace
        if (currentCommandMain.length>0) currentCommandMain = currentCommandMain.slice(0,-1);
        sendStdin(data); // remote shell will handle deletion
        return;
      }
      if (data === '\x1b[A') { // up arrow history navigate (manual recall)
        if (history.length) {
          if (historyIndex < history.length -1) historyIndex++;
          // Push recalled command chars to remote shell (simulate user typing)
          const recall = history[historyIndex];
          // Clear current line remotely (Ctrl+U) then retype (best effort)
          sendStdin('\u0015');
          for (const ch of recall) sendStdin(ch);
          currentCommandMain = recall;
        }
        return;
      }
      if (data === '\x1b[B') { // down arrow
        if (historyIndex > 0) { historyIndex--; }
        else if (historyIndex === 0) { historyIndex = -1; currentCommandMain=''; }
        const recall = historyIndex >=0 ? history[historyIndex] : '';
        sendStdin('\u0015');
        for (const ch of recall) sendStdin(ch);
        currentCommandMain = recall;
        return;
      }
      // Tab passthrough & all other characters
      sendStdin(data);
      if (data !== '\t' && data !== '\n') currentCommandMain += data;
      return;
    }
    // Exec (non-interactive) mode local line editing & echo
    if (data === '\x1b[A') { // up
      if (history.length) {
        if (historyIndex < history.length -1) historyIndex++;
        redrawHistory();
      }
      return;
    }
    if (data === '\x1b[B') { // down
      if (historyIndex > 0) { historyIndex--; redrawHistory(); }
      else if (historyIndex === 0) { historyIndex = -1; replaceLine(''); }
      return;
    }
    if (data === '\t') { // Tab pass-through when not interactive
      sendStdin(data);
      return;
    }
    if (data === '\r') {
      term.write('\r\n');
      const cmd = currentCommandMain.trim();
      if (cmd) {
        history.unshift(cmd);
        historyIndex = -1;
        setRunning(true);
        clearPromptState();
        enqueueJson({ type:'command', command: cmd });
      } else {
        writePrompt(term);
      }
      currentCommandMain='';
      return;
    }
    if (data === '\u007F') {
      if (currentCommandMain.length>0) {
        currentCommandMain = currentCommandMain.slice(0,-1);
        term.write('\b \b');
      }
      return;
    }
    currentCommandMain += data;
    term.write(data);
  });

  function enqueueJson(obj) {
    const payload = JSON.stringify(obj);
    if (socketReady) socket.send(payload); else socketQueue.push(payload);
  }
  function sendStdin(chunk) { enqueueJson({ type:'stdin', data: chunk }); }
  function replaceLine(txt) {
    // Erase current line content after prompt
    const backspaces = currentCommandMain.length;
    for (let i=0;i<backspaces;i++) term.write('\b \b');
    currentCommandMain = txt;
    term.write(txt);
  }
  function redrawHistory() {
    if (historyIndex >=0 && historyIndex < history.length) {
      replaceLine(history[historyIndex]);
    }
  }
  // term.onData((data) => {
  //   // --- Ctrl+C and Escape handling while running ---
  //   if (isRunning) {
  //     // Ctrl+C (ASCII 3) or Escape (ASCII 27)
  //     if (data === '\x03' || data === '\x1b') {
  //       if (socket && socket.readyState === WebSocket.OPEN) {
  //         socket.send('\x03'); // Send SIGINT to backend
  //       }
  //       // Optionally, show ^C in terminal
  //       term.write('^C\r\n$ ');
  //       isRunning = false;
  //     }
  //     return;
  //   }
  //   if (data === '\r') {
  //     term.write('\r\n');
  //     if (currentCommand.trim()) {
  //       runCommand(currentCommand);
  //     } else {
  //       term.write('$ ');
  //     }
  //     currentCommand = '';
  //   } else if (data === '\u007F') {
  //     // Backspace
  //     if (currentCommand.length > 0) {
  //       currentCommand = currentCommand.slice(0, -1);
  //       term.write('\b \b');
  //     }
  //   } else {
  //     currentCommand += data;
  //     term.write(data);
  //   }
  // });

  // Function to run a command via the server and output to the terminal.
  // function runCommand(commandStr) {
  //   if (isRunning) return;
  //   if (commandStr.trim() === 'clear' || commandStr.trim() === 'cls') {
  //     showWelcome();
  //     return;
  //   }
  //   isRunning = true;
  //   // Use ws/wss depending on protocol
  //   const wsProtocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  //   socket = new WebSocket(`${wsProtocol}${window.location.host}/run`);
  //   socket.onopen = () => {
  //     socket.send(commandStr);
  //   };
  //   socket.onmessage = (event) => {
  //     try {
  //       const json = JSON.parse(event.data);
  //       if (json.type === 'validation') {
  //         window.dispatchEvent(new CustomEvent('rpg-validated', { detail: json.data }));
  //         term.write('$ ');
  //         isRunning = false;
  //         return;
  //       }
  //     } catch (err) {
  //       // Not JSON — likely streaming output
  //       term.write(event.data);
  //     }
  //   };
  //   socket.onclose = () => {
  //     // Always show prompt after command completes
  //     term.write('\r\n$ ');
  //     isRunning = false;
  //   };
  //   socket.onerror = (err) => {
  //     term.write('\r\n\x1b[1;37m\x1b[41mError:\x1b[0m \x1b[31m' + (err && err.message ? err.message : 'WebSocket error') + '\x1b[0m\r\n$ ');
  //     isRunning = false;
  //   };
  // }
  // window.runCommand = runCommand;

  // Removed legacy term.onData handler to prevent duplicate input/prompt logic.

  // Listen for terminal style changes (from settings modal)
  window.addEventListener('apply-terminal-style', function(e) {
    const { bg, fg, font } = e.detail;
    term.options.theme = { background: bg, foreground: fg };
    term.options.fontFamily = font;
    if (termContainer) {
      termContainer.style.background = bg;
      termContainer.style.color = fg;
      termContainer.style.fontFamily = font;
    }
  });

  // --- xterm.js multi-terminal logic ---
  window.terminals = [{ id: 0, label: 'Terminal 1', element: document.getElementById('output-terminal'), xterm: window.term }];
  window.activeTerminal = 0;

  function switchTerminal(idx) {
    window.terminals.forEach((t, i) => {
      t.element.style.display = (i === idx) ? '' : 'none';
      if (t.xterm && i === idx) t.xterm.focus();
      // Show/hide associated drop area
      const drop = document.getElementById('drop-area-' + t.id);
      if (drop) drop.style.display = (i === idx) ? '' : 'none';
    });
    window.activeTerminal = idx;
    renderTerminalTabs();
  }

  function renderTerminalTabs() {
    const terminalTabs = document.getElementById('terminal-tabs');
    const dropdownMenu = document.getElementById('terminal-dropdown-menu');
    terminalTabs.innerHTML = '';
    let showDropdown = window.terminals.length > 6;
    if (showDropdown) {
      const dropdown = document.createElement('button');
      dropdown.className = 'terminal-tab-btn';
      dropdown.textContent = `Terminals (${window.terminals.length}) \u25BC`;
      dropdown.onclick = (e) => {
        e.stopPropagation();
        buildTerminalDropdownMenu();
        showDropdownMenu(dropdown);
      };
      terminalTabs.appendChild(dropdown);
    } else {
      window.terminals.forEach((t, i) => {
        const btn = document.createElement('button');
        btn.className = 'terminal-tab-btn';
        btn.textContent = (window.terminals.length > 3) ? `${i + 1}` : t.label;
        btn.onclick = () => switchTerminal(i);
        if (i > 0) {
          const del = document.createElement('span');
          del.textContent = '×';
          del.style.marginLeft = '6px';
          del.style.color = '#c0392b';
          del.style.cursor = 'pointer';
          del.onclick = (e) => {
            e.stopPropagation();
            window.terminals[i].element.remove();
            window.terminals[i].xterm.dispose();
            // Remove associated drop area
            const drop = document.getElementById('drop-area-' + window.terminals[i].id);
            if (drop) drop.remove();
            window.terminals.splice(i, 1);
            if (window.activeTerminal >= i) window.activeTerminal = Math.max(0, window.activeTerminal - 1);
            switchTerminal(window.activeTerminal);
          };
          btn.appendChild(del);
        }
        terminalTabs.appendChild(btn);
      });
    }
  }

  function buildTerminalDropdownMenu() {
    const dropdownMenu = document.getElementById('terminal-dropdown-menu');
    dropdownMenu.innerHTML = '';
    window.terminals.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = t.label;
      item.onclick = (ev) => {
        ev.stopPropagation();
        switchTerminal(i);
        dropdownMenu.style.display = 'none';
      };
      dropdownMenu.appendChild(item);
    });
    // Divider
    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    divider.style.height = '1px';
    divider.style.background = '#333';
    divider.style.margin = '4px 0';
    dropdownMenu.appendChild(divider);

    // Terminal action functions
    function deleteTerminal() {
      if (window.terminals.length > 1) {
        const currentIdx = window.activeTerminal;
        const termObj = window.terminals[currentIdx];
        if (termObj.element) termObj.element.remove();
        if (termObj.xterm && termObj.xterm.dispose) termObj.xterm.dispose();
        const drop = document.getElementById('drop-area-' + termObj.id);
        if (drop) drop.remove();
        window.terminals.splice(currentIdx, 1);
        window.activeTerminal = Math.max(0, currentIdx - 1);
        switchTerminal(window.activeTerminal);
        renderTerminalTabs();
      } else {
        alert('Cannot delete the only terminal.');
      }
    }

    function endRunningProcess() {
      const termObj = window.terminals[window.activeTerminal];
      // Simulate sending Ctrl+C to terminate the running process.
      // Note: Actual termination depends on the backend command handling.
      termObj.xterm.write('\x03');
      termObj.xterm.write('\r\nProcess terminated.\r\n');
      
      // Find the state for this terminal and reset it properly
      const state = findTerminalState(termObj);
      if (state) {
        state.isRunning = false;
        state.hasPrompt = false;
        if (!state.isRunning) {
          termObj.xterm.write('$ ');
          state.hasPrompt = true;
        }
      } else {
        // Fallback if state not found
        termObj.xterm.write('$ ');
      }
    }

    function changeShell(shellType) {
      const termObj = window.terminals[window.activeTerminal];
      let command;
      switch (shellType) {
        case 'root':
          command = 'sudo -i';
          break;
        case 'bash':
          command = 'bash';
          break;
        case 'zsh':
          command = 'zsh';
          break;
        case 'batch':
          command = 'cmd';
          break;
        case 'pwsh':
          command = 'pwsh';
          break;
        default:
          return;
      }
      termObj.xterm.write(`\r\nSwitching to ${shellType} shell: ${command}\r\n`);
      // Optionally, actually run the command via the backend:
      if (window.runCommand) {
        window.runCommand(command);
      }
    }

    // Add other dropdown actions
    [
      { action: 'delete', label: 'Delete Terminal' },
      { action: 'end-process', label: 'End Running Process' },
      { action: 'shell-root', label: 'Switch to Root Shell' },
      { action: 'shell-bash', label: 'Switch to Bash' },
      { action: 'shell-zsh', label: 'Switch to Zsh' },
      { action: 'shell-batch', label: 'Switch to Batch' },
  { action: 'shell-pwsh', label: 'Switch to PowerShell' }
    ].forEach(opt => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = opt.label;
      item.setAttribute('data-action', opt.action);
      item.onclick = (ev) => {
        ev.stopPropagation();
        switch (opt.action) {
          case 'delete':
            deleteTerminal();
            break;
          case 'end-process':
            endRunningProcess();
            break;
          case 'shell-root':
            changeShell('root');
            break;
          case 'shell-bash':
            changeShell('bash');
            break;
          case 'shell-zsh':
            changeShell('zsh');
            break;
          case 'shell-batch':
            changeShell('batch');
            break;
          case 'shell-pwsh':
            changeShell('pwsh');
            break;
          default:
            break;
        }
        dropdownMenu.style.display = 'none';
      };
      dropdownMenu.appendChild(item);
    });

    // Divider before OS selection
    const osDivider = document.createElement('div');
    osDivider.className = 'dropdown-divider';
    osDivider.style.height = '1px';
    osDivider.style.background = '#333';
    osDivider.style.margin = '4px 0';
    dropdownMenu.appendChild(osDivider);

    function setCurrentTerminalOS(os) {
      localStorage.setItem('currentTerminalOS', os);
      logRpgDebug(`[terminal] current OS set to ${os}`);
      updateSandboxStatusPill(os);
      try { if (socket && socket.readyState === WebSocket.OPEN) { socket.send(JSON.stringify({ type: 'set-os', os })); } } catch {}
    }

    // Only show macOS option if feature flag or status endpoint indicates availability, else keep it visible but labeled (beta)
  const osOptions = ['kali','windows'].concat((window.FEATURE_MACOS_DOCKUR === '1') ? ['osx'] : []);
  osOptions.forEach(os => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      let label = `Set Current OS: ${os}`;
      if (os === 'osx') label = `Set Current OS: macOS (beta)`;
      item.textContent = label;
      item.setAttribute('role','menuitem');
      item.tabIndex = 0;
      item.onclick = (e) => { e.stopPropagation(); setCurrentTerminalOS(os); dropdownMenu.style.display='none'; };
      item.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } };
      dropdownMenu.appendChild(item);
    });
  // SuperUser option
  const su = document.createElement('div');
  su.className = 'dropdown-item';
  su.textContent = 'Set SuperUser';
  su.onclick = (e)=>{ e.stopPropagation(); window.IS_SUPER_USER = true; updateSandboxStatusPill(localStorage.getItem('currentTerminalOS')||'auto'); dropdownMenu.style.display='none'; };
  dropdownMenu.appendChild(su);
  }

  function showDropdownMenu(relativeToBtn) {
    const dropdownMenu = document.getElementById('terminal-dropdown-menu');
    const btnRect = relativeToBtn.getBoundingClientRect();
    const consoleRect = relativeToBtn.closest('.console').getBoundingClientRect();
    dropdownMenu.style.left = (btnRect.left - consoleRect.left) + 'px';
    dropdownMenu.style.top = (btnRect.bottom - consoleRect.top) + 'px';
    dropdownMenu.style.display = 'block';
    dropdownMenu.style.zIndex = 9999;
  }

  // Attach dropdown to ▼ button
  const dropdownBtn = document.getElementById('btn-terminal-dropdown');
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      buildTerminalDropdownMenu();
      showDropdownMenu(dropdownBtn);
    });
  }
  // Hide dropdown when clicking outside
  window.addEventListener('click', function() {
    const dropdownMenu = document.getElementById('terminal-dropdown-menu');
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  });

  // --- Fix: Ensure all terminals accept input, including the first one ---
  // --- Deep refactor: Robust per-terminal state, single handler, debug output ---
  function patchTerminalInput(t) {
    if (!t) return;
    // Ensure only one input handler per terminal
    if (t._inputPatched) {
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm patch] Input already patched for terminal', t.id || '[unknown]');
        }
        return;
    }
    t._inputPatched = true;
    if (window.DEBUG_XTERM_INPUT) {
        console.log('[xterm patch] Attaching input handler for terminal', t.id || '[unknown]');
    }
    // Per-terminal state
    t._xtermInputState = {
        currentCommand: '',
        isRunning: false,
        socket: null,
        hasPrompt: false
    };
    // Defensive: clear any previous handler
    if (t._inputDisposable) {
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm patch] Disposing previous input handler for terminal', t.id || '[unknown]');
        }
        t._inputDisposable.dispose();
    }
    // Defensive: clear/reset terminal input buffer
    if (typeof t.xterm.clearInput === 'function') t.xterm.clearInput();
    if (typeof t.xterm.reset === 'function') t.xterm.reset();
    // Attach new input handler
    t._inputDisposable = t.xterm.onData((data) => {
        const state = t._xtermInputState;
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm input] onData:', JSON.stringify(data), 'currentCommand:', state.currentCommand, 'isRunning:', state.isRunning, 'termId:', t.id || '[unknown]');
        }
        // Reset currentCommand if undefined or null (defensive)
        if (typeof state.currentCommand !== 'string') state.currentCommand = '';
        // Ctrl+L (clear)
        if (data === '\x0c') {
            t.xterm.clear();
            t.xterm.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n");
            state.hasPrompt = false;
            if (!state.isRunning) {
                t.xterm.write('$ ');
                state.hasPrompt = true;
            }
            state.currentCommand = '';
            if (window.DEBUG_XTERM_INPUT) {
                console.log('[xterm input] Ctrl+L clear triggered, state reset for terminal', t.id || '[unknown]');
            }
            return;
        }
        if (state.isRunning) {
            // Ctrl+C or Escape
            if (data === '\x03' || data === '\x1b') {
                if (state.socket && state.socket.readyState === WebSocket.OPEN) {
                    state.socket.send('\x03');
                }
                t.xterm.write('^C\r\n');
                state.isRunning = false;
                state.hasPrompt = false;
                if (!state.isRunning) {
                    t.xterm.write('$ ');
                    state.hasPrompt = true;
                }
                if (window.DEBUG_XTERM_INPUT) {
                    console.log('[xterm input] Ctrl+C/Esc during running, process killed, state reset for terminal', t.id || '[unknown]');
                }
            }
            return;
        }
        if (data === '\r') {
            t.xterm.write('\r\n');
            if (window.DEBUG_XTERM_INPUT) {
                console.log('[xterm input] Enter pressed, command:', state.currentCommand, 'termId:', t.id || '[unknown]');
            }
            if (state.currentCommand.trim()) {
                if (window.DEBUG_XTERM_INPUT) {
                    console.log('[xterm input] Submitting command:', state.currentCommand, 'termId:', t.id || '[unknown]');
                }
                // Run command via WebSocket
                runCommandForTerminal(t, state.currentCommand);
            } else {
                state.hasPrompt = false;
                if (!state.isRunning) {
                    t.xterm.write('$ ');
                    state.hasPrompt = true;
                }
            }
            state.currentCommand = '';
            if (window.DEBUG_XTERM_INPUT) {
                console.log('[xterm input] Command buffer reset after Enter, termId:', t.id || '[unknown]');
            }
        } else if (data === '\u007F') {
            // Backspace
            if (state.currentCommand.length > 0) {
                state.currentCommand = state.currentCommand.slice(0, -1);
                t.xterm.write('\b \b');
                if (window.DEBUG_XTERM_INPUT) {
                    console.log('[xterm input] Backspace, new currentCommand:', state.currentCommand, 'termId:', t.id || '[unknown]');
                }
            }
        } else {
            state.currentCommand += data;
            t.xterm.write(data);
            if (window.DEBUG_XTERM_INPUT) {
                console.log('[xterm input] Char appended, new currentCommand:', state.currentCommand, 'termId:', t.id || '[unknown]');
            }
        }
    });
}

// Helper: run command for a terminal, robust per-terminal state, with debug
function runCommandForTerminal(t, commandStr) {
    const state = t._xtermInputState;
    if (!state) return;
    if (state.isRunning) {
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm runCommand] Already running, ignoring new command for terminal', t.id || '[unknown]');
        }
        return;
    }
    if (commandStr.trim() === 'clear' || commandStr.trim() === 'cls') {
        t.xterm.clear();
        t.xterm.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n");
        state.hasPrompt = false;
        if (!state.isRunning) {
            t.xterm.write('$ ');
            state.hasPrompt = true;
        }
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm runCommand] clear/cls command, terminal cleared', t.id || '[unknown]');
        }
        return;
    }
    state.isRunning = true;
    // Defensive: close previous socket if any
    if (state.socket && state.socket.readyState !== WebSocket.CLOSED) {
        try { state.socket.close(); } catch (e) {}
    }
    const wsProtocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    state.socket = new WebSocket(`${wsProtocol}${window.location.host}/sandbox/exec`);
    if (window.DEBUG_XTERM_INPUT) {
        console.log('[xterm runCommand] Opening WebSocket for command', commandStr, 'termId:', t.id || '[unknown]');
    }
    state.socket.onopen = () => {
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm runCommand] WebSocket open, sending command', commandStr, 'termId:', t.id || '[unknown]');
        }
        state.socket.send(commandStr);
    };
    state.socket.onmessage = (event) => {
        // Check if the incoming data contains a prompt at the end
        let data = event.data;
        let hasServerPrompt = false;
        
        // Check for common prompt patterns at the end of messages
        if (typeof data === 'string' && (data.endsWith('$ ') || data.endsWith('$'))) {
            hasServerPrompt = true;
            // Remove the server prompt since we'll manage it client-side
            data = data.replace(/\$\s*$/, '');
        }
        
        try {
            const json = JSON.parse(data);
            if (json.type === 'validation') {
                if (window.DEBUG_XTERM_INPUT) {
                    console.log('[xterm runCommand] Validation message received', json, 'termId:', t.id || '[unknown]');
                }
                // Print RPG menu if present
                if (json.data && json.data.menu) {
                    t.xterm.write('\r\n--- MENU ---\r\n');
                    json.data.menu.forEach(item => t.xterm.write(item + '\r\n'));
                    t.xterm.write('--------------\r\n');
                }
                if (json.data && json.data.hint) {
                    t.xterm.write(`\r\nHint: ${json.data.hint}\r\n`);
                }
                window.dispatchEvent(new CustomEvent('rpg-validated', { detail: json.data }));
                state.isRunning = false;
                state.hasPrompt = false;
                if (!state.isRunning) {
                    t.xterm.write('$ ');
                    state.hasPrompt = true;
                }
                return;
            }
        } catch (err) {
            // If it's not JSON, it's regular terminal output
            // Strip server-sent prompts to avoid duplication
            let cleanData = data;
            if (typeof cleanData === 'string') {
                // Remove trailing prompts that the server might send
                cleanData = cleanData.replace(/\$\s*$/, '');
            }
            t.xterm.write(cleanData);
            
            // If the command finished (server sent a prompt), show our managed prompt
            if (hasServerPrompt) {
                state.isRunning = false;
                state.hasPrompt = false;
                if (!state.isRunning) {
                    t.xterm.write('$ ');
                    state.hasPrompt = true;
                }
            }
        }
    };
    state.socket.onclose = () => {
        state.isRunning = false;
        state.hasPrompt = false;
        if (!state.isRunning) {
            t.xterm.write('\r\n$ ');
            state.hasPrompt = true;
        }
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm runCommand] WebSocket closed, prompt shown, termId:', t.id || '[unknown]');
        }
    };
    state.socket.onerror = (err) => {
        state.isRunning = false;
        state.hasPrompt = false;
        if (!state.isRunning) {
            t.xterm.write('\r\n\x1b[1;37m\x1b[41mError:\x1b[0m \x1b[31m' + (err && err.message ? err.message : 'WebSocket error') + '\x1b[0m\r\n$ ');
            state.hasPrompt = true;
        }
        if (window.DEBUG_XTERM_INPUT) {
            console.log('[xterm runCommand] WebSocket error', err, 'termId:', t.id || '[unknown]');
        }
    };
  }
  // Patch all terminals on load and when new ones are added
  window.terminals.forEach(patchTerminalInput);
  window.patchTerminalInput = patchTerminalInput;
  window.addEventListener('xterm-ready', function() {
    window.terminals.forEach(patchTerminalInput);
  });

  // --- Fix: Ctrl+C only affects the current terminal ---
  // (Handled in patchTerminalInput per terminal)

  // --- Play button runs blocks in the most recently opened terminal ---
  var playRunButton = document.getElementById('run-button');
  if (playRunButton) {
    playRunButton.onclick = function() {
      const t = window.terminals[window.activeTerminal];
  const targetDrop = document.getElementById('drop-area-' + t.id) || document.getElementById('drop-area');
  const targetDropId = targetDrop ? targetDrop.id : ('drop-area-' + t.id);
  let commandStr = window.buildCommandStringFromBlocks(targetDropId);
      // Defensive sanitation: remove accidental 'undefined' prefixes and trailing operators
      if (typeof commandStr !== 'string') commandStr = String(commandStr || '');
      commandStr = commandStr.replace(/^\s*undefined\s+/i, '').replace(/\s*&&\s*$/,'');
      if (!commandStr.trim()) {
        t.xterm.write('\r\n$ ');
        return;
      }
      // Simulate typing and running in the active terminal
      let prompt = '$ ';
      t.xterm.write('\r\n' + prompt);
      for (let c of commandStr) {
        t.xterm.write(c);
      }
      t.xterm.write('\r\n');
      // Actually run the command
      let currentCommand = commandStr;
      let isRunning = false;
      let socket = null;
      function runCommand(commandStr) {
        if (isRunning) return;
        if (commandStr.trim() === 'clear' || commandStr.trim() === 'cls') {
          t.xterm.clear();
          t.xterm.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n$ ");
          return;
        }
        isRunning = true;
        const wsProtocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
        socket = new WebSocket(`${wsProtocol}${window.location.host}/sandbox/exec`);
        socket.onopen = () => {
          socket.send(commandStr);
        };
        socket.onmessage = (event) => {
          try {
            const json = JSON.parse(event.data);
            if (json.type === 'validation') {
              window.dispatchEvent(new CustomEvent('rpg-validated', { detail: json.data }));
              return;
            }
          } catch (err) {
            // Check if the incoming data contains a prompt at the end
            let data = event.data;
            let hasServerPrompt = false;
            
            // Check for common prompt patterns at the end of messages
            if (typeof data === 'string' && (data.endsWith('$ ') || data.endsWith('$'))) {
              hasServerPrompt = true;
              // Remove the server prompt since we'll manage it client-side
              data = data.replace(/\$\s*$/, '');
            }
            
            t.xterm.write(data);
            
            // If the command finished (indicated by server prompt), reset running state
            if (hasServerPrompt) {
              isRunning = false;
            }
          }
        };
        socket.onclose = () => {
          isRunning = false;
          // Let the existing prompt management system handle prompts
        };
        socket.onerror = (err) => {
          isRunning = false;
          t.xterm.write('\r\n\x1b[1;37m\x1b[41mError:\x1b[0m \x1b[31m' + (err && err.message ? err.message : 'WebSocket error') + '\x1b[0m\r\n');
          // Let the existing prompt management system handle prompts
        };
      }
      runCommand(currentCommand);
    };
  }

  // --- Opening a new terminal creates a new drop area ---
  const addTerminalBtn = document.getElementById('btn-new-terminal');
  if (addTerminalBtn) {
    addTerminalBtn.onclick = function() {
      const termDiv = document.createElement('div');
      termDiv.className = 'terminal';
      termDiv.style.display = 'none';
      document.querySelector('.console').insertBefore(termDiv, document.querySelector('.console-footer'));
      // Create new xterm instance
      const newXterm = new window.Terminal({
        theme: window.term.options.theme,
        fontFamily: window.term.options.fontFamily,
        fontSize: window.term.options.fontSize,
        cursorBlink: true
      });
      const fitAddon = new window.FitAddon.FitAddon();
      newXterm.loadAddon(fitAddon);
      newXterm.open(termDiv);
      fitAddon.fit();

      const newId = window.terminals.length;
      // Create a new drop area for this terminal
      const newDrop = document.createElement('div');
      newDrop.className = 'canvas';
      newDrop.id = 'drop-area-' + newId;
      newDrop.style.display = 'none';
      // Insert after all other drop areas
      const workspace = document.querySelector('.workspace');
      const allDrops = workspace.querySelectorAll('.canvas');
      if (allDrops.length) {
        workspace.insertBefore(newDrop, allDrops[allDrops.length - 1].nextSibling);
      } else {
        workspace.insertBefore(newDrop, workspace.firstChild);
      }
      window.terminals.push({ id: newId, label: `Terminal ${newId + 1}`, element: termDiv, xterm: newXterm });
      patchTerminalInput(window.terminals[window.terminals.length - 1]);
      switchTerminal(window.terminals.length - 1);
    };
  }

  // --- On page load, keep original canvas IDs; do not rename canvases ---
  window.addEventListener('DOMContentLoaded', function() {
    // No renaming to avoid breaking #network-drop-area
  });

  // Patch the first terminal input handler on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', function() {
    if (window.terminals && window.terminals[0]) {
      patchTerminalInput(window.terminals[0]);
    }
  });
  window.isRunning = false;
  window.currentCommand = '';

  // --- Automation helper: inject command and Enter, always trigger validation ---
  window.injectCommandAndEnter = function(command) {
    // Focus the active terminal
    const t = window.terminals && window.terminals[window.activeTerminal];
    if (!t || !t.xterm) return;
    // Only support main terminal for automation
    if (t.xterm !== term) return;
    // Clear any current input
    currentCommand = '';
    window.currentCommand = '';
    // Simulate typing the command
    for (let i = 0; i < command.length; i++) {
      handleInput(command[i]);
    }
    // Simulate Enter key
    handleInput('\r');
  };

  // Patch xterm.js textarea for accessibility after terminal is ready
  window.addEventListener('xterm-ready', function() {
    setTimeout(function() {
      var ta = document.querySelector('.xterm-helper-textarea');
      if (ta) {
        ta.id = 'xterm-helper-textarea';
        ta.name = 'xterm-helper-textarea';
        ta.setAttribute('aria-label', 'Terminal input');
      }
    }, 500);
  });
});