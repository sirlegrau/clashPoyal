// Main game initialization and DOM setup

// Canvas and game constants
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;

// Game state
let gameId = null;
let playerId = null;
let opponentId = null;
let playerPosition = null;
let gameState = null;

// Assets
const assets = {
    troop: new Image(),
    card1: new Image(),
    card2: new Image(),
    card3: new Image()
};
const troopImages = {
    soldier: new Image(),
    archer: new Image(),
    tank: new Image()
};

// DOM elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const menuScreen = document.getElementById('menu-screen');
const gameContainer = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over-screen');
const resultText = document.getElementById('result-text');
const playBtn = document.getElementById('play-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const waitingMessage = document.getElementById('waiting-message');
const cards = document.querySelectorAll('.card');
const playerHealthFill = document.getElementById('player-health-fill');
const opponentHealthFill = document.getElementById('opponent-health-fill');

// Debug logging
function logDebug(message) {
    console.log(`[DEBUG] ${message}`);
}

function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const toLoad = 7; // 4 original + 3 new troop images

        function assetLoaded() {
            loaded++;
            if (loaded === toLoad) {
                resolve();
            }
        }

        // Load original assets
        assets.troop.onload = assetLoaded;
        assets.troop.src = 'assets/troop.png';
        assets.troop.onerror = () => {
            console.warn("Failed to load troop image, using fallback");
            assetLoaded();
        };

        assets.card1.onload = assetLoaded;
        assets.card1.src = 'assets/card1.png';
        assets.card1.onerror = () => {
            console.warn("Failed to load card1 image, using fallback");
            assetLoaded();
        };

        assets.card2.onload = assetLoaded;
        assets.card2.src = 'assets/card2.png';
        assets.card2.onerror = () => {
            console.warn("Failed to load card2 image, using fallback");
            assetLoaded();
        };

        assets.card3.onload = assetLoaded;
        assets.card3.src = 'assets/card3.png';
        assets.card3.onerror = () => {
            console.warn("Failed to load card3 image, using fallback");
            assetLoaded();
        };

        // Load troop type images
        troopImages.soldier.onload = assetLoaded;
        troopImages.soldier.src = 'assets/soldier.png';
        troopImages.soldier.onerror = () => {
            console.warn("Failed to load soldier image, using fallback");
            assetLoaded();
        };

        troopImages.archer.onload = assetLoaded;
        troopImages.archer.src = 'assets/archer.png';
        troopImages.archer.onerror = () => {
            console.warn("Failed to load archer image, using fallback");
            assetLoaded();
        };

        troopImages.tank.onload = assetLoaded;
        troopImages.tank.src = 'assets/tank.png';
        troopImages.tank.onerror = () => {
            console.warn("Failed to load tank image, using fallback");
            assetLoaded();
        };

        // Set a timeout in case image loading takes too long
        setTimeout(() => {
            if (loaded < toLoad) {
                console.warn("Asset loading timed out, continuing anyway");
                resolve();
            }
        }, 3000);
    });
}

// Resize canvas to fit screen
function resizeCanvas() {
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight * 0.8; // Adjust height for gameplay canvas
    // Draw game elements with the proper scale
    if (gameState) {
        drawGame();
    }
}
window.addEventListener('resize', resizeCanvas);

// Initialize event listeners and UI
function setupUI() {
    // Set card images
    const cardElements = document.querySelectorAll('.card');
    cardElements.forEach((card, index) => {
        // Create an image container
        const imgContainer = document.createElement('div');
        imgContainer.className = 'card-image';

        // Set background image for each card
        const cardImg = new Image();
        cardImg.src = `assets/card${index + 1}.png`;
        imgContainer.appendChild(cardImg);

        // Insert the image container at the beginning of the card
        card.insertBefore(imgContainer, card.firstChild);

        // Set proper text content (remove default "Card X" text)
        const cardText = card.childNodes[1];
        if (cardText && cardText.nodeType === Node.TEXT_NODE) {
            card.removeChild(cardText);
        }
    });

    // Add event listeners for cards
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const cardIndex = parseInt(card.getAttribute('data-index'));
            logDebug(`Card clicked: ${cardIndex}`);

            if (gameId && playerId) {
                socket.emit('playCard', { gameId, cardIndex });
            }
        });
    });

    // Play button
    playBtn.addEventListener('click', () => {
        logDebug('Play button clicked');
        menuScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        socket.emit('joinQueue');
        waitingMessage.style.display = 'block';
    });

    // Play again button
    playAgainBtn.addEventListener('click', () => {
        logDebug('Play again button clicked');
        gameOverScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        socket.emit('joinQueue');
        waitingMessage.style.display = 'block';
    });
}

// Add CSS for troop type info
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
    .troop-type {
        position: absolute;
        bottom: 5px;
        left: 5px;
        right: 5px;
        text-align: center;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 1px black;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 2px;
        border-radius: 3px;
    }
    `;
    document.head.appendChild(style);
}

// Main initialization function
async function init() {
    logDebug('Initializing game');

    // Load assets first
    await loadAssets();
    logDebug('Assets loaded');

    // Set up UI and event listeners
    setupUI();

    // Add custom styles
    addCustomStyles();

    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize socket connection and handlers
    initSocketConnection();
}

// Start game when window loads
window.onload = init;