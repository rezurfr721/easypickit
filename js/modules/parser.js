import { weaponTypes } from '../config/constants.js';

export class Parser {
    static parseRawText(text) {
        if (!text) return this.getEmptyItemData();
        
        const lines = text.split('\n').filter(line => line && typeof line === 'string');
        const parsed = this.getEmptyItemData();

        lines.forEach(line => this.parseLine(line, parsed));
        return parsed;
    }

    static parseLine(line, parsed) {
        // Implémentation du parsing de ligne
    }

    static getEmptyItemData() {
        return {
            name: '',
            type: '',
            rarity: '',
            // ...autres propriétés par défaut...
        };
    }
}
