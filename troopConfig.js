// troopConfig.js
const playerTroopLevels = {};

// Initialize player troop levels
function initializePlayerTroopLevels(playerId) {
    if (!playerTroopLevels[playerId]) {
        playerTroopLevels[playerId] = {
            escroto: 0,
            tank: 0,
            archer: 0,
            berserker: 0,
            knight: 0,
            mage: 0,
            flacidos: 0,
            lapiz: 0
        };
    }
    return playerTroopLevels[playerId];
}

// Level up a specific troop type for a player
function levelUpTroop(playerId, troopType) {
    if (!playerTroopLevels[playerId]) {
        initializePlayerTroopLevels(playerId);
    }

    // Increase the level
    playerTroopLevels[playerId][troopType]++;

    return playerTroopLevels[playerId][troopType];
}

// Get the current level for a troop type
function getTroopLevel(playerId, troopType) {
    if (!playerTroopLevels[playerId]) {
        initializePlayerTroopLevels(playerId);
    }

    return playerTroopLevels[playerId][troopType] || 1;
}

// Calculate stats with level bonuses (10% per level)
function getScaledTroopStat(baseStat, level) {
    // Base case - level 1 returns the base stat
    if (level <= 1) {
        return Math.floor(baseStat * 100) / 100;
    }

    let scaledStat = baseStat;

    // Apply scaling for each level above 1
    for (let i = 2; i <= level; i++) {
        // Calculate percentage for this level (10% + (i-2)*1%)
        let percentage = 10 + (i - 2);
        let increase = baseStat * (percentage / 100);
        scaledStat += increase;
    }

    // Round down to 2 decimal places
    return Math.floor(scaledStat * 100) / 100;
}

// Configuration for all troop types
const troopTypes = {
    // Regular soldier - balanced stats
    escroto: {
        id: 'escroto',
        health: 2,
        attack: 1,
        range: 35,
        speed: 10,
        attackSpeed: 1.5 // attacks per second
    },

    // Tank - high health, low speed, medium damage
    tank: {
        id: 'tank',
        health: 45,
        attack: 2,
        range: 40,
        speed: 3,
        attackSpeed: 1 // slower attack
    },

    // Archer - low health, high range, medium damage
    archer: {
        id: 'archer',
        health: 7,
        attack: 3,
        range: 225,
        speed: 4,
        attackSpeed: 1
    },

    // Berserker - medium health, high attack, low range
    berserker: {
        id: 'berserker',
        health: 15,
        attack: 4,
        range: 15,
        speed: 15,      // fast
        attackSpeed: 2  // attacks faster
    },

    // Knight - high health, high attack, medium range
    knight: {
        id: 'knight',
        health: 18,
        attack: 3,
        range: 35,
        speed: 5.5,
        attackSpeed: 0.8 // slower attack
    },

    // Mage - very low health, high range, high damage
    mage: {
        id: 'mage',
        health: 5,
        attack: 12,
        range: 275,
        speed: 3.5,
        attackSpeed: 0.66 // slower attack
    },

    shuffler: {
        id: 'shuffler',
        health: 0,
        attack: 0,
        range: 0,
        speed: 0,
        attackSpeed: 0 // slower attack
    },

    flacidos: {
        id: 'flacidos',
        health: 4,
        attack: 2,
        range: 50,
        speed: 7,
        attackSpeed: 1.5 // slower attack
    },

    lapiz: {
        id: 'lapiz',
        health: 50,
        attack: 1,
        range: 350,
        speed: 0.166,
        attackSpeed: 2.66 // slower attack
    },
    lacaja: {
        id: 'lacaja',
        health: 0,
        attack: 0,
        range: 0,
        speed: 0,
        attackSpeed: 0 // slower attack
    }
};

// Map card IDs to troop types
const cardTroopMapping = {
    'card1': troopTypes.escroto,
    'card2': troopTypes.archer,
    'card3': troopTypes.tank,
    'card4': troopTypes.berserker,
    'card5': troopTypes.knight,
    'card6': troopTypes.mage,
    'card7': troopTypes.shuffler,
    'card8': troopTypes.flacidos,
    'card9': troopTypes.lapiz,
    'card10': troopTypes.lacaja
};

// Export configurations
module.exports = {
    troopTypes,
    cardTroopMapping,
    initializePlayerTroopLevels,
    levelUpTroop,
    getTroopLevel,
    getScaledTroopStat,

    // Method to get troop config by card ID
    getTroopConfigByCardId: function(cardId) {
        return cardTroopMapping[cardId] || troopTypes.escroto; // Default to soldier
    },

    // Method to get troop config by type ID
    getTroopConfigByTypeId: function(typeId) {
        return troopTypes[typeId] || troopTypes.escroto; // Default to soldier
    },

    // Get mana cost for a troop type - keeping function signature but updating implementation
    getManaCost: function(typeId) {
        return 1; // Default to 1 since manaCost was removed
    }
};