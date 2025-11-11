// Canvas tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
  const canvasTabs = document.querySelectorAll('.canvas-tab');
  const dropArea = document.getElementById('drop-area');
  const sidebar = document.querySelector('.sidebar');
  
  // Default content for Block Editor
  const blockEditorContent = `
    <div id="block-editor-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; pointer-events: none;">
      <h2 style="margin-bottom: 20px; font-family: 'Tomorrow', sans-serif;">Block Editor</h2>
      <p style="margin-bottom: 20px; text-align: center; max-width: 400px;">
        Drag and drop code blocks to create powerful command-line scripts and automation workflows.
      </p>
      <div style="padding: 20px; border: 2px dashed #ddd; border-radius: 8px; background: #f9f9f9;">
        <p style="margin: 0; color: #888;">📦 Drag blocks from the sidebar to build your script</p>
      </div>
    </div>
  `;

  // Default content for Network Editor
  const networkEditorContent = `
    <div id="network-editor-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; pointer-events: none;">
      <h2 style="margin-bottom: 20px; font-family: 'Tomorrow', sans-serif;">Network Editor</h2>
      <p style="margin-bottom: 20px; text-align: center; max-width: 400px;">
        Network topology designer similar to Cisco Packet Tracer. 
        Drag network devices, connect them, and configure network scenarios.
      </p>
      <div style="padding: 20px; border: 2px dashed #ddd; border-radius: 8px; background: #f9f9f9;">
        <p style="margin: 0; color: #888;">🖥️ Drag devices from the sidebar to build your network topology</p>
      </div>
    </div>
  `;
  
  // Store original content
  let originalSidebarContent = '';
  let isNetworkMode = false;
  
  // Network block categories for Network Editor
  const networkBlockCategories = [
    { category: 'end-devices', name: 'End Devices', icon: '/assets/images/desktop.svg', color: '#27ae60' },
    { category: 'routers', name: 'Routers', icon: '/assets/images/router.svg', color: '#3498db' },
    { category: 'switches', name: 'Switches', icon: '/assets/images/switch.svg', color: '#e74c3c' },
    { category: 'wireless', name: 'Wireless', icon: '/assets/images/wifi.svg', color: '#9b59b6' },
    { category: 'security', name: 'Security', icon: '/assets/images/security.svg', color: '#e67e22' },
    { category: 'hacking', name: 'Hacking Tools', icon: '/assets/images/hacking.svg', color: '#c0392b' },
    { category: 'wan', name: 'WAN', icon: '/assets/images/cloud.svg', color: '#34495e' },
    { category: 'connections', name: 'Connections', icon: '/assets/images/cable.svg', color: '#95a5a6' },
    { category: 'modules', name: 'Modules', icon: '/assets/images/module.svg', color: '#f39c12' },
    { category: 'iot', name: 'IoT Devices', icon: '/assets/images/iot.svg', color: '#16a085' },
    { category: 'misc', name: 'Miscellaneous', icon: '/assets/images/misc.svg', color: '#7f8c8d' }
  ];

  // Function to setup network sidebar
  function setupNetworkSidebar() {
    console.log('[Canvas] Setting up network sidebar categories');
    sidebar.classList.add('network-editor-mode');
    
    // Replace the categories with network categories
    const categoriesContainer = document.querySelector('.categories-container');
    if (categoriesContainer) {
      // Store original categories if not already stored
      if (!originalSidebarContent) {
        originalSidebarContent = categoriesContainer.innerHTML;
      }
      
      // Clear existing categories
      categoriesContainer.innerHTML = '';
      
      // Add terminal button first (always present)
      const terminalBtn = document.createElement('div');
      terminalBtn.className = 'category-btn active';
      terminalBtn.setAttribute('data-category', 'terminal');
      terminalBtn.textContent = 'Terminal';
      categoriesContainer.appendChild(terminalBtn);
      
      // Add network categories
      networkBlockCategories.forEach(cat => {
        const categoryBtn = document.createElement('div');
        categoryBtn.className = 'category-btn';
        categoryBtn.setAttribute('data-category', cat.category);
        categoryBtn.textContent = cat.name;
        categoriesContainer.appendChild(categoryBtn);
      });
      
      // Initialize event listeners for network categories
      initializeNetworkCategoryButtons();
    }
    
    console.log('[Canvas] Network sidebar categories setup complete');
  }
  
  // Function to initialize event listeners for network category buttons
  function initializeNetworkCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    console.log('[Canvas] Initializing', categoryButtons.length, 'network category buttons');
    
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryName = btn.getAttribute('data-category');
        console.log('[Canvas] Network category button clicked:', categoryName);
        
        if (categoryName === 'terminal') {
          // Handle terminal toggle
          const terminalActive = btn.classList.contains('active');
          const consoleElement = document.querySelector('.console');
          const sidebar = document.querySelector('.sidebar');
          
          if (terminalActive) {
            btn.classList.remove('active');
            if (consoleElement) consoleElement.classList.add('hidden');
            if (sidebar) sidebar.classList.add('terminal-hidden');
            console.log('[Canvas] Terminal hidden');
          } else {
            btn.classList.add('active');
            if (consoleElement) consoleElement.classList.remove('hidden');
            if (sidebar) sidebar.classList.remove('terminal-hidden');
            console.log('[Canvas] Terminal shown');
          }
        } else {
          // Handle network category selection
          const blocksDisplayArea = document.querySelector('.blocks-display-area');
          const bottomPanel = document.querySelector('.bottom-panel');
          
          // Toggle visibility
          if (btn.classList.contains('active')) {
            // Close if already active
            btn.classList.remove('active');
            if (blocksDisplayArea) blocksDisplayArea.style.display = 'none';
            if (bottomPanel) bottomPanel.classList.remove('category-selected');
            console.log('[Canvas] Closed network category:', categoryName);
          } else {
            // Remove active from all other buttons except terminal
            categoryButtons.forEach(otherBtn => {
              if (otherBtn !== btn && otherBtn.getAttribute('data-category') !== 'terminal') {
                otherBtn.classList.remove('active');
              }
            });
            
            // Activate this button
            btn.classList.add('active');
            if (blocksDisplayArea) blocksDisplayArea.style.display = 'flex';
            if (bottomPanel) bottomPanel.classList.add('category-selected');
            
            // Load network blocks for this category
            console.log('[Canvas] Loading network blocks for category:', categoryName);
            loadNetworkBlocksForCategory(categoryName);
            
            console.log('[Canvas] Opened network category:', categoryName);
          }
        }
      });
    });
  }
  
  // Function to load network blocks for a category
  function loadNetworkBlocksForCategory(categoryName) {
    const blockList = document.querySelector('.block-list');
    if (blockList) {
      // Clear existing blocks
      blockList.innerHTML = '';
      
      // Add placeholder network blocks for demonstration
      const networkBlocks = getNetworkBlocksForCategory(categoryName);
      networkBlocks.forEach(block => {
        const blockElement = document.createElement('div');
        blockElement.className = 'block-item';
        blockElement.setAttribute('draggable', 'true');
        blockElement.setAttribute('data-block-type', block.type);
        blockElement.innerHTML = `
          <div class="block-icon">${block.icon}</div>
          <div class="block-name">${block.name}</div>
        `;
        
        // Add drag event listener
        blockElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/json', JSON.stringify({
            type: block.type,
            name: block.name,
            category: categoryName,
            isNetworkDevice: true
          }));
        });
        
        blockList.appendChild(blockElement);
      });
    }
  }
  
  // Function to get network blocks for a specific category
  function getNetworkBlocksForCategory(categoryName) {
    const networkBlocksData = {
      'end-devices': [
        { type: 'pc', name: 'PC', icon: '🖥️' },
        { type: 'laptop', name: 'Laptop', icon: '💻' },
        { type: 'server', name: 'Server', icon: '🖲️' },
        { type: 'printer', name: 'Printer', icon: '🖨️' }
      ],
      'routers': [
        { type: 'router', name: 'Router', icon: '📡' },
        { type: 'gateway', name: 'Gateway', icon: '🌐' },
        { type: 'edge-router', name: 'Edge Router', icon: '🔗' }
      ],
      'switches': [
        { type: 'switch', name: 'Switch', icon: '🔀' },
        { type: 'managed-switch', name: 'Managed Switch', icon: '⚙️' },
        { type: 'poe-switch', name: 'PoE Switch', icon: '⚡' }
      ],
      'wireless': [
        { type: 'access-point', name: 'Access Point', icon: '📶' },
        { type: 'wireless-router', name: 'Wireless Router', icon: '📡' },
        { type: 'wifi-adapter', name: 'WiFi Adapter', icon: '📱' }
      ],
      'security': [
        { type: 'firewall', name: 'Firewall', icon: '🛡️' },
        { type: 'ids', name: 'IDS', icon: '🔍' },
        { type: 'vpn-gateway', name: 'VPN Gateway', icon: '🔐' }
      ],
      'hacking': [
        { type: 'kali-linux', name: 'Kali Linux', icon: '🐉' },
        { type: 'metasploit', name: 'Metasploit', icon: '💥' },
        { type: 'wireshark', name: 'Wireshark', icon: '🦈' }
      ],
      'wan': [
        { type: 'cloud', name: 'Cloud', icon: '☁️' },
        { type: 'internet', name: 'Internet', icon: '🌍' },
        { type: 'isp', name: 'ISP', icon: '🏢' }
      ],
      'connections': [
        { type: 'ethernet', name: 'Ethernet Cable', icon: '🔌' },
        { type: 'fiber', name: 'Fiber Cable', icon: '💡' },
        { type: 'serial', name: 'Serial Cable', icon: '🔗' }
      ],
      'modules': [
        { type: 'power-supply', name: 'Power Supply', icon: '🔋' },
        { type: 'cooling', name: 'Cooling Fan', icon: '❄️' },
        { type: 'backup', name: 'Backup Module', icon: '💾' }
      ],
      'iot': [
        { type: 'sensor', name: 'IoT Sensor', icon: '📡' },
        { type: 'smart-camera', name: 'Smart Camera', icon: '📹' },
        { type: 'smart-light', name: 'Smart Light', icon: '💡' }
      ],
      'misc': [
        { type: 'cable-tester', name: 'Cable Tester', icon: '🔧' },
        { type: 'multimeter', name: 'Multimeter', icon: '⚡' },
        { type: 'rack', name: 'Server Rack', icon: '🏗️' }
      ]
    };
    
    return networkBlocksData[categoryName] || [];
  }

  // Function to restore block editor sidebar  
  function restoreBlockEditorSidebar() {
    sidebar.classList.remove('network-editor-mode');
    
    // Restore original categories
    const categoriesContainer = document.querySelector('.categories-container');
    if (categoriesContainer && originalSidebarContent) {
      categoriesContainer.innerHTML = originalSidebarContent;
      console.log('[Canvas] Original block editor categories restored');
    }
    
    // Give a small delay to ensure DOM is ready, then initialize
    setTimeout(() => {
      // Try to use the global initializeSidebar function
      if (window.initializeSidebar && typeof window.initializeSidebar === 'function') {
        try {
          window.initializeSidebar();
          console.log('[Canvas] Block editor sidebar re-initialized with initializeSidebar()');
        } catch (error) {
          console.error('[Canvas] Error calling initializeSidebar:', error);
          manuallyInitializeCategoryButtons();
        }
      } else {
        console.warn('[Canvas] window.initializeSidebar not available, attempting manual initialization');
        manuallyInitializeCategoryButtons();
      }
    }, 100);

    console.log('[Canvas] Block editor sidebar categories restored');
  }
  
  // Manual fallback function to initialize category buttons
  function manuallyInitializeCategoryButtons() {
    console.log('[Canvas] Manually initializing category buttons');
    
    const categoryButtons = document.querySelectorAll('.category-btn');
    console.log('[Canvas] Found', categoryButtons.length, 'category buttons for manual initialization');
    
    // Remove existing event listeners by cloning elements
    categoryButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Re-query after cloning
    const freshButtons = document.querySelectorAll('.category-btn');
    
    freshButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryName = btn.getAttribute('data-category');
        console.log('[Canvas] Manual category button clicked:', categoryName);
        
        if (categoryName === 'terminal') {
          // Handle terminal toggle
          const terminalActive = btn.classList.contains('active');
          const consoleElement = document.querySelector('.console');
          const sidebar = document.querySelector('.sidebar');
          
          if (terminalActive) {
            btn.classList.remove('active');
            if (consoleElement) consoleElement.classList.add('hidden');
            if (sidebar) sidebar.classList.add('terminal-hidden');
            console.log('[Canvas] Terminal hidden');
          } else {
            btn.classList.add('active');
            if (consoleElement) consoleElement.classList.remove('hidden');
            if (sidebar) sidebar.classList.remove('terminal-hidden');
            console.log('[Canvas] Terminal shown');
          }
        } else {
          // Handle block category selection
          const blocksDisplayArea = document.querySelector('.blocks-display-area');
          const bottomPanel = document.querySelector('.bottom-panel');
          
          // Toggle visibility
          if (btn.classList.contains('active')) {
            // Close if already active
            btn.classList.remove('active');
            if (blocksDisplayArea) blocksDisplayArea.style.display = 'none';
            if (bottomPanel) bottomPanel.classList.remove('category-selected');
            console.log('[Canvas] Closed category:', categoryName);
          } else {
            // Remove active from all other buttons
            freshButtons.forEach(otherBtn => {
              if (otherBtn !== btn && otherBtn.getAttribute('data-category') !== 'terminal') {
                otherBtn.classList.remove('active');
              }
            });
            
            // Activate this button
            btn.classList.add('active');
            if (blocksDisplayArea) blocksDisplayArea.style.display = 'flex';
            if (bottomPanel) bottomPanel.classList.add('category-selected');
            
            // Try to load blocks for this category
            if (window.loadBlocks && typeof window.loadBlocks === 'function') {
              window.loadBlocks(categoryName);
            } else {
              console.warn('[Canvas] loadBlocks function not available');
            }
            
            console.log('[Canvas] Opened category:', categoryName);
          }
        }
      });
    });
    
    console.log('[Canvas] Manual category button event listeners attached');
  }
  
  // Function to switch tabs
  function switchTab(activeTab, targetContent = null) {
    console.log('[Canvas] Switching to tab:', activeTab.getAttribute('data-tab'));
    
    // Remove active class from all tabs
    canvasTabs.forEach(tab => tab.classList.remove('active'));
    
    // Add active class to clicked tab
    activeTab.classList.add('active');
    
    // Get canvas elements
    const blockCanvas = document.getElementById('drop-area');
    const networkCanvas = document.getElementById('network-drop-area');
    
    // Switch content based on tab
    const tabType = activeTab.getAttribute('data-tab');
    
    if (tabType === 'block-editor') {
      isNetworkMode = false;
      
      // Show Block Editor canvas, hide Network Editor canvas
      if (blockCanvas) {
        blockCanvas.classList.add('active');
        blockCanvas.style.pointerEvents = 'auto';
      }
      if (networkCanvas) {
        networkCanvas.classList.remove('active');
        networkCanvas.style.pointerEvents = 'none';
      }
      
      // Update sidebar class for Block Editor
      sidebar.classList.remove('network-editor-mode');
      
      // Check if we have actual blocks or show placeholder
      const hasBlocks = blockCanvas.children.length > 0 && 
                       !blockCanvas.querySelector('#network-editor-placeholder') &&
                       !blockCanvas.querySelector('#block-editor-placeholder');
      
      if (!hasBlocks) {
        blockCanvas.innerHTML = blockEditorContent;
      }
      
      // Restore original sidebar categories for Block Editor
      restoreBlockEditorSidebar();
      
      console.log('[Canvas] Switched to Block Editor mode');
      
    } else if (tabType === 'network-editor') {
      isNetworkMode = true;
      
      // Show Network Editor canvas, hide Block Editor canvas
      if (blockCanvas) {
        blockCanvas.classList.remove('active');
        blockCanvas.style.pointerEvents = 'none';
      }
      if (networkCanvas) {
        networkCanvas.classList.add('active');
        networkCanvas.style.pointerEvents = 'auto';
      }
      
      // Update sidebar class for Network Editor
      sidebar.classList.add('network-editor-mode');
      
      // Store current content if switching from block editor
      if (!originalSidebarContent) {
        originalSidebarContent = sidebar.innerHTML;
      }
      
      // Check if we have actual network devices or show placeholder
      const hasNetworkDevices = networkCanvas.children.length > 0 && 
                               !networkCanvas.querySelector('#block-editor-placeholder') &&
                               !networkCanvas.querySelector('#network-editor-placeholder');
      
      if (!hasNetworkDevices) {
        networkCanvas.innerHTML = networkEditorContent;
      }
      
      // Switch sidebar to network categories
      setupNetworkSidebar();
      
      console.log('[Canvas] Switched to Network Editor mode - using separate canvas');
    }
  }
  
  // Add click event listeners to tabs
  canvasTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[Canvas] Tab clicked:', tab.getAttribute('data-tab'));
      switchTab(tab);
    });
  });
  
  // Store original sidebar content on page load
  setTimeout(() => {
    // Store original categories content before any modifications
    const categoriesContainer = document.querySelector('.categories-container');
    if (categoriesContainer && !originalSidebarContent) {
      originalSidebarContent = categoriesContainer.innerHTML;
      console.log('[Canvas] Original sidebar content stored');
    }
    
    // Initialize Block Editor categories on page load
    restoreBlockEditorSidebar();
    
    // Ensure category buttons are always clickable with direct fallback
    setTimeout(() => {
      ensureCategoryButtonsWork();
      
      // Force manual initialization if buttons still don't work
      const testButton = document.querySelector('.category-btn[data-category="general"]');
      if (testButton) {
        // Test if the button responds to clicks
        let clickWorking = false;
        const testHandler = () => { clickWorking = true; };
        testButton.addEventListener('click', testHandler);
        testButton.click();
        testButton.removeEventListener('click', testHandler);
        
        if (!clickWorking) {
          console.warn('[Canvas] Category buttons not responding, forcing manual initialization');
          manuallyInitializeCategoryButtons();
        }
      }
    }, 500);
  }, 1000);
  
  // Function to ensure category buttons work
  function ensureCategoryButtonsWork() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    console.log('[Canvas] Found', categoryButtons.length, 'category buttons');
    
    categoryButtons.forEach((btn, index) => {
      // Add a test click listener to make sure they're responsive
      btn.addEventListener('click', (e) => {
        console.log('[Canvas] Direct category button click detected:', btn.getAttribute('data-category'));
      });
      
      // Check if button is clickable
      const rect = btn.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;
      const computedStyle = window.getComputedStyle(btn);
      const hasPointerEvents = computedStyle.pointerEvents !== 'none';
      
      console.log(`[Canvas] Button ${index} (${btn.getAttribute('data-category')}):`, {
        visible: isVisible,
        pointerEvents: hasPointerEvents,
        display: computedStyle.display,
        position: computedStyle.position
      });
    });
  }
  
  // Initialize with Block Editor active (already set in HTML)
  console.log('Canvas tabs initialized with network block support');
});
