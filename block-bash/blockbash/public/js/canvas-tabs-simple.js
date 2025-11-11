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
  
  // Store original categories immediately
  let originalCategories = '';
  if (categoriesContainer) {
    originalCategories = categoriesContainer.innerHTML;
    console.log('[Canvas] Original categories stored');
  }
  
  // Block Editor categories (default)
  const blockEditorCategories = `
    <div class="category-btn active" data-category="terminal">Terminal</div>
    <div class="category-btn" data-category="general">General</div>
    <div class="category-btn" data-category="network">Network</div>
    <div class="category-btn" data-category="database">Database</div>
    <div class="category-btn" data-category="files">Files</div>
    <div class="category-btn" data-category="system">System</div>
    <div class="category-btn" data-category="misc">Misc</div>
    <div class="category-btn" data-category="tools">Tools</div>
    <div class="category-btn" data-category="apps">Apps</div>
    <div class="category-btn" data-category="server">Server</div>
    <div class="category-btn" data-category="analysis">Analysis</div>
  `;
  
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
    
    // Update canvas visibility
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    
    if (blockCanvas) {
      blockCanvas.classList.add('active');
      blockCanvas.style.pointerEvents = 'auto';
    }
    if (networkCanvas) {
      networkCanvas.classList.remove('active');
      networkCanvas.style.pointerEvents = 'none';
    }
    
    // Update categories
    if (categoriesContainer) {
      categoriesContainer.innerHTML = originalCategories || blockEditorCategories;
      sidebar.classList.remove('network-editor-mode');
      
      // Initialize button listeners
      setTimeout(() => {
        initializeCategoryButtons();
        
        // Try to call original sidebar initialization
        if (window.initializeSidebar) {
          try {
            window.initializeSidebar();
          } catch (e) {
            console.warn('[Canvas] Error calling initializeSidebar:', e);
          }
        }
      }, 50);
    }
  }
  
  // Function to switch to Network Editor
  function switchToNetworkEditor() {
    console.log('[Canvas] Switching to Network Editor');
    
    // Update canvas visibility
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    
    if (blockCanvas) {
      blockCanvas.classList.remove('active');
      blockCanvas.style.pointerEvents = 'none';
    }
    if (networkCanvas) {
      networkCanvas.classList.add('active');
      networkCanvas.style.pointerEvents = 'auto';
    }
    
    // Update categories
    if (categoriesContainer) {
      categoriesContainer.innerHTML = networkEditorCategories;
      sidebar.classList.add('network-editor-mode');
      
      // Initialize button listeners
      setTimeout(() => {
        initializeCategoryButtons();
      }, 50);
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
  
  // Initialize with Block Editor on page load
  setTimeout(() => {
    console.log('[Canvas] Initializing page with Block Editor');
    switchToBlockEditor();
  }, 500);
  
  console.log('[Canvas] Canvas tabs script loaded');
});
