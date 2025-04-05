const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const troopConfig = require('./troopConfig');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

// Game constants
const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const BASE_SIZE = 100;
const BASE_HEALTH = 500;
const CARD_COOLDOWN = 3000; // 3 seconds

// Game state
const games = {};
const playerQueue = [];

function createGame(player1Id, player2Id) {
    const gameId = `game_${Date.now()}`;

    const game = {
        id: gameId,
        players: {
            [player1Id]: {
                id: player1Id,
                basePosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - BASE_SIZE / 2 },
                baseHealth: BASE_HEALTH,
                troops: [],
                cards: [
                    { id: 'card1', cooldown: 0, troopType: 'soldier' },
                    { id: 'card2', cooldown: 0, troopType: 'archer' },
                    { id: 'card3', cooldown: 0, troopType: 'tank' }
                ]
            },
            [player2Id]: {
                id: player2Id,
                basePosition: { x: GAME_WIDTH / 2, y: BASE_SIZE / 2 },
                baseHealth: BASE_HEALTH,
                troops: [],
                cards: [
                    { id: 'card1', cooldown: 0, troopType: 'soldier' },
                    { id: 'card2', cooldown: 0, troopType: 'archer' },
                    { id: 'card3', cooldown: 0, troopType: 'tank' }
                ]
            }
        },
        active: true
    };

    games[gameId] = game;

    // Create room for this game to send updates more efficiently
    io.sockets.sockets.get(player1Id)?.join(gameId);
    io.sockets.sockets.get(player2Id)?.join(gameId);

    // Notify players they've been matched
    io.to(player1Id).emit('gameStart', {
        gameId,
        playerId: player1Id,
        opponentId: player2Id,
        position: 'bottom'
    });

    io.to(player2Id).emit('gameStart', {
        gameId,
        playerId: player2Id,
        opponentId: player1Id,
        position: 'top'
    });

    // Start game loop
    startGameLoop(gameId);

    return game;
}

function startGameLoop(gameId) {
    const game = games[gameId];
    if (!game) return;

    const gameInterval = setInterval(() => {
        if (!game || !game.active) {
            clearInterval(gameInterval);
            return;
        }

        // Update all troops
        Object.keys(game.players).forEach(playerId => {
            const player = game.players[playerId];
            if (!player) return;

            // Decrease cooldowns
            player.cards.forEach(card => {
                if (card.cooldown > 0) {
                    card.cooldown = Math.max(0, card.cooldown - 100);
                }
            });

            // Update troop positions and handle attacks
            player.troops = player.troops.filter(troop => troop && troop.health > 0);
            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;

                const troopStats = troopConfig.getTroopConfigByTypeId(troop.type);

                // Find closest enemy or enemy base
                let target = null;
                let minDistance = Infinity;

                // Find opponent
                const opponentId = Object.keys(game.players).find(id => id !== playerId);
                if (!opponentId) return;

                const opponent = game.players[opponentId];
                if (!opponent || !opponent.basePosition) return;

                // Check distance to enemy base
                const distToBase = calculateDistance(troop.position, opponent.basePosition);
                if (distToBase < minDistance) {
                    minDistance = distToBase;
                    target = { type: 'base', id: opponentId };
                }

                // Check distance to enemy troops
                if (opponent.troops && Array.isArray(opponent.troops)) {
                    opponent.troops.forEach(enemyTroop => {
                        if (!enemyTroop || !enemyTroop.position) return;

                        const dist = calculateDistance(troop.position, enemyTroop.position);
                        if (dist < minDistance) {
                            minDistance = dist;
                            target = { type: 'troop', id: enemyTroop.id };
                        }
                    });
                }

                // Attack or move
                if (target && minDistance <= troopStats.range) {
                    // Attack
                    troop.attacking = true;

                    // Check if troop can attack based on attack speed
                    const now = Date.now();
                    if (!troop.lastAttackTime || (now - troop.lastAttackTime) >= (1000 / troopStats.attackSpeed)) {
                        troop.lastAttackTime = now;

                        if (target.type === 'base') {
                            opponent.baseHealth -= troopStats.attack / 10; // Reduced damage to base for balance
                            if (opponent.baseHealth <= 0) {
                                endGame(gameId, playerId);
                            }
                        } else if (opponent.troops && Array.isArray(opponent.troops)) {
                            const enemyTroopIndex = opponent.troops.findIndex(t => t && t.id === target.id);
                            if (enemyTroopIndex !== -1) {
                                opponent.troops[enemyTroopIndex].health -= troopStats.attack;
                            }
                        }
                    }
                } else {
                    // Move towards target
                    troop.attacking = false;

                    let targetPosition;
                    if (target) {
                        if (target.type === 'base') {
                            targetPosition = opponent.basePosition;
                        } else if (opponent.troops && Array.isArray(opponent.troops)) {
                            const targetTroop = opponent.troops.find(t => t && t.id === target.id);
                            if (targetTroop) {
                                targetPosition = targetTroop.position;
                            }
                        }
                    }

                    // If no valid target found, move towards enemy base
                    if (!targetPosition) {
                        targetPosition = opponent.basePosition;
                    }

                    // Move towards target
                    const dx = targetPosition.x - troop.position.x;
                    const dy = targetPosition.y - troop.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0) {
                        troop.position.x += (dx / distance) * troopStats.speed;
                        troop.position.y += (dy / distance) * troopStats.speed;
                    }
                }
            });
        });

        // Emit game state to both players
        io.to(gameId).emit('gameState', game);

    }, 100); // Update 10 times per second
}

function calculateDistance(pos1, pos2) {
    if (!pos1 || !pos2) return Infinity;
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function endGame(gameId, winnerId) {
    const game = games[gameId];
    if (!game || !game.active) return;

    game.active = false;

    // Find loser ID
    const loserId = Object.keys(game.players).find(id => id !== winnerId);

    // Notify players
    io.to(winnerId).emit('gameOver', { result: 'win' });
    io.to(loserId).emit('gameOver', { result: 'lose' });

    // Clean up game after delay
    setTimeout(() => {
        delete games[gameId];
    }, 5000);
}

// Socket connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Join matchmaking queue
    socket.on('joinQueue', () => {
        console.log(`Player ${socket.id} joined queue`);

        // Check if player is already in queue
        if (!playerQueue.includes(socket.id)) {
            playerQueue.push(socket.id);
        }

        // Check if we can match players
        if (playerQueue.length >= 2) {
            const player1Id = playerQueue.shift();
            const player2Id = playerQueue.shift();

            // Make sure both players are still connected
            if (io.sockets.sockets.has(player1Id) && io.sockets.sockets.has(player2Id)) {
                createGame(player1Id, player2Id);
            } else {
                // If one disconnected, put the other back in queue
                if (io.sockets.sockets.has(player1Id)) {
                    playerQueue.push(player1Id);
                    io.to(player1Id).emit('waitingForOpponent');
                }
                if (io.sockets.sockets.has(player2Id)) {
                    playerQueue.push(player2Id);
                    io.to(player2Id).emit('waitingForOpponent');
                }
            }
        } else {
            socket.emit('waitingForOpponent');
        }
    });

    // Player played a card
    socket.on('playCard', ({ gameId, cardIndex }) => {
        console.log(`Player ${socket.id} played card ${cardIndex} in game ${gameId}`);

        const game = games[gameId];
        if (!game || !game.active) {
            console.log("Game not found or not active");
            return;
        }

        const player = game.players[socket.id];
        if (!player) {
            console.log("Player not found in game");
            return;
        }

        const card = player.cards[cardIndex];
        if (!card || card.cooldown > 0) {
            console.log("Card not available or on cooldown");
            return;
        }

        // Apply cooldown
        card.cooldown = CARD_COOLDOWN;

        // Get troop type from card
        const troopType = card.troopType;
        const troopStats = troopConfig.getTroopConfigByTypeId(troopType);

        // Spawn a troop near the player's base
        const troopId = `troop_${socket.id}_${Date.now()}`;
        const isFirstPlayer = socket.id === Object.keys(game.players)[0];

        // Randomize spawn position slightly around the base
        const spawnPos = {
            x: player.basePosition.x + (Math.random() * 280 - 40),
            y: player.basePosition.y + (isFirstPlayer ? -50 : 50)
        };

        const newTroop = {
            id: troopId,
            type: troopType,
            position: spawnPos,
            health: troopStats.health,
            attacking: false,
            lastAttackTime: 0
        };

        player.troops.push(newTroop);

        // Send immediate update to make spawning feel responsive
        io.to(gameId).emit('gameState', game);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        // Remove from queue if waiting
        const queueIndex = playerQueue.indexOf(socket.id);
        if (queueIndex !== -1) {
            playerQueue.splice(queueIndex, 1);
        }

        // End any active game
        for (const gameId in games) {
            const game = games[gameId];
            if (game && game.active && game.players[socket.id]) {
                const opponentId = Object.keys(game.players).find(id => id !== socket.id);
                if (opponentId) {
                    endGame(gameId, opponentId);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});