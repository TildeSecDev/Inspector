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
  let currentEditorContent = '';
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
  
  // Function to create network sidebar - DEPRECATED: Now using unified bottom panel
  /*
  function createNetworkSidebar() {
    const sidebarContent = document.querySelector('.sidebar');
    
    // Clear existing content but preserve toggle button
    const toggleBtn = sidebarContent.querySelector('#sidebar-toggle-btn');
    sidebarContent.innerHTML = '';
    if (toggleBtn) {
      sidebarContent.appendChild(toggleBtn);
    } else {
      // Create toggle button if it doesn't exist
      const newToggleBtn = document.createElement('button');
      newToggleBtn.id = 'sidebar-toggle-btn';
      newToggleBtn.textContent = '☰';
      sidebarContent.appendChild(newToggleBtn);
    }
    
    // Add network block categories
    networkBlockCategories.forEach(cat => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'block-category';
      categoryElement.setAttribute('data-category', cat.category);
      categoryElement.style.cssText = `--theme: ${cat.color}; --icon: url('${cat.icon}');`;
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = cat.name;
      
      categoryElement.appendChild(iconSpan);
      categoryElement.appendChild(nameSpan);
      sidebarContent.appendChild(categoryElement);
    });
    
    // Create corresponding block containers for network categories
    const existingContainers = document.querySelectorAll('.block-container');
    existingContainers.forEach(container => {
      const category = container.getAttribute('data-category');
      if (networkBlockCategories.some(cat => cat.category === category)) {
        container.style.display = 'none'; // Hide instead of removing
      }
    });
    
    // Create new network block containers
    networkBlockCategories.forEach(cat => {
      let container = document.querySelector(`.block-container[data-category="${cat.category}"]`);
      if (!container) {
        container = document.createElement('div');
        container.className = 'block-container container-closed';
        container.setAttribute('data-category', cat.category);
        container.innerHTML = `
          <div class="inner-container">
            <div class="container-details">
              <span class="icon"></span>
              <span class="name">${cat.name}</span>
            </div>
            <div class="block-list"></div>
          </div>
        `;
        document.body.appendChild(container);
      } else {
        container.style.display = 'block';
      }
    });
  }
  
  // Function to restore original sidebar
  function restoreOriginalSidebar() {
    if (originalSidebarContent) {
      sidebar.innerHTML = originalSidebarContent;
    }
    
    // Show original block containers and hide network containers
    const allContainers = document.querySelectorAll('.block-container');
    allContainers.forEach(container => {
      const category = container.getAttribute('data-category');
      if (networkBlockCategories.some(cat => cat.category === category)) {
        container.style.display = 'none';
      } else {
        container.style.display = 'block';
      }
    });
    
    // Re-initialize original sidebar functionality
    setTimeout(() => {
      if (window.initializeSidebar) {
        window.initializeSidebar();
      } else {
        // Fallback: manually reinitialize sidebar click handlers
        const blockCategories = document.querySelectorAll('.block-category');
        blockCategories.forEach(category => {
          // Remove any existing listeners
          category.replaceWith(category.cloneNode(true));
        });
        
        // Re-add click handlers (import and call the sidebar functionality)
        import('./sidebar.js').then(module => {
          console.log('Sidebar module reloaded');
        }).catch(err => {
          console.warn('Could not reload sidebar module:', err);
        });
      }
    }, 100);
  }
  */
  
  // Function to load network blocks for a category - DEPRECATED: Now using unified loadBlocks
  /*
  function loadNetworkBlocks(category) {
    console.log("Loading network blocks for category:", category);
    
    fetch(`/blocks/network-blocks/${category}.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        const container = document.querySelector(`.block-container[data-category="${category}"] .block-list`);
        if (!container) return;
        
        container.innerHTML = '';
        data.forEach(block => {
          const blockElement = document.createElement('div');
          blockElement.className = 'network-block';
          blockElement.setAttribute('draggable', true);
          blockElement.dataset.blockType = block.blockType || '';
          blockElement.dataset.category = category;
          
          const content = document.createElement('div');
          content.className = 'block-content';
          
          const name = document.createElement('span');
          name.textContent = block.name || block.blockType || 'Network Block';
          content.appendChild(name);
          
          blockElement.appendChild(content);
          blockElement.dataset.template = block.innerHTML;
          
          blockElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
              type: block.blockType,
              template: block.innerHTML,
              category: category,
              deviceType: block.deviceType || 'network-device'
            }));
          });
          
          container.appendChild(blockElement);
        });
      })
      .catch(err => {
        console.warn(`Error loading network blocks for category: ${category}`, err);
      });
  }
  */

  // Block Editor categories
  const blockEditorCategories = [
    { category: 'general', name: 'General' },
    { category: 'network', name: 'Network' },
    { category: 'database', name: 'Database' },
    { category: 'files', name: 'Files' },
    { category: 'system', name: 'System' },
    { category: 'misc', name: 'Misc' },
    { category: 'tools', name: 'Tools' },
    { category: 'apps', name: 'Apps' },
    { category: 'server', name: 'Server' },
    { category: 'analysis', name: 'Analysis' },
  ];

  // Function to setup network sidebar categories
  function setupNetworkSidebar() {
    console.log('[Canvas] setupNetworkSidebar called - keeping existing categories');
    
    // Don't replace the sidebar categories, just ensure network category loads properly
    // The existing categories should work fine, we just need to make sure network blocks are loaded
    
    // Ensure the blocks display area is shown
    const blocksDisplayArea = document.querySelector('.blocks-display-area');
    const bottomPanel = document.querySelector('.bottom-panel');
    
    if (blocksDisplayArea) {
      blocksDisplayArea.style.display = 'flex';
    }
    if (bottomPanel) {
      bottomPanel.classList.add('category-selected');
    }
    
    // Auto-load network blocks to show something immediately
    setTimeout(() => {
      if (window.loadBlocks) {
        console.log('[Canvas] Auto-loading network blocks');
        window.loadBlocks('network');
      }
    }, 100);
    
    console.log('[Canvas] Network sidebar setup complete - using existing categories');
  }

  // Function to restore block editor sidebar categories  
  function restoreBlockEditorSidebar() {
    console.log('[Canvas] restoreBlockEditorSidebar called - keeping existing categories');
    
    // Remove network editor mode class
    sidebar.classList.remove('network-editor-mode');
    
    // Just ensure the categories are ready for block editor mode
    // Don't replace categories, the existing ones should work fine
    
    console.log('[Canvas] Block editor sidebar restored - using existing categories');
  }
      categoryBtn.textContent = cat.name;
      categoryBtnsContainer.appendChild(categoryBtn);
    });

    // Reinitialize sidebar event listeners using existing sidebar.js functionality
    if (window.initializeSidebar) {
      console.log('[Canvas] Calling window.initializeSidebar');
      window.initializeSidebar();
    } else {
      console.warn('[Canvas] window.initializeSidebar not available');
    }

    console.log('[Canvas] Block editor sidebar categories restored');
  }
  
  // Function to switch tabs
  function switchTab(activeTab, targetContent = null) {
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
      }
      if (networkCanvas) {
        networkCanvas.classList.remove('active');
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
      
    } else if (tabType === 'network-editor') {
      isNetworkMode = true;
      
      // Show Network Editor canvas, hide Block Editor canvas
      if (blockCanvas) {
        blockCanvas.classList.remove('active');
      }
      if (networkCanvas) {
        networkCanvas.classList.add('active');
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
    if (!originalSidebarContent) {
      originalSidebarContent = sidebar.innerHTML;
    }
    
    // Initialize Block Editor categories on page load
    restoreBlockEditorSidebar();
  }, 1000);
  
  // Initialize with Block Editor active (already set in HTML)
  console.log('Canvas tabs initialized with network block support');
});
