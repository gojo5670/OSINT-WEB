// Simple ribbon effect using Canvas API
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configure canvas
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    // Add canvas to page
    document.body.appendChild(canvas);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Ribbon points
    const points = [];
    const maxPoints = 50;
    const ribbonWidth = 30;
    const batmanYellow = '#ffca28';
    
    // Mouse position
    let mouseX = 0;
    let mouseY = 0;
    
    // Track mouse position
    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Add point if array is empty
        if (points.length === 0) {
            for (let i = 0; i < maxPoints; i++) {
                points.push({
                    x: mouseX,
                    y: mouseY
                });
            }
        }
    });
    
    // Animation function
    function animate() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update first point to mouse position
        if (points.length > 0) {
            // Smooth follow
            points[0].x += (mouseX - points[0].x) * 0.3;
            points[0].y += (mouseY - points[0].y) * 0.3;
            
            // Update all other points to follow previous point
            for (let i = 1; i < points.length; i++) {
                points[i].x += (points[i-1].x - points[i].x) * 0.3;
                points[i].y += (points[i-1].y - points[i].y) * 0.3;
            }
            
            // Draw ribbon
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            // Draw curve through points
            for (let i = 1; i < points.length - 2; i++) {
                const xc = (points[i].x + points[i+1].x) / 2;
                const yc = (points[i].y + points[i+1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }
            
            // Draw last segment
            ctx.quadraticCurveTo(
                points[points.length-2].x, 
                points[points.length-2].y, 
                points[points.length-1].x, 
                points[points.length-1].y
            );
            
            // Style and stroke
            ctx.lineWidth = ribbonWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = batmanYellow;
            ctx.stroke();
            
            // Add glow effect
            ctx.shadowColor = batmanYellow;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        // Continue animation
        requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
}); 