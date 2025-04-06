            // Game rendering and UI update functions
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

                // Update card display to show mana cost and availability
                player.cards.forEach((card, index) => {
                    if (index < cards.length) {
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
            }function drawGame() {
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

                    // Draw health bar for base - INCREASED SIZE
                    const healthBarWidth = baseSize * 1.5; // 1.5x wider than the base (increased from 1.2)
                    const healthBarHeight = 15 * Math.min(scaleX, scaleY); // Increased from 10
                    const healthBarBorderWidth = 3 * Math.min(scaleX, scaleY); // Increased from 2

                    // Maximum base health (assumed to be 500 based on the updateUI function)
                    const maxBaseHealth = 100;
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

                    // NEW CODE: Draw mana bar for the player only
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

                        // Calculate mana percentage
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
                            '⚡',
                            baseX - manaBarWidth/2 - healthBarBorderWidth * 2,
                            manaBarY + manaBarHeight/2
                        );

                        // Add mana text on the bars
                        ctx.fillStyle = '#ffffff';
                        ctx.font = `bold ${12 * Math.min(scaleX, scaleY)}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(
                            `${Math.floor(player.mana)}/${player.maxMana} Mana`,
                            baseX,
                            manaBarY + manaBarHeight/2
                        );
                    }

                    // Draw troops
                    if (player.troops && Array.isArray(player.troops)) {
                        player.troops.forEach(troop => {
                            if (!troop || !troop.position) return;

                            const troopX = troop.position.x * scaleX;
                            const troopY = troop.position.y * scaleY;
                            // Size varies by troop type
                            let troopSize = 70;

                            // Adjust size based on troop type
                            if (troop.type === 'tank') {
                                troopSize = 135;
                            } else if (troop.type === 'archer') {
                                troopSize = 85;
                            }

                            troopSize *= Math.min(scaleX, scaleY);

                            // Check if proper asset paths are set for enemy troops
                            if (!troopImages.enemySoldier) {
                                troopImages.enemySoldier = new Image();
                                troopImages.enemySoldier.src = 'assets/soldier.png';
                            }
                            if (!troopImages.enemyArcher) {
                                troopImages.enemyArcher = new Image();
                                troopImages.enemyArcher.src = 'assets/archer.png';
                            }
                            if (!troopImages.enemyTank) {
                                troopImages.enemyTank = new Image();
                                troopImages.enemyTank.src = 'assets/tank.png';
                            }

                            if (playerKey === playerId) {
                                // Draw correct troop image based on type
                                const troopImg = troop.type && troopImages[troop.type]?.complete ?
                                    troopImages[troop.type] : assets.troop;

                                if (troopImg && troopImg.complete && troopImg.naturalWidth !== 0) {
                                    ctx.drawImage(troopImg,
                                        troopX - troopSize / 2,
                                        troopY - troopSize / 2,
                                        troopSize,
                                        troopSize);
                                } else {
                                    // Fallback - color by troop type
                                    if (troop.type === 'tank') {
                                        ctx.fillStyle = '#7f8c8d'; // Gray for tanks
                                    } else if (troop.type === 'archer') {
                                        ctx.fillStyle = '#3498db'; // Light blue for archers
                                    } else {
                                        ctx.fillStyle = '#2980b9'; // Default blue for soldiers
                                    }
                                    ctx.beginPath();
                                    ctx.arc(troopX, troopY, troopSize / 2, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            } else {
                                // Use same asset images for enemy troops, just tint them
                                let enemyTroopImg;

                                if (troop.type === 'tank') {
                                    enemyTroopImg = troopImages.enemyTank;
                                } else if (troop.type === 'archer') {
                                    enemyTroopImg = troopImages.enemyArcher;
                                } else {
                                    enemyTroopImg = troopImages.enemySoldier;
                                }

                                if (enemyTroopImg && enemyTroopImg.complete && enemyTroopImg.naturalWidth !== 0) {
                                    ctx.drawImage(enemyTroopImg,
                                        troopX - troopSize / 2,
                                        troopY - troopSize / 2,
                                        troopSize,
                                        troopSize);
                                } else {
                                    // Fallback to colored circles if assets aren't loaded
                                    if (troop.type === 'tank') {
                                        ctx.fillStyle = '#cd6155'; // Dark red for tanks
                                    } else if (troop.type === 'archer') {
                                        ctx.fillStyle = '#e67e22'; // Orange for archers
                                    } else {
                                        ctx.fillStyle = '#c0392b'; // Default red for soldiers
                                    }
                                    ctx.beginPath();
                                    ctx.arc(troopX, troopY, troopSize / 2, 0, Math.PI * 2);
                                    ctx.fill();
                                }
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

                            // Get max health based on troop type
                            let maxHealth = 10;
                            if (troop.type === 'tank') maxHealth = 25;
                            if (troop.type === 'archer') maxHealth = 7;

                            const healthPercent = troop.health / maxHealth;

                            // Background
                            ctx.fillStyle = '#7f8c8d';
                            ctx.fillRect(troopX - healthBarWidth / 2, troopY - troopSize / 2 - healthBarHeight * 2,
                                healthBarWidth, healthBarHeight);

                            // Health fill - color based on health percentage
                            if (healthPercent > 0.7) {
                                ctx.fillStyle = '#27ae60'; // Green
                            } else if (healthPercent > 0.3) {
                                ctx.fillStyle = '#f39c12'; // Yellow/Orange
                            } else {
                                ctx.fillStyle = '#e74c3c'; // Red
                            }

                            ctx.fillRect(troopX - healthBarWidth / 2, troopY - troopSize / 2 - healthBarHeight * 2,
                                healthBarWidth * healthPercent, healthBarHeight);

                            // Show attack animation
                            if (troop.attacking) {
                                // Different attack animation colors based on troop type
                                if (troop.type === 'tank') {
                                    ctx.strokeStyle = '#e74c3c'; // Red for tank attacks
                                } else if (troop.type === 'archer') {
                                    ctx.strokeStyle = '#9b59b6'; // Purple for archer attacks
                                } else {
                                    ctx.strokeStyle = '#f39c12'; // Orange/yellow for soldier attacks
                                }

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