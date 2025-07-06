// Add star elements to all batman-button elements
document.addEventListener('DOMContentLoaded', function() {
    // Star SVG markup
    const starSVG = `
        <svg class="star-1" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
        <svg class="star-2" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
        <svg class="star-3" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
        <svg class="star-4" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
        <svg class="star-5" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
        <svg class="star-6" viewBox="0 0 24 24"><polygon class="fil0" points="12,0 15.5,9 24,9 17,14.5 20,24 12,18 4,24 7,14.5 0,9 9,9"/></svg>
    `;
    
    // Get all batman-button elements
    const batmanButtons = document.querySelectorAll('.batman-button');
    
    // Add star elements to each batman-button
    batmanButtons.forEach(button => {
        // Insert the star SVGs before the span element
        button.insertAdjacentHTML('afterbegin', starSVG);
    });
}); 