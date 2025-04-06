// troopConfig.js - Configuration file for troop types and related settings

const TROOP_CONFIG = {
    // Base troop configuration with health, size, and colors
    types: {
        soldier: {
            maxHealth: 10,
            size: 70,
            playerColor: '#2980b9',
            enemyColor: '#c0392b',
            attackColor: '#f39c12'
        },
        tank: {
            maxHealth: 25,
            size: 135,
            playerColor: '#7f8c8d',
            enemyColor: '#cd6155',
            attackColor: '#e74c3c'
        },
        archer: {
            maxHealth: 7,
            size: 85,
            playerColor: '#3498db',
            enemyColor: '#e67e22',
            attackColor: '#9b59b6'
        },
        berserker: {
            maxHealth: 12,
            size: 90,
            playerColor: '#e74c3c',
            enemyColor: '#d35400',
            attackColor: '#c0392b'
        },
        knight: {
            maxHealth: 18,
            size: 110,
            playerColor: '#f39c12',
            enemyColor: '#b9770e',
            attackColor: '#d35400'
        },
        mage: {
            maxHealth: 6,
            size: 80,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad'
        }
    },

    // Helper functions for accessing troop data
    getTroopMaxHealth: function(troopType) {
        return this.types[troopType]?.maxHealth || this.types.soldier.maxHealth;
    },

    getTroopSize: function(troopType) {
        return this.types[troopType]?.size || this.types.soldier.size;
    },

    getPlayerColor: function(troopType) {
        return this.types[troopType]?.playerColor || this.types.soldier.playerColor;
    },

    getEnemyColor: function(troopType) {
        return this.types[troopType]?.enemyColor || this.types.soldier.enemyColor;
    },

    getAttackColor: function(troopType) {
        return this.types[troopType]?.attackColor || this.types.soldier.attackColor;
    },

    // Game constants
    CARD_ANIMATION_DURATION: 300, // ms
    BASE_MAX_HEALTH: 100
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TROOP_CONFIG;
}