// Layout control functionality for collapsible sections and resizable panels

document.addEventListener('DOMContentLoaded', function() {
    // Initialize collapse functionality
    initializeCollapseButtons();
    
    // Initialize resize functionality
    initializeResizeHandlers();
});

function initializeCollapseButtons() {
    // Workspace collapse button
    const workspaceCollapseBtn = document.getElementById('workspace-collapse-btn');
    const workspace = document.querySelector('.workspace');
    const mainContent = document.querySelector('.main-content');
    
    if (workspaceCollapseBtn && workspace) {
        workspaceCollapseBtn.addEventListener('click', function() {
            workspace.classList.toggle('collapsed');
            // Also toggle class on main-content for easier CSS targeting
            if (mainContent) {
                mainContent.classList.toggle('workspace-collapsed');
            }
            const span = this.querySelector('span');
            if (workspace.classList.contains('collapsed')) {
                span.innerHTML = '&#x2B;'; // Plus sign when collapsed
                this.title = 'Expand Workspace';
            } else {
                span.innerHTML = '&#x2212;'; // Minus sign when expanded
                this.title = 'Collapse Workspace';
            }
        });
    }
    
    // Console collapse button - updated for new bottom-panel layout
    const consoleCollapseBtn = document.getElementById('console-collapse-btn');
    const console = document.querySelector('.console');
    const sidebar = document.querySelector('.sidebar');
    
    if (consoleCollapseBtn && console) {
        consoleCollapseBtn.addEventListener('click', function() {
            const isHidden = console.classList.contains('hidden');
            const terminalBtn = document.querySelector('.category-btn[data-category="terminal"]');
            
            if (isHidden) {
                // Show terminal
                console.classList.remove('hidden');
                if (sidebar) sidebar.classList.remove('terminal-hidden');
                if (terminalBtn) terminalBtn.classList.add('active');
                
                const span = this.querySelector('span');
                span.innerHTML = '&#x2212;'; // Minus sign when expanded
                this.title = 'Hide Console';
            } else {
                // Hide terminal
                console.classList.add('hidden');
                if (sidebar) sidebar.classList.add('terminal-hidden');
                if (terminalBtn) terminalBtn.classList.remove('active');
                
                const span = this.querySelector('span');
                span.innerHTML = '&#x2B;'; // Plus sign when collapsed
                this.title = 'Show Console';
            }
        });
    }
}

function initializeResizeHandlers() {
    const resizer = document.getElementById('workshop-resizer');
    const workshopPanel = document.getElementById('workshop-panel');
    
    if (!resizer || !workshopPanel) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(workshopPanel).flexBasis, 10);
        
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = startX - e.clientX; // Reversed because we're moving left border
        const newWidth = startWidth + deltaX;
        
        // Constrain the width
        const minWidth = 200;
        const maxWidth = 800;
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        workshopPanel.style.flexBasis = constrainedWidth + 'px';
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
    
    // Handle double-click to reset to default width
    resizer.addEventListener('dblclick', function() {
        workshopPanel.style.flexBasis = '400px';
    });
}

// Export functions for use in other modules if needed
window.layoutControls = {
    initializeCollapseButtons,
    initializeResizeHandlers
};
