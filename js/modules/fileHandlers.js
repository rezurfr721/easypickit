import { UI } from './ui.js';
import { rules } from '../config/settings.js';

export class FileHandler {
    static async loadFile(event) {
        const file = event.target.files[0];
        if (!file) {
            UI.showError('Aucun fichier sélectionné');
            return;
        }

        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            let lineNumber = 1;
            let errors = [];

            // Vider les règles existantes
            rules.length = 0;

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (!trimmedLine || trimmedLine.startsWith('//')) {
                    lineNumber++;
                    continue;
                }

                if (trimmedLine.includes('#')) {
                    try {
                        const [conditions, action] = trimmedLine.split('#').map(part => part.trim());
                        if (conditions && action) {
                            rules.push({
                                line: lineNumber,
                                conditions,
                                action
                            });
                            console.log(`Règle ajoutée: ${conditions} # ${action}`);
                        }
                    } catch (e) {
                        errors.push(`Ligne ${lineNumber}: ${e.message}`);
                    }
                }
                lineNumber++;
            }

            // Mise à jour de l'interface
            UI.renderRules(rules);

            if (errors.length > 0) {
                UI.showWarning('Fichier chargé avec des avertissements', rules.length, errors);
            } else {
                UI.showSuccess('Chargement réussi', `${rules.length} règles chargées`);
            }

        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            UI.showError('Erreur de chargement du fichier');
        }
    }

    static exportFile() {
        // ... implémentation de l'export
    }
}
