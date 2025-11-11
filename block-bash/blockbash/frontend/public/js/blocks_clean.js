// blocks.js - Clean working version

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
    const blockType = block.dataset.blockType;
    const inputs = block.querySelectorAll('input, select, textarea');
    
    if (blockType) {
      commandString += blockType;
      inputs.forEach(input => {
        if (input.value) {
          commandString += ` ${input.value}`;
        }
      });
      commandString += ' && ';
    }
  });
  
  return commandString.trim().replace(/ && $/, '');
}

window.buildCommandStringFromBlocks = buildCommandStringFromBlocks;

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const networkDropArea = document.getElementById('network-drop-area');
  const workspace = document.querySelector('.workspace');
  const minimizeBtn = document.getElementById('btn-console-minimize');

  console.log('[Blocks] Initializing drag and drop handlers');

  // Initialize drag and drop for both areas
  setupDropHandlers(dropArea);
  setupDropHandlers(networkDropArea);

  // Terminal minimize/peek logic
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      const consoleElement = document.querySelector('.console');
      const sidebar = document.querySelector('.sidebar');
      const terminalBtn = document.querySelector('.category-btn[data-category="terminal"]');
      
      if (consoleElement && sidebar) {
        consoleElement.classList.add('hidden');
        sidebar.classList.add('terminal-hidden');
        
        if (terminalBtn) {
          terminalBtn.classList.remove('active');
        }
      }
    });
  }
});

// Simple, clean drop handler function
function setupDropHandlers(dropArea) {
  if (!dropArea) {
    console.warn('[Blocks] Drop area not found');
    return;
  }
  
  console.log('[Blocks] Setting up drop handlers for:', dropArea.id);
  
  // Dragover handler
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (document.querySelector('.dragging')) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
    
    dropArea.classList.add('drag-over');
  });

  // Dragleave handler
  dropArea.addEventListener('dragleave', (e) => {
    if (!dropArea.contains(e.relatedTarget)) {
      dropArea.classList.remove('drag-over');
    }
  });

  // Drop handler
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
      const x = e.clientX - rect.left - 50; // Center the block
      const y = e.clientY - rect.top - 25;
      
      block.style.position = 'absolute';
      block.style.left = x + 'px';
      block.style.top = y + 'px';
      
      // Add delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.onclick = () => block.remove();
      block.appendChild(deleteBtn);
      
      // Add to drop area
      dropArea.appendChild(block);
      
      // Make block draggable for repositioning
      makeBlockDraggable(block);
      
      console.log('[Blocks] Block created and added:', block);
      
    } catch (error) {
      console.error('[Blocks] Error handling drop:', error);
    }
  });
}

// Make dropped blocks draggable for repositioning
function makeBlockDraggable(block) {
  block.setAttribute('draggable', 'true');
  block.dataset.draggable = "true";
  
  block.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/plain', 'reposition');
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => block.classList.add('dragging'), 0);
  });
  
  block.addEventListener('dragend', function() {
    block.classList.remove('dragging');
  });
  
  block.addEventListener('dragover', function(e) {
    e.preventDefault();
  });
  
  block.addEventListener('drop', function(e) {
    e.preventDefault();
    const draggedBlock = document.querySelector('.dragging');
    if (draggedBlock && draggedBlock !== block) {
      const rect = block.getBoundingClientRect();
      const offset = e.clientY - rect.top;
      const dropArea = block.parentNode;
      if (offset < rect.height / 2) {
        dropArea.insertBefore(draggedBlock, block);
      } else {
        dropArea.insertBefore(draggedBlock, block.nextSibling);
      }
    }
  });
}

// Export categoryData for compatibility
export { categoryData };
