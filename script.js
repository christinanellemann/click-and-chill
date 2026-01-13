import Matter from 'matter-js';

const circle = document.getElementById('circle');
const counterElement = document.getElementById('counter');
const chillPointsElement = document.getElementById('chill-points');

// --- Physics Setup ---
const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite;

// Create engine
const engine = Engine.create();
const world = engine.world;

// Start runner
const runner = Runner.create();
Runner.run(runner, engine);

// Store pairs of { body, element } to sync physics with DOM
const bodiesDomPairs = [];

// Boundaries (Floor and Walls)
let ground, leftWall, rightWall;

function createBoundaries() {
    // Remove old boundaries if resizing
    if (ground) Composite.remove(world, [ground, leftWall, rightWall]);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const wallThickness = 1000; // Thick walls so things don't glitch through effortlessly

    // Floor at the bottom
    ground = Bodies.rectangle(width / 2, height + wallThickness / 2, width + 200, wallThickness, { 
        isStatic: true,
        label: 'ground'
    });

    // Invisible walls
    leftWall = Bodies.rectangle(0 - wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });
    rightWall = Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });

    Composite.add(world, [ground, leftWall, rightWall]);
}

// Init boundaries
createBoundaries();
window.addEventListener('resize', createBoundaries);

// Game Loop: Sync Physics -> DOM
function updateRender() {
    // Remove "dead" bodies (optional, if we wanted to despawn them)
    // For now, infinite pile!

    bodiesDomPairs.forEach(({ body, element }) => {
        const { x, y } = body.position;
        const angle = body.angle;
        
        // Translate center-based coordinates to top-left CSS transform
        // The particle size is 100px, so offset by 50
        element.style.transform = `translate(${x - 50}px, ${y - 50}px) rotate(${angle}rad)`;
    });

    requestAnimationFrame(updateRender);
}
updateRender();


// --- Click Logic ---
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
    // Start from center of circle (approx)
    const rect = circle.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Spawn slightly above center to look like it popped out
    createPhysicsCorn(centerX, centerY - 50);
});

function createPhysicsCorn(x, y) {
    const size = 100; 
    const radius = size / 2;

    // Create a circular body for the corn
    // Using a circle collider is faster and rolls nicely
    const body = Bodies.circle(x, y, radius * 0.4, { // Smaller radius for more visual overlap
        restitution: 0.4, // Bounciness (0-1)
        friction: 0.5,
        density: 0.002,
        angle: Math.random() * Math.PI * 2
    });

    // Add initial "Explosion" velocity
    // Random direction upwards
    const spread = 10; // X spread
    const upForce = 12 + Math.random() * 8; // Y force strength

    const velocityX = (Math.random() - 0.5) * spread; // -5 to 5
    const velocityY = -upForce; // Upwards

    Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });
    // Add some random rotation spin
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.5);

    // Create the visual element
    const element = document.createElement('div');
    element.classList.add('particle');
    // Prepend to body so it renders behind higher z-index like .circle
    // but better approach is strictly using z-index
    document.body.appendChild(element);

    // Add to world and tracker
    Composite.add(world, body);
    bodiesDomPairs.push({ body, element });
}
