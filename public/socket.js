// Socket connection and game networking code

// Socket connection
let socket;

// Initialize socket connection and set up event handlers
function initSocketConnection() {
    // Create socket.io connection
    socket = io();

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

        // Ensure canvas is properly sized when game starts
        resizeCanvas();
    });
    socket.on('notEnoughMana', () => {
        showNotification('Not enough mana!', 'error');
    });

    socket.on('cardOnCooldown', () => {
        showNotification('Card is on cooldown!', 'error');
    });
    socket.on('gameState', state => {
        // Update game state
        gameState = state;

        // Make sure canvas is properly sized before drawing
        resizeCanvas();

        // Update UI elements and redraw game
        updateUI();
        drawGame();
    });

    socket.on('gameOver', data => {
        logDebug(`Game over: ${data.result}`);
        resultText.textContent = data.result === 'win' ? '🍆Te lo culiaste!!🥵' : '💦💦Nooo! te culiaron 😢!';
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
// Player actions
function joinQueue() {
    if (socket && socket.connected) {
        socket.emit('joinQueue');
        waitingMessage.style.display = 'block';
    } else {
        logDebug('Cannot join queue: socket not connected');
    }
}

function playCard(cardIndex) {
    if (socket && socket.connected && gameId) {
        socket.emit('playCard', { gameId, cardIndex });
    } else {
        logDebug('Cannot play card: socket not connected or game not active');
    }
}