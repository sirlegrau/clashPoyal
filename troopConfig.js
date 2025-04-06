// troopConfig.js

// Configuration for all troop types
const troopTypes = {
    // Regular soldier - balanced stats
    soldier: {
        id: 'soldier',
        health: 10,
        attack: 1,
        range: 50,
        speed: 12,
        attackSpeed: 1, // attacks per second
        cost: 1,        // energy cost
        manaCost: 2,    // mana cost to play this troop
        imageUrl: 'assets/soldier.png',
        description: 'Balanced infantry unit'
    },

    // Tank - high health, low speed, medium damage
    tank: {
        id: 'tank',
        health: 25,
        attack: 2,
        range: 40,
        speed: 3,
        attackSpeed: 1, // slower attack
        cost: 3,
        manaCost: 8,    // mana cost to play this troop
        imageUrl: 'assets/tank.png',
        description: 'Heavy unit with high health'
    },

    // Archer - low health, high range, medium damage
    archer: {
        id: 'archer',
        health: 5,
        attack: 3,
        range: 300,
        speed: 5,
        attackSpeed: 1,
        cost: 2,
        manaCost: 5,    // mana cost to play this troop
        imageUrl: 'assets/archer.png',
        description: 'Ranged unit with high attack range'
    }
};

// Map card IDs to troop types
const cardTroopMapping = {
    'card1': troopTypes.soldier,
    'card2': troopTypes.archer,
    'card3': troopTypes.tank
};

// Export configurations
module.exports = {
    troopTypes,
    cardTroopMapping,

    // Method to get troop config by card ID
    getTroopConfigByCardId: function(cardId) {
        return cardTroopMapping[cardId] || troopTypes.soldier; // Default to soldier
    },

    // Method to get troop config by type ID
    getTroopConfigByTypeId: function(typeId) {
        return troopTypes[typeId] || troopTypes.soldier; // Default to soldier
    },

    // Get mana cost for a troop type
    getManaCost: function(typeId) {
        return troopTypes[typeId]?.manaCost || 1; // Default to 1
    }
};