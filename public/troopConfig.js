// troopConfig.js - Configuration file for troop types and related settings

const TROOP_CONFIG = {
    // Base troop configuration with health, size, and colors
    types: {
        escroto: {
            id: 'escroto',
            nombre: 'escroto',
            maxHealth: 2,
            health: 2,
            attack: 1,
            range: 35,
            speed: 10,
            attackSpeed: 1.5, // attacks per second
            size: 80,
            coste:1,
            playerColor: '#2980b9',
            enemyColor: '#c0392b',
            attackColor: '#f39c12',
            description: 'Un escroto que solo hace bulto.'
        },
        tank: {
            id: 'tank',
            nombre: 'poyón',
            maxHealth: 55,
            health: 45,
            attack: 2,
            range: 40,
            speed: 2.5,
            attackSpeed: 1, // slower attack
            size: 190,
            coste: 8,
            playerColor: '#7f8c8d',
            enemyColor: '#cd6155',
            attackColor: '#e74c3c',
            description: 'Conocido como general titagorda.'
        },
        archer: {
            id: 'archer',
            nombre: 'salpicona',
            maxHealth: 7,
            health: 7,
            attack: 1.5,
            range: 225,
            speed: 4,
            attackSpeed: 2,
            size: 95,
            coste: 5,
            playerColor: '#3498db',
            enemyColor: '#e67e22',
            attackColor: '#9b59b6',
            description: 'Escupe pequeñas cantidades de cum a gran velocidad.'
        },
        berserker: {
            id: 'berserker',
            nombre: 'poya jinete',
            maxHealth: 13,
            health: 15,
            attack: 2,
            range: 15,
            speed: 17,      // fast
            attackSpeed: 2,  // attacks faster
            size: 110,
            coste:4,
            playerColor: '#e74c3c',
            enemyColor: '#d35400',
            attackColor: '#c0392b',
            description: 'Tiene un objetivo, fecundar, y lo va a conseguir.'
        },
        knight: {
            id: 'knight',
            nombre: 'micropoya',
            maxHealth: 18,
            health: 15,
            attack: 3,
            range: 35,
            speed: 5.5,
            attackSpeed: 0.8, // slower attack
            size: 120,
            coste:3,
            playerColor: '#f39c12',
            enemyColor: '#b9770e',
            attackColor: '#d35400',
            description: 'Nose tío, average size 18cms.'
        },
        mage: {
            id: 'mage',
            nombre: 'poya hechizera',
            maxHealth: 5,
            health: 5,
            attack: 9,
            range: 275,
            speed: 3.5,
            attackSpeed: 0.66, // slower attack
            size: 100,
            coste: 7,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad',
            description: 'Vacía los testículos al completo con una gran salpicadura lechosa.'
        },
        flacidos: {
            id: 'flacidos',
            nombre:'flácidos',
            maxHealth: 4,
            health: 4,
            attack: 2,
            range: 50,
            speed: 7,
            attackSpeed: 1.5,
            size: 100,
            coste:5,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad',
            description: 'La unión hace la fuerza y 3 no son multidud'
        },
        lapiz: {
            id: 'lapiz',
            nombre: 'lapiz',
            maxHealth: 25,
            health: 25,
            attack: 1,
            range: 285,
            speed: 0.1,
            attackSpeed: 2.33,
            size: 120,
            coste:6,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad',
            description: 'jaja poya lapiz'
        },
        shuffler: {
            id: 'shuffler',
            nombre: 'intercambio de poyas',
            size: 100,
            coste:0,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad',
            description: 'Baile de pitos, renueva las poyas disponibles con 4 aleatorias.'
        },
        lacaja: {
            id: 'lacaja',
            nombre:'La caja',
            size: 130,
            coste:10,
            playerColor: '#9b59b6',
            enemyColor: '#8e44ad',
            attackColor: '#8e44ad',
            description: 'Una caja misteriosa de la que salen vergas de todo tipo. ¿Qué puede salir mal?'
        },
        pildoras: {
            id: 'pildoras',
            nombre: 'Píldoras Mágicas',
            coste:4,
            playerColor: '#f39c12',
            enemyColor: '#b9770e',
            attackColor: '#d35400',
            description: 'lo que toman los machos alpha, +12 en virilidad'
        },
        bolsa: {
            id: 'bolsa',
            nombre: 'Bolsa de Cum',
            coste:2,
            playerColor: '#f39c12',
            enemyColor: '#b9770e',
            attackColor: '#d35400',
            description: 'reutilizable'
        },
    },

    // Helper functions for accessing troop data
    getTroopMaxHealth: function(troopType) {
        return this.types[troopType]?.maxHealth || this.types.escroto.maxHealth;
    },

    getTroopSize: function(troopType) {
        return this.types[troopType]?.size || this.types.escroto.size;
    },

    getPlayerColor: function(troopType) {
        return this.types[troopType]?.playerColor || this.types.escroto.playerColor;
    },

    getEnemyColor: function(troopType) {
        return this.types[troopType]?.enemyColor || this.types.escroto.enemyColor;
    },

    getAttackColor: function(troopType) {
        return this.types[troopType]?.attackColor || this.types.escroto.attackColor;
    },

    getTroopDescription: function(troopType) {
        return this.types[troopType]?.description || "No description available.";
    },

    // Game constants
    CARD_ANIMATION_DURATION: 300, // ms
    BASE_MAX_HEALTH: 100
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TROOP_CONFIG;
}