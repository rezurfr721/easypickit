import { ModsManager } from './modules/modsList.js';
import { FileHandler } from './modules/fileHandlers.js';
import { BetaPickitCreator } from './modules/betaPickitCreator.js';

// Point d'entrée principal
document.addEventListener('DOMContentLoaded', () => {
    ModsManager.loadModsList();
    
    // Ajouter l'écouteur d'événements pour le chargement de fichier
    document.getElementById('fileInput').addEventListener('change', FileHandler.loadFile);

    // Exposer loadFile globalement si nécessaire
    window.loadFile = FileHandler.loadFile;
    
    // Initialiser le BetaPickitCreator
    window.showBetaPickitCreator = () => {
        document.querySelectorAll('.container > .card').forEach(card => card.style.display = 'none');
        document.getElementById('betaPickitCreator').style.display = 'block';
        BetaPickitCreator.init();
    };
});
