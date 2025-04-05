// Socket connection
const socket = io();

// Canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
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

// DOM elements
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

// Load assets
function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const toLoad = 4; // Updated number of assets to load

        function assetLoaded() {
            loaded++;
            if (loaded === toLoad) {
                resolve();
            }
        }

        // Load troop image
        assets.troop.onload = assetLoaded;
        assets.troop.src = 'assets/troop.png';
        assets.troop.onerror = () => {
            console.warn("Failed to load troop image, using fallback");
            assetLoaded();
        };

        // Load card images
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
    canvas.width = gameContainer.clientWidth;
    canvas.height = gameContainer.clientHeight;

    // Draw game elements with the proper scale
    if (gameState) {
        drawGame();
    }
}

// Initialize game
async function init() {
    logDebug('Initializing game');

    // Load assets first
    await loadAssets();
    logDebug('Assets loaded');
// Set card images after loading assets
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
    // Set up canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

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

    // Socket.io event handlers
    socket.on('connect', () => {
        logDebug(`Connected to server with socket ID: ${socket.id}`);
    });

    socket.on('waitingForOpponent', () => {
        logDebug('Waiting for opponent');
        waitingMessage.style.display = 'block';
    });

    socket.on('gameStart', data => {
        logDebug(`Game started: ${JSON.stringify(data)}`);
        waitingMessage.style.display = 'none';
        gameId = data.gameId;
        playerId = data.playerId;
        opponentId = data.opponentId;
        playerPosition = data.position;

        // Make sure game container is visible
        gameContainer.style.display = 'block';
    });

    socket.on('gameState', state => {
        // logDebug(`Game state updated`); // This would be too verbose
        gameState = state;
        updateUI();
        drawGame();
    });

    socket.on('gameOver', data => {
        logDebug(`Game over: ${data.result}`);
        resultText.textContent = data.result === 'win' ? 'You Win!' : 'You Lose!';
        gameContainer.style.display = 'none';
        gameOverScreen.style.display = 'flex';
    });

    socket.on('disconnect', () => {
        logDebug('Disconnected from server');
    });

    socket.on('error', (error) => {
        logDebug(`Socket error: ${error}`);
    });
}

function updateUI() {
    if (!gameState || !playerId || !opponentId || !gameState.players) return;

    const player = gameState.players[playerId];
    const opponent = gameState.players[opponentId];

    if (!player || !opponent) return;

    // Update health bars
    const playerHealthPercent = (player.baseHealth / 500) * 100;
    const opponentHealthPercent = (opponent.baseHealth / 500) * 100;

    playerHealthFill.style.width = `${playerHealthPercent}%`;
    opponentHealthFill.style.width = `${opponentHealthPercent}%`;

    // Update card cooldowns
    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            const cooldownEl = cards[index].querySelector('.card-cooldown');
            const cooldownPercent = (card.cooldown / 3000) * 100;
            cooldownEl.style.height = `${cooldownPercent}%`;

            // Visual feedback for available cards
            if (card.cooldown === 0) {
                cards[index].style.opacity = '1';
                cards[index].style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.7)';
            } else {
                cards[index].style.opacity = '0.7';
                cards[index].style.boxShadow = '0 3px 6px rgba(0,0,0,0.16)';
            }
        }
    });
}

function drawGame() {
    if (!ctx || !gameState) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factor
    const scaleX = canvas.width / GAME_WIDTH;
    const scaleY = canvas.height / GAME_HEIGHT;

    // Draw bases
    for (const playerKey in gameState.players) {
        const player = gameState.players[playerKey];
        const baseX = player.basePosition.x * scaleX;
        const baseY = player.basePosition.y * scaleY;
        const baseSize = 100 * Math.min(scaleX, scaleY);

        // Draw base
        if (playerKey === playerId) {
            ctx.fillStyle = '#27ae60'; // Green for player
        } else {
            ctx.fillStyle = '#e74c3c'; // Red for opponent
        }

        ctx.beginPath();
        ctx.arc(baseX, baseY, baseSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw base border
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3 * Math.min(scaleX, scaleY);
        ctx.stroke();

        // Draw health indicator
        ctx.fillStyle = '#ffffff';
        ctx.font = `${16 * Math.min(scaleX, scaleY)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(player.baseHealth), baseX, baseY);

        // Draw troops
        if (player.troops && Array.isArray(player.troops)) {
            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;

                const troopX = troop.position.x * scaleX;
                const troopY = troop.position.y * scaleY;
                const troopSize = 30 * Math.min(scaleX, scaleY);

                if (playerKey === playerId) {
                    // Draw troop image if loaded, otherwise fallback to circle
                    if (assets.troop.complete && assets.troop.naturalWidth !== 0) {
                        ctx.drawImage(assets.troop,
                            troopX - troopSize / 2,
                            troopY - troopSize / 2,
                            troopSize,
                            troopSize);
                    } else {
                        ctx.fillStyle = '#2980b9'; // Blue for player troops
                        ctx.beginPath();
                        ctx.arc(troopX, troopY, troopSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    ctx.fillStyle = '#c0392b'; // Dark red for opponent troops
                    ctx.beginPath();
                    ctx.arc(troopX, troopY, troopSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw troop border
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
                ctx.beginPath();
                ctx.arc(troopX, troopY, troopSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Draw health bar
                const healthBarWidth = troopSize;
                const healthBarHeight = 5 * Math.min(scaleX, scaleY);
                const healthPercent = troop.health / 100;

                // Background
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(troopX - healthBarWidth / 2, troopY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth, healthBarHeight);

                // Health fill
                ctx.fillStyle = '#27ae60';
                ctx.fillRect(troopX - healthBarWidth / 2, troopY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth * healthPercent, healthBarHeight);

                // Show attack animation
                if (troop.attacking) {
                    ctx.strokeStyle = '#f39c12';
                    ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
                    ctx.beginPath();
                    ctx.arc(troopX, troopY, troopSize, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }
    }

    // Draw player position indicators
    const fontSize = 14 * Math.min(scaleX, scaleY);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';

    if (playerPosition === 'bottom') {
        ctx.fillText('YOU', GAME_WIDTH/2 * scaleX, (GAME_HEIGHT - 20) * scaleY);
        ctx.fillText('OPPONENT', GAME_WIDTH/2 * scaleX, 20 * scaleY);
    } else {
        ctx.fillText('YOU', GAME_WIDTH/2 * scaleX, 20 * scaleY);
        ctx.fillText('OPPONENT', GAME_WIDTH/2 * scaleX, (GAME_HEIGHT - 20) * scaleY);
    }
}

// Start game
window.onload = init;