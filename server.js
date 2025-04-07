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
const BASE_SIZE = 150;
const BASE_HEALTH = 100;

// Base attack constants
const BASE_ATTACK_RANGE = 230; // Range in game units
const BASE_ATTACK_DAMAGE = 3; // Damage per attack
const BASE_ATTACK_SPEED = 1.2; // Attacks per second

// Game state
const games = {};
const playerQueue = [];
const CARD_POOL = [
    { id: 'card1',troopType: 'escroto', manaCost: 1 },
    { id: 'card2',troopType: 'archer', manaCost: 5 },
    { id: 'card3',troopType: 'tank', manaCost: 8 },
    { id: 'card4',troopType: 'berserker', manaCost: 4 },
    { id: 'card5',troopType: 'knight', manaCost: 3 },
    { id: 'card6',troopType: 'mage', manaCost: 7 }
];

function getInitialCards() {
    // Return 3 copies of the escroto card
    return Array(3).fill({ id: 'card1', troopType: 'escroto', manaCost: 1 });
}

// Modify the drawNewCard function to avoid giving the same card that was just played
function drawNewCard(playedCardId) {
    // Filter out the card that was just played
    const availableCards = CARD_POOL.filter(card => card.id !== playedCardId);

    // Return a random card from the filtered pool
    return availableCards[Math.floor(Math.random() * availableCards.length)];
}

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
                mana: 5, // Starting mana
                maxMana: 10, // Maximum mana
                lastManaUpdateTime: Date.now(),
                lastBaseAttackTime: Date.now(), // Track last base attack time
                cards: getInitialCards()
            },
            [player2Id]: {
                id: player2Id,
                basePosition: { x: GAME_WIDTH / 2, y: BASE_SIZE / 2 },
                baseHealth: BASE_HEALTH,
                troops: [],
                mana: 5, // Starting mana
                maxMana: 10, // Maximum mana
                lastManaUpdateTime: Date.now(),
                lastBaseAttackTime: Date.now(), // Track last base attack time
                cards: getInitialCards()
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

            // Generate mana - 1 per second
            const now = Date.now();
            const elapsedTime = now - player.lastManaUpdateTime;
            const manaToAdd = (elapsedTime / 1000) / 2; // 1 mana per second (allow fractional)

            if (elapsedTime > 0) {
                player.mana = Math.min(player.maxMana, player.mana + manaToAdd);
                player.lastManaUpdateTime = now; // Reset timer on every update
            }

            // Remove dead troops
            player.troops = player.troops.filter(troop => troop && troop.health > 0);

            // Find opponent
            const opponentId = Object.keys(game.players).find(id => id !== playerId);
            if (!opponentId) return;

            const opponent = game.players[opponentId];
            if (!opponent || !opponent.basePosition) return;

            // BASE ATTACKS ENEMY TROOPS
            // Check if it's time for the base to attack
            const attackElapsedTime = now - player.lastBaseAttackTime;
            const attackCooldown = 1000 / BASE_ATTACK_SPEED; // Convert attacks per second to milliseconds

            if (attackElapsedTime >= attackCooldown) {
                // Find enemy troops in range of the base
                const enemyTroopsInRange = opponent.troops.filter(troop => {
                    if (!troop || !troop.position) return false;
                    return calculateDistance(player.basePosition, troop.position) <= BASE_ATTACK_RANGE;
                });

                // If there are enemy troops in range, attack the closest one
                if (enemyTroopsInRange.length > 0) {
                    // Sort by distance to find closest
                    enemyTroopsInRange.sort((a, b) => {
                        const distA = calculateDistance(player.basePosition, a.position);
                        const distB = calculateDistance(player.basePosition, b.position);
                        return distA - distB;
                    });

                    // Attack the closest enemy troop
                    const targetTroop = enemyTroopsInRange[0];
                    targetTroop.health -= BASE_ATTACK_DAMAGE;

                    // Mark the troop as being targeted by the base
                    targetTroop.targetedByBase = true;

                    // Reset the base attack timer
                    player.lastBaseAttackTime = now;

                    // Add a base attack event for visualization
                    player.baseAttacking = {
                        target: targetTroop.id,
                        timestamp: now
                    };
                } else {
                    // No enemies in range, clear base attacking state
                    player.baseAttacking = null;
                }
            } else {
                // Decay base attack visualization after 200ms
                if (player.baseAttacking && now - player.baseAttacking.timestamp > 200) {
                    player.baseAttacking = null;
                }
            }

            // Replace the troop update code in the gameLoop with this version
// Find the section in startGameLoop function in server.js that updates troops

// Update each troop
            // Update each troop
            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;

                // Use troop's own stats if available (from level scaling)
                const troopAttack = troop.attack || troopConfig.getTroopConfigByTypeId(troop.type).attack;
                const troopRange = troop.range || troopConfig.getTroopConfigByTypeId(troop.type).range;
                const troopSpeed = troop.speed || troopConfig.getTroopConfigByTypeId(troop.type).speed;
                const troopAttackSpeed = troop.attackSpeed || troopConfig.getTroopConfigByTypeId(troop.type).attackSpeed;

                // Modified targeting logic
                let targetPosition;
                let targetExists = false;

                if (troop.attacking && troop.currentTargetType === 'base') {
                    // If already attacking the base, don't change targets
                    targetExists = true;
                    targetPosition = opponent.basePosition;
                } else if (troop.currentTargetType === 'troop') {
                    // Check if targeted troop still exists
                    const targetTroop = opponent.troops.find(t => t && t.id === troop.currentTarget && t.health > 0);
                    if (targetTroop) {
                        targetExists = true;
                        targetPosition = targetTroop.position;
                    } else {
                        // Target troop is dead, clear target to find a new one
                        troop.currentTarget = null;
                        troop.currentTargetType = null;
                        // We'll find a new target below
                    }
                }

                // If not locked onto a target yet, find the closest
                if (!targetExists) {
                    let minDistance = Infinity;

                    // Check distance to enemy troops first
                    let closestTroop = null;
                    opponent.troops.forEach(enemyTroop => {
                        if (!enemyTroop || !enemyTroop.position || enemyTroop.health <= 0) return;

                        const dist = calculateDistance(troop.position, enemyTroop.position);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestTroop = enemyTroop;
                        }
                    });

                    // If an enemy troop is in range, target it
                    if (closestTroop && minDistance <= troopRange * 2.66) {
                        targetExists = true;
                        targetPosition = closestTroop.position;
                        troop.currentTarget = closestTroop.id;
                        troop.currentTargetType = 'troop';
                    } else {
                        // Otherwise, target the enemy base
                        targetExists = true;
                        targetPosition = opponent.basePosition;
                        troop.currentTarget = opponentId;
                        troop.currentTargetType = 'base';
                    }
                }

                // Calculate distance to target
                const distanceToTarget = calculateDistance(troop.position, targetPosition);

                // Attack or move
                if (targetExists && distanceToTarget <= troopRange) {
                    // In range to attack
                    troop.attacking = true;

                    // Check attack cooldown
                    const now = Date.now();
                    if (!troop.lastAttackTime || (now - troop.lastAttackTime) >= (1000 / troopAttackSpeed)) {
                        troop.lastAttackTime = now;

                        if (troop.currentTargetType === 'base') {
                            // Attack enemy base
                            opponent.baseHealth -= Math.ceil(troopAttack / 2);
                            if (opponent.baseHealth <= 0) {
                                endGame(gameId, playerId);
                            }
                        } else if (troop.currentTargetType === 'troop') {
                            // Attack enemy troop
                            const enemyTroopIndex = opponent.troops.findIndex(t => t && t.id === troop.currentTarget);
                            if (enemyTroopIndex !== -1) {
                                opponent.troops[enemyTroopIndex].health -= troopAttack;
                            }
                        }
                    }
                } else {
                    // Move towards target
                    troop.attacking = false;

                    // Calculate direction
                    const dx = targetPosition.x - troop.position.x;
                    const dy = targetPosition.y - troop.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance > 0) {
                        troop.position.x += (dx / distance) * troopSpeed;
                        troop.position.y += (dy / distance) * troopSpeed;
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

    // Add this to server.js in the 'playCard' socket handler

// Player played a card
    // In server.js, modify the 'playCard' socket handler where stats are calculated

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
        if (!card) {
            console.log("Card not found");
            return;
        }

        // Check if player has enough mana
        if (player.mana < card.manaCost) {
            console.log("💦 No tienes suficiente cum!");
            socket.emit('notEnoughMana');
            return;
        }

        // Deduct mana cost
        player.mana -= card.manaCost;

        // Get troop type from card
        const troopType = card.troopType;

        // LEVEL UP the troop type for this player
        const newLevel = troopConfig.levelUpTroop(socket.id, troopType);
        console.log(`Player ${socket.id} leveled up ${troopType} to level ${newLevel}`);

        // Get base troop stats
        const baseTroopStats = troopConfig.getTroopConfigByTypeId(troopType);

        // Calculate level-scaled stats with 10% bonus per level
        // BUT DON'T scale range - keep it at base value
        const health = troopConfig.getScaledTroopStat(baseTroopStats.health, newLevel);
        const attack = troopConfig.getScaledTroopStat(baseTroopStats.attack, newLevel);
        const range = baseTroopStats.range; // Keep range constant regardless of level
        const speed = troopConfig.getScaledTroopStat(baseTroopStats.speed, newLevel);
        const attackSpeed = troopConfig.getScaledTroopStat(baseTroopStats.attackSpeed, newLevel);

        // Spawn a troop near the player's base
        const troopId = `troop_${socket.id}_${Date.now()}`;
        const isFirstPlayer = socket.id === Object.keys(game.players)[0];

        const spawnPos = {
            x: player.basePosition.x + (Math.random() * 300 - 40),
            y: player.basePosition.y + (isFirstPlayer ? -50 : 50)
        };

        const newTroop = {
            id: troopId,
            type: troopType,
            level: newLevel, // Store the level
            position: spawnPos,
            health: health,
            maxHealth: health, // Add maxHealth to track percentage correctly
            attack: attack,
            range: range,
            speed: speed,
            attackSpeed: attackSpeed,
            attacking: false,
            lastAttackTime: 0,
            currentTarget: null,
            currentTargetType: null
        };

        player.troops.push(newTroop);
        console.log(newTroop);
        // Store the played card's ID before replacing it
        const playedCardId = card.id;

        // Draw a new card to replace the played one, ensuring it's different
        player.cards[cardIndex] = drawNewCard(playedCardId);

        // Send immediate update to make spawning feel responsive
        io.to(gameId).emit('gameState', game);
    });
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