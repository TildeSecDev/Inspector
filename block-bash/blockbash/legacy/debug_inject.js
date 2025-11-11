// Inject debugging script
(function() {
    console.log('=== DRAG DEBUG SCRIPT LOADED ===');
    
    // Check if blocks exist and are draggable
    setTimeout(() => {
        const blocks = document.querySelectorAll('.block, .network-block');
        console.log('Found blocks:', blocks.length);
        
        blocks.forEach((block, index) => {
            console.log(`Block ${index}:`, {
                draggable: block.draggable,
                hasAttribute: block.hasAttribute('draggable'),
                getAttribute: block.getAttribute('draggable'),
                className: block.className,
                innerHTML: block.innerHTML.substring(0, 100)
            });
            
            // Test if we can add our own dragstart listener
            block.addEventListener('dragstart', (e) => {
                console.log('CUSTOM dragstart listener fired for block:', index);
            });
            
            // Test mouse events
            block.addEventListener('mousedown', (e) => {
                console.log('Mouse down on block:', index);
            });
        });
        
        // Check drop areas
        const dropAreas = document.querySelectorAll('#blocks-area, #network-drop-area');
        console.log('Found drop areas:', dropAreas.length);
        
    }, 1000);
})();
