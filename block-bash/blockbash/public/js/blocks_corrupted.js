// blocks.js - Fixed version

// Import categoryData from loadblocks.js
import { categoryData } from './loadblocks.js';

console.log('[Blocks] Loading blocks.js module');

// Global variables
let nextBlockId = 1;

function buildCommandStringFromBlocks(dropId = 'drop-area') {
  const container = document.getElementById(dropId);
  if (!container) return '';
  
  const blocks = Array.from(container.children).filter(child => 
    child.classList.contains('block') && !child.classList.contains('placeholder')
  );
  
  let commandString = '';
  blocks.forEach(block => {
    const inputs = block.querySelectorAll('input, textarea, select');
    let blockCommand = block.dataset.command || '';
    
    inputs.forEach(input => {
      const placeholder = input.getAttribute('placeholder') || input.getAttribute('name') || 'VALUE';
      if (input.value) {
        blockCommand = blockCommand.replace(`{{${placeholder}}}`, input.value);
      }
    });
    
    if (blockCommand) {
      commandString += blockCommand + ' ';
    }
  });
  
  return commandString.trim();
}

window.buildCommandStringFromBlocks = buildCommandStringFromBlocks;

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const networkDropArea = document.getElementById('network-drop-area');
  const workspace = document.querySelector('.workspace');
  const minimizeBtn = document.getElementById('btn-console-minimize');
  const peekBtn = document.getElementById('peek-terminal-btn');
  let term = window.term; // rxvt terminal instance must be globally available as window.term

  console.log('[Blocks] DOM loaded, dropArea found:', !!dropArea, 'networkDropArea found:', !!networkDropArea);

  // Show welcome message at startup
  function showWelcome() {
    if (term) {
      term.clear();
      term.write("\x1b[1;35mWelcome to \x1b[1;34mTildeSec's Inspector Editor!\x1b[0m\r\n");
      term.write('$ ');
    }
  }
  showWelcome();

  // Initialize drag and drop for both areas
  setupDropHandlers(dropArea);
  setupDropHandlers(networkDropArea);

  // Terminal minimize/peek logic - updated for new bottom-panel layout
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      const consoleElement = document.querySelector('.console');
      const sidebar = document.querySelector('.sidebar');
      const terminalBtn = document.querySelector('.category-btn[data-category="terminal"]');
      
      if (consoleElement && sidebar) {
        // Hide terminal
        consoleElement.classList.add('hidden');
        sidebar.classList.add('terminal-hidden');
        
        // Update terminal button state
        if (terminalBtn) {
          terminalBtn.classList.remove('active');
        }
      }
    });
  }
  
  if (peekBtn) {
    peekBtn.addEventListener('click', () => {
      const consoleElement = document.querySelector('.console');
      const sidebar = document.querySelector('.sidebar');
      const terminalBtn = document.querySelector('.category-btn[data-category="terminal"]');
      
      if (consoleElement && sidebar) {
        // Show terminal
        consoleElement.classList.remove('hidden');
        sidebar.classList.remove('terminal-hidden');
        
        // Update terminal button state
        if (terminalBtn) {
          terminalBtn.classList.add('active');
        }
      }
    });
  }

  // --- Add: Terminal switcher logic ---
  const terminalTabs = document.getElementById('terminal-tabs');
  const addTerminalBtn = document.getElementById('btn-new-terminal');
  let terminals = [{ id: 0, label: 'Terminal 1', element: document.getElementById('output-terminal'), rxvt: window.term }];
  let activeTerminal = 0;

  function switchTerminal(idx) {
    terminals.forEach((t, i) => {
      t.element.style.display = (i === idx) ? '' : 'none';
      if (t.rxvt) {
        if (i === idx) t.xterm.focus();
      }
    });
    activeTerminal = idx;
    renderTerminalTabs();
  }

  function renderTerminalTabs() {
    if (!terminalTabs) return;
    
    terminalTabs.innerHTML = '';
    let showDropdown = terminals.length > 6;
    
    if (showDropdown) {
      // Collapsed dropdown for all tabs
      const dropdown = document.createElement('button');
      dropdown.className = 'terminal-tab-btn';
      dropdown.textContent = `Terminals (${terminals.length}) ▼`;
      terminalTabs.appendChild(dropdown);
    } else {
      terminals.forEach((t, i) => {
        const btn = document.createElement('button');
        btn.className = 'terminal-tab-btn';
        btn.textContent = terminals.length > 3 ? `${i + 1}` : t.label;
        btn.style.background = (i === activeTerminal) ? 'transparent' : 'transparent';
        btn.style.color = (i === activeTerminal) ? '#6a7df9' : '#6a7df9';
        btn.onclick = () => switchTerminal(i);
        
        if (i > 0) {
          const del = document.createElement('span');
          del.textContent = '×';
          del.style.marginLeft = '6px';
          del.style.color = '#c0392b';
          del.style.cursor = 'pointer';
          del.onclick = (e) => {
            e.stopPropagation();
            terminals[i].element.remove();
            if (terminals[i].xterm) terminals[i].xterm.dispose();
            terminals.splice(i, 1);
            if (activeTerminal >= i) activeTerminal = Math.max(0, activeTerminal - 1);
            switchTerminal(activeTerminal);
          };
          btn.appendChild(del);
        }
        terminalTabs.appendChild(btn);
      });
    }
  }

  if (addTerminalBtn) {
    addTerminalBtn.onclick = () => {
      const termDiv = document.createElement('div');
      termDiv.className = 'terminal';
      termDiv.style.display = 'none';
      document.querySelector('.console').insertBefore(termDiv, document.querySelector('.console-footer'));
      
      // Use the factory from xterm.js if available
      const newXterm = window.createNewTerminal ? window.createNewTerminal(termDiv) : null;
      terminals.push({ 
        id: terminals.length, 
        label: `Terminal ${terminals.length + 1}`, 
        element: termDiv, 
        xterm: newXterm 
      });
      switchTerminal(terminals.length - 1);
    };
  }

  renderTerminalTabs();

  // Initialize block repositioning system
  setupBlockRepositioning();
  console.log('[Blocks] Block repositioning system initialized');
});

// Function to setup drag and drop handlers for a drop area
function setupDropHandlers(dropArea) {
  if (!dropArea) {
    console.warn('[Blocks] Drop area not found');
    return;
  }
  
  console.log('[Blocks] Setting up drop handlers for:', dropArea.id);
  
  // Simple, clean dragover handler
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a reposition operation
    const transferData = e.dataTransfer.types.includes('text/plain');
    if (document.querySelector('.dragging')) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    dropArea.classList.add('drag-over');
  });

  // Clean up drag over styling
  dropArea.addEventListener('dragleave', (e) => {
    if (!dropArea.contains(e.relatedTarget)) {
      dropArea.classList.remove('drag-over');
    }
  });

  // Simple, clean drop handler
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dropArea.classList.remove('drag-over');
    
    console.log('[Blocks] Drop event triggered on:', dropArea.id);
    
    try {
      const dataString = e.dataTransfer.getData('text/plain');
      console.log('[Blocks] Raw drop data:', dataString);
      
      // Check if this is a reposition operation
      if (dataString === 'reposition') {
        console.log('[Blocks] Ignoring reposition operation');
        return;
      }
      
      const data = JSON.parse(dataString);
      console.log('[Blocks] Parsed drop data:', data);
      
      const categoryDataColor = categoryData[data.category]?.color || '#888';
      
      // Remove placeholder content when first item is dropped
      const placeholder = dropArea.querySelector('#block-editor-placeholder, #network-editor-placeholder');
      if (placeholder) {
        placeholder.remove();
      }
      
      // Check if this is a network block
      const isNetworkBlock = data.isNetworkBlock || data.deviceType;
      
      const block = document.createElement('div');
      
      if (isNetworkBlock) {
        // Handle network blocks
        block.className = 'network-device';
        block.style.background = categoryDataColor;
        block.innerHTML = `<div class="device-label">${data.name}</div>`;
        block.dataset.deviceType = data.deviceType || 'network-device';
      } else {
        // Handle regular blocks
        block.className = 'block';
        block.style.background = categoryDataColor;
        block.innerHTML = data.template || `<div class="block-title">${data.name}</div>`;
      }
      
      // Set common properties
      block.dataset.blockType = data.type;
      block.dataset.category = data.category;
      block.dataset.template = data.template;
      block.id = `block-${nextBlockId++}`;
      
      // Position block at drop location
      const rect = dropArea.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      block.style.position = 'absolute';
      block.style.left = x + 'px';
      block.style.top = y + 'px';
      
      // Add to drop area
      dropArea.appendChild(block);
      
      console.log('[Blocks] Block created and added:', block);
      
    } catch (error) {
      console.error('[Blocks] Error handling drop:', error);
    }
  });
}
        
        // Calculate precise drop position relative to drop area
        const dropAreaRect = dropArea.getBoundingClientRect();
        const offsetX = e.clientX - dropAreaRect.left - 50; // Center the block
        const offsetY = e.clientY - dropAreaRect.top - 25;
        
        block.style.cssText = `--theme: ${categoryDataColor}; position: absolute; left: ${offsetX}px; top: ${offsetY}px;`;
        block.dataset.deviceType = data.deviceType || 'network-device';
        block.dataset.blockType = data.type;
        
        // Create network device representation with proper icons
        const deviceContainer = document.createElement('div');
        deviceContainer.className = 'device-container';
        
        const deviceIcon = document.createElement('div');
        deviceIcon.className = 'device-icon';
        
        // Set appropriate icons based on device type
        let iconClass = 'fa fa-square';
        switch(data.deviceType) {
          default:
            iconClass = 'fa fa-square';
        }
        
        deviceIcon.innerHTML = `<i class="${iconClass}"></i>`;
        
        const deviceLabel = document.createElement('div');
        deviceLabel.className = 'device-label';
        deviceLabel.textContent = data.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        deviceContainer.appendChild(deviceIcon);
        deviceContainer.appendChild(deviceLabel);
        block.appendChild(deviceContainer);
        
        // Add configuration panel (hidden by default)
        const configPanel = document.createElement('div');
        configPanel.className = 'device-config';
        configPanel.style.display = 'none';
        configPanel.innerHTML = data.template;
        block.appendChild(configPanel);
        
        // Double-click to configure
        block.addEventListener('dblclick', () => {
          configPanel.style.display = configPanel.style.display === 'none' ? 'block' : 'none';
        });
        
        // Add info button to network blocks
        const infoBtn = document.createElement('button');
        infoBtn.className = 'block-info-btn';
        infoBtn.innerHTML = 'i';
        infoBtn.title = 'Click for more information';
        infoBtn.onclick = (e) => {
          e.stopPropagation();
          showBlockInfoPopup(block, data);
        };
        block.appendChild(infoBtn);
        
        // Add delete button to network blocks
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => block.remove();
        block.appendChild(deleteBtn);
        
        // Add right-click context menu for network blocks
        block.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showBlockContextMenu(e, block);
        });
        
        // Make network blocks draggable for repositioning
        makeBlockDraggable(block);
        
      } else {
        // Handle regular command blocks - now with free positioning
        block.className = `block`;
        
        // Calculate precise drop position relative to drop area for all blocks
        const dropAreaRect = dropArea.getBoundingClientRect();
        const offsetX = e.clientX - dropAreaRect.left - 50; // Center the block
        const offsetY = e.clientY - dropAreaRect.top - 25;
        
        block.style.cssText = `--theme: ${categoryDataColor}; position: absolute; left: ${offsetX}px; top: ${offsetY}px;`;
        block.dataset.blockType = data.type;
        block.innerHTML = data.template;
        
        // Immediately reveal any input fields for command blocks
        const inputs = block.querySelectorAll('input[type="text"], input[type="password"], input[type="number"], input[type="url"], input[type="email"], textarea, select');
        inputs.forEach(input => {
          input.style.display = 'inline-block';
        });
        
        // Add delete button to regular blocks
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => block.remove();
        block.appendChild(deleteBtn);
        
        // Add info button to regular blocks
        const infoBtn = document.createElement('button');
        infoBtn.className = 'block-info-btn';
        infoBtn.innerHTML = 'i';
        infoBtn.title = 'Click for more information';
        infoBtn.onclick = (e) => {
          e.stopPropagation();
          showBlockInfoPopup(block, data);
        };
        block.appendChild(infoBtn);
        
        // Add right-click context menu for regular blocks
        block.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showBlockContextMenu(e, block);
        });
        
        // Make regular blocks draggable for repositioning
        makeBlockDraggable(block);
      }
      
      dropArea.appendChild(block);
      console.log('[Blocks] Block created and added to drop area:', block);
      
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  });
}

// Enhanced function to make dropped blocks draggable for free positioning
function makeBlockDraggable(block) {
  if (!block || block.dataset.draggable === "true") return; // Prevent duplicate setup
  
  block.setAttribute('draggable', 'true');
  block.dataset.draggable = "true";
  
  // Add visual cursor indicator
  block.style.cursor = 'move';
  
  let draggedBlock = null;
  let dragOffset = { x: 0, y: 0 };
  
  block.addEventListener('dragstart', function(e) {
    draggedBlock = block;
    
    // Calculate and store offset from mouse to top-left of block
    const rect = block.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    // Store offset on the block for access during drop
    block._dragOffset = dragOffset;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'reposition');
    
    // Add visual feedback immediately
    block.classList.add('dragging');
    
    console.log('[Blocks] Started dragging block:', block.dataset.blockType || block.dataset.deviceType, 'offset:', dragOffset);
  });
  
  block.addEventListener('dragend', function(e) {
    block.classList.remove('dragging');
    draggedBlock = null;
    console.log('[Blocks] Finished dragging block');
  });
  
  // Prevent default drag image for smoother experience
  block.addEventListener('dragstart', function(e) {
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  });
}

// Enhanced repositioning system - separate from main drop handler
function setupBlockRepositioning() {
  const dropAreas = [document.getElementById('drop-area'), document.getElementById('network-drop-area')];
  
  dropAreas.forEach(dropArea => {
    if (!dropArea) return;
    
    console.log('[Blocks] Setting up block repositioning system for:', dropArea.id);
    
    // Handle repositioning with a separate drop event listener
    dropArea.addEventListener('drop', (e) => {
      const transferData = e.dataTransfer.getData('text/plain');
      
      // Check if this is a reposition operation
      if (transferData === 'reposition') {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('[Blocks] Handling reposition drop');
        
        // Find the currently dragging block
        const draggedBlock = document.querySelector('.block.dragging, .network-device.dragging');
        if (draggedBlock) {
          // Calculate precise new position using the stored offset
          const dropAreaRect = dropArea.getBoundingClientRect();
          
          // Get the drag offset that was stored during dragstart
          const dragOffset = draggedBlock._dragOffset || { x: 50, y: 25 };
          
          const newX = Math.max(0, e.clientX - dropAreaRect.left - dragOffset.x);
          const newY = Math.max(0, e.clientY - dropAreaRect.top - dragOffset.y);
          
          // Update block position
          draggedBlock.style.left = newX + 'px';
          draggedBlock.style.top = newY + 'px';
          
          console.log('[Blocks] Block repositioned to:', newX, newY);
          return;
        }
      }
    }, true); // Use capture phase to handle before main drop handler
  });
}

// Function to show block info popup
function showBlockInfoPopup(block, data) {
  // Remove any existing popup
  const existingPopup = document.querySelector('.block-info-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Get block name and explanation
  const titleElement = block.querySelector('.block-title, .network-block-title');
  const explanationElement = block.querySelector('.explanation');
  
  const blockName = titleElement ? titleElement.textContent : (data.name || data.type || 'Block');
  const explanation = explanationElement ? explanationElement.textContent : 'No description available.';
  
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'block-info-popup';
  popup.innerHTML = `
    <div class="popup-header">
      <h3>${blockName}</h3>
      <button class="popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="popup-content">
      <p>${explanation}</p>
    </div>
  `;
  
  // Position popup in center of screen
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #333;
    border-radius: 8px;
    padding: 0;
    z-index: 10000;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  
  document.body.appendChild(popup);
  
  // Close popup when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 100);
}

// Function to show block context menu
function showBlockContextMenu(e, block) {
  // Remove any existing context menu
  const existingMenu = document.querySelector('.block-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create context menu
  const menu = document.createElement('div');
  menu.className = 'block-context-menu';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="delete">Delete Block</div>
    <div class="context-menu-item" data-action="duplicate">Duplicate Block</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="change-color">Change Color</div>
    <div class="context-menu-item" data-action="resize">Resize</div>
  `;
  
  // Position menu at cursor
  menu.style.cssText = `
    position: fixed;
    left: ${e.pageX}px;
    top: ${e.pageY}px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    z-index: 10000;
    min-width: 150px;
  `;
  
  document.body.appendChild(menu);
  
  // Add event listeners for menu items
  menu.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (!action) return;
    
    switch (action) {
      case 'delete':
        block.remove();
        break;
      case 'duplicate':
        duplicateBlock(block);
        break;
      case 'change-color':
        changeBlockColor(block);
        break;
      case 'resize':
        resizeBlock(block);
        break;
    }
    
    menu.remove();
  });
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
}

// Function to duplicate a block
function duplicateBlock(originalBlock) {
  const clone = originalBlock.cloneNode(true);
  
  // Offset the clone position slightly
  if (originalBlock.style.left && originalBlock.style.top) {
    const leftValue = parseInt(originalBlock.style.left) + 20;
    const topValue = parseInt(originalBlock.style.top) + 20;
    clone.style.left = leftValue + 'px';
    clone.style.top = topValue + 'px';
  }
  
  // Re-add event listeners to the clone
  setupBlockEventListeners(clone);
  
  // Make the clone draggable
  makeBlockDraggable(clone);
  
  originalBlock.parentNode.appendChild(clone);
}

// Function to change block color
function changeBlockColor(block) {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
  const currentIndex = colors.findIndex(color => block.style.getPropertyValue('--theme') === color);
  const nextIndex = (currentIndex + 1) % colors.length;
  block.style.setProperty('--theme', colors[nextIndex]);
}

// Function to resize block
function resizeBlock(block) {
  const currentTransform = block.style.transform || '';
  if (currentTransform.includes('scale')) {
    // Reset to normal size
    block.style.transform = currentTransform.replace(/scale\([^)]*\)/g, '');
  } else {
    // Make larger
    block.style.transform = currentTransform + ' scale(1.2)';
  }
}

// Function to setup event listeners for blocks (used for duplicated blocks)
function setupBlockEventListeners(block) {
  // Re-add info button functionality
  const infoBtn = block.querySelector('.block-info-btn');
  if (infoBtn) {
    infoBtn.onclick = (e) => {
      e.stopPropagation();
      const data = { name: block.dataset.blockType, type: block.dataset.blockType };
      showBlockInfoPopup(block, data);
    };
  }
  
  // Re-add delete button functionality
  const deleteBtn = block.querySelector('.delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = () => block.remove();
  }
  
  // Re-add context menu
  block.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showBlockContextMenu(e, block);
  });
  
  // Make the block draggable
  makeBlockDraggable(block);
}
