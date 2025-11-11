// Load category data
let categoryData = {};
fetch('/blocks/categoryData.json')
  .then(res => res.json())
  .then(data => {
    categoryData = data;
    console.log('[LoadBlocks] Category data loaded:', categoryData);
  })
  .catch(err => console.error('[LoadBlocks] Failed to load category data:', err));

function loadBlocks(category) {
  console.log('[LoadBlocks] Loading blocks for category:', category);
  const container = document.querySelector('.blocks-display-area .active-block-list');
  if (!container) {
    console.error('[LoadBlocks] Container not found!');
    console.log('[LoadBlocks] Available elements:', document.querySelectorAll('#blocks-display-area, .blocks-display-area, .active-block-list'));
    return;
  }
  
  console.log('[LoadBlocks] Container found:', container);

  // Check if this is a network block category
  // Network-only categories (exclude generic 'network' which has its own root JSON file)
  const networkCategories = ['end-devices', 'routers', 'switches', 'wireless', 'security', 'wan', 'connections', 'modules', 'iot', 'misc', 'hacking'];
  const isNetworkCategory = networkCategories.includes(category);
  
  // Determine the correct path
  const basePath = isNetworkCategory ? '/blocks/network-blocks' : '/blocks';
  const primaryFile = isNetworkCategory ? `${basePath}/${category}.json` : `${basePath}/${category}.json`;
  const fallbackFile = '/blocks/blocks.json';

  // Try to load category-specific file first, fallback to blocks.json
  console.log('[LoadBlocks] Fetching file:', primaryFile);
  fetch(primaryFile)
    .then(res => {
      console.log('[LoadBlocks] Fetch response:', res.status, res.ok);
  if (res.ok) return res.json();
  // If not found, fallback to blocks.json only for non-network categories
  if (!isNetworkCategory) {
        console.log('[LoadBlocks] Trying fallback file:', fallbackFile);
        return fetch(fallbackFile).then(r => r.ok ? r.json() : []);
      }
  throw new Error(`Network blocks file not found (404) for category '${category}': ${primaryFile}`);
    })
    .then(data => {
      console.log('[LoadBlocks] Data received:', data);
      if (!data) return;
      
      container.innerHTML = '';
      let blocks = Array.isArray(data) ? data : [];
      console.log('[LoadBlocks] Processing blocks:', blocks.length);
      // If blocks.json, filter by category
      if (blocks.length && blocks[0]['data-category'] !== undefined) {
        blocks = blocks.filter(block => block['data-category'] === category);
      }
      blocks.forEach(block => {
        // --- Normalize block format ---
        let blockObj = { ...block };
        // If legacy format (type/label/inputs), convert to modern
        if (!blockObj.name && blockObj.label) blockObj.name = blockObj.label;
        if (!blockObj.blockType && blockObj.type) blockObj.blockType = blockObj.type;
        if (!blockObj["data-category"] && category) blockObj["data-category"] = category;
        if (!blockObj.innerHTML) {
          // Fallback: generate a simple innerHTML
          let inputsHTML = '';
          if (Array.isArray(blockObj.inputs)) {
            inputsHTML = blockObj.inputs.map(input => `<input type="text" placeholder="${input.placeholder || input.name || ''}">`).join('');
          }
          blockObj.innerHTML = `<div class=\"block-title\">${blockObj.name || blockObj.blockType || 'Block'}</div><div class=\"block-details\" style=\"display:none;\"></div>${inputsHTML}`;
        }
        // --- Render block ---
        const blockElement = document.createElement('div');
        blockElement.className = isNetworkCategory ? 'network-block' : 'block';
        blockElement.setAttribute('draggable', true);
        console.log('[LoadBlocks] Created block:', blockObj.name, 'draggable:', blockElement.draggable);
        blockElement.dataset.blockType = blockObj.blockType || '';
        blockElement.dataset.category = category;
        if (isNetworkCategory && blockObj.deviceType) {
          blockElement.dataset.deviceType = blockObj.deviceType;
        }
        const content = document.createElement('div');
        content.className = 'block-content';
        const name = document.createElement('span');
        name.textContent = blockObj.name || blockObj.blockType || 'Block';
        content.appendChild(name);
        blockElement.appendChild(content);
        blockElement.dataset.template = blockObj.innerHTML;
        blockElement.addEventListener('dragstart', (e) => {
          console.log('[LoadBlocks] Dragstart event fired for:', blockObj.name);
          const dragData = {
            type: blockObj.blockType,
            name: blockObj.name,
            template: blockObj.innerHTML,
            category: category,
            icon: blockObj.icon || ''
          };
          if (isNetworkCategory) {
            dragData.deviceType = blockObj.deviceType || 'network-device';
            dragData.isNetworkBlock = true;
          }
          console.log('[LoadBlocks] Setting drag data:', dragData);
          e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        });
        container.appendChild(blockElement);
      });
    })
    .catch(err => {
      console.warn(`Error loading blocks for category: ${category}`, err);
    });
}

// Make loadBlocks available globally for dynamic category switching
window.loadBlocks = loadBlocks;

export { loadBlocks, categoryData };