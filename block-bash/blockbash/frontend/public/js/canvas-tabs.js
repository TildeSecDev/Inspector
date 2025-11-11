// Simple Canvas Tab Switching with Category Management
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Canvas] Canvas tabs script loading...');
  
  const canvasTabs = document.querySelectorAll('.canvas-tab');
  const sidebar = document.querySelector('.sidebar');
  const categoriesContainer = document.querySelector('.categories-container');
  
  console.log('[Canvas] Found elements:', {
    canvasTabs: canvasTabs.length,
    sidebar: !!sidebar,
    categoriesContainer: !!categoriesContainer
  });
  
  // Will store original categories only if/when we first switch to network mode
  let originalCategories = '';
  let storedOriginal = false;
  
  // (We no longer recreate block editor categories; we rely on existing DOM + sidebar.js logic.)
  
  // Network Editor categories
  const networkEditorCategories = `
    <div class="category-btn active" data-category="terminal">Terminal</div>
    <div class="category-btn" data-category="end-devices">End Devices</div>
    <div class="category-btn" data-category="routers">Routers</div>
    <div class="category-btn" data-category="switches">Switches</div>
    <div class="category-btn" data-category="wireless">Wireless</div>
    <div class="category-btn" data-category="security">Security</div>
    <div class="category-btn" data-category="hacking">Hacking Tools</div>
    <div class="category-btn" data-category="wan">WAN</div>
    <div class="category-btn" data-category="connections">Connections</div>
    <div class="category-btn" data-category="iot">IoT Devices</div>
    <div class="category-btn" data-category="misc">Miscellaneous</div>
  `;
  
  // Function to initialize category button event listeners
  function initializeCategoryButtons() {
    const buttons = document.querySelectorAll('.category-btn');
    console.log('[Canvas] Initializing', buttons.length, 'category buttons');
    
    buttons.forEach(btn => {
      // Remove existing listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Re-query after cloning
    const freshButtons = document.querySelectorAll('.category-btn');
    freshButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const category = btn.getAttribute('data-category');
        console.log('[Canvas] Category button clicked:', category);
        
        if (category === 'terminal') {
          // Toggle terminal
          const isActive = btn.classList.contains('active');
          const console = document.querySelector('.console');
          
          if (isActive) {
            btn.classList.remove('active');
            if (console) console.classList.add('hidden');
          } else {
            btn.classList.add('active');
            if (console) console.classList.remove('hidden');
          }
        } else {
          // Handle other categories
          const blocksDisplay = document.querySelector('.blocks-display-area');
          const bottomPanel = document.querySelector('.bottom-panel');
          
          if (btn.classList.contains('active')) {
            // Close if already active
            btn.classList.remove('active');
            if (blocksDisplay) blocksDisplay.style.display = 'none';
            if (bottomPanel) bottomPanel.classList.remove('category-selected');
          } else {
            // Close other categories
            freshButtons.forEach(otherBtn => {
              if (otherBtn !== btn && otherBtn.getAttribute('data-category') !== 'terminal') {
                otherBtn.classList.remove('active');
              }
            });
            
            // Open this category
            btn.classList.add('active');
            if (blocksDisplay) blocksDisplay.style.display = 'flex';
            if (bottomPanel) bottomPanel.classList.add('category-selected');
            
            // Load blocks
            if (window.loadBlocks) {
              window.loadBlocks(category);
            }
          }
        }
      });
    });
    
    console.log('[Canvas] Category buttons initialized');
  }
  
  // Function to switch to Block Editor
  function switchToBlockEditor() {
    console.log('[Canvas] Switching to Block Editor');
    // First clear any lingering active state to guarantee exclusivity
    document.querySelectorAll('.canvas').forEach(c => c.classList.remove('active'));
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    if (blockCanvas) {
      blockCanvas.classList.add('active');
      blockCanvas.style.pointerEvents = 'auto';
    }
    if (networkCanvas) {
      networkCanvas.style.pointerEvents = 'none';
    }
    if (categoriesContainer) {
      // If we had previously swapped to network mode, restore original markup
      if (categoriesContainer.getAttribute('data-mode') === 'network' && storedOriginal) {
        categoriesContainer.innerHTML = originalCategories;
        categoriesContainer.removeAttribute('data-mode');
        console.log('[Canvas] Restored original block editor categories');
        // Re-run the original sidebar initialization (it wires up .category-btn + other logic)
        if (window.initializeSidebar) {
          try { window.initializeSidebar(); } catch (e) { console.warn('[Canvas] initializeSidebar error:', e); }
        }
      }
      sidebar.classList.remove('network-editor-mode');
    }
  }
  
  // Function to switch to Network Editor
  function switchToNetworkEditor() {
    console.log('[Canvas] Switching to Network Editor');
    // First clear any lingering active state to guarantee exclusivity
    document.querySelectorAll('.canvas').forEach(c => c.classList.remove('active'));
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    if (blockCanvas) {
      blockCanvas.style.pointerEvents = 'none';
    }
    if (networkCanvas) {
      networkCanvas.classList.add('active');
      networkCanvas.style.pointerEvents = 'auto';
    }
    if (categoriesContainer) {
      // Store original only once, right before first swap
      if (!storedOriginal) {
        originalCategories = categoriesContainer.innerHTML;
        storedOriginal = true;
        console.log('[Canvas] Stored original categories before network swap');
      }
      categoriesContainer.innerHTML = networkEditorCategories;
      categoriesContainer.setAttribute('data-mode', 'network');
      sidebar.classList.add('network-editor-mode');
      setTimeout(() => { initializeCategoryButtons(); }, 30);
    }
  }
  
  // Add tab click listeners
  canvasTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tabType = tab.getAttribute('data-tab');
      console.log('[Canvas] Tab clicked:', tabType);
      
      // Remove active from all tabs
      canvasTabs.forEach(t => t.classList.remove('active'));
      // Add active to clicked tab
      tab.classList.add('active');
      
      if (tabType === 'block-editor') {
        switchToBlockEditor();
      } else if (tabType === 'network-editor') {
        switchToNetworkEditor();
      }
    });
  });
  
  // Do not overwrite existing sidebar on load; assume sidebar.js already initialized it.
  console.log('[Canvas] Ready (no sidebar re-init on load)');
  
  // Ensure Block Editor is active by default
  setTimeout(() => {
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    if (blockCanvas && !blockCanvas.classList.contains('active')) {
      console.log('[Canvas] Setting Block Editor as default active canvas');
      blockCanvas.classList.add('active');
      blockCanvas.style.pointerEvents = 'auto';
    }
    if (networkCanvas && networkCanvas.classList.contains('active')) {
      networkCanvas.classList.remove('active');
      networkCanvas.style.pointerEvents = 'none';
    }
  }, 100);
  
  console.log('[Canvas] Canvas tabs script loaded');
});
