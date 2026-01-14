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
let autoPoppers = 0;
const autoPopperCost = 250;
let clickPower = 1;
const clickUpgradeCost = 100;

// Update UI including shop buttons
function updateUI() {
    counterElement.textContent = count;
    chillPointsElement.textContent = Math.floor(chillPoints);
    document.getElementById('auto-popper-count').textContent = autoPoppers;
    document.getElementById('click-power-count').textContent = clickPower;
    
    const buyBtn = document.getElementById('buy-auto-popper');
    if (chillPoints >= autoPopperCost) {
        buyBtn.classList.remove('disabled');
    } else {
        buyBtn.classList.add('disabled');
    }

    const buyClickBtn = document.getElementById('buy-click-upgrade');
    if (chillPoints >= clickUpgradeCost) {
        buyClickBtn.classList.remove('disabled');
    } else {
        buyClickBtn.classList.add('disabled');
    }
}

// Auto Popper Logic
let lastAutoPopTime = Date.now();

setInterval(() => {
    const now = Date.now();
    const delta = now - lastAutoPopTime;

    if (delta >= 1000) {
        const secondsPassed = Math.floor(delta / 1000);
        
        if (autoPoppers > 0) {
            chillPoints += autoPoppers * secondsPassed;
            updateUI();
        }
        
        // Advance time in 1000ms increments to keep remainder
        lastAutoPopTime += secondsPassed * 1000;
    }
}, 100);

// Shop Logic
document.getElementById('buy-auto-popper').addEventListener('click', () => {
    if (chillPoints >= autoPopperCost) {
        chillPoints -= autoPopperCost;
        autoPoppers++;
        updateUI();
        saveGame(); // Save on purchase
    }
});

document.getElementById('buy-click-upgrade').addEventListener('click', () => {
    if (chillPoints >= clickUpgradeCost) {
        chillPoints -= clickUpgradeCost;
        clickPower++;
        updateUI();
        saveGame(); // Save on purchase
    }
});

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
    playPopSound();
    count++;
    
    chillPoints += clickPower;
    updateUI();

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



// Audio Context for synthetic pop sound
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Audio State
// Master mute is now a derived state, not a source of truth
let isSfxMuted = false;
let isMusicMuted = false;
let sfxVolume = 0.5;
let musicVolume = 0.5;

// Music Setup
const rainAudio = new Audio('lofi-rain-lofi-music-458077.mp3');
rainAudio.loop = true;
rainAudio.volume = musicVolume;

// Elements
const soundToggleBtn = document.getElementById('sound-toggle');
const sfxMuteBtn = document.getElementById('sfx-mute-btn');
const musicMuteBtn = document.getElementById('music-mute-btn');
const sfxSlider = document.getElementById('sfx-slider');
const musicSlider = document.getElementById('music-slider');

function updateAudioState() {
    // Derived Master State
    const isMasterMuted = isSfxMuted && isMusicMuted;

    // Visuals for Master Toggle
    soundToggleBtn.textContent = isMasterMuted ? '🔇' : '🔊';
    soundToggleBtn.style.opacity = isMasterMuted ? '0.5' : '1';

    // Visuals for Mini Toggles
    sfxMuteBtn.textContent = isSfxMuted ? '🔇' : '🔊';
    sfxMuteBtn.style.opacity = isSfxMuted ? '0.5' : '1';

    musicMuteBtn.textContent = isMusicMuted ? '🔇' : '🎵';
    musicMuteBtn.style.opacity = isMusicMuted ? '0.5' : '1';

    // Music control (Only depends on individual state)
    if (!isMusicMuted && musicVolume > 0) {
        rainAudio.volume = musicVolume;
        if (rainAudio.paused) {
            rainAudio.play().catch(e => { /* Autoplay restriction */ });
        }
    } else {
        rainAudio.pause();
    }
}

// Master Mute Toggle logic:
// If EVERYTHING is muted -> Unmute everything
// If ANYTHING is playing -> Mute everything
soundToggleBtn.addEventListener('click', (e) => {
    const isMasterMuted = isSfxMuted && isMusicMuted;
    
    if (isMasterMuted) {
        isSfxMuted = false;
        isMusicMuted = false;
    } else {
        isSfxMuted = true;
        isMusicMuted = true;
    }
    
    updateAudioState();
    saveGame();
    e.stopPropagation();
});

// SFX Mute Toggle
sfxMuteBtn.addEventListener('click', (e) => {
    isSfxMuted = !isSfxMuted;
    updateAudioState();
    saveGame();
    e.stopPropagation();
});

// Music Mute Toggle
musicMuteBtn.addEventListener('click', (e) => {
    isMusicMuted = !isMusicMuted;
    updateAudioState();
    saveGame();
    e.stopPropagation();
});

// Sliders
sfxSlider.addEventListener('input', (e) => {
    sfxVolume = parseFloat(e.target.value);
    saveGame();
});

musicSlider.addEventListener('input', (e) => {
    musicVolume = parseFloat(e.target.value);
    updateAudioState();
    saveGame();
});
    
// Removed rainToggleBtn listeners as UI is replaced

const bgToggleBtn = document.getElementById('bg-toggle');
const colorDropdown = document.getElementById('color-dropdown');
const colorOptions = document.querySelectorAll('.color-option');

// Toggle dropdown visibility
bgToggleBtn.addEventListener('click', (e) => {
    colorDropdown.classList.toggle('hidden');
    e.stopPropagation();
});

// Handle color selection
colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        const color = e.target.getAttribute('data-color');
        document.body.style.backgroundColor = color;
        colorDropdown.classList.add('hidden'); // Close after selection
        e.stopPropagation();
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    if (!colorDropdown.classList.contains('hidden')) {
        colorDropdown.classList.add('hidden');
    }
    if (!settingsDropdown.classList.contains('hidden')) {
        settingsDropdown.classList.add('hidden');
    }
});


// --- Settings Logic ---
const settingsToggleBtn = document.getElementById('settings-toggle');
const settingsDropdown = document.getElementById('settings-dropdown');
const resetGameBtn = document.getElementById('reset-game-btn');

settingsToggleBtn.addEventListener('click', (e) => {
    settingsDropdown.classList.toggle('hidden');
    e.stopPropagation();
});

resetGameBtn.addEventListener('click', (e) => {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
        // Block auto-saving during the reload process
        isResetting = true;
        
        // Clear all data
        localStorage.removeItem('clickAndChillSave');
        location.reload(); // Reload page to reset state completely
    }
    e.stopPropagation();
});


function playPopSound() {
    // Attempt to start rain if enabled but not playing
    // Check specific Music Mute only (Master logic is now baked into isMusicMuted via UI)
    if (!isMusicMuted && musicVolume > 0 && rainAudio.paused) {
        rainAudio.play().catch(e => { /* Ignore pending play errors */ });
    }

    if (isSfxMuted) return;

    // Resume context if suspended (browser auto-play policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const t = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    
    // "Pop" frequency sweep
    // Slight randomization to make it sound organic
    const startFreq = 500 + Math.random() * 200; // Middle pitch range
    const endFreq = 80 + Math.random() * 50;
    
    oscillator.frequency.setValueAtTime(startFreq, t);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, t + 0.1);

    // Gain envelope (Click/Pop shape)
    gainNode.gain.setValueAtTime(0, t);
    // Use sfxVolume state
    const peakGain = 0.4 * sfxVolume;
    gainNode.gain.linearRampToValueAtTime(peakGain, t + 0.01); 
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.1); // Decay

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(t);
    oscillator.stop(t + 0.1);
}

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

// --- Save/Load System ---
let isResetting = false;

function saveGame() {
    if (isResetting) return;

    const gameData = {
        count: count,
        chillPoints: chillPoints,
        // Removed explicit isMuted as it is derived
        isSfxMuted: isSfxMuted,
        isMusicMuted: isMusicMuted,
        sfxVolume: sfxVolume,
        musicVolume: musicVolume,
        autoPoppers: autoPoppers,
        clickPower: clickPower,
        backgroundColor: document.body.style.backgroundColor
    };
    localStorage.setItem('clickAndChillSave', JSON.stringify(gameData));
}

function loadGame() {
    const savedData = localStorage.getItem('clickAndChillSave');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        
        // Restore values
        if (typeof gameData.count !== 'undefined') {
            count = gameData.count;
        }
        
        if (typeof gameData.chillPoints !== 'undefined') {
            chillPoints = gameData.chillPoints;
        }
        
        // Legacy support: if old save has isMuted=true but no individual settings, honor it
        if (typeof gameData.isMuted !== 'undefined' && gameData.isMuted) {
            isSfxMuted = true;
            isMusicMuted = true;
        }

        if (typeof gameData.isSfxMuted !== 'undefined') {
            isSfxMuted = gameData.isSfxMuted;
        }

        if (typeof gameData.isMusicMuted !== 'undefined') {
            isMusicMuted = gameData.isMusicMuted;
        }

        if (typeof gameData.sfxVolume !== 'undefined') {
            sfxVolume = gameData.sfxVolume;
            sfxSlider.value = sfxVolume;
        }

        if (typeof gameData.musicVolume !== 'undefined') {
            musicVolume = gameData.musicVolume;
            musicSlider.value = musicVolume;
        }

        if (gameData.backgroundColor) {
            document.body.style.backgroundColor = gameData.backgroundColor;
        }

        if (typeof gameData.autoPoppers !== 'undefined') {
            autoPoppers = gameData.autoPoppers;
        }

        if (typeof gameData.clickPower !== 'undefined') {
            clickPower = gameData.clickPower;
        }
        
        // Legacy support: map old keys if needed, or just let them reset
        // The old save used isSoundEnabled and isRainEnabled.
        // We can safely ignore them as the new UI overrides the logic.
        
        updateUI();
        updateAudioState();
    }
}

// Auto-save every 10 seconds
setInterval(saveGame, 10000);

// Save when closing
window.addEventListener('beforeunload', saveGame);

// Sync across tabs: Reload data when another tab saves
window.addEventListener('storage', (e) => {
    if (e.key === 'clickAndChillSave') {
        loadGame();
    }
});

// Load immediately on startup
loadGame();

// --- Custom Cursor Logic ---
const customCursor = document.getElementById('custom-cursor');
if (customCursor) {
    document.addEventListener('mousemove', (e) => {
        customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });

    document.addEventListener('mousedown', () => {
        customCursor.src = 'CursorActive.PNG';
    });

    document.addEventListener('mouseup', () => {
        customCursor.src = 'Cursor.PNG';
    });
}

