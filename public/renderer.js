// Game rendering and UI update functions

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

    // Update card cooldowns and add troop type info
    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            const cooldownEl = cards[index].querySelector('.card-cooldown');
            const cooldownPercent = (card.cooldown / 3000) * 100;
            cooldownEl.style.height = `${cooldownPercent}%`;

            // Add or update troop type label
            let troopLabel = cards[index].querySelector('.troop-type');
            if (!troopLabel) {
                troopLabel = document.createElement('div');
                troopLabel.className = 'troop-type';
                cards[index].appendChild(troopLabel);
            }

            // Set troop type info
            let troopInfo = '';
            if (card.troopType === 'soldier') {
                troopInfo = 'Soldier<br>HP: 100 • DMG: 10';
            } else if (card.troopType === 'archer') {
                troopInfo = 'Archer<br>HP: 70 • DMG: 12';
            } else if (card.troopType === 'tank') {
                troopInfo = 'Tank<br>HP: 250 • DMG: 15';
            }
            troopLabel.innerHTML = troopInfo;

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
                // Size varies by troop type
                let troopSize = 30;

                // Adjust size based on troop type
                if (troop.type === 'tank') {
                    troopSize = 40;
                } else if (troop.type === 'archer') {
                    troopSize = 25;
                }

                troopSize *= Math.min(scaleX, scaleY);

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
                    // For opponent troops, use different colors based on type
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
                let maxHealth = 100;
                if (troop.type === 'tank') maxHealth = 250;
                if (troop.type === 'archer') maxHealth = 70;

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