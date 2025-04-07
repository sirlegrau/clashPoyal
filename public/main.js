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
        card3: new Image(),
        playerBase: new Image(),
        opponentBase: new Image()
    };
    const troopImages = {
        escroto: new Image(),
        archer: new Image(),
        tank: new Image(),

    
        enemyEscroto: new Image(),
        enemyArcher: new Image(),
        enemyTank: new Image()
    };
    
    // DOM elements
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    const menuScreen = document.getElementById('menu-screen');
    const gameContainer = document.getElementById('game-container');
    const gameOverScreen = document.getElementById('game-over-screen');
    const resultText = document.getElementById('result-text');
    const playBtn = document.getElementById('play-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const waitingMessage = document.getElementById('waiting-message');
    const cards = document.querySelectorAll('.card');
    
    // Debug logging
    function logDebug(message) {
        console.log(`[DEBUG] ${message}`);
    }
    
    function loadAssets() {
        return new Promise((resolve) => {
            let loaded = 0;
            const toLoad = 11; // 4 original + 3 troop images + 2 base images + 2 enemy troop images
    
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
            troopImages.escroto.onload = assetLoaded;
            troopImages.escroto.src = 'assets/escroto.png';
            troopImages.escroto.onerror = () => {
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
    
            // Load enemy troop images (same assets, but separate instances for potential tinting)
            troopImages.enemyEscroto.onload = assetLoaded;
            troopImages.enemyEscroto.src = 'assets/escroto.png';
            troopImages.enemyEscroto.onerror = () => {
                console.warn("Failed to load enemy soldier image, using fallback");
                assetLoaded();
            };
    
            troopImages.enemyArcher.onload = assetLoaded;
            troopImages.enemyArcher.src = 'assets/archer.png';
            troopImages.enemyArcher.onerror = () => {
                console.warn("Failed to load enemy archer image, using fallback");
                assetLoaded();
            };
    
            troopImages.enemyTank.onload = assetLoaded;
            troopImages.enemyTank.src = 'assets/tank.png';
            troopImages.enemyTank.onerror = () => {
                console.warn("Failed to load enemy tank image, using fallback");
                assetLoaded();
            };
    
            // Load base images
            assets.playerBase.onload = assetLoaded;
            assets.playerBase.src = 'assets/player-base.png';
            assets.playerBase.onerror = () => {
                console.warn("Failed to load player base image, using fallback");
                assetLoaded();
            };
    
            assets.opponentBase.onload = assetLoaded;
            assets.opponentBase.src = 'assets/opponent-base.png';
            assets.opponentBase.onerror = () => {
                console.warn("Failed to load opponent base image, using fallback");
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
        const cardContainer = document.querySelector('.card-container');

        // Get the card container height
        const cardContainerHeight = cardContainer.clientHeight;

        // Calculate the available space
        const availableWidth = gameContainer.clientWidth;
        const availableHeight = gameContainer.clientHeight - cardContainerHeight;

        // Use fixed dimensions for internal canvas resolution
        const INTERNAL_WIDTH = GAME_WIDTH;  // Use your existing GAME_WIDTH constant (600)
        const INTERNAL_HEIGHT = GAME_HEIGHT; // Use your existing GAME_HEIGHT constant (800)

        // Set canvas internal dimensions to fixed size
        canvas.width = INTERNAL_WIDTH;
        canvas.height = INTERNAL_HEIGHT;

        // Calculate scale to fit while maintaining aspect ratio
        const scaleX = availableWidth / INTERNAL_WIDTH;
        const scaleY = availableHeight / INTERNAL_HEIGHT;
        const scale = Math.min(scaleX, scaleY);

        // Apply scale using CSS
        canvas.style.width = `${INTERNAL_WIDTH * scale}px`;
        canvas.style.height = `${INTERNAL_HEIGHT * scale}px`;

        // Center the canvas horizontally
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.transform = 'translateX(-50%)';
        canvas.style.top = '0';

        // Store the scale for use in event handlers
        canvas.dataset.scale = scale;

        // Redraw game elements
        if (gameState) {
            drawGame();
        }
    }
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
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.textContent = message;
    
        document.body.appendChild(notification);
    
        // Animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    
        // Auto remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }
    // Add CSS for troop type info
    function addCustomStyles() {
        const style = document.createElement('style');
        style.textContent = `
    /* Your existing styles... */
    #game-canvas {
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-crisp-edges;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
    }
    
    .game-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-50px);
        padding: 10px 20px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        border-radius: 5px;
        z-index: 1000;
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .game-notification.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    
    .game-notification.error {
        background-color: rgba(231, 76, 60, 0.9);
    }
    
    .game-notification.success {
        background-color: rgba(46, 204, 113, 0.9);
    }
    
    #game-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
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
        setupModal();
        // Set up canvas
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    
        // Initialize socket connection and handlers
        initSocketConnection();
    }
    // Start game when window loads
    window.onload = init;
    function getCanvasCoordinates(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scale = parseFloat(canvas.dataset.scale) || 1;

        return {
            x: (event.clientX - rect.left) / scale,
            y: (event.clientY - rect.top) / scale
        };
    }
    function setupModal() {
        const poyeriaBtn = document.getElementById('poyeria-btn');
        const cardModal = document.getElementById('card-modal');
        const closeModal = document.querySelector('.close-modal');

        // Open modal when Poyería button is clicked
        poyeriaBtn.addEventListener('click', () => {
            cardModal.style.display = 'block';
        });

        // Close modal when X is clicked
        closeModal.addEventListener('click', () => {
            cardModal.style.display = 'none';
        });

        // Close modal when clicking outside the modal content
        window.addEventListener('click', (event) => {
            if (event.target === cardModal) {
                cardModal.style.display = 'none';
            }
        });
        generateCardCatalog();
    }
    function generateCardCatalog() {
        const cardCatalog = document.querySelector('.card-catalog');

        // Clear existing cards
        cardCatalog.innerHTML = '';

        // Get all troop types from TROOP_CONFIG
        Object.keys(TROOP_CONFIG.types).forEach(troopType => {
            const troopData = TROOP_CONFIG.types[troopType];

            // Create card element
            const card = document.createElement('div');
            card.className = 'catalog-card';

            // Create image container
            const imageContainer = document.createElement('div');
            imageContainer.className = 'catalog-card-image';

            // Create image element
            const image = document.createElement('img');
            image.src = `assets/${troopType}.png`;
            image.alt = troopType;
            image.onerror = () => {
                // Fallback if image doesn't load
                image.src = 'assets/troop.png';
            };

            // Create info container
            const infoContainer = document.createElement('div');
            infoContainer.className = 'catalog-card-info';

            // Create heading
            const heading = document.createElement('h3');
            heading.textContent = troopType.charAt(0).toUpperCase() + troopType.slice(1);

            // Create health info
            const health = document.createElement('p');
            health.textContent = `Vida: ${troopData.maxHealth}`;

            // Create description (you can add more detailed descriptions later)
            const description = document.createElement('p');
            switch (troopType) {
                case 'escroto':
                    description.textContent = 'Un escroto que solo hace bulto.';
                    break;
                case 'tank':
                    description.textContent = 'Conocido como general titagorda.';
                    break;
                case 'archer':
                    description.textContent = 'Escupe pequeñas cantidades de cum a gran velocidad.';
                    break;
                case 'berserker':
                    description.textContent = 'Tiene un objetivo, fecundar, y lo va a conseguir.';
                    break;
                case 'knight':
                    description.textContent = 'Nose tío, average size 18cms.';
                    break;
                case 'mage':
                    description.textContent = 'Vacía los testículos al completo con una gran salpicadura lechosa.';
                    break;
                case 'shuffler':
                    description.textContent = 'Baile de pitos, consigue 3 poyas aleatorias.';
                    break;
                default:
                    description.textContent = 'A mysterious troop with unknown abilities.';
            }

            // Assemble the card
            imageContainer.appendChild(image);
            infoContainer.appendChild(heading);
            infoContainer.appendChild(health);
            infoContainer.appendChild(description);

            card.appendChild(imageContainer);
            card.appendChild(infoContainer);

            // Add card to catalog
            cardCatalog.appendChild(card);
        });
    }