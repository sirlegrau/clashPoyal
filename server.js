const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const troopConfig = require('./troopConfig');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static('public'));

const GAME_WIDTH = 600;
const GAME_HEIGHT = 800;
const BASE_SIZE = 150;
const BASE_HEALTH = 100;
const BASE_ATTACK_RANGE = 230;
const BASE_ATTACK_DAMAGE = 3;
const BASE_ATTACK_SPEED = 1.2;

const games = {};
const playerQueue = [];
// Use card pool directly from troopConfig
const CARD_POOL = troopConfig.CARD_POOL;

function getInitialCards() {
    // Return 4 copies of the first card (typically escroto)
    const initialCard = CARD_POOL.find(card => card.id === 'escroto') || CARD_POOL[0];
    return Array(4).fill(initialCard);
}

function drawNewCard(playedCardId) {
    const availableCards = CARD_POOL.filter(card => card.id !== playedCardId);
    return availableCards[Math.floor(Math.random() * availableCards.length)];
}

function getThreeRandomCards(lastPlayedCardId = null) {
    // Create a filtered pool excluding the last played card (if one exists)
    const availableCards = lastPlayedCardId
        ? CARD_POOL.filter(card => card.id !== lastPlayedCardId)
        : CARD_POOL;

    // Generate 4 random cards from the available pool
    const randomCards = [];

    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * availableCards.length);
        randomCards.push(availableCards[randomIndex]);
    }

    return randomCards;
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
                mana: 5,
                maxMana: 10,
                lastManaUpdateTime: Date.now(),
                lastBaseAttackTime: Date.now(),
                cards: getInitialCards()
            },
            [player2Id]: {
                id: player2Id,
                basePosition: { x: GAME_WIDTH / 2, y: BASE_SIZE / 2 },
                baseHealth: BASE_HEALTH,
                troops: [],
                mana: 5,
                maxMana: 10,
                lastManaUpdateTime: Date.now(),
                lastBaseAttackTime: Date.now(),
                cards: getInitialCards()
            }
        },
        active: true
    };
    games[gameId] = game;

    io.sockets.sockets.get(player1Id)?.join(gameId);
    io.sockets.sockets.get(player2Id)?.join(gameId);

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

        Object.keys(game.players).forEach(playerId => {
            const player = game.players[playerId];
            if (!player) return;

            const now = Date.now();
            const elapsedTime = now - player.lastManaUpdateTime;
            const manaToAdd = (elapsedTime / 1000) / 2;

            if (elapsedTime > 0) {
                player.mana = Math.min(player.maxMana, player.mana + manaToAdd);
                player.lastManaUpdateTime = now;
            }

            player.troops = player.troops.filter(troop => troop && troop.health > 0);

            const opponentId = Object.keys(game.players).find(id => id !== playerId);
            if (!opponentId) return;

            const opponent = game.players[opponentId];
            if (!opponent || !opponent.basePosition) return;

            const attackElapsedTime = now - player.lastBaseAttackTime;
            const attackCooldown = 1000 / BASE_ATTACK_SPEED;

            if (attackElapsedTime >= attackCooldown) {
                const enemyTroopsInRange = opponent.troops.filter(troop => {
                    if (!troop || !troop.position) return false;
                    return calculateDistance(player.basePosition, troop.position) <= BASE_ATTACK_RANGE;
                });

                if (enemyTroopsInRange.length > 0) {
                    enemyTroopsInRange.sort((a, b) => {
                        const distA = calculateDistance(player.basePosition, a.position);
                        const distB = calculateDistance(player.basePosition, b.position);
                        return distA - distB;
                    });

                    const targetTroop = enemyTroopsInRange[0];
                    targetTroop.health -= BASE_ATTACK_DAMAGE;
                    targetTroop.targetedByBase = true;
                    player.lastBaseAttackTime = now;
                    player.baseAttacking = {
                        target: targetTroop.id,
                        timestamp: now
                    };
                } else {
                    player.baseAttacking = null;
                }
            } else {
                if (player.baseAttacking && now - player.baseAttacking.timestamp > 200) {
                    player.baseAttacking = null;
                }
            }

            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;

                const troopAttack = troop.attack || troopConfig.getTroopConfigByTypeId(troop.type).attack;
                const troopRange = troop.range || troopConfig.getTroopConfigByTypeId(troop.type).range;
                const troopSpeed = troop.speed || troopConfig.getTroopConfigByTypeId(troop.type).speed;
                const troopAttackSpeed = troop.attackSpeed || troopConfig.getTroopConfigByTypeId(troop.type).attackSpeed;

                let targetPosition;
                let targetExists = false;

                if (troop.attacking && troop.currentTargetType === 'base') {
                    targetExists = true;
                    targetPosition = opponent.basePosition;
                } else if (troop.currentTargetType === 'troop') {
                    const targetTroop = opponent.troops.find(t => t && t.id === troop.currentTarget && t.health > 0);
                    if (targetTroop) {
                        targetExists = true;
                        targetPosition = targetTroop.position;
                    } else {
                        troop.currentTarget = null;
                        troop.currentTargetType = null;
                    }
                }

                if (!targetExists) {
                    let minDistance = Infinity;
                    let closestTroop = null;
                    opponent.troops.forEach(enemyTroop => {
                        if (!enemyTroop || !enemyTroop.position || enemyTroop.health <= 0) return;

                        const dist = calculateDistance(troop.position, enemyTroop.position);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestTroop = enemyTroop;
                        }
                    });

                    if (closestTroop && minDistance <= troopRange * 2.66) {
                        targetExists = true;
                        targetPosition = closestTroop.position;
                        troop.currentTarget = closestTroop.id;
                        troop.currentTargetType = 'troop';
                    } else {
                        targetExists = true;
                        targetPosition = opponent.basePosition;
                        troop.currentTarget = opponentId;
                        troop.currentTargetType = 'base';
                    }
                }

                const distanceToTarget = calculateDistance(troop.position, targetPosition);

                if (targetExists && distanceToTarget <= troopRange) {
                    troop.attacking = true;

                    const now = Date.now();
                    if (!troop.lastAttackTime || (now - troop.lastAttackTime) >= (1000 / troopAttackSpeed)) {
                        troop.lastAttackTime = now;

                        if (troop.currentTargetType === 'base') {
                            opponent.baseHealth -= Math.ceil(troopAttack / 2);
                            if (opponent.baseHealth <= 0) {
                                endGame(gameId, playerId);
                            }
                        } else if (troop.currentTargetType === 'troop') {
                            const enemyTroopIndex = opponent.troops.findIndex(t => t && t.id === troop.currentTarget);
                            if (enemyTroopIndex !== -1) {
                                opponent.troops[enemyTroopIndex].health -= troopAttack;
                            }
                        }
                    }
                } else {
                    troop.attacking = false;

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

        io.to(gameId).emit('gameState', game);
    }, 100);
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
    const loserId = Object.keys(game.players).find(id => id !== winnerId);

    io.to(winnerId).emit('gameOver', { result: 'win' });
    io.to(loserId).emit('gameOver', { result: 'lose' });

    setTimeout(() => {
        delete games[gameId];
    }, 5000);
}

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinQueue', () => {
        console.log(`Player ${socket.id} joined queue`);

        if (!playerQueue.includes(socket.id)) {
            playerQueue.push(socket.id);
        }

        if (playerQueue.length >= 2) {
            const player1Id = playerQueue.shift();
            const player2Id = playerQueue.shift();

            if (io.sockets.sockets.has(player1Id) && io.sockets.sockets.has(player2Id)) {
                createGame(player1Id, player2Id);
            } else {
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

        if (player.mana < card.manaCost) {
            console.log("💦 No tienes suficiente cum!");
            socket.emit('notEnoughMana');
            return;
        }

        player.mana -= card.manaCost;
        const troopType = card.troopType; // This is now directly the troop ID
        const newLevel = troopConfig.levelUpTroop(socket.id, troopType);
        console.log(`Player ${socket.id} leveled up ${troopType} to level ${newLevel}`);

        const baseTroopStats = troopConfig.getTroopConfigByTypeId(troopType);
        const health = troopConfig.getScaledTroopStat(baseTroopStats.health, newLevel);
        const attack = troopConfig.getScaledTroopStat(baseTroopStats.attack, newLevel);
        const range = baseTroopStats.range;
        const speed = troopConfig.getScaledTroopStat(baseTroopStats.speed, newLevel);
        const attackSpeed = troopConfig.getScaledTroopStat(baseTroopStats.attackSpeed, newLevel);

        const isFirstPlayer = socket.id === Object.keys(game.players)[0];
        if (troopType === 'flacidos') {
            // Create 3 troops instead of 1
            for (let i = 0; i < 3; i++) {
                const troopId = `troop_${socket.id}_${Date.now()}_${i}`;

                // Create different spawn positions for each troop
                const offsetX = (i - 1) * 80; // -80, 0, 80 spacing
                const spawnPos = {
                    x: player.basePosition.x + offsetX + (Math.random() * 40 - 20), // Add a little randomness
                    y: player.basePosition.y + (isFirstPlayer ? -50 : 50) + (Math.random() * 30 - 15)
                };

                const newTroop = {
                    id: troopId,
                    type: troopType,
                    level: newLevel,
                    position: spawnPos,
                    health: health,
                    maxHealth: health,
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
                console.log(`Spawned flacidos troop ${i+1}/3:`, newTroop);
            }
        }else if (troopType === 'lacaja') {
            // Create 3 random troops
            console.log('Spawning random troops from lacaja');

            // Get all available troop types excluding flacidos and shuffler
            const availableTroopTypes = CARD_POOL
                .filter(card => card.id !== 'lacaja' && card.id !== 'shuffler')
                .map(card => card.troopType);

            // Spawn 3 random troops
            for (let i = 0; i < 3; i++) {
                // Select a random troop type
                const randomTroopType = availableTroopTypes[Math.floor(Math.random() * availableTroopTypes.length)];

                // Get the current level for this troop type
                const currentLevel = troopConfig.levelUpTroop(socket.id, randomTroopType);
                console.log(`Player ${socket.id} using ${randomTroopType} at level ${currentLevel}`);

                const baseTroopStats = troopConfig.getTroopConfigByTypeId(randomTroopType);

                // Scale stats based on current level
                const health = troopConfig.getScaledTroopStat(baseTroopStats.health, currentLevel);
                const attack = troopConfig.getScaledTroopStat(baseTroopStats.attack, currentLevel);
                const range = baseTroopStats.range;
                const speed = troopConfig.getScaledTroopStat(baseTroopStats.speed, currentLevel);
                const attackSpeed = troopConfig.getScaledTroopStat(baseTroopStats.attackSpeed, currentLevel);

                const troopId = `troop_${socket.id}_${Date.now()}_${i}`;

                // Create different spawn positions like flacidos
                const offsetX = (i - 1) * 80; // -80, 0, 80 spacing
                const spawnPos = {
                    x: player.basePosition.x + offsetX + (Math.random() * 40 - 20), // Add randomness
                    y: player.basePosition.y + (isFirstPlayer ? -50 : 50) + (Math.random() * 30 - 15)
                };

                const newTroop = {
                    id: troopId,
                    type: randomTroopType,
                    level: currentLevel,
                    position: spawnPos,
                    health: health,
                    maxHealth: health,
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
                console.log(`Spawned random troop ${i+1}/3 of type ${randomTroopType} at level ${currentLevel}:`, newTroop);
            }
        }
        else {
            // Original code for other troop types (spawns 1 troop)
            const troopId = `troop_${socket.id}_${Date.now()}`;
            const spawnPos = {
                x: player.basePosition.x + (Math.random() * 300 - 40),
                y: player.basePosition.y + (isFirstPlayer ? -50 : 50)
            };

            const newTroop = {
                id: troopId,
                type: troopType,
                level: newLevel,
                position: spawnPos,
                health: health,
                maxHealth: health,
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
        }

        const playedCardId = card.id;
        if (playedCardId !== 'shuffler'){
            player.cards[cardIndex] = drawNewCard(playedCardId);
        } else {
            player.cards = getThreeRandomCards(playedCardId);
        }

        io.to(gameId).emit('gameState', game);
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const queueIndex = playerQueue.indexOf(socket.id);
        if (queueIndex !== -1) {
            playerQueue.splice(queueIndex, 1);
        }

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