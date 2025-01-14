// Global variables
let rules = [];
let hasUnsavedChanges = false;
const modsListCache = {};
let currentParsedData = null;
let parsedData = null;

// Remplacer la fonction loadModsList() par:
function loadModsList() {
    try {
        // Charger directement les mods depuis l'objet MODS_LIST
        Object.entries(MODS_LIST).forEach(([index, name]) => {
            modsListCache[parseInt(index)] = name;
        });

        console.log('Mods list loaded successfully:', Object.keys(modsListCache).length, 'entries');
    } catch (error) {
        console.error('Error initializing mods list:', error);
        
        // Initialisation avec des valeurs par défaut en cas d'erreur
        const defaultMods = {
            1: "Life",
            2: "Mana",
            3: "Energy Shield",
            4: "Armor",
            5: "Evasion"
        };

        Object.entries(defaultMods).forEach(([index, name]) => {
            modsListCache[parseInt(index)] = name;
        });

        Swal.fire({
            icon: 'warning',
            title: 'Mods List Initialization',
            text: 'Using default mods list. Some features may be limited.',
            footer: 'You can continue using the editor with basic functionality.'
        });
    }
}

// Error handling
window.onerror = function(msg, url, line) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `An error occurred: ${msg}\nLine: ${line}`,
        footer: 'Please check the console for more details'
    });
    return false;
};

// Event delegation for better performance
document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.matches('.edit-btn')) {
        editRule(parseInt(target.dataset.index));
    } else if (target.matches('.delete-btn')) {
        deleteRule(parseInt(target.dataset.index));
    }
});

async function loadFile(event) {
    const file = event.target.files[0];
    if (!file) {
        Swal.fire({ 
            icon: 'error', 
            title: 'Erreur',
            text: 'Aucun fichier sélectionné' 
        });
        return;
    }

    try {
        console.log('Chargement du fichier:', file.name);
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        rules = [];
        let lineNumber = 1;
        let errors = [];
        let inRulesSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Ignorer les lignes vides
            if (!trimmedLine) {
                lineNumber++;
                continue;
            }

            // Ignorer les commentaires et les séparateurs
            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('////')) {
                lineNumber++;
                continue;
            }

            // Vérifier si la ligne contient une règle valide
            if (trimmedLine.includes('#')) {
                try {
                    const [conditions, action] = trimmedLine.split('#').map(part => part.trim());
                    
                    // Vérifier que la règle a le bon format
                    if (conditions && action) {
                        // Vérifier le format [Type] == "Value" ou format similaire
                        if (conditions.includes('[') && conditions.includes(']')) {
                            rules.push({
                                line: lineNumber,
                                conditions,
                                action
                            });
                            console.log(`Règle valide ajoutée ligne ${lineNumber}`);
                        } else {
                            errors.push(`Ligne ${lineNumber}: Format de condition invalide - ${conditions}`);
                        }
                    }
                } catch (e) {
                    errors.push(`Ligne ${lineNumber}: Erreur de parsing - ${e.message}`);
                }
            }

            lineNumber++;
        }

        if (errors.length) {
            console.warn('Avertissements lors du chargement:', errors);
            Swal.fire({
                icon: 'warning',
                title: 'Fichier chargé avec des avertissements',
                html: `${rules.length} règles chargées<br>${errors.length} avertissements:<br>${errors.map(e => `- ${e}<br>`).join('')}`,
                width: '600px'
            });
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Chargement réussi',
                text: `${rules.length} règles chargées`
            });
        }

        console.log('Règles chargées:', rules);
        refreshTable();
        
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erreur de chargement',
            text: `Erreur: ${error.message}`
        });
    }
}

async function parseAndLoadRules(content) {
    const lines = content.split(/\r?\n/);
    rules = lines
        .filter(line => line.trim() && !line.startsWith("//"))
        .map((line, index) => {
            const parts = line.split("#");
            if (parts.length !== 2) {
                throw new Error(`Invalid rule format at line ${index + 1}`);
            }
            return {
                line: index + 1,
                conditions: parts[0].trim(),
                action: parts[1].trim()
            };
        });
}

// Ajout de la liste des actions
const actionsList = [
    "StashItem", "StashUnid", "Salvage","SellItem"
    // Ajoutez d'autres actions si nécessaire
];

// Ajout des types depuis normal.ipd
const typesList = [
    // OneHandedWeapons
    "Claws", "Daggers", "Wands", "OneHandSwords", "OneHandAxes", "OneHandMaces", "Sceptres", "Spears", "Flails",
    // TwoHandedWeapons
    "Bows", "Staves", "TwoHandSwords", "TwoHandAxes", "TwoHandMaces", "Quarterstaves", "Crossbows", "Traps", "FishingRods",
    // OffHand
    "Quivers", "Shields", "Foci",
    // Armour
    "Gloves", "Boots", "BodyArmours", "Helmets"
];

// Variable pour tracker les modifications

// Avertissement avant de fermer la page si modifications non sauvegardées
window.onbeforeunload = function() {
    if (hasUnsavedChanges) {
        return "You have unsaved changes. Are you sure you want to leave?";
    }
};

function addRule() {
    // On crée une règle vide
    const emptyRule = { 
        line: rules.length + 1, 
        conditions: '', 
        action: ''
    };
    
    // On utilise editRule avec la nouvelle règle
    editRule(-1, emptyRule);
}

function renderRules() {
    const tbody = document.querySelector('#rulesTable tbody');
    tbody.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rule.line}</td>
            <td>${rule.conditions}</td>
            <td>${rule.action}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editRule(${index})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteRule(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Chargement du fichier .ipd et affichage des règles dans le tableau
 * Version : 1.3.0
 */
function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const lines = e.target.result.split(/\r?\n/);
            rules = [];
            let lineNumber = 1;
            lines.forEach(line => {
                if (line.trim() && !line.startsWith("//")) {
                    const parts = line.split("#");
                    if (parts.length === 2) {
                        rules.push({
                            line: lineNumber,
                            conditions: parts[0].trim(),
                            action: parts[1].trim()
                        });
                    } else {
                        console.warn(`Invalid rule format at line ${lineNumber}: ${line}`);
                    }
                }
                lineNumber++;
            });
            renderRules();
            Swal.fire({
                icon: 'success',
                title: 'File loaded successfully',
                text: `Loaded ${rules.length} rules`
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error loading file',
                text: error.message
            });
        }
    };
    reader.onerror = function() {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to read the file'
        });
    };
    reader.readAsText(file);
}

/**
 * Rafraîchit le tableau avec les règles chargées
 * Version : 1.3.0
 */
function refreshTable() {
    const tbody = document.querySelector("#rulesTable tbody");
    tbody.innerHTML = "";
    rules.forEach((rule, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = rule.line;
        row.insertCell().textContent = rule.conditions;
        row.insertCell().textContent = rule.action;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn btn-primary btn-sm" onclick='editRule(${index})'><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick='deleteRule(${index})'><i class="fas fa-trash"></i></button>
        `;
    });
}
const keysList = [
    // Identifiers
    "Type", "Category", "Rarity", "ItemLevel", "Quality", "Sockets", "Linked",
    
    // Basic Defense
    "Armor", "Evasion", "EnergyShield",
    
    // Computed Defense
    "ComputedArmour", "ComputedEvasion", "ComputedEnergyShield",
    
    // Damage Calculations
    "DPS", "ElementalDPS", "PhysicalDPS",
    
    // Resistances and Totals
    "TotalResistances",
    
    // Spell Damage Totals
    "TotalSpellElementalDamage",
    "TotalFireSpellDamage", 
    "TotalColdSpellDamage",
    "TotalLightningSpellDamage",
    
    // Map Related
    "MapTier",
    
    // Special
    "Influence"
];

const categoryList = [
    // Equipment
    "BodyArmour", "Gloves", "Boots", "Belt", "Helmet", "Ring", "Amulet",
    // Weapons
    "Weapon", "1Handed", "2Handed", "OffHand",
    // Others
    "Flask", "Map"
];

const rarityList = [
    "Normal", "Magic", "Rare", "Unique"
];

const influenceTypes = [
    "None", "Shaper", "Elder", "Crusader", "Redeemer", "Hunter", "Warlord"
];

const operatorsList = [
    {value: "==", label: "equals"},
    {value: "!=", label: "not equals"},
    {value: ">=", label: "greater or equal"},
    {value: "<=", label: "less or equal"},
    {value: ">", label: "greater than"},
    {value: "<", label: "less than"}
];

// Ajout d'un objet pour stocker les mods
const modsDatabase = {};

// Remplacer la fonction loadModsList() par:
function loadModsList() {
    try {
        // Charger directement les mods depuis l'objet MODS_LIST
        Object.entries(MODS_LIST).forEach(([index, name]) => {
            modsListCache[parseInt(index)] = name;
        });

        console.log('Mods list loaded successfully:', Object.keys(modsListCache).length, 'entries');
    } catch (error) {
        console.error('Error initializing mods list:', error);
        
        // Initialisation avec des valeurs par défaut en cas d'erreur
        const defaultMods = {
            1: "Life",
            2: "Mana",
            3: "Energy Shield",
            4: "Armor",
            5: "Evasion"
        };

        Object.entries(defaultMods).forEach(([index, name]) => {
            modsListCache[parseInt(index)] = name;
        });

        Swal.fire({
            icon: 'warning',
            title: 'Mods List Initialization',
            text: 'Using default mods list. Some features may be limited.',
            footer: 'You can continue using the editor with basic functionality.'
        });
    }
}

// Mise à jour de l'appel initial
document.addEventListener('DOMContentLoaded', () => {
    loadModsList();  // Appel direct sans vérification de fichier
});

// Mise à jour de la fonction getModName pour être plus robuste
function getModName(index) {
    if (!index || isNaN(index)) return 'Invalid Mod Index';
    return modsListCache[index] || `Unknown Mod (${index})`;
}

function createValueInput(key, index, value = '') {
    // Vérifier si la clé est un nombre
    if (!isNaN(key)) {
        const modInfo = modsDatabase[key];
        const tooltip = modInfo ? 
            `<div class="tooltip-text">${modInfo.name}: ${modInfo.description}</div>` : 
            '';
        return `
            <div class="tooltip">
                <input type="text" 
                       id="condition-value-${index}" 
                       value="${value}" 
                       onchange="updatePreview()">
                ${tooltip}
            </div>`;
    }

    // Le reste du code existant pour Category, Rarity, etc.
    if (key === 'Category') {
        return `
            <select id="condition-value-${index}" onchange="updatePreview()">
                <option value="">Select Category</option>
                ${categoryList.map(cat => 
                    `<option value="${cat}" ${value === cat ? 'selected' : ''}>${cat}</option>
                `).join('')}
            </select>`;
    }
    if (key === 'Rarity') {
        return `
            <select id="condition-value-${index}" onchange="updatePreview()">
                <option value="">Select Rarity</option>
                ${rarityList.map(rarity => 
                    `<option value="${rarity}" ${value === rarity ? 'selected' : ''}>${rarity}</option>
                `).join('')}
            </select>`;
    }
    // Suppression de la condition pour Type, il utilisera maintenant le return par défaut
    return `<input type="text" id="condition-value-${index}" value="${value}" onchange="updatePreview()">`;
}

function onKeyChange(index) {
    const keySelect = document.getElementById(`condition-key-${index}`);
    const key = keySelect.value;
    const valueCell = document.getElementById(`value-cell-${index}`);
    const currentValue = document.getElementById(`condition-value-${index}`)?.value || '';
    
    // Si la clé est un nombre, vérifier dans la base de données des mods
    if (!isNaN(key) && modsDatabase[key]) {
        valueCell.innerHTML = createValueInput(key, index, currentValue);
