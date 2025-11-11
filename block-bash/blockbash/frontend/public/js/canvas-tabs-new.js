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
    
    // Load network blocks from JSON (simulating the loadBlocks functionality)
    // This would be replaced with actual network block loading
    setTimeout(() => {
      console.log('[Canvas] Network sidebar setup complete');
    }, 100);
  }

  // Function to restore block editor sidebar  
  function restoreBlockEditorSidebar() {
    sidebar.classList.remove('network-editor-mode');
    
    if (window.initializeSidebar) {
      // Re-initialize sidebar if function is available
      window.initializeSidebar();
    } else {
      console.warn('[Canvas] window.initializeSidebar not available');
    }

    console.log('[Canvas] Block editor sidebar categories restored');
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
    if (!originalSidebarContent) {
      originalSidebarContent = sidebar.innerHTML;
    }
    
    // Initialize Block Editor categories on page load
    restoreBlockEditorSidebar();
  }, 1000);
  
  // Initialize with Block Editor active (already set in HTML)
  console.log('Canvas tabs initialized with network block support');
});
