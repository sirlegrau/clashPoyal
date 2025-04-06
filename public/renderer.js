
function updateUI() {
    if (!gameState || !playerId || !opponentId || !gameState.players) return;

    const player = gameState.players[playerId];
    const opponent = gameState.players[opponentId];

    if (!player || !opponent) return;

    // Remove the old mana container code since we're now drawing it in the canvas
    // The old mana container can be removed from the DOM if it exists
    const oldManaContainer = document.getElementById('mana-container');
    if (oldManaContainer) {
        oldManaContainer.remove();
    }

    // Initialize previousCardData if needed
    if (previousCardData.length === 0 && player.cards) {
        previousCardData = JSON.parse(JSON.stringify(player.cards));
    }

    // Update card display to show mana cost and availability
    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            // Check if this card has changed from the previous state
            const cardChanged = !previousCardData[index] ||
                previousCardData[index].id !== card.id ||
                previousCardData[index].troopType !== card.troopType;

            // If the card has changed, animate it
            if (cardChanged && previousCardData.length > 0) {
                animateCardReplacement(cards[index], card);
            } else {
                // Normal card update without animation
                // Remove cooldown display - not using cooldowns anymore
                const cooldownEl = cards[index].querySelector('.card-cooldown');
                if (cooldownEl) {
                    cooldownEl.style.height = '0%';
                }

                // Add or update mana cost label
                let manaCostLabel = cards[index].querySelector('.mana-cost');
                if (!manaCostLabel) {
                    manaCostLabel = document.createElement('div');
                    manaCostLabel.className = 'mana-cost';
                    cards[index].appendChild(manaCostLabel);
                }
                manaCostLabel.textContent = card.manaCost;

                // Add or update troop type label
                let troopLabel = cards[index].querySelector('.troop-type');
                if (!troopLabel) {
                    troopLabel = document.createElement('div');
                    troopLabel.className = 'troop-type';
                    cards[index].appendChild(troopLabel);
                }
                troopLabel.textContent = card.troopType.charAt(0).toUpperCase() + card.troopType.slice(1);
            }

            // Visual feedback for available cards - only based on mana now
            const canPlayCard = player.mana >= card.manaCost;

            if (canPlayCard) {
                cards[index].style.opacity = '1';
                cards[index].style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.7)';
                cards[index].setAttribute('data-can-play', 'true');
            } else {
                // Not enough mana
                cards[index].style.opacity = '0.5';
                cards[index].style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.7)';
                cards[index].setAttribute('data-can-play', 'false');
            }
        }
    });

    // Update the previous card data reference
    previousCardData = JSON.parse(JSON.stringify(player.cards));
}

function drawGame() {
    if (!ctx || !gameState) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factor
    const scaleX = canvas.width / GAME_WIDTH;
    const scaleY = canvas.height / GAME_HEIGHT;

    // Load base images if not already loaded
    if (!assets.playerBase) {
        assets.playerBase = new Image();
        assets.playerBase.src = 'assets/player-base.png';
    }
    if (!assets.opponentBase) {
        assets.opponentBase = new Image();
        assets.opponentBase.src = 'assets/opponent-base.png';
    }

    // Draw bases
    for (const playerKey in gameState.players) {
        const player = gameState.players[playerKey];

        // Adjust base position for bottom base (player base) to be higher on screen
        let baseX = player.basePosition.x * scaleX;
        let baseY = player.basePosition.y * scaleY;

        // If this is the bottom base and player is positioned at bottom, move it higher
        if (playerPosition === 'bottom' && playerKey === playerId) {
            // Move the base up by 10% of game height
            baseY = baseY - (GAME_HEIGHT * 0.1 * scaleY);
        }
        // If this is the bottom base and player is positioned at top, move opponent's base higher
        else if (playerPosition !== 'bottom' && playerKey !== playerId) {
            // Move the base up by 10% of game height
            baseY = baseY - (GAME_HEIGHT * 0.1 * scaleY);
        }

        const baseSize = 100 * Math.min(scaleX, scaleY);

        // Draw base attack range indicator if debug mode enabled
        if (window.debugMode) {
            const baseAttackRange = 200 * Math.min(scaleX, scaleY); // Match the BASE_ATTACK_RANGE from server
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(baseX, baseY, baseAttackRange, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw base attack animation when attacking
        if (player.baseAttacking) {
            // Find the targeted enemy troop
            const opponentId = Object.keys(gameState.players).find(id => id !== playerKey);
            const opponent = gameState.players[opponentId];

            if (opponent && opponent.troops) {
                const targetTroop = opponent.troops.find(t => t && t.id === player.baseAttacking.target);

                if (targetTroop && targetTroop.position) {
                    const targetX = targetTroop.position.x * scaleX;
                    const targetY = targetTroop.position.y * scaleY;

                    // Draw lightning bolt from base to target
                    ctx.strokeStyle = '#f1c40f'; // Yellow lightning
                    ctx.lineWidth = 3 * Math.min(scaleX, scaleY);

                    // Create a lightning path with some randomness
                    ctx.beginPath();
                    ctx.moveTo(baseX, baseY);

                    // Calculate midpoints with offsets for zigzag effect
                    const midX = (baseX + targetX) / 2 + (Math.random() * 40 - 20) * Math.min(scaleX, scaleY);
                    const midY = (baseY + targetY) / 2 + (Math.random() * 40 - 20) * Math.min(scaleX, scaleY);

                    ctx.lineTo(midX, midY);
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();

                    // Add glow effect around target
                    ctx.fillStyle = 'rgba(241, 196, 15, 0.3)';
                    ctx.beginPath();
                    ctx.arc(targetX, targetY, 20 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Draw base with image
        if (playerKey === playerId) {
            if (assets.playerBase && assets.playerBase.complete && assets.playerBase.naturalWidth !== 0) {
                ctx.drawImage(assets.playerBase,
                    baseX - baseSize / 2,
                    baseY - baseSize / 2,
                    baseSize,
                    baseSize);
            } else {
                // Fallback to circle if image not loaded
                ctx.fillStyle = '#27ae60'; // Green for player
                ctx.beginPath();
                ctx.arc(baseX, baseY, baseSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            if (assets.opponentBase && assets.opponentBase.complete && assets.opponentBase.naturalWidth !== 0) {
                ctx.drawImage(assets.opponentBase,
                    baseX - baseSize / 2,
                    baseY - baseSize / 2,
                    baseSize,
                    baseSize);
            } else {
                // Fallback to circle if image not loaded
                ctx.fillStyle = '#e74c3c'; // Red for opponent
                ctx.beginPath();
                ctx.arc(baseX, baseY, baseSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Base glow effect when attacking
        if (player.baseAttacking) {
            ctx.fillStyle = playerKey === playerId ?
                'rgba(39, 174, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            ctx.beginPath();
            ctx.arc(baseX, baseY, baseSize * 0.75, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw health bar for base - INCREASED SIZE
        const healthBarWidth = baseSize * 1.5; // 1.5x wider than the base
        const healthBarHeight = 15 * Math.min(scaleX, scaleY);
        const healthBarBorderWidth = 3 * Math.min(scaleX, scaleY);

        // Maximum base health from config
        const maxBaseHealth = TROOP_CONFIG.BASE_MAX_HEALTH;
        const healthPercent = player.baseHealth / maxBaseHealth;

        // Determine if this is top or bottom base
        const isTopBase = (playerPosition === 'bottom' && playerKey !== playerId) ||
            (playerPosition !== 'bottom' && playerKey === playerId);

        // Position health bar BELOW top base or ABOVE bottom base
        let healthBarY;
        if (isTopBase) {
            // Position below top base
            healthBarY = baseY + baseSize/2 + healthBarHeight;
        } else {
            // Position above bottom base
            healthBarY = baseY - baseSize/2 - healthBarHeight - healthBarBorderWidth * 2;
        }

        // Draw health bar background (border)
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(
            baseX - healthBarWidth/2 - healthBarBorderWidth,
            healthBarY - healthBarBorderWidth,
            healthBarWidth + healthBarBorderWidth * 2,
            healthBarHeight + healthBarBorderWidth * 2
        );

        // Draw health bar background
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(
            baseX - healthBarWidth/2,
            healthBarY,
            healthBarWidth,
            healthBarHeight
        );

        // Health fill - color based on health percentage
        if (healthPercent > 0.7) {
            ctx.fillStyle = '#27ae60'; // Green
        } else if (healthPercent > 0.3) {
            ctx.fillStyle = '#f39c12'; // Yellow/Orange
        } else {
            ctx.fillStyle = '#e74c3c'; // Red
        }

        ctx.fillRect(
            baseX - healthBarWidth/2,
            healthBarY,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        // Add health text on the bars
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${12 * Math.min(scaleX, scaleY)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${player.baseHealth}/${maxBaseHealth}`,
            baseX,
            healthBarY + healthBarHeight/2
        );

        // Draw mana bar for the player only
        if (playerKey === playerId) {
            const manaBarWidth = healthBarWidth; // Same width as health bar
            const manaBarHeight = healthBarHeight; // Same height as health bar
            const manaBarSpacing = healthBarHeight + healthBarBorderWidth * 4; // Space between health and mana bar

            // Position mana bar below health bar for bottom base, or above health bar for top base
            let manaBarY;
            if (isTopBase) {
                // Position below health bar for top base
                manaBarY = healthBarY + manaBarSpacing;
            } else {
                // Position above health bar for bottom base
                manaBarY = healthBarY - manaBarSpacing;
            }

            // Draw mana bar background (border)
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(
                baseX - manaBarWidth/2 - healthBarBorderWidth,
                manaBarY - healthBarBorderWidth,
                manaBarWidth + healthBarBorderWidth * 2,
                manaBarHeight + healthBarBorderWidth * 2
            );

            // Draw mana bar background
            ctx.fillStyle = '#34495e';
            ctx.fillRect(
                baseX - manaBarWidth/2,
                manaBarY,
                manaBarWidth,
                manaBarHeight
            );
            const manaPercent = player.mana / player.maxMana;

            // Mana fill - gradient from blue to purple
            const gradient = ctx.createLinearGradient(
                baseX - manaBarWidth/2,
                manaBarY,
                baseX - manaBarWidth/2 + manaBarWidth * manaPercent,
                manaBarY
            );
            gradient.addColorStop(0, '#3498db'); // Blue
            gradient.addColorStop(1, '#9b59b6'); // Purple
            ctx.fillStyle = gradient;

            ctx.fillRect(
                baseX - manaBarWidth/2,
                manaBarY,
                manaBarWidth * manaPercent,
                manaBarHeight
            );

            // Add mana icon (lightning bolt)
            const iconSize = manaBarHeight * 1.2;
            ctx.fillStyle = '#f1c40f'; // Yellow/gold for the icon
            ctx.font = `bold ${iconSize}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                '💦',
                baseX - manaBarWidth/2 - healthBarBorderWidth * 2,
                manaBarY + manaBarHeight/2
            );

            // Add mana text on the bars
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${12 * Math.min(scaleX, scaleY)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${Math.floor(player.mana)}/${player.maxMana} Cum`,
                baseX,
                manaBarY + manaBarHeight/2
            );
        }

        // Draw troops
        if (player.troops && Array.isArray(player.troops)) {
            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;

                // Initialize projectiles array if it doesn't exist
                if (!window.projectiles) {
                    window.projectiles = [];
                }

                // Get base position of the troop
                let troopX = troop.position.x * scaleX;
                let troopY = troop.position.y * scaleY;

                // Apply jiggle effect if troop is attacking (small random movement)
                let jiggleX = 0;
                let jiggleY = 0;
                if (troop.attacking) {
                    jiggleX = (Math.random() * 6 - 3) * Math.min(scaleX, scaleY);
                    jiggleY = (Math.random() * 6 - 3) * Math.min(scaleX, scaleY);
                }

                // Apply jiggle to position
                const displayX = troopX + jiggleX;
                const displayY = troopY + jiggleY;

                // Get troop size from config
                let troopSize = TROOP_CONFIG.getTroopSize(troop.type) * Math.min(scaleX, scaleY);

                // Load troop images if not already loaded
                if (!troopImages[troop.type]) {
                    troopImages[troop.type] = new Image();
                    troopImages[troop.type].src = `assets/${troop.type}.png`;
                }
                if (!troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`]) {
                    troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`] = new Image();
                    troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`].src = `assets/${troop.type}.png`;
                }

                if (playerKey === playerId) {
                    // Draw correct troop image based on type
                    const troopImg = troop.type && troopImages[troop.type]?.complete ?
                        troopImages[troop.type] : assets.troop;

                    if (troopImg && troopImg.complete && troopImg.naturalWidth !== 0) {
                        ctx.drawImage(troopImg,
                            displayX - troopSize / 2,
                            displayY - troopSize / 2,
                            troopSize,
                            troopSize);
                    } else {
                        // Fallback - color by troop type from config
                        ctx.fillStyle = TROOP_CONFIG.getPlayerColor(troop.type);
                        ctx.beginPath();
                        ctx.arc(displayX, displayY, troopSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // Use same asset images for enemy troops, just tint them
                    const enemyTroopType = `enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`;
                    const enemyTroopImg = troopImages[enemyTroopType];

                    if (enemyTroopImg && enemyTroopImg.complete && enemyTroopImg.naturalWidth !== 0) {
                        ctx.drawImage(enemyTroopImg,
                            displayX - troopSize / 2,
                            displayY - troopSize / 2,
                            troopSize,
                            troopSize);
                    } else {
                        // Fallback to colored circles if assets aren't loaded
                        ctx.fillStyle = TROOP_CONFIG.getEnemyColor(troop.type);
                        ctx.beginPath();
                        ctx.arc(displayX, displayY, troopSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Draw troop border
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
                ctx.beginPath();
                ctx.arc(displayX, displayY, troopSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Draw health bar
                const healthBarWidth = troopSize;
                const healthBarHeight = 5 * Math.min(scaleX, scaleY);

                // Get max health from config
                const maxHealth = TROOP_CONFIG.getTroopMaxHealth(troop.type);
                const healthPercent = troop.health / maxHealth;

                // Background
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(displayX - healthBarWidth / 2, displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth, healthBarHeight);

                // Health fill - color based on health percentage
                if (healthPercent > 0.7) {
                    ctx.fillStyle = '#27ae60'; // Green
                } else if (healthPercent > 0.3) {
                    ctx.fillStyle = '#f39c12'; // Yellow/Orange
                } else {
                    ctx.fillStyle = '#e74c3c'; // Red
                }

                ctx.fillRect(displayX - healthBarWidth / 2, displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth * healthPercent, healthBarHeight);

                // Create projectile for ranged units if attacking
                if (troop.attacking && (troop.type === 'archer' || troop.type === 'mage')) {
                    // Find the target
                    const opponentId = Object.keys(gameState.players).find(id => id !== playerKey);
                    const opponent = gameState.players[opponentId];

                    if (opponent && opponent.troops) {
                        const targetTroop = opponent.troops.find(t => t && t.id === troop.attacking.target);

                        if (targetTroop && targetTroop.position) {
                            const targetX = targetTroop.position.x * scaleX;
                            const targetY = targetTroop.position.y * scaleY;

                            // Only create a new projectile occasionally to avoid flooding
                            if (Math.random() < 0.05) { // 5% chance each frame
                                let projectileType = troop.type === 'archer' ? 'arrow' : 'fireball';

                                // Create new projectile
                                window.projectiles.push({
                                    fromX: troopX,
                                    fromY: troopY,
                                    toX: targetX,
                                    toY: targetY,
                                    type: projectileType,
                                    progress: 0,
                                    startTime: Date.now(),
                                    owner: playerKey
                                });
                            }
                        }
                    }
                }
            });
        }
    }

    // Draw projectiles
    if (window.projectiles && window.projectiles.length > 0) {
        window.projectiles.forEach((projectile, index) => {
            // Calculate progress based on time (animate over 500ms)
            const now = Date.now();
            const elapsed = now - projectile.startTime;
            projectile.progress = Math.min(elapsed / 500, 1); // 500ms flight time

            // Calculate current position with arc for archers, straight line for mages
            let currentX, currentY;

            if (projectile.type === 'arrow') {
                // Arched trajectory for arrows
                currentX = projectile.fromX + (projectile.toX - projectile.fromX) * projectile.progress;
                // Add arc height based on progress (highest at 0.5)
                const arcHeight = 30 * Math.min(scaleX, scaleY); // Maximum arc height
                const arcFactor = 4 * projectile.progress * (1 - projectile.progress); // Equals 1 at progress = 0.5
                currentY = projectile.fromY + (projectile.toY - projectile.fromY) * projectile.progress - arcHeight * arcFactor;
            } else {
                // Straight line for fireballs
                currentX = projectile.fromX + (projectile.toX - projectile.fromX) * projectile.progress;
                currentY = projectile.fromY + (projectile.toY - projectile.fromY) * projectile.progress;
            }

            // Load projectile images if needed
            if (!assets[projectile.type]) {
                assets[projectile.type] = new Image();
                assets[projectile.type].src = `assets/${projectile.type}.png`;
            }

            // Draw projectile
            const projectileSize = 20 * Math.min(scaleX, scaleY);

            if (assets[projectile.type] && assets[projectile.type].complete) {
                // Draw image
                ctx.drawImage(
                    assets[projectile.type],
                    currentX - projectileSize/2,
                    currentY - projectileSize/2,
                    projectileSize,
                    projectileSize
                );
            } else {
                // Fallback shape (small circle)
                ctx.fillStyle = projectile.type === 'arrow' ? '#2c3e50' : '#e67e22';
                ctx.beginPath();
                ctx.arc(currentX, currentY, projectileSize/3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Remove projectile if it reached its target
            if (projectile.progress >= 1) {
                window.projectiles.splice(index, 1);
            }
        });
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
// Card animation functions
function animateCardReplacement(cardElement, newCardData) {
    // Animate the card being played (shrink and fade out)
    cardElement.classList.add('card-played');

    // After the animation completes, update the card and animate it back in
    setTimeout(() => {
        // Update card data
        updateCardElement(cardElement, newCardData);

        // Remove the played class and add the new card class
        cardElement.classList.remove('card-played');
        cardElement.classList.add('card-new');

        // After the new card animation completes, remove that class too
        setTimeout(() => {
            cardElement.classList.remove('card-new');
        }, TROOP_CONFIG.CARD_ANIMATION_DURATION);

    }, TROOP_CONFIG.CARD_ANIMATION_DURATION);
}

// Function to update a card element with new data
function updateCardElement(cardElement, cardData) {
    // Update mana cost
    let manaCostLabel = cardElement.querySelector('.mana-cost');
    if (manaCostLabel) {
        manaCostLabel.textContent = cardData.manaCost;
    }

    // Update troop type
    let troopLabel = cardElement.querySelector('.troop-type');
    if (troopLabel) {
        troopLabel.textContent = cardData.troopType.charAt(0).toUpperCase() + cardData.troopType.slice(1);
    }

    // Update card image if we're using different images per card type
    const imgContainer = cardElement.querySelector('.card-image img');
    if (imgContainer) {
        // Try to load an image for this specific troop type if it exists
        const newSrc = `assets/${cardData.troopType}.png`;

        // First try to load the specific troop image
        const tempImg = new Image();
        tempImg.onload = () => {
            imgContainer.src = newSrc;
        };
        tempImg.onerror = () => {
            // Fallback to card ID based image
            imgContainer.src = `assets/${cardData.id}.png`;
        };
        tempImg.src = newSrc;
    }
}
// Add this code to your initialization logic where you first receive player cards
function initializeCardDisplay() {
    if (!gameState || !playerId || !gameState.players[playerId]?.cards) return;

    const player = gameState.players[playerId];

    // Update each card element with correct initial data
    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            updateCardElement(cards[index], card);
        }
    });

    // Store initial card data
    previousCardData = JSON.parse(JSON.stringify(player.cards));
}

// Call this after receiving the initial game state
// For example, add this call after setting gameState in your gameStart or initial gameState handler
// Keep track of previous card data to detect changes
let previousCardData = [];