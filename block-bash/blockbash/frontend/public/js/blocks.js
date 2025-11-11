// blocks.js - Enhanced version with persistence, linking, export/import
import { categoryData } from './loadblocks.js';
console.log('[Blocks] Loading enhanced blocks.js');
let nextBlockId = 1;
const STORAGE_PREFIX = 'blockbash:canvas:';
const SCHEMA_VERSION = 2;
const networkState = (function(){
  if (typeof window !== 'undefined' && window.__networkStateSingleton) return window.__networkStateSingleton;
  const obj = { linking:false, linkSource:null, connections:[] };
  if (typeof window !== 'undefined') window.__networkStateSingleton = obj;
  return obj;
})();
// Expose a read-only reference for tests
if (typeof window !== 'undefined') window.networkState = networkState;

// ------------------------------------------------------------
// OOP Scaffolding for Editors (non-breaking; wraps existing functions)
// ------------------------------------------------------------
class BaseCanvasEditor {
  constructor(canvasId, { isNetwork = false } = {}) {
    this.canvasId = canvasId;
    this.isNetwork = isNetwork;
  }
  serialize() { return serializeCanvas(this.canvasId); }
  save() { saveCanvasState(this.canvasId); }
  restore() { restoreCanvasState(this.canvasId); }
  addRestoredBlock(data) {
    const el = document.getElementById(this.canvasId);
    if (!el) return;
    createRestoredBlock(data, el);
  }
}

class BlockEditor extends BaseCanvasEditor {
  constructor() { super('drop-area'); }
  buildCommandString() { return buildCommandStringFromBlocks(this.canvasId); }
}

class NetworkEditor extends BaseCanvasEditor {
  constructor() { super('network-drop-area', { isNetwork: true }); }
  get connections() { return networkState.connections; }
  set connections(v) { networkState.connections = Array.isArray(v) ? v : []; }
}

class EditorManager {
  constructor() {
    this.blockEditor = new BlockEditor();
    this.networkEditor = new NetworkEditor();
    this.initialized = false;
  }
  init() {
    if (this.initialized) return;
    this.blockEditor.restore();
    this.networkEditor.restore();
    this.initialized = true;
    console.log('[EditorManager] Initialized editors');
  }
  saveAll() {
    this.blockEditor.save();
    this.networkEditor.save();
  }
  serializeAll() {
    return {
      blocks: this.blockEditor.serialize(),
      network: this.networkEditor.serialize(),
      connections: [...networkState.connections]
    };
  }
}

// Expose manager for other scripts (backwards compatibility layer)
if (!window.editorManager) {
  window.editorManager = new EditorManager();
  window.getEditorManager = () => window.editorManager;
}

function serializeCanvas(canvasId) {
  const el = document.getElementById(canvasId);
  if (!el) return [];
  
  const items = [];
  el.querySelectorAll('.block, .network-device').forEach(node => {
    const entry = {
      id: node.id,
      kind: node.classList.contains('network-device') ? 'network-device' : 'block',
      blockType: node.dataset.blockType || '',
      category: node.dataset.category || '',
      template: node.dataset.template || '',
      deviceType: node.dataset.deviceType || '',
      left: node.style.left || '0px',
      top: node.style.top || '0px',
      bg: node.style.background || '',
      name: node.querySelector('.block-title')?.textContent || 
            node.querySelector('.device-label')?.textContent || '',
      inputs: []
    };
    
    // Capture all input values with their types and placeholders
    node.querySelectorAll('input, select, textarea').forEach(inp => {
      entry.inputs.push({
        value: inp.value || '',
        type: inp.type || 'text',
        placeholder: inp.placeholder || '',
        className: inp.className || ''
      });
    });
    
    items.push(entry);
  });
  
  return items;
}

function saveCanvasState(canvasId) {
  try {
    const data = serializeCanvas(canvasId);
    const payload = {
      v: SCHEMA_VERSION,
      items: data,
      timestamp: Date.now()
    };
    
    if (canvasId === 'network-drop-area') {
      payload.connections = networkState.connections;
    }
    
    localStorage.setItem(STORAGE_PREFIX + canvasId, JSON.stringify(payload));
    console.log('[Blocks] Saved state for', canvasId, '- items:', data.length);
  } catch (e) {
    console.warn('[Blocks] Failed to save', canvasId, e);
  }
}

function restoreCanvasState(canvasId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + canvasId);
    if (!raw) return;
    
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return;
    
    // Handle schema version migrations
    if (!parsed.v) parsed.v = 1;
    if (parsed.v < SCHEMA_VERSION) {
      console.log('[Blocks] Migrating schema from v' + parsed.v + ' to v' + SCHEMA_VERSION);
      parsed.v = SCHEMA_VERSION;
    }
    
    const el = document.getElementById(canvasId);
    if (!el) return;
    
    // Clear existing content first
    el.querySelectorAll('.block, .network-device').forEach(node => node.remove());
    
    // Restore blocks
    parsed.items.forEach(item => createRestoredBlock(item, el));
    
    // Restore network connections (ensure SVG layer exists even if not in base HTML)
    if (canvasId === 'network-drop-area' && Array.isArray(parsed.connections)) {
      networkState.connections = parsed.connections;
      if (!document.getElementById('network-connections-layer')) {
        try {
          const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
          svg.id = 'network-connections-layer';
          Object.assign(svg.style, { position:'absolute', top:'0', left:'0', width:'100%', height:'100%', pointerEvents:'none' });
          // Prefer parent (which might be a container) else append inside canvas container
          (el.parentElement || el).appendChild(svg);
        } catch(e){ console.warn('[Blocks] Failed to create connections layer', e); }
      }
      setTimeout(() => redrawAllConnections(), 120); // Slight delay to ensure blocks laid out
    }
    
    // Update nextBlockId to avoid conflicts
    const maxId = parsed.items.reduce((max, item) => {
      const num = (item.id || '').split('-').pop();
      const n = parseInt(num, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    
    if (maxId >= nextBlockId) nextBlockId = maxId + 1;
    
    console.log('[Blocks] Restored state for', canvasId, '- items:', parsed.items.length);
  } catch (e) {
    console.warn('[Blocks] Failed restore', canvasId, e);
  }
}
function createRestoredBlock(data, dropAreaEl) {
  const isNetwork = data.kind === 'network-device' || data.deviceType;
  const block = document.createElement('div');
  
  if (isNetwork) {
    // Create network device
    block.className = 'network-device';
    block.dataset.deviceType = data.deviceType || 'network-device';
    
    const iconMap = {
      'end-device': '💻',
      'network-device': '🖥️',
      'voice-device': '📞',
      'iot-device': '📡',
      'mobile-device': '📱',
      'router': '📡',
      'switch': '🔀'
    };
    
    const icon = iconMap[data.deviceType] || iconMap['network-device'];
    block.innerHTML = `<div class="device-icon" style="font-size:28px;line-height:32px;text-align:center;">${icon}</div><div class="device-label">${data.name || data.blockType}</div>`;
    
    Object.assign(block.style, {
      width: '80px',
      height: '70px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f1f1f',
      border: '1px solid #444',
      borderRadius: '6px',
      cursor: 'move'
    });
  } else {
    // Create regular block
    block.className = 'block';
    block.style.background = data.bg || '#4e5dc1';
    
    if (data.template) {
      block.innerHTML = data.template;
      
      // Restore input values
      const inputs = block.querySelectorAll('input, select, textarea');
      inputs.forEach((inp, i) => {
        if (data.inputs[i]) {
          inp.value = data.inputs[i].value;
          if (data.inputs[i].type) inp.type = data.inputs[i].type;
          if (data.inputs[i].placeholder) inp.placeholder = data.inputs[i].placeholder;
          if (data.inputs[i].className) inp.className = data.inputs[i].className;
        }
      });
      
      // Make sure block details are visible
      setTimeout(() => {
        block.querySelectorAll('.block-details, .command-details, .ssh-details, .ping-details').forEach(detail => {
          detail.style.display = 'block';
        });
        block.querySelectorAll('input, select, textarea').forEach(inp => {
          inp.style.display = 'inline-block';
          inp.style.margin = '2px';
        });
      }, 0);
    } else {
      block.innerHTML = `<div class="block-title">${data.name || data.blockType}</div>`;
    }
  }
  
  // Set common properties
  block.dataset.blockType = data.blockType || '';
  block.dataset.category = data.category || '';
  block.dataset.template = data.template || '';
  block.id = data.id || `block-${nextBlockId++}`;
  block.style.position = 'absolute';
  
  if (data.left) block.style.left = data.left;
  if (data.top) block.style.top = data.top;
  
  // Add delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '×';
  deleteBtn.onclick = () => {
    block.remove();
    saveCanvasState(dropAreaEl.id);
    redrawAllConnections();
  };
  block.appendChild(deleteBtn);
  
  // Add to drop area
  dropAreaEl.appendChild(block);
  
  // Make draggable and add network handlers
  makeBlockDraggable(block);
  attachNetworkLinkHandlersIfNeeded(block);
}
window.saveCanvasState=saveCanvasState; window.restoreCanvasState=restoreCanvasState;

function buildCommandStringFromBlocks(dropId = 'drop-area') {
  const container = document.getElementById(dropId);
  if (!container) return '';

  // Only include real blocks (exclude placeholders)
  const blocks = Array.from(container.children).filter(child =>
    child.classList.contains('block') && !child.classList.contains('placeholder')
  );

  const parts = [];
  blocks.forEach(block => {
    const blockType = ((block.dataset || {}).blockType ?? '').trim();
    const inputs = Array.from(block.querySelectorAll('input, select, textarea'));
    const argStr = inputs.map(i => (i.value || '').trim()).filter(Boolean).join(' ');

    let cmd = '';
    if (blockType) {
      cmd = argStr ? `${blockType} ${argStr}` : blockType;
    } else {
      // Custom block: raw input only
      cmd = argStr;
    }
    if (cmd) parts.push(cmd);
  });

  return parts.join(' && ');
}

window.buildCommandStringFromBlocks = buildCommandStringFromBlocks;
window.setupDropHandlers = setupDropHandlers; // Expose globally for debugging/testing

document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const networkDropArea = document.getElementById('network-drop-area');
  const workspace = document.querySelector('.workspace');
  const minimizeBtn = document.getElementById('btn-console-minimize');

  console.log('[Blocks] Initializing drag and drop handlers');
  console.log('[Blocks] Drop area found:', !!dropArea, 'Network drop area found:', !!networkDropArea);

  setupDropHandlers(dropArea); // block editor
  setupDropHandlers(networkDropArea); // network editor

  // Initialize editors via manager (delayed to allow other scripts to finish)
  setTimeout(() => {
    window.editorManager.init();
  }, 50);

  // Save once before unload just in case
  window.addEventListener('beforeunload', () => {
    window.editorManager.saveAll();
  });

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

// Enhanced drop handler with Scratch-like behavior
function setupDropHandlers(dropArea) {
  if (!dropArea) {
    console.warn('[Blocks] Drop area not found');
    return;
  }
  
  console.log('[Blocks] Setting up drop handlers for:', dropArea.id);
  
  // Ensure drop area can receive drops
  dropArea.style.minHeight = '300px';
  dropArea.style.pointerEvents = 'auto';
  
  let dragOverCount = 0;
  
  // Dragover handler (throttled to reduce spam)
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only log every 50th dragover to reduce console spam
    if (dragOverCount++ % 50 === 0) {
      console.log('[Blocks] Dragover on:', dropArea.id, 'count:', dragOverCount);
    }
    
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
    dragOverCount = 0; // Reset counter
    
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
  // Only treat as network block if the drag data explicitly marks it or provides a deviceType.
  // Do NOT use category === 'network' here, because functional blocks like Ping live in the
  // 'network' category for the block editor and should render with inputs, not as device icons.
  const isNetworkBlock = data.isNetworkBlock || data.deviceType;

      // More permissive separation: allow network blocks in network area, regular blocks anywhere
      const isNetworkCanvas = dropArea.id === 'network-drop-area';
      if (isNetworkCanvas && !isNetworkBlock) {
        console.warn('[Blocks] Converting regular block to network device for network canvas');
        // Convert regular block to network device for network canvas
        data.isNetworkBlock = true;
        data.deviceType = 'network-device';
      }
      
      const block = document.createElement('div');
      
      if (isNetworkBlock) {
        // Handle network blocks (visual icon style)
        block.className = 'network-device';
        block.dataset.deviceType = data.deviceType || 'network-device';
        const iconMap = {
          'end-device': '💻',
          'network-device': '🖥️',
          'voice-device': '📞',
          'iot-device': '📡',
          'mobile-device': '📱',
          'router': '📡',
          'switch': '🔀'
        };
        const icon = iconMap[data.deviceType] || iconMap[block.dataset.deviceType] || '🖥️';
        block.innerHTML = `<div class="device-icon" style="font-size:28px; line-height:32px; text-align:center;">${icon}</div><div class="device-label">${data.name}</div>`;
        block.style.width = '80px';
        block.style.height = '70px';
        block.style.display = 'flex';
        block.style.flexDirection = 'column';
        block.style.alignItems = 'center';
        block.style.justifyContent = 'center';
        block.style.background = '#1f1f1f';
        block.style.border = '1px solid #444';
        block.style.borderRadius = '6px';
        block.style.cursor = 'move';
      } else {
        // Handle regular blocks
        block.className = 'block';
        block.style.background = categoryDataColor;
        block.innerHTML = data.template || `<div class="block-title">${data.name}</div>`;
        
        // Make sure input fields are visible and functional
        setTimeout(() => {
          // Show block details containers
          const blockDetails = block.querySelectorAll('.block-details, .command-details, .ssh-details, .ping-details');
          blockDetails.forEach(detail => {
            detail.style.display = 'block';
          });
          
          // Show input fields
          const inputs = block.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            input.style.display = 'inline-block';
            input.style.margin = '2px';
          });
        }, 10);
      }
      
  // Set common properties
  // Normalize to empty string to avoid literal 'undefined' ending up in dataset
  block.dataset.blockType = (data.type ?? data.blockType ?? '');
      block.dataset.category = data.category;
      block.dataset.template = data.template;
      block.id = `block-${nextBlockId++}`;
      
  // Position block at drop location (clamp inside area)
  const rect = dropArea.getBoundingClientRect();
  let x = e.clientX - rect.left - 40;
  let y = e.clientY - rect.top - 35;
  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > rect.width - 90) x = rect.width - 90;
  if (y > rect.height - 80) y = rect.height - 80;
  // Apply the same 10px grid snapping used during drag movements so initial
  // placement also satisfies grid-alignment tests (previously top offset could end in +5).
  const INITIAL_SNAP_GRID = 10;
  x = Math.round(x / INITIAL_SNAP_GRID) * INITIAL_SNAP_GRID;
  y = Math.round(y / INITIAL_SNAP_GRID) * INITIAL_SNAP_GRID;
      
      block.style.position = 'absolute';
      block.style.left = x + 'px';
      block.style.top = y + 'px';
      
      // Add delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '×';
  deleteBtn.onclick = () => { block.remove(); saveCanvasState(dropArea.id); redrawAllConnections(); };
      block.appendChild(deleteBtn);
      
      // Add to drop area
      dropArea.appendChild(block);
      
  makeBlockDraggable(block);
  attachNetworkLinkHandlersIfNeeded(block);
  saveCanvasState(dropArea.id);
  redrawAllConnections();
      
      console.log('[Blocks] Block created and added:', block);
      
    } catch (error) {
      console.error('[Blocks] Error handling drop:', error);
    }
  });
}

function makeBlockDraggable(block) {
  block.style.userSelect = 'none';
  block.draggable = true;
  
  let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
  
  // Enhanced pointer-based dragging with Scratch-like snapping
  function down(e) {
    if (e.button !== 0) return;
    // If the pointerdown originated on (or inside) an interactive form control/contenteditable,
    // do NOT start a drag so the user can focus & type/select text. This fixes the bug where
    // clicking an input inside a block only moved the block instead of allowing input.
    const interactive = e.target.closest('input, textarea, select, [contenteditable="true"], option');
    if (interactive) {
      return; // allow normal focus / text selection behavior
    }
    e.preventDefault();
    
    dragging = true;
    block.classList.add('dragging');
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(block.style.left || '0', 10);
    origTop = parseInt(block.style.top || '0', 10);
    
    // Bring to front
    block.style.zIndex = '1000';
    
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  console.log('[Blocks][DragDebug] pointerdown', block.id || '(no-id)', 'start', startX, startY, 'orig', origLeft, origTop);
  }
  
  function move(e) {
    if (!dragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const p = block.parentElement;
    
    let nl = origLeft + dx;
    let nt = origTop + dy;
    
    // Constrain to parent bounds
    if (p) {
      const r = p.getBoundingClientRect();
      const bw = block.offsetWidth || 90;
      const bh = block.offsetHeight || 60;
      
      if (nl < 0) nl = 0;
      if (nt < 0) nt = 0;
      if (nl > r.width - bw) nl = r.width - bw;
      if (nt > r.height - bh) nt = r.height - bh;
    }
    
    // Apply Scratch-like grid snapping (optional, 10px grid)
    const SNAP_GRID = 10;
    nl = Math.round(nl / SNAP_GRID) * SNAP_GRID;
    nt = Math.round(nt / SNAP_GRID) * SNAP_GRID;
    
    block.style.left = nl + 'px';
    block.style.top = nt + 'px';
  console.log('[Blocks][DragDebug] move', block.id || '(no-id)', '->', nl, nt);
    
    // Update network connections if this is a network device
    if (block.classList.contains('network-device')) {
      updateConnectionsForNode(block.id);
    }
    
    // Check for Scratch-like block connections (for regular blocks)
    if (block.classList.contains('block')) {
      highlightNearbyBlocks(block);
    }
  }
  
  function up() {
    if (!dragging) return;
    
    dragging = false;
    block.classList.remove('dragging');
    block.style.zIndex = '';
    
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    
    // Clear any highlighting
    clearBlockHighlights();
    
    // Try to snap to nearby blocks (Scratch-like behavior)
    if (block.classList.contains('block')) {
      attemptBlockSnap(block);
    }
    
    const p = block.parentElement;
    if (p && p.id) {
      saveCanvasState(p.id);
    }
  }
  
  block.addEventListener('pointerdown', down);
}

// Scratch-like block connection helpers
function highlightNearbyBlocks(draggedBlock) {
  const SNAP_DISTANCE = 50;
  const parentEl = draggedBlock.parentElement;
  if (!parentEl) return;
  
  clearBlockHighlights();
  
  const draggedRect = draggedBlock.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();
  
  // Find nearby blocks
  parentEl.querySelectorAll('.block').forEach(otherBlock => {
    if (otherBlock === draggedBlock) return;
    
    const otherRect = otherBlock.getBoundingClientRect();
    const distance = Math.sqrt(
      Math.pow(draggedRect.left - otherRect.left, 2) + 
      Math.pow(draggedRect.top - otherRect.top, 2)
    );
    // Debug logging to help Playwright test verify proximity calculations
    if (distance < 200) {
      console.log('[Blocks][HighlightDebug] distance to block', otherBlock.id || '(no-id)', '=>', Math.round(distance));
    }
    
    if (distance < SNAP_DISTANCE) {
      otherBlock.classList.add('snap-highlight');
      console.log('[Blocks][HighlightDebug] Added snap-highlight to', otherBlock.id || '(no-id)');
    }
  });
}

function clearBlockHighlights() {
  document.querySelectorAll('.snap-highlight').forEach(el => {
    if (el.classList.contains('snap-highlight')) {
      console.log('[Blocks][HighlightDebug] clearing highlight on', el.id || '(no-id)');
      el.classList.remove('snap-highlight');
    }
  });
}

function attemptBlockSnap(block) {
  const SNAP_DISTANCE = 30;
  const SNAP_TOLERANCE = 20;
  const parentEl = block.parentElement;
  if (!parentEl) return;
  
  const blockRect = block.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();
  
  let closestBlock = null;
  let closestDistance = SNAP_DISTANCE;
  
  // Find the closest block within snap distance
  parentEl.querySelectorAll('.block').forEach(otherBlock => {
    if (otherBlock === block) return;
    
    const otherRect = otherBlock.getBoundingClientRect();
    const distance = Math.sqrt(
      Math.pow(blockRect.left - otherRect.left, 2) + 
      Math.pow(blockRect.top - (otherRect.bottom), 2)
    );
    
    if (distance < closestDistance) {
      closestBlock = otherBlock;
      closestDistance = distance;
    }
  });
  
  // Snap to the closest block
  if (closestBlock) {
    const targetRect = closestBlock.getBoundingClientRect();
    const newLeft = targetRect.left - parentRect.left;
    const newTop = targetRect.bottom - parentRect.top + 5; // Small gap
    
    block.style.left = newLeft + 'px';
    block.style.top = newTop + 'px';
    
    console.log('[Blocks] Snapped block to nearby block');
  }
}

function attachNetworkLinkHandlersIfNeeded(block){ if(!block.classList.contains('network-device')) return; block.addEventListener('click',e=>{ if(!networkState.linking) return; e.stopPropagation(); if(!networkState.linkSource){ networkState.linkSource=block; block.classList.add('link-source'); } else if(networkState.linkSource===block){ block.classList.remove('link-source'); networkState.linkSource=null; } else { createConnection(networkState.linkSource, block); networkState.linkSource.classList.remove('link-source'); networkState.linkSource=null; saveCanvasState('network-drop-area'); }}); }
function createConnection(a,b){ const svg=document.getElementById('network-connections-layer'); if(!svg) return; const id='conn-'+Date.now()+'-'+Math.random().toString(36).slice(2,8); const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('stroke','#4e5dc1'); line.setAttribute('stroke-width','2'); line.setAttribute('data-conn-id',id); svg.appendChild(line); networkState.connections.push({id,fromId:a.id,toId:b.id}); updateConnectionPosition(line,a,b); }
function updateConnectionPosition(line,a,b){ const ar=a.getBoundingClientRect(), br=b.getBoundingClientRect(), pr=a.parentElement.getBoundingClientRect(); const ax=ar.left-pr.left+ar.width/2, ay=ar.top-pr.top+ar.height/2, bx=br.left-pr.left+br.width/2, by=br.top-pr.top+br.height/2; line.setAttribute('x1',ax); line.setAttribute('y1',ay); line.setAttribute('x2',bx); line.setAttribute('y2',by); }
function updateConnectionsForNode(id){ const svg=document.getElementById('network-connections-layer'); if(!svg) return; networkState.connections.forEach(c=>{ if(c.fromId===id||c.toId===id){ const line=svg.querySelector(`[data-conn-id="${c.id}"]`); const a=document.getElementById(c.fromId), b=document.getElementById(c.toId); if(line&&a&&b) updateConnectionPosition(line,a,b); }}); }
function redrawAllConnections(){ const svg=document.getElementById('network-connections-layer'); if(!svg) return; svg.innerHTML=''; networkState.connections.forEach(c=>{ const a=document.getElementById(c.fromId), b=document.getElementById(c.toId); if(!a||!b) return; const line=document.createElementNS('http://www.w3.org/2000/svg','line'); line.setAttribute('stroke','#4e5dc1'); line.setAttribute('stroke-width','2'); line.setAttribute('data-conn-id',c.id); svg.appendChild(line); updateConnectionPosition(line,a,b); }); }

function exportSetup() {
  // Support dynamically suffixed canvas IDs (e.g., drop-area-0) introduced at runtime.
  const resolveCanvasIds = () => {
    const staticBlock = document.getElementById('drop-area');
    const dynamicBlock = document.querySelector('[id^="drop-area-"]');
    const staticNetwork = document.getElementById('network-drop-area');
    const dynamicNetwork = document.querySelector('[id^="network-drop-area-"]');
    const choose = (primary, fallback) => {
      if (primary && primary.querySelector('.block, .network-device')) return primary;
      if (fallback && fallback.querySelector('.block, .network-device')) return fallback;
      return primary || fallback;
    };
    const blockEl = choose(staticBlock, dynamicBlock);
    const networkEl = choose(staticNetwork, dynamicNetwork);
    return { blockId: blockEl?.id || 'drop-area', networkId: networkEl?.id || 'network-drop-area' };
  };
  const { blockId, networkId } = resolveCanvasIds();
  const collectCanvasIds = (baseId) => {
    const set = new Set();
    const staticEl = document.getElementById(baseId);
    if (staticEl) set.add(staticEl.id);
    document.querySelectorAll(`[id^="${baseId}-"]`).forEach(el => set.add(el.id));
    return [...set];
  };
  const blockIds = collectCanvasIds('drop-area');
  const networkIds = collectCanvasIds('network-drop-area');
  // Collect all canvases and classify by element class rather than canvas grouping
  const allCanvasIds = [...new Set([...blockIds, ...networkIds])];
  const allItems = allCanvasIds.flatMap(id => serializeCanvas(id));
  const blockItems = allItems.filter(i => i.kind === 'block');
  const networkItems = allItems.filter(i => i.kind === 'network-device');
  const exportData = {
    schema: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    application: 'BlockBash',
    canvases: {
      block: blockItems,
      network: networkItems,
      connections: networkState.connections,
      meta: { canvasIds: allCanvasIds }
    }
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `blockbash-setup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  console.log('[Blocks] Exported setup with', exportData.canvases.block.length, 'blocks and', exportData.canvases.network.length, 'network devices');
  return exportData;
}

function importSetup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      
      if (!data.canvases) {
        throw new Error('Invalid setup file - missing canvases data');
      }
      
      // Clear existing content
      // Determine actual runtime IDs (may include suffixes)
      const runtimeBlockEl = document.getElementById('drop-area') || document.querySelector('[id^="drop-area-"]');
      const runtimeNetworkEl = document.getElementById('network-drop-area') || document.querySelector('[id^="network-drop-area-"]');
      [runtimeBlockEl?.id, runtimeNetworkEl?.id].filter(Boolean).forEach(id => {
        const el = id ? document.getElementById(id) : null;
        if (el) {
          el.querySelectorAll('.block, .network-device').forEach(node => node.remove());
        }
      });
      
      // Reset network state
      networkState.connections = [];
      const svg = document.getElementById('network-connections-layer');
      if (svg) svg.innerHTML = '';
      
      // Import blocks and network devices
      const blockData = data.canvases.block || [];
      const networkData = data.canvases.network || [];
      
  const targetBlockEl = runtimeBlockEl || document.getElementById('drop-area');
  const targetNetworkEl = runtimeNetworkEl || document.getElementById('network-drop-area');
  blockData.forEach(item => { if (targetBlockEl) createRestoredBlock(item, targetBlockEl); });
  networkData.forEach(item => { if (targetNetworkEl) createRestoredBlock(item, targetNetworkEl); });
      
      // Import network connections
      if (Array.isArray(data.canvases.connections)) {
        networkState.connections = data.canvases.connections;
        setTimeout(() => redrawAllConnections(), 200); // Give time for blocks to render
      }
      
      // Save the imported state
  if (targetBlockEl) saveCanvasState(targetBlockEl.id);
  if (targetNetworkEl) saveCanvasState(targetNetworkEl.id);
      
      alert(`Setup imported successfully!\nBlocks: ${blockData.length}\nNetwork devices: ${networkData.length}\nConnections: ${networkState.connections.length}`);
      
      console.log('[Blocks] Imported setup with', blockData.length, 'blocks and', networkData.length, 'network devices');
    } catch (e) {
      alert('Import failed: ' + e.message);
      console.error('[Blocks] Import error:', e);
    }
  };
  reader.readAsText(file);
}
// Direct data import variant for testing (bypasses FileReader)
function importSetupData(data) {
  try {
    if (!data || !data.canvases) throw new Error('Invalid setup data');
    const runtimeBlockEl = document.getElementById('drop-area') || document.querySelector('[id^="drop-area-"]');
    const runtimeNetworkEl = document.getElementById('network-drop-area') || document.querySelector('[id^="network-drop-area-"]');
    [runtimeBlockEl?.id, runtimeNetworkEl?.id].filter(Boolean).forEach(id => {
      const el = id ? document.getElementById(id) : null;
      if (el) el.querySelectorAll('.block, .network-device').forEach(n => n.remove());
    });
    networkState.connections = [];
    const svg = document.getElementById('network-connections-layer'); if (svg) svg.innerHTML='';
    const blockData = data.canvases.block || [];
    const networkData = data.canvases.network || [];
    const targetBlockEl = runtimeBlockEl || document.getElementById('drop-area');
    const targetNetworkEl = runtimeNetworkEl || document.getElementById('network-drop-area');
    blockData.forEach(item => { if (targetBlockEl) createRestoredBlock(item, targetBlockEl); });
    networkData.forEach(item => { if (targetNetworkEl) createRestoredBlock(item, targetNetworkEl); });
    if (Array.isArray(data.canvases.connections)) { networkState.connections = data.canvases.connections; setTimeout(()=>redrawAllConnections(),200); }
    if (targetBlockEl) saveCanvasState(targetBlockEl.id);
    if (targetNetworkEl) saveCanvasState(targetNetworkEl.id);
    console.log('[Blocks] Imported (data) setup with', blockData.length, 'blocks and', networkData.length, 'network devices');
    return { blocks: blockData.length, devices: networkData.length };
  } catch (e) {
    console.error('[Blocks] importSetupData error', e);
    throw e;
  }
}
document.addEventListener('DOMContentLoaded',()=>{ const btnExport=document.getElementById('btn-export-setup'); const btnImport=document.getElementById('btn-import-setup'); const fileInput=document.getElementById('import-file-input'); const btnStartLink=document.getElementById('btn-start-link'); const btnCancelLink=document.getElementById('btn-cancel-link'); if(btnExport) btnExport.addEventListener('click',exportSetup); if(btnImport&&fileInput){ btnImport.addEventListener('click',()=>fileInput.click()); fileInput.addEventListener('change',()=>{ if(fileInput.files&&fileInput.files[0]) importSetup(fileInput.files[0]); fileInput.value=''; }); } if(btnStartLink&&btnCancelLink){ btnStartLink.addEventListener('click',()=>{ networkState.linking=true; networkState.linkSource=null; btnStartLink.style.display='none'; btnCancelLink.style.display='inline-block'; document.getElementById('network-drop-area').classList.add('link-mode'); }); btnCancelLink.addEventListener('click',()=>{ networkState.linking=false; if(networkState.linkSource) networkState.linkSource.classList.remove('link-source'); networkState.linkSource=null; btnStartLink.style.display='inline-block'; btnCancelLink.style.display='none'; document.getElementById('network-drop-area').classList.remove('link-mode'); }); } 
  // Expose test harness API only in test environment
  try {
    const isNodeTest = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    const isAutomated = typeof navigator !== 'undefined' && navigator.webdriver; // Playwright / Selenium
    if (isNodeTest || isAutomated) {
      window.InspectorIO = { exportSetup, importSetupData };
      console.log('[Blocks] InspectorIO test API exposed (test/automated)');
    }
  } catch (e) {
    // Ignore if process not accessible
  }
});

// Export categoryData for compatibility
export { categoryData };
