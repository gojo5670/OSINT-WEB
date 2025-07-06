// Custom cursor implementation
document.addEventListener('DOMContentLoaded', function() {
    // Create cursor element
    const customCursor = document.createElement('div');
    
    // Style cursor
    customCursor.className = 'custom-cursor';
    Object.assign(customCursor.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '32px',
        height: '32px',
        pointerEvents: 'none',
        zIndex: '9999',
        transform: 'translate(-50%, -50%)',
        transition: 'transform 0.1s ease-out'
    });
    
    // Set the target SVG
    customCursor.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <g fill="none" stroke="#ffcc00" stroke-width="2">
                <circle cx="12" cy="12" r="8.5"></circle>
                <path d="M1 12h5M18 12h5M12 6V1.04M12 23v-4.96M11.95 11.95h.1v.1h-.1z"></path>
            </g>
        </svg>
    `;
    
    // Add cursor to document
    document.body.appendChild(customCursor);
    
    // State variables
    let cursorX = 0;
    let cursorY = 0;
    let targetX = 0;
    let targetY = 0;
    
    // Hide default cursor on all elements
    document.documentElement.style.cursor = 'none';
    
    // Ensure all elements have cursor: none
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        * {
            cursor: none !important;
        }
        input, button, a, select, textarea, [role="button"] {
            cursor: none !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    // Track mouse position
    document.addEventListener('mousemove', function(e) {
        targetX = e.clientX;
        targetY = e.clientY;
    });
    
    // Handle click animation
    document.addEventListener('mousedown', function() {
        customCursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
    });
    
    document.addEventListener('mouseup', function() {
        customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    
    // Handle hover effects for interactive elements
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
    
    interactiveElements.forEach(el => {
        // Ensure each interactive element has cursor: none
        el.style.cursor = 'none';
        
        el.addEventListener('mouseenter', function() {
            customCursor.style.transform = 'translate(-50%, -50%) scale(1.2)';
            customCursor.style.filter = 'drop-shadow(0 0 5px #ffcc00)';
        });
        
        el.addEventListener('mouseleave', function() {
            customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
            customCursor.style.filter = 'none';
        });
    });
    
    // Animation function
    function updateCursorPosition() {
        // Smooth follow
        cursorX += (targetX - cursorX) * 0.2;
        cursorY += (targetY - cursorY) * 0.2;
        
        // Apply position
        customCursor.style.left = `${cursorX}px`;
        customCursor.style.top = `${cursorY}px`;
        
        // Continue animation
        requestAnimationFrame(updateCursorPosition);
    }
    
    // Start animation
    updateCursorPosition();
    
    // Handle touch devices
    if ('ontouchstart' in window) {
        customCursor.style.display = 'none';
        document.documentElement.style.cursor = 'auto';
    }
}); 