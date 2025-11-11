import { loadBlocks } from './loadblocks.js';

// Function to initialize sidebar functionality
function initializeSidebar() {
  const blockCategories = document.querySelectorAll('.block-category');
  const sidebar = document.querySelector('.sidebar');
  const workspace = document.getElementById('drop-area');
  const terminalBtn = document.querySelector('.category-btn[data-category="terminal"]');

  // Helper to close all block containers and deselect categories
  function closeAllBlockContainers() {
    // Hide the blocks display area
    const blocksDisplayArea = document.querySelector('.blocks-display-area');
    if (blocksDisplayArea) {
      blocksDisplayArea.style.display = 'none';
    }
    
    blockCategories.forEach(cat => cat.classList.remove('category-selected'));
    
    // Only deactivate non-terminal category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
      if (btn.getAttribute('data-category') !== 'terminal') {
        btn.classList.remove('active');
      }
    });
    
    // Remove category-selected class from bottom-panel
    const bottomPanel = document.querySelector('.bottom-panel');
    if (bottomPanel) {
      bottomPanel.classList.remove('category-selected');
    }
  }

  // Helper to show blocks for a category
  function showBlocksForCategory(categoryName) {
    // Show the blocks display area
    const blocksDisplayArea = document.querySelector('.blocks-display-area');
    if (blocksDisplayArea) {
      blocksDisplayArea.style.display = 'flex';
    }
    
    // Add category-selected class to bottom-panel
    const bottomPanel = document.querySelector('.bottom-panel');
    if (bottomPanel) {
      bottomPanel.classList.add('category-selected');
    }
    
    // Mark the category button as active
    const categoryBtn = document.querySelector(`.category-btn[data-category="${categoryName}"]`);
    if (categoryBtn) {
      categoryBtn.classList.add('active');
    }
  }

  // Remove existing event listeners by cloning elements
  blockCategories.forEach(category => {
    const newCategory = category.cloneNode(true);
    category.parentNode.replaceChild(newCategory, category);
  });

  // Re-query categories after cloning
  const freshCategories = document.querySelectorAll('.block-category');

  // Click handler for block categories (old vertical layout)
  freshCategories.forEach(category => {
    category.addEventListener('click', (e) => {
      e.stopPropagation();
      const cat = category.getAttribute('data-category');
      const container = document.querySelector(`.block-container[data-category="${cat}"]`);
      if (!container) return;

      // If already selected, close all
      if (category.classList.contains('category-selected')) {
        closeAllBlockContainers();
        return;
      }
      // Deselect all, select this
      freshCategories.forEach(cat => cat.classList.remove('category-selected'));
      category.classList.add('category-selected');

      // Close all containers, open this one
      closeAllBlockContainers();
      container.classList.add('container-open');
      container.classList.remove('container-closed');
      container.scrollTop = 0; // scroll to top when opened

      // Set theme/icon for container details
      const theme = category.style.getPropertyValue('--theme');
      const icon = category.style.getPropertyValue('--icon');
      const containerDetails = container.querySelector('.container-details');
      const blockList = container.querySelector('.block-list');
      if (containerDetails) {
        containerDetails.style.setProperty('--theme', theme);
        containerDetails.style.setProperty('--icon', icon);
      }
      if (blockList) {
        blockList.style.setProperty('--theme', theme);
      }
      // Set name
      const nameSpan = containerDetails.querySelector('.name');
      const categoryText = category.querySelector('span:nth-child(2)').textContent;
      if (nameSpan) nameSpan.textContent = categoryText;

      // Load blocks for this category
      loadBlocks(cat);

      // Debug log
      console.log(`[Sidebar] Popout for '${cat}' opened`);
    });
  });

  // Click handler for new category buttons (horizontal layout)
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const categoryName = btn.getAttribute('data-category');
      const bottomPanel = document.querySelector('.bottom-panel');
      
      if (categoryName === 'terminal') {
        // Handle terminal button click - toggle terminal visibility
        const terminalActive = btn.classList.contains('active');
        const consoleElement = document.querySelector('.console');
        const sidebar = document.querySelector('.sidebar');
        
        if (terminalActive) {
          // Hide terminal
          btn.classList.remove('active');
          if (consoleElement) consoleElement.classList.add('hidden');
          if (sidebar) sidebar.classList.add('terminal-hidden');
          console.log('[Sidebar] Terminal hidden');
        } else {
          // Show terminal
          btn.classList.add('active');
          if (consoleElement) consoleElement.classList.remove('hidden');
          if (sidebar) sidebar.classList.remove('terminal-hidden');
          // Focus the terminal if possible
          setTimeout(() => {
            const terminal = document.querySelector('#output-terminal');
            if (terminal && window.term) {
              window.term.focus();
            }
          }, 100);
          console.log('[Sidebar] Terminal shown');
        }
        
        // Close any open block categories when terminal is toggled
        closeAllBlockContainers();
        return;
      }
      
      // Handle block category selection
      // If clicking the same category that's already active, close it
      if (btn.classList.contains('active')) {
        closeAllBlockContainers();
        return;
      }
      
      // Show blocks for this category
      closeAllBlockContainers();
      showBlocksForCategory(categoryName);
      
      // Load blocks for this category
      loadBlocks(categoryName);
      
      console.log(`[Sidebar] Category '${categoryName}' selected in horizontal layout`);
    });
  });

  // After setting icon for each category
  freshCategories.forEach(category => {
    const iconUrl = category.style.getPropertyValue('--icon');
    if (iconUrl) {
      const img = new window.Image();
      img.src = iconUrl.replace('url(','').replace(')','').replace(/['"]/g,'');
      img.onerror = () => {
        console.warn('[Sidebar] Missing icon asset:', iconUrl, 'for category', category.getAttribute('data-category'));
        category.style.setProperty('--icon', 'url(/assets/images/other.svg)');
      };
    }
  });

  // Clicking workspace closes block containers
  if (workspace) {
    workspace.addEventListener('click', () => {
      closeAllBlockContainers();
    });
  }

  // Clicking outside sidebar closes block containers (but not if clicking terminal or other UI elements)
  document.addEventListener('click', (e) => {
    // Don't close if clicking on sidebar, terminal, or workshop area
    if (!sidebar.contains(e.target) && 
        !e.target.closest('.console') && 
        !e.target.closest('.workshop-panel') &&
        !e.target.closest('.bottom-panel')) {
      closeAllBlockContainers();
    }
  });

  // Legacy sidebar toggle functionality (for compatibility)
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  
  function collapseSidebar() {
    if (sidebar) {
      sidebar.classList.remove('sidebar-open');
      sidebar.classList.add('sidebar-closed');
    }
    closeAllBlockContainers();
  }
  
  function expandSidebar() {
    if (sidebar) {
      sidebar.classList.remove('sidebar-closed');
      sidebar.classList.add('sidebar-open');
    }
  }
  
  if (sidebarToggleBtn) {
    sidebarToggleBtn.onclick = () => {
      const isOpen = sidebar && sidebar.classList.contains('sidebar-open');
      if (isOpen) {
        collapseSidebar();
      } else {
        expandSidebar();
      }
    };
  }
  
  // Initialize sidebar as open and terminal as visible by default
  expandSidebar();
  
  // Set terminal as active by default
  const defaultTerminalBtn = document.querySelector('.category-btn[data-category="terminal"]');
  if (defaultTerminalBtn) {
    defaultTerminalBtn.classList.add('active');
  }
}

// Make initializeSidebar available globally
window.initializeSidebar = initializeSidebar;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeSidebar);