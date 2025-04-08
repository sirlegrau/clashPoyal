

function updateUI() {
    if (!gameState || !playerId || !opponentId || !gameState.players) return;
    const player = gameState.players[playerId];
    const opponent = gameState.players[opponentId];
    if (!player || !opponent) return;
    if (previousCardData.length === 0 && player.cards) {
        previousCardData = JSON.parse(JSON.stringify(player.cards));
    }

    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            const cardChanged = !previousCardData[index] ||
                previousCardData[index].id !== card.id ||
                previousCardData[index].troopType !== card.troopType;

            if (cardChanged && previousCardData.length > 0) {
                animateCardReplacement(cards[index], card);
            } else {
                const cooldownEl = cards[index].querySelector('.card-cooldown');
                if (cooldownEl) cooldownEl.style.height = '0%';

                let manaCostLabel = cards[index].querySelector('.mana-cost');
                if (!manaCostLabel) {
                    manaCostLabel = document.createElement('div');
                    manaCostLabel.className = 'mana-cost';
                    cards[index].appendChild(manaCostLabel);
                }
                manaCostLabel.textContent = card.manaCost;
            }

            const canPlayCard = player.mana >= card.manaCost;
            if (canPlayCard) {
                cards[index].style.opacity = '1';
                cards[index].style.boxShadow = '0 0 10px rgba(52, 152, 219, 0.7)';
                cards[index].setAttribute('data-can-play', 'true');
            } else {
                cards[index].style.opacity = '0.5';
                cards[index].style.boxShadow = '0 0 10px rgba(231, 76, 60, 0.7)';
                cards[index].setAttribute('data-can-play', 'false');
            }
        }
    });

    previousCardData = JSON.parse(JSON.stringify(player.cards));
}

function drawGame() {
    if (!ctx || !gameState) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / GAME_WIDTH;
    const scaleY = canvas.height / GAME_HEIGHT;

    if (!assets.background) {
        assets.background = new Image();
        assets.background.src = 'assets/background.png';
    }

    if (assets.background && assets.background.complete && assets.background.naturalWidth !== 0) {
        ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#8ED1FC');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!assets.playerBase) {
        assets.playerBase = new Image();
        assets.playerBase.src = 'assets/player-base.png';
    }
    if (!assets.opponentBase) {
        assets.opponentBase = new Image();
        assets.opponentBase.src = 'assets/opponent-base.png';
    }

    for (const playerKey in gameState.players) {
        const player = gameState.players[playerKey];
        let baseX = player.basePosition.x * scaleX;
        let baseY = player.basePosition.y * scaleY;

        if (playerPosition === 'bottom' && playerKey === playerId) {
            baseY = baseY - (GAME_HEIGHT * 0.1 * scaleY);
        } else if (playerPosition !== 'bottom' && playerKey !== playerId) {
            baseY = baseY - (GAME_HEIGHT * 0.1 * scaleY);
        }

        const baseSize = 100 * Math.min(scaleX, scaleY);

        if (player.baseAttacking) {
            const opponentId = Object.keys(gameState.players).find(id => id !== playerKey);
            const opponent = gameState.players[opponentId];

            if (opponent && opponent.troops) {
                const targetTroop = opponent.troops.find(t => t && t.id === player.baseAttacking.target);

                if (targetTroop && targetTroop.position) {
                    const targetX = targetTroop.position.x * scaleX;
                    const targetY = targetTroop.position.y * scaleY;
                    ctx.strokeStyle = '#f1c40f';
                    ctx.lineWidth = 3 * Math.min(scaleX, scaleY);
                    ctx.beginPath();
                    ctx.moveTo(baseX, baseY);
                    const midX = (baseX + targetX) / 2 + (Math.random() * 40 - 20) * Math.min(scaleX, scaleY);
                    const midY = (baseY + targetY) / 2 + (Math.random() * 40 - 20) * Math.min(scaleX, scaleY);
                    ctx.lineTo(midX, midY);
                    ctx.lineTo(targetX, targetY);
                    ctx.stroke();
                }
            }
        }

        if (playerKey === playerId) {
            if (assets.playerBase && assets.playerBase.complete && assets.playerBase.naturalWidth !== 0) {
                ctx.drawImage(assets.playerBase, baseX - baseSize / 2, baseY - baseSize / 2, baseSize, baseSize);
            } else {
                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.arc(baseX, baseY, baseSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            if (assets.opponentBase && assets.opponentBase.complete && assets.opponentBase.naturalWidth !== 0) {
                ctx.drawImage(assets.opponentBase, baseX - baseSize / 2, baseY - baseSize / 2, baseSize, baseSize);
            } else {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(baseX, baseY, baseSize / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (player.baseAttacking) {
            ctx.fillStyle = playerKey === playerId ? 'rgba(39, 174, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            ctx.beginPath();
            ctx.arc(baseX, baseY, baseSize * 0.75, 0, Math.PI * 2);
            ctx.fill();
        }

        const healthBarWidth = baseSize * 1.5;
        const healthBarHeight = 15 * Math.min(scaleX, scaleY);
        const healthBarBorderWidth = 3 * Math.min(scaleX, scaleY);
        const maxBaseHealth = TROOP_CONFIG.BASE_MAX_HEALTH;
        const healthPercent = player.baseHealth / maxBaseHealth;
        const isTopBase = (playerPosition === 'bottom' && playerKey !== playerId) ||
            (playerPosition !== 'bottom' && playerKey === playerId);

        let healthBarY = isTopBase ?
            baseY + baseSize/2 + healthBarHeight :
            baseY - baseSize/2 - healthBarHeight - healthBarBorderWidth * 2;

        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(
            baseX - healthBarWidth/2 - healthBarBorderWidth,
            healthBarY - healthBarBorderWidth,
            healthBarWidth + healthBarBorderWidth * 2,
            healthBarHeight + healthBarBorderWidth * 2
        );

        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(
            baseX - healthBarWidth/2,
            healthBarY,
            healthBarWidth,
            healthBarHeight
        );

        const baseHealthColor = playerKey === playerId ?
            (healthPercent > 0.7 ? '#27ae60' : healthPercent > 0.3 ? '#219653' : '#1e8449') : // Player: Green shades darkening
            (healthPercent > 0.7 ? '#e74c3c' : healthPercent > 0.3 ? '#c0392b' : '#922b21');  // Enemy: Red shades darkening

        ctx.fillStyle = baseHealthColor;
        ctx.fillRect(
            baseX - healthBarWidth/2,
            healthBarY,
            healthBarWidth * healthPercent,
            healthBarHeight
        );

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${12 * Math.min(scaleX, scaleY)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${player.baseHealth}/${maxBaseHealth}`,
            baseX,
            healthBarY + healthBarHeight/2
        );

        if (playerKey === playerId) {
            const manaBarWidth = healthBarWidth;
            const manaBarHeight = healthBarHeight;
            const manaBarSpacing = healthBarHeight + healthBarBorderWidth * 4;
            let manaBarY = isTopBase ?
                healthBarY + manaBarSpacing :
                healthBarY - manaBarSpacing;

            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(
                baseX - manaBarWidth/2 - healthBarBorderWidth,
                manaBarY - healthBarBorderWidth,
                manaBarWidth + healthBarBorderWidth * 2,
                manaBarHeight + healthBarBorderWidth * 2
            );

            ctx.fillStyle = '#34495e';
            ctx.fillRect(
                baseX - manaBarWidth/2,
                manaBarY,
                manaBarWidth,
                manaBarHeight
            );

            const manaPercent = player.mana / player.maxMana;
            const gradient = ctx.createLinearGradient(
                baseX - manaBarWidth/2,
                manaBarY,
                baseX - manaBarWidth/2 + manaBarWidth * manaPercent,
                manaBarY
            );
            gradient.addColorStop(0, '#3498db');
            gradient.addColorStop(1, '#9b59b6');
            ctx.fillStyle = gradient;

            ctx.fillRect(
                baseX - manaBarWidth/2,
                manaBarY,
                manaBarWidth * manaPercent,
                manaBarHeight
            );

            const iconSize = manaBarHeight * 1.2;
            ctx.fillStyle = '#f1c40f';
            ctx.font = `bold ${iconSize}px Arial`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                '💦',
                baseX - manaBarWidth/2 - healthBarBorderWidth * 2,
                manaBarY + manaBarHeight/2
            );

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

        if (player.troops && Array.isArray(player.troops)) {
            player.troops.forEach(troop => {
                if (!troop || !troop.position) return;
                let troopX = troop.position.x * scaleX;
                let troopY = troop.position.y * scaleY;
                let jiggleX = 0, jiggleY = 0;

                if (troop.attacking) {
                    jiggleX = (Math.random() * 6 - 3) * Math.min(scaleX, scaleY);
                    jiggleY = (Math.random() * 6 - 3) * Math.min(scaleX, scaleY);
                }

                const displayX = troopX + jiggleX;
                const displayY = troopY + jiggleY;

                // Use troop's own size if available, otherwise get from config
                let troopSize = troop.size || TROOP_CONFIG.getTroopSize(troop.type) * Math.min(scaleX, scaleY);

                // Apply scaling factor to the base size
                troopSize = troopSize * Math.min(scaleX, scaleY);

                if (!troopImages[troop.type]) {
                    troopImages[troop.type] = new Image();
                    troopImages[troop.type].src = `assets/${troop.type}.png`;
                }
                if (!troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`]) {
                    troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`] = new Image();
                    troopImages[`enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`].src = `assets/${troop.type}.png`;
                }

                if (playerKey === playerId) {
                    const troopImg = troop.type && troopImages[troop.type]?.complete ?
                        troopImages[troop.type] : assets.troop;

                    if (troopImg && troopImg.complete && troopImg.naturalWidth !== 0) {
                        ctx.drawImage(troopImg, displayX - troopSize / 2, displayY - troopSize / 2, troopSize, troopSize);
                    } else {
                        ctx.fillStyle = TROOP_CONFIG.getPlayerColor(troop.type);
                        ctx.beginPath();
                        ctx.arc(displayX, displayY, troopSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    const enemyTroopType = `enemy${troop.type.charAt(0).toUpperCase() + troop.type.slice(1)}`;
                    const enemyTroopImg = troopImages[enemyTroopType];

                    if (enemyTroopImg && enemyTroopImg.complete && enemyTroopImg.naturalWidth !== 0) {
                        ctx.drawImage(enemyTroopImg, displayX - troopSize / 2, displayY - troopSize / 2, troopSize, troopSize);
                    } else {
                        ctx.fillStyle = TROOP_CONFIG.getEnemyColor(troop.type);
                        ctx.beginPath();
                        ctx.arc(displayX, displayY, troopSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Health bar
                const healthBarWidth = troopSize;
                const healthBarHeight = 5 * Math.min(scaleX, scaleY);
                const maxHealth = troop.maxHealth || TROOP_CONFIG.getTroopMaxHealth(troop.type);
                const healthPercent = troop.health / maxHealth;

                // Determine health bar color based on player ownership and health level
                let bgColor, healthColor;
                if (playerKey === playerId) {
                    // Ally troop (green health bar)
                    bgColor = '#7f8c8d'; // Background gray
                    healthColor = healthPercent > 0.7 ? '#27ae60' : healthPercent > 0.3 ? '#219653' : '#1e8449'; // Green shades darkening
                } else {
                    // Enemy troop (red health bar)
                    bgColor = '#7f8c8d'; // Background gray
                    healthColor = healthPercent > 0.7 ? '#e74c3c' : healthPercent > 0.3 ? '#c0392b' : '#922b21'; // Red shades darkening
                }

                // Draw level indicator before health bar
                if (troop.level && troop.level >= 1) {
                    // Increased size for level indicator
                    const levelWidth = 24 * Math.min(scaleX, scaleY);
                    const levelHeight = 24 * Math.min(scaleX, scaleY);
                    const levelColor = playerKey === playerId ? '#27ae60' : '#e74c3c'; // Green for allies, red for enemies

                    // Move level indicator completely outside the health bar
                    // Position it to the left of the health bar with a small gap
                    ctx.fillStyle = levelColor;
                    ctx.fillRect(
                        displayX - healthBarWidth / 2 - levelWidth - 3 * Math.min(scaleX, scaleY),
                        displayY - troopSize / 2 - healthBarHeight * 2 - (levelHeight - healthBarHeight) / 2,
                        levelWidth,
                        levelHeight
                    );

                    // Increase font size for level number
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${18 * Math.min(scaleX, scaleY)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        `${troop.level}`,
                        displayX - healthBarWidth / 2 - levelWidth/2 - 3 * Math.min(scaleX, scaleY),
                        displayY - troopSize / 2 - healthBarHeight * 2 + healthBarHeight/2
                    );
                }

                // Draw health bar background
                ctx.fillStyle = bgColor;
                ctx.fillRect(
                    displayX - healthBarWidth / 2,
                    displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth,
                    healthBarHeight
                );

                // Draw health bar fill
                ctx.fillStyle = healthColor;
                ctx.fillRect(
                    displayX - healthBarWidth / 2,
                    displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth * healthPercent,
                    healthBarHeight
                );
            });
        }
    }
    const fontSize = 16 * Math.min(scaleX, scaleY);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';

    // Draw name tags with background for better visibility
    function drawNameTag(name, x, y, isPlayer) {
        const padding = 10 * Math.min(scaleX, scaleY);
        const textWidth = ctx.measureText(name).width;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = fontSize + padding;

        // Draw background
        ctx.fillStyle = isPlayer ? 'rgba(39, 174, 96, 0.8)' : 'rgba(231, 76, 60, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x - bgWidth/2, y - bgHeight/2, bgWidth, bgHeight, padding/2);
        ctx.fill();

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(name, x, y + fontSize/4);
    }

    if (playerPosition === 'bottom') {
        drawNameTag(playerName, GAME_WIDTH/2 * scaleX, (GAME_HEIGHT - 30) * scaleY, true);
        drawNameTag(opponentName, GAME_WIDTH/2 * scaleX, 30 * scaleY, false);
    } else {
        drawNameTag(playerName, GAME_WIDTH/2 * scaleX, 30 * scaleY, true);
        drawNameTag(opponentName, GAME_WIDTH/2 * scaleX, (GAME_HEIGHT - 30) * scaleY, false);
    }

}

function animateCardReplacement(cardElement, newCardData) {
    cardElement.classList.add('card-played');
    setTimeout(() => {
        updateCardElement(cardElement, newCardData);
        cardElement.classList.remove('card-played');
        cardElement.classList.add('card-new');
        setTimeout(() => {
            cardElement.classList.remove('card-new');
        }, TROOP_CONFIG.CARD_ANIMATION_DURATION);
    }, TROOP_CONFIG.CARD_ANIMATION_DURATION);
}

function updateCardElement(cardElement, cardData) {
    let manaCostLabel = cardElement.querySelector('.mana-cost');
    if (manaCostLabel) {
        manaCostLabel.textContent = cardData.manaCost;
    }

    let troopLabel = cardElement.querySelector('.troop-type');
    if (troopLabel) {
        troopLabel.textContent = cardData.troopType.charAt(0).toUpperCase() + cardData.troopType.slice(1);
    }

    const imgContainer = cardElement.querySelector('.card-image img');
    if (imgContainer) {
        const newSrc = `assets/${cardData.troopType}.png`;
        const tempImg = new Image();
        tempImg.onload = () => {
            imgContainer.src = newSrc;
        };
        tempImg.onerror = () => {
            imgContainer.src = `assets/${cardData.id}.png`;
        };
        tempImg.src = newSrc;
    }
}

function initializeCardDisplay() {
    if (!gameState || !playerId || !gameState.players[playerId]?.cards) return;
    const player = gameState.players[playerId];
    player.cards.forEach((card, index) => {
        if (index < cards.length) {
            updateCardElement(cards[index], card);
        }
    });
    previousCardData = JSON.parse(JSON.stringify(player.cards));
}

let previousCardData = [];