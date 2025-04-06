// troopConfig.js

// Configuration for all troop types
const troopTypes = {
    // Regular soldier - balanced stats
    soldier: {
        id: 'soldier',
        health: 100,
        attack: 10,
        range: 50,
        speed: 15,
        attackSpeed: 1, // attacks per second
        cost: 1,        // energy cost
        manaCost: 1,    // mana cost to play this troop
        imageUrl: 'assets/soldier.png',
        description: 'Balanced infantry unit'
    },

    // Tank - high health, low speed, medium damage
    tank: {
        id: 'tank',
        health: 250,
        attack: 15,
        range: 40,
        speed: 3,
        attackSpeed: 0.7, // slower attack
        cost: 3,
        manaCost: 3,    // mana cost to play this troop
        imageUrl: 'assets/tank.png',
        description: 'Heavy unit with high health'
    },

    // Archer - low health, high range, medium damage
    archer: {
        id: 'archer',
        health: 70,
        attack: 12,
        range: 350,
        speed: 4,
        attackSpeed: 3,
        cost: 2,
        manaCost: 2,    // mana cost to play this troop
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