// Enhanced drag drop debug test
console.log('=== ENHANCED DRAG DROP DEBUG TEST ===');

function debugDragDrop() {
    setTimeout(() => {
        console.log('Starting comprehensive drag drop test...');
        
        // Test 1: Check if elements exist
        const dropArea = document.getElementById('drop-area');
        const networkDropArea = document.getElementById('network-drop-area');
        const blocksContainer = document.querySelector('#blocks-display-area .active-block-list');
        
        console.log('Elements check:', {
            dropArea: !!dropArea,
            networkDropArea: !!networkDropArea,
            blocksContainer: !!blocksContainer
        });
        
        if (dropArea) {
            console.log('Drop area info:', {
                id: dropArea.id,
                className: dropArea.className,
                style: dropArea.style.cssText,
                offsetParent: dropArea.offsetParent,
                clientRect: dropArea.getBoundingClientRect()
            });
        }
        
        // Test 2: Check blocks
        const blocks = document.querySelectorAll('.block, .network-block');
        console.log(`Found ${blocks.length} blocks`);
        
        blocks.forEach((block, i) => {
            console.log(`Block ${i}:`, {
                draggable: block.draggable,
                hasAttribute: block.hasAttribute('draggable'),
                getAttribute: block.getAttribute('draggable'),
                className: block.className,
                text: block.textContent?.trim(),
                style: block.style.cssText,
                offsetParent: block.offsetParent,
                clientRect: block.getBoundingClientRect()
            });
            
            // Remove existing listeners and add fresh ones
            const newBlock = block.cloneNode(true);
            block.parentNode.replaceChild(newBlock, block);
            
            // Add comprehensive event listeners
            newBlock.addEventListener('mousedown', (e) => {
                console.log(`🖱️ MOUSEDOWN on block ${i}:`, e.target.textContent?.trim());
            });
            
            newBlock.addEventListener('dragstart', (e) => {
                console.log(`🚀 DRAGSTART on block ${i}:`, e.target.textContent?.trim());
                e.dataTransfer.setData('text/plain', `test-block-${i}`);
                e.dataTransfer.effectAllowed = 'copy';
                return false; // Prevent any other handlers
            });
            
            newBlock.addEventListener('drag', (e) => {
                console.log(`🔄 DRAG on block ${i}`);
            });
            
            newBlock.addEventListener('dragend', (e) => {
                console.log(`🏁 DRAGEND on block ${i}`);
            });
            
            // Ensure it's draggable
            newBlock.draggable = true;
            newBlock.setAttribute('draggable', 'true');
        });
        
        // Test 3: Add drop area listeners
        if (dropArea) {
            // Clear existing listeners
            const newDropArea = dropArea.cloneNode(true);
            dropArea.parentNode.replaceChild(newDropArea, dropArea);
            
            newDropArea.addEventListener('dragover', (e) => {
                console.log('🎯 DRAGOVER on drop area');
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });
            
            newDropArea.addEventListener('dragenter', (e) => {
                console.log('📥 DRAGENTER on drop area');
                e.preventDefault();
            });
            
            newDropArea.addEventListener('drop', (e) => {
                console.log('💥 DROP on drop area with data:', e.dataTransfer.getData('text/plain'));
                e.preventDefault();
                
                // Create a simple dropped block
                const droppedBlock = document.createElement('div');
                droppedBlock.textContent = 'DROPPED: ' + e.dataTransfer.getData('text/plain');
                droppedBlock.style.background = '#4CAF50';
                droppedBlock.style.color = 'white';
                droppedBlock.style.padding = '10px';
                droppedBlock.style.margin = '5px';
                droppedBlock.style.borderRadius = '4px';
                newDropArea.appendChild(droppedBlock);
            });
        }
        
        console.log('Debug setup complete. Try dragging a block now...');
        
    }, 3000);
}

// Run the enhanced debug
debugDragDrop();
