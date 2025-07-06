// Standalone script to initialize the ribbon effect
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking for ribbon container and OGL");
    
    // Function to check if both the container and OGL are available
    function checkDependencies() {
        const ribbonsContainer = document.getElementById('ribbons-container');
        
        if (!ribbonsContainer) {
            console.error("Ribbon container not found");
            return false;
        }
        
        if (!window.ogl) {
            console.error("OGL library not loaded");
            return false;
        }
        
        return { ribbonsContainer };
    }
    
    // Function to initialize the ribbon effect
    function initRibbons() {
        const deps = checkDependencies();
        if (!deps) {
            console.log("Dependencies not met, retrying in 500ms");
            setTimeout(initRibbons, 500);
            return;
        }
        
        console.log("Initializing ribbon effect");
        
        try {
            // Create the ribbon effect
            const ribbons = new window.RibbonsEffect(deps.ribbonsContainer, {
                colors: ['#ffca28'], // Batman yellow color
                baseThickness: 30,
                speedMultiplier: 0.5,
                maxAge: 500,
                enableFade: false,
                enableShaderEffect: true,
                effectAmplitude: 2
            });
            
            console.log("Ribbon effect initialized successfully");
        } catch (error) {
            console.error("Error initializing ribbon effect:", error);
        }
    }
    
    // Start initialization
    initRibbons();
}); 