// Cache pour la liste des mods
export const modsListCache = {};

// Tableau pour stocker les règles
export const rules = [];

// Configuration de l'application
export const config = {
    maxRules: 1000,
    defaultAction: 'StashItem',
    exportFileName: 'rules.ipd',
    version: '1.0.0'
};

// Options pour l'interface utilisateur
export const uiSettings = {
    darkMode: true,
    showLineNumbers: true,
    confirmDeletion: true
};
