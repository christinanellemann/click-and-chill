const circle = document.getElementById('circle');
const counterElement = document.getElementById('counter');
const chillPointsElement = document.getElementById('chill-points');

let count = 0;
let chillPoints = 0;
let activeTimeout;

// Activate immediately on press
circle.addEventListener('mousedown', () => {
    circle.classList.add('active');
    if (activeTimeout) clearTimeout(activeTimeout);
});
circle.addEventListener('touchstart', () => {
    circle.classList.add('active');
    if (activeTimeout) clearTimeout(activeTimeout);
}, { passive: true });

circle.addEventListener('click', (e) => {
    count++;
    counterElement.textContent = count;

    chillPoints++;
    chillPointsElement.textContent = chillPoints;

    // Extend active state after release
    circle.classList.add('active');
    if (activeTimeout) {
        clearTimeout(activeTimeout);
    }
    activeTimeout = setTimeout(() => {
        circle.classList.remove('active');
    }, 1000);

    // Create particle
    const rect = circle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + 20; // Start slightly inside the top
    createParticle(x, y);
});

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    document.body.appendChild(particle);

    const size = 20;
    particle.style.left = `${x - size / 2}px`;
    particle.style.top = `${y - size / 2}px`;

    // Popcorn physics
    // Random spread for X
    const destinationX = (Math.random() - 0.5) * 300; 
    // Random height for Y (negative is up)
    const destinationY = -100 - Math.random() * 100;
    // Random rotation
    const rotation = Math.random() * 500;

    particle.style.setProperty('--tx', `${destinationX}px`);
    particle.style.setProperty('--ty', `${destinationY}px`);
    particle.style.setProperty('--rot', `${rotation}deg`);

    particle.addEventListener('animationend', () => {
        particle.remove();
    });
}