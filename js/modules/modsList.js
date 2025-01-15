import { modsListCache } from '../config/settings.js';

export class ModsManager {
    static async loadModsList() {
        try {
            Object.entries(MODS_LIST).forEach(([index, name]) => {
                modsListCache[parseInt(index)] = name;
            });
            console.log('Mods list loaded successfully:', Object.keys(modsListCache).length, 'entries');
        } catch (error) {
            console.error('Error loading mods list:', error);
            this.loadDefaultMods();
        }
    }

    static loadDefaultMods() {
        // Implementation des mods par défaut
    }

    static getModName(index) {
        if (!index || isNaN(index)) return 'Invalid Mod Index';
        return modsListCache[index] || `Unknown Mod (${index})`;
    }
}
