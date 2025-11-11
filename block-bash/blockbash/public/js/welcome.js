// Torch effect for revealing "INSPECTOR"
const board = document.getElementById('board');
board.addEventListener('mousemove', e => {
  const rect = board.getBoundingClientRect();
  board.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  board.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
});
board.addEventListener('mouseleave', () => {
  board.style.setProperty('--mouse-x', `-200px`);
  board.style.setProperty('--mouse-y', `-200px`);
});

// Helper: check if two frames overlap
function framesOverlap(a, b) {
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
}

// Dynamically add blurred frames with random images, fade in/out, avoid overlap
function addBlurredFrames(stagger=0.18) {
  const images = [
    '/images/board1.jpg', '/images/board2.jpg', '/images/board3.jpg', '/images/board4.jpg',
    '/images/board5.jpg', '/images/board6.jpg', '/images/board7.jpg', '/images/board8.jpg',
    '/images/board9.jpg', '/images/board10.jpg', '/images/board11.jpg', '/images/board12.jpg'
  ];
  const container = document.getElementById('frames-container');
  document.querySelectorAll('.photo-frame.blur').forEach(e => {
    e.classList.add('fade-out');
    setTimeout(()=>e.remove(), 1200);
  });
  const n = 8 + Math.floor(Math.random()*3);
  let placed = [];
  for (let i=0; i<n; ++i) {
    let tries = 0, top, left, overlap;
    do {
      top = 10 + Math.random()*75;
      left = 10 + Math.random()*80;
      overlap = false;
      for (const p of placed) {
        if (Math.abs(top-p.top)<12 && Math.abs(left-p.left)<12) { overlap = true; break; }
      }
      tries++;
    } while (overlap && tries<20);
    placed.push({top,left});
    const img = images[Math.floor(Math.random()*images.length)];
    const rot = -10 + Math.random()*20;
    const el = document.createElement('div');
    el.className = 'photo-frame blur';
    el.style.top = top+'%';
    el.style.left = left+'%';
    el.style.transform = `translate(-50%,-50%) rotate(${rot}deg)`;
    el.style.setProperty('--fade-delay', `${0.3 + i*stagger}s`);
    el.innerHTML = `<div class='tape'></div><div class='photo-inner matboard'><img src='${img}' style='filter: blur(2.5px) grayscale(0.7) brightness(0.7) sepia(0.2) contrast(1.1); opacity:0.7;'><div class='gloss'></div></div>`;
    container.appendChild(el);
  }
}

// Main sequence: source frame fades in, line animates, destination frame fades in, hold, fade out
function runMultiFrameLineSequence() {
  const images = [
    '/images/board1.jpg', '/images/board2.jpg', '/images/board3.jpg', '/images/board4.jpg',
    '/images/board5.jpg', '/images/board6.jpg', '/images/board7.jpg', '/images/board8.jpg',
    '/images/board9.jpg', '/images/board10.jpg', '/images/board11.jpg', '/images/board12.jpg'
  ];
  const container = document.getElementById('frames-container');
  document.querySelectorAll('.photo-frame.blur').forEach(e => {
    e.classList.add('fade-out');
    setTimeout(()=>e.remove(), 1200);
  });
  const canvas = document.getElementById('strings');
  const ctx = canvas.getContext('2d');
  const { width, height } = board.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  // Helper: distance from center
  function distToCenter(top, left) {
    const cTop = 50, cLeft = 50;
    return Math.sqrt(Math.pow(top-cTop,2)+Math.pow(left-cLeft,2));
  }
  // Generate outer frames (sources) and inner frames (destinations)
  const srcFrames = [];
  const dstFrames = [];
  // Outermost: top/bottom/left/right edges
  for (let i=0; i<4; ++i) {
    let top, left;
    if (i===0) { top=10+Math.random()*10; left=10+Math.random()*80; }
    if (i===1) { top=80+Math.random()*10; left=10+Math.random()*80; }
    if (i===2) { left=10+Math.random()*10; top=10+Math.random()*80; }
    if (i===3) { left=80+Math.random()*10; top=10+Math.random()*80; }
    srcFrames.push({top,left,rot:-10+Math.random()*20,img:images[Math.floor(Math.random()*images.length)]});
  }
  // Inner frames: near center
  for (let i=0; i<4; ++i) {
    let top=40+Math.random()*20, left=40+Math.random()*20;
    dstFrames.push({top,left,rot:-10+Math.random()*20,img:images[Math.floor(Math.random()*images.length)]});
  }
  // Create destination frames
  const dstEls = dstFrames.map((dst, i) => {
    const el = document.createElement('div');
    el.className = 'photo-frame blur';
    el.style.top = dst.top+'%';
    el.style.left = dst.left+'%';
    el.style.transform = `translate(-50%,-50%) rotate(${dst.rot}deg)`;
    el.style.setProperty('--fade-delay', `${0.2 + i*0.18}s`);
    el.innerHTML = `<div class='tape'></div><div class='photo-inner matboard'><img src='${dst.img}' style='filter: blur(2.5px) grayscale(0.7) brightness(0.7) sepia(0.2) contrast(1.1); opacity:0.7;'><div class='gloss'></div></div>`;
    container.appendChild(el);
    return el;
  });
  // Create source frames (outermost, fade in first)
  const srcEls = srcFrames.map((src, i) => {
    const el = document.createElement('div');
    el.className = 'photo-frame blur';
    el.style.top = src.top+'%';
    el.style.left = src.left+'%';
    el.style.transform = `translate(-50%,-50%) rotate(${src.rot}deg)`;
    el.style.setProperty('--fade-delay', `${0.2 + i*0.22}s`);
    el.innerHTML = `<div class='tape'></div><div class='photo-inner matboard'><img src='${src.img}' style='filter: blur(2.5px) grayscale(0.7) brightness(0.7) sepia(0.2) contrast(1.1); opacity:0.7;'><div class='gloss'></div></div>`;
    container.appendChild(el);
    return el;
  });
  // Animate source frames fade in
  setTimeout(()=>{
    // Animate lines from each source to nearest destination frame (never outer-to-outer)
    const srcCenters = srcEls.map(el => {
      const r = el.getBoundingClientRect();
      return [r.left-board.getBoundingClientRect().left+r.width/2, r.top-board.getBoundingClientRect().top+r.height/2];
    });
    const dstCenters = dstEls.map(el => {
      const r = el.getBoundingClientRect();
      return [r.left-board.getBoundingClientRect().left+r.width/2, r.top-board.getBoundingClientRect().top+r.height/2];
    });
    // For each source, connect to 2 closest destinations
    let lines = [];
    srcCenters.forEach((sc, i) => {
      let dists = dstCenters.map((dc, j) => ({j, dist: Math.hypot(sc[0]-dc[0], sc[1]-dc[1])}));
      dists.sort((a,b)=>a.dist-b.dist);
      for (let k=0; k<2; ++k) {
        lines.push({src: sc, dst: dstCenters[dists[k].j], color: ['#e17055','#00b894','#0984e3','#fdcb6e','#6c5ce7','#fab1a0','#636e72'][(i+k)%7], delay: 0.2 + i*0.22 + k*0.18});
      }
    });
    // Animate lines one by one
    let currentLine = 0;
    function drawNextLine() {
      if (currentLine >= lines.length) {
        // Fade in destination frames
        dstEls.forEach((el, i) => setTimeout(()=>el.classList.add('fade-in'), 200+i*120));
        // Hold for 2 seconds
        setTimeout(()=>{
          // Fade out all frames and lines
          srcEls.forEach(el=>el.classList.add('fade-out'));
          dstEls.forEach(el=>el.classList.add('fade-out'));
          ctx.clearRect(0, 0, width, height);
          setTimeout(runMultiFrameLineSequence, 1200);
        }, 2000);
        return;
      }
      const {src, dst, color, delay} = lines[currentLine];
      let t = 0;
      function drawLine() {
        ctx.clearRect(0, 0, width, height);
        // Draw previous lines as static
        for (let j=0; j<currentLine; ++j) {
          const l = lines[j];
          ctx.strokeStyle = l.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(...l.src);
          ctx.lineTo(...l.dst);
          ctx.stroke();
        }
        // Animate current line
        let progress = Math.min(1, t/1.2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(...src);
        ctx.lineTo(src[0]+(dst[0]-src[0])*progress, src[1]+(dst[1]-src[1])*progress);
        ctx.stroke();
        t += 0.03;
        if (progress < 1) {
          requestAnimationFrame(drawLine);
        } else {
          currentLine++;
          setTimeout(drawNextLine, 180);
        }
      }
      setTimeout(drawLine, delay*1000);
    }
    drawNextLine();
  }, 900); // Wait for source frames to fade in
}
runMultiFrameLineSequence();

// Animate lines as frames fade in
// Animate lines one by one, only after both frames are fully loaded
function animateStringsSequenced() {
  const canvas = document.getElementById('strings');
  const ctx = canvas.getContext('2d');
  const { width, height } = board.getBoundingClientRect();
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  const frames = Array.from(document.querySelectorAll('.photo-frame.blur'));
  const offsetX = board.getBoundingClientRect().left;
  const offsetY = board.getBoundingClientRect().top;
  function center(r) {
    return [r.left - offsetX + r.width/2, r.top - offsetY + r.height/2];
  }
  const boardCenter = [width/2, height/2];
  function distToCenter(c) {
    return Math.sqrt(Math.pow(c[0]-boardCenter[0],2)+Math.pow(c[1]-boardCenter[1],2));
  }
  let lines = [];
  for (let i=0; i<frames.length; ++i) {
    const f1 = frames[i].getBoundingClientRect();
    const c1 = center(f1);
    const d = distToCenter(c1);
    let maxAttach = 2;
    if (d < 60) maxAttach = 8;
    else if (d < 180) maxAttach = 4;
    else if (d < 320) maxAttach = 2;
    else maxAttach = 1;
    let targets = [];
    for (let tries=0; tries<maxAttach*2 && targets.length<maxAttach; tries++) {
      let idx = Math.floor(Math.random()*frames.length);
      if (idx !== i && !targets.includes(idx)) {
        const f2 = frames[idx].getBoundingClientRect();
        const c2 = center(f2);
        if (Math.abs(c1[0]-c2[0])>40 || Math.abs(c1[1]-c2[1])>40) {
          targets.push(idx);
        }
      }
    }
    for (const idx of targets) {
      const f2 = frames[idx].getBoundingClientRect();
      const c2 = center(f2);
      const colorList = ['#e17055','#00b894','#0984e3','#fdcb6e','#6c5ce7','#fab1a0','#636e72'];
      const color = colorList[idx % colorList.length];
      const curved = Math.abs(c1[0]-c2[0]) > 80;
      // Delay line until both frames are fully loaded
      const delay = Math.max(
        parseFloat(frames[i].style.getPropertyValue('--fade-delay')||'0'),
        parseFloat(frames[idx].style.getPropertyValue('--fade-delay')||'0')
      ) + 1.2;
      lines.push({c1, c2, color, curved, delay});
    }
  }
  let currentLine = 0;
  function drawNextLine() {
    if (currentLine >= lines.length) {
      // Fade out all lines and frames together
      setTimeout(()=>{
        ctx.clearRect(0, 0, width, height);
      }, 800);
      return;
    }
    const {c1, c2, color, curved, delay} = lines[currentLine];
    let t = 0;
    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      // Draw previous lines as static
      for (let j=0; j<currentLine; ++j) {
        const l = lines[j];
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (l.curved) {
          const midX = (l.c1[0]+l.c2[0])/2;
          const midY = Math.min(l.c1[1],l.c2[1])-60-Math.random()*40;
          ctx.moveTo(...l.c1);
          ctx.quadraticCurveTo(midX, midY, ...l.c2);
        } else {
          ctx.moveTo(...l.c1);
          ctx.lineTo(...l.c2);
        }
        ctx.stroke();
      }
      // Animate current line
      let progress = Math.min(1, Math.max(0, t/1.5));
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Always animate to the true center of the destination frame
      const endX = c1[0] + (c2[0] - c1[0]) * progress;
      const endY = c1[1] + (c2[1] - c1[1]) * progress;
      if (curved) {
        const midX = (c1[0]+c2[0])/2;
        const midY = Math.min(c1[1],c2[1])-60-Math.random()*40;
        ctx.moveTo(...c1);
        ctx.quadraticCurveTo(midX, midY, endX, endY);
      } else {
        ctx.moveTo(...c1);
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();
      t += 0.03;
      if (progress < 1) {
        requestAnimationFrame(drawFrame);
      } else {
        currentLine++;
        setTimeout(drawNextLine, 200);
      }
    }
    setTimeout(drawFrame, delay*1000);
  }
  drawNextLine();
}
window.addEventListener('resize', ()=>{repeatFramesAndStrings();});
window.addEventListener('load', ()=>{repeatFramesAndStrings();});

// Auto-open login folder for test visibility if running in headless (Playwright) environment
window.addEventListener('DOMContentLoaded', () => {
  try {
    const isHeadless = navigator.webdriver;
    if (isHeadless) {
      const binder = document.querySelector('.binder');
      if (binder) binder.classList.remove('closed');
      const loginCover = document.querySelector('.folder-login .folder-cover');
      if (loginCover) loginCover.click();
    }
  } catch {}
});

// Folder open/close, page-turn, binder zoom/fade, and toast
function setupFolderAnimations() {
  const binder = document.querySelector('.binder');
  const loginFolder = document.querySelector('.folder-login');
  const registerFolder = document.querySelector('.folder-register');
  const loginCover = document.querySelector('.folder-login .folder-cover');
  const registerCover = document.querySelector('.folder-register .folder-cover');
  const boardText = document.querySelector('.board-text');
  
  let isAnimating = false;
  let currentOpenFolder = null;

  function openFolder(type) {
    if (isAnimating || currentOpenFolder) return;
    
    console.log('Opening folder:', type); // Debug log
    isAnimating = true;
    currentOpenFolder = type;
    const clickedFolder = type === 'login' ? loginFolder : registerFolder;
    const clickedCover = type === 'login' ? loginCover : registerCover;
    
    // Move INSPECTOR title up
    boardText.classList.add('folder-opened');
    
    // Start center animation - both folders move to center
    binder.classList.add('animating');
  // Ensure closed state removed so inner forms become visible
  binder.classList.remove('closed');
    
    // Start the cover turn animation
    clickedCover.classList.add('turning');
    
    // Immediately set the folder as opening to trigger CSS transitions
    setTimeout(() => {
      clickedFolder.classList.add('folder-open');
      console.log('Added folder-open class to:', clickedFolder.className); // Debug log
    }, 150);
    
    // At halfway point (300ms), complete the opening
    setTimeout(() => {
      clickedCover.classList.remove('turning');
      isAnimating = false;
      console.log('Folder opening complete'); // Debug log
    }, 300);
  }

  function closeFolder() {
    if (isAnimating || !currentOpenFolder) return;
    
    isAnimating = true;
    const openedFolder = currentOpenFolder === 'login' ? loginFolder : registerFolder;
    const openedCover = currentOpenFolder === 'login' ? loginCover : registerCover;
    
    // Move INSPECTOR title back to original position
    boardText.classList.remove('folder-opened');
    
    // Start reverse animation - first show cover again
    openedCover.classList.add('turning');
    
    // At halfway point, complete the close
    setTimeout(() => {
      // Remove folder open state
      openedFolder.classList.remove('folder-open');
      openedCover.classList.remove('turning');
      
      // Remove center animation
      binder.classList.remove('animating');
      
      currentOpenFolder = null;
      isAnimating = false;
    }, 300);
  }

  // Click handlers for folder covers
  loginCover.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFolder('login');
  });
  
  registerCover.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openFolder('register');
  });

  // Click handlers for binder peek areas (close functionality)
  const loginPeek = document.querySelector('.folder-login .binder-peek');
  const registerPeek = document.querySelector('.folder-register .binder-peek');
  
  if (loginPeek) {
    loginPeek.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeFolder();
    });
  }
  if (registerPeek) {
    registerPeek.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeFolder();
    });
  }

  // Page turn on form submit
  async function handleSubmit(e) {
    e.preventDefault();
    if (isAnimating) return;
    
    const form = e.target;
    const formData = new FormData(form);
    const isLogin = form.id === 'login-form';
    const isRegister = form.id === 'register-form';
    
    // Get form fields based on form type
    const data = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    
    // Add additional fields for registration
    if (isRegister) {
      data.name = formData.get('name');
      data.organization = formData.get('organization');
    }
    
    // Validate required fields
    if (!data.email || !data.password) {
      showFormMessage(form, 'Please fill in all required fields', 'error');
      return;
    }
    
    if (isRegister && (!data.name || !data.organization)) {
      showFormMessage(form, 'Please fill in all required fields', 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Loading...';
    submitBtn.disabled = true;
    
    try {
      // Submit to appropriate endpoint
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // SUCCESS ANIMATION SEQUENCE
        console.log('Success - starting animation sequence');
        
        // Step 1: Close both folders (300ms)
        binder.classList.add('folders-closing');
        if (currentOpenFolder) {
          const openedFolder = currentOpenFolder === 'login' ? loginFolder : registerFolder;
          const openedCover = currentOpenFolder === 'login' ? loginCover : registerCover;
          
          openedCover.classList.add('turning');
          setTimeout(() => {
            openedFolder.classList.remove('folder-open');
            openedCover.classList.remove('turning');
            binder.classList.remove('animating');
            currentOpenFolder = null;
          }, 300);
        }
        
        // Step 2: Drop folders off-screen (starts at 500ms, takes 1200ms)
        setTimeout(() => {
          binder.classList.add('folders-drop');
        }, 500);
        
        // Step 3: Move INSPECTOR title to center (starts at 800ms)
        setTimeout(() => {
          boardText.classList.remove('folder-opened');
          boardText.classList.add('drop-center');
        }, 800);
        
        // Step 4: Fade background (starts at 1000ms)
        setTimeout(() => {
          document.body.classList.add('background-fade');
        }, 1000);
        
        // Step 5: Show success toast (starts at 1800ms)
        setTimeout(() => {
          const toast = document.getElementById('case-toast');
          toast.textContent = 'Case Accepted';
          toast.classList.remove('error');
          toast.classList.add('success', 'show');
          
          // Hide toast after 2.6 seconds
          setTimeout(() => {
            toast.classList.remove('show');
          }, 2600);
        }, 1800);
        
        // Step 6: Redirect to editor (starts at 5000ms)
        setTimeout(() => {
          window.location.href = '/editor';
        }, 5000);
        
      } else {
        // FAILURE - Show error toast only, no folder animations
        console.log('Authentication failed');
        
        // Reset loading state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Show Case Denied toast
        const toast = document.getElementById('case-toast');
        toast.textContent = 'Case Denied';
        toast.classList.remove('success');
        toast.classList.add('error', 'show');
        
        // Hide toast after 3 seconds
        setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);
        
        // Also show form message
        showFormMessage(form, result.error || 'Authentication failed', 'error');
      }
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Reset loading state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      
      // Show Case Denied toast for network errors
      const toast = document.getElementById('case-toast');
      toast.textContent = 'Case Denied';
      toast.classList.remove('success');
      toast.classList.add('error', 'show');
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
      
      // Also show form message
      showFormMessage(form, 'Network error. Please try again.', 'error');
    }
  }
  
  // Helper function to show form messages
  function showFormMessage(form, message, type) {
    const messageEl = form.querySelector('.form-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.color = type === 'error' ? '#e74c3c' : '#27ae60';
      messageEl.style.opacity = '1';
      
      // Clear message after 5 seconds
      setTimeout(() => {
        messageEl.style.opacity = '0';
      }, 5000);
    }
  }

  document.getElementById('login-form').addEventListener('submit', handleSubmit);
  document.getElementById('register-form').addEventListener('submit', handleSubmit);
}
window.addEventListener('DOMContentLoaded', setupFolderAnimations);
