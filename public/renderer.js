function updateUI() {
    if (!gameState || !playerId || !opponentId || !gameState.players) return;
    const player = gameState.players[playerId];
    const opponent = gameState.players[opponentId];
    if (!player || !opponent) return;

    const oldManaContainer = document.getElementById('mana-container');
    if (oldManaContainer) oldManaContainer.remove();

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

        if (window.debugMode) {
            const baseAttackRange = 200 * Math.min(scaleX, scaleY);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(baseX, baseY, baseAttackRange, 0, Math.PI * 2);
            ctx.stroke();
        }

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

        ctx.fillStyle = healthPercent > 0.7 ? '#27ae60' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
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
                if (!window.projectiles) window.projectiles = [];

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

                // Add level display
                if (troop.level && troop.level > 1) {

                    // Add level text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${10 * Math.min(scaleX, scaleY)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                }

                // Health bar
                const healthBarWidth = troopSize;
                const healthBarHeight = 5 * Math.min(scaleX, scaleY);

                // Use maxHealth if available, otherwise use current health as max
                const maxHealth = troop.maxHealth || TROOP_CONFIG.getTroopMaxHealth(troop.type);
                const healthPercent = troop.health / maxHealth;

                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(displayX - healthBarWidth / 2, displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth, healthBarHeight);

                ctx.fillStyle = healthPercent > 0.7 ? '#27ae60' : healthPercent > 0.3 ? '#f39c12' : '#e74c3c';
                ctx.fillRect(displayX - healthBarWidth / 2, displayY - troopSize / 2 - healthBarHeight * 2,
                    healthBarWidth * healthPercent, healthBarHeight);

                // Add level text next to health bar
                if (troop.level) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${18 * Math.min(scaleX, scaleY)}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        `Lvl ${troop.level}`,
                        displayX,
                        displayY - troopSize / 2 - healthBarHeight * 4
                    );
                }
                if (troop.attacking && (troop.type === 'archer' || troop.type === 'mage')) {
                    const opponentId = Object.keys(gameState.players).find(id => id !== playerKey);
                    const opponent = gameState.players[opponentId];

                    if (opponent && opponent.troops) {
                        const targetTroop = opponent.troops.find(t => t && t.id === troop.attacking.target);

                        if (targetTroop && targetTroop.position) {
                            const targetX = targetTroop.position.x * scaleX;
                            const targetY = targetTroop.position.y * scaleY;

                            if (Math.random() < 0.05) {
                                let projectileType = troop.type === 'archer' ? 'arrow' : 'fireball';
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

    if (window.projectiles && window.projectiles.length > 0) {
        window.projectiles.forEach((projectile, index) => {
            const now = Date.now();
            const elapsed = now - projectile.startTime;
            projectile.progress = Math.min(elapsed / 500, 1);

            let currentX, currentY;
            if (projectile.type === 'arrow') {
                currentX = projectile.fromX + (projectile.toX - projectile.fromX) * projectile.progress;
                const arcHeight = 30 * Math.min(scaleX, scaleY);
                const arcFactor = 4 * projectile.progress * (1 - projectile.progress);
                currentY = projectile.fromY + (projectile.toY - projectile.fromY) * projectile.progress - arcHeight * arcFactor;
            } else {
                currentX = projectile.fromX + (projectile.toX - projectile.fromX) * projectile.progress;
                currentY = projectile.fromY + (projectile.toY - projectile.fromY) * projectile.progress;
            }

            if (!assets[projectile.type]) {
                assets[projectile.type] = new Image();
                assets[projectile.type].src = `assets/${projectile.type}.png`;
            }

            const projectileSize = 20 * Math.min(scaleX, scaleY);
            if (assets[projectile.type] && assets[projectile.type].complete) {
                ctx.drawImage(
                    assets[projectile.type],
                    currentX - projectileSize/2,
                    currentY - projectileSize/2,
                    projectileSize,
                    projectileSize
                );
            } else {
                ctx.fillStyle = projectile.type === 'arrow' ? '#2c3e50' : '#e67e22';
                ctx.beginPath();
                ctx.arc(currentX, currentY, projectileSize/3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (projectile.progress >= 1) {
                window.projectiles.splice(index, 1);
            }
        });
    }

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