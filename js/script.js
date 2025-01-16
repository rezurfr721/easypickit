// Global variables
        let rules = [];
        let hasUnsavedChanges = false;
        const modsListCache = {};
        let currentParsedData = null;
        let parsedData = null;

        const DEFAULT_MODS = {
            1: "Life",
            2: "Mana",
            3: "Energy Shield",
            4: "Armor",
            5: "Evasion",
            6: "Block",
            7: "Spell Block",
            8: "Attack Speed",
            9: "Cast Speed",
            10: "Movement Speed"
        };

        const actionsList = [
            "StashItem", "StashUnid", "Salvage", "SellItem"
        ];

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

        const weaponTypes = [
            "Claws", "Daggers", "Wands", "OneHandSwords", "OneHandAxes", "OneHandMaces", 
            "Sceptres", "Spears", "Flails", "Bows", "Staves", "TwoHandSwords", 
            "TwoHandAxes", "TwoHandMaces", "Quarterstaves", "Crossbows", "Traps", 
            "FishingRods", "Quivers", "Shields", "Foci"
        ];

        // Remplacer la fonction loadModsList() par:
        async function loadModsList() {
            try {
                const response = await fetch('./js/mods_list.json');
                if (!response.ok) throw new Error('Failed to load mods list');
                
                const modsData = await response.json();
                Object.entries(modsData).forEach(([index, name]) => {
                    modsListCache[parseInt(index)] = name;
                });
                console.log('Mods list loaded from JSON:', Object.keys(modsListCache).length, 'entries');
            } catch (error) {
                console.warn('Using default mods list due to error:', error);
                // En cas d'erreur, utiliser la liste par défaut
                Object.entries(DEFAULT_MODS).forEach(([index, name]) => {
                    modsListCache[parseInt(index)] = name;
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

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    
                    if (!trimmedLine) {
                        lineNumber++;
                        continue;
                    }

                    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('////')) {
                        lineNumber++;
                        continue;
                    }

                    if (trimmedLine.includes('#')) {
                        try {
                            const [conditions, action] = trimmedLine.split('#').map(part => part.trim());
                            
                            if (conditions && action) {
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
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    tbody.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.classList.add('rule-row');
        
        row.innerHTML = `
            <td>${rule.line}</td>
            <td class="conditions-cell" onclick="makeEditable(this)">
                <span class="content">${rule.conditions}</span>
                <input type="text" class="edit-input d-none" value="${rule.conditions}">
            </td>
            <td class="action-cell" onclick="makeEditable(this)">
                <span class="content">${rule.action}</span>
                <select class="edit-input d-none">
                    ${actionsList.map(action => 
                        `<option value="[${action}] == &quot;true&quot;" ${rule.action === `[${action}] == "true"` ? 'selected' : ''}>
                            ${action}
                        </option>`
                    ).join('')}
                </select>
            </td>
            <td class="actions-cell">
                <div class="btn-group">
                    <button class="btn btn-outline-secondary" onclick="editInline(${index})" title="Quick Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-outline-primary" onclick="editRule(${index})" title="Advanced Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteRule(${index})" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Ajouter les gestionnaires d'événements pour le clic sur les lignes
    document.querySelectorAll('.rule-row').forEach(row => {
        row.addEventListener('click', function(e) {
            if (!e.target.closest('.actions-cell')) {
                const index = parseInt(this.dataset.index);
                editInline(index);
            }
        });
    });
}

function makeEditable(cell) {
    const content = cell.querySelector('.content');
    const input = cell.querySelector('.edit-input');
    
    if (content && input) {
        content.classList.add('d-none');
        input.classList.remove('d-none');
        input.focus();
        
        input.onblur = () => saveEditable(cell);
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveEditable(cell);
            }
        };
    }
}

function saveEditable(cell) {
    const content = cell.querySelector('.content');
    const input = cell.querySelector('.edit-input');
    const row = cell.closest('tr');
    const index = parseInt(row.dataset.index);
    
    if (content && input && !isNaN(index)) {
        const newValue = input.value.trim();
        
        if (cell.classList.contains('conditions-cell')) {
            rules[index].conditions = newValue;
        } else if (cell.classList.contains('action-cell')) {
            rules[index].action = newValue;
        }
        
        content.textContent = newValue;
        content.classList.remove('d-none');
        input.classList.add('d-none');
        
        hasUnsavedChanges = true;
    }
}

function editInline(index) {
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) {
        const conditionsCell = row.querySelector('.conditions-cell');
        const actionCell = row.querySelector('.action-cell');
        
        makeEditable(conditionsCell);
        makeEditable(actionCell);
    }
}

function enableInlineEdit(row) {
    row.classList.add('editing');
    row.querySelectorAll('.edit-input').forEach(input => input.classList.remove('d-none'));
    row.querySelectorAll('.content').forEach(span => span.classList.add('d-none'));
    row.querySelector('.edit-inline').classList.add('d-none');
    row.querySelector('.edit-modal').classList.add('d-none');
    row.querySelector('.delete-rule').classList.add('d-none');
    row.querySelector('.save-inline').classList.remove('d-none');
    row.querySelector('.cancel-inline').classList.remove('d-none');
}

function saveInlineEdit(row) {
    const index = parseInt(row.dataset.index);
    const conditions = row.querySelector('.conditions-cell .edit-input').value;
    const action = row.querySelector('.action-cell .edit-input').value;

    // Validation des valeurs
    if (!validateInlineEdit(conditions, action)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            text: 'Please check your conditions and action format'
        });
        return;
    }

    // Mise à jour des données
    rules[index].conditions = conditions;
    rules[index].action = action;
    
    // Mise à jour de l'affichage
    row.querySelector('.conditions-cell .content').textContent = conditions;
    row.querySelector('.action-cell .content').textContent = action;
    
    cancelInlineEdit(row);
    hasUnsavedChanges = true;
}

function cancelInlineEdit(row) {
    row.classList.remove('editing');
    row.querySelectorAll('.edit-input').forEach(input => input.classList.add('d-none'));
    row.querySelectorAll('.content').forEach(span => span.classList.remove('d-none'));
    row.querySelector('.edit-inline').classList.remove('d-none');
    row.querySelector('.edit-modal').classList.remove('d-none');
    row.querySelector('.delete-rule').classList.remove('d-none');
    row.querySelector('.save-inline').classList.add('d-none');
    row.querySelector('.cancel-inline').classList.add('d-none');
}

function validateInlineEdit(conditions, action) {
    // Validation des conditions
    if (!conditions) return false;
    
    // Vérifier la structure basique [Key] Operator "Value"
    const conditionParts = conditions.split(/\s*(?:&&|\|\|)\s*/);
    for (const part of conditionParts) {
        const isValidFormat = /^\[[\w\s]+\]\s*([=!<>]=?)\s*"[^"]*"$/.test(part.trim());
        if (!isValidFormat) return false;
        
        // Vérifier si la clé existe dans nos listes connues
        const keyMatch = part.match(/\[([\w\s]+)\]/);
        if (keyMatch) {
            const key = keyMatch[1];
            const isValidKey = [...keysList, ...Object.values(modsListCache)].some(k => 
                k.toLowerCase() === key.toLowerCase()
            );
            if (!isValidKey) return false;
        }
    }

    // Validation de l'action
    if (!action) return false;
    const isValidAction = actionsList.some(validAction => 
        action === `[${validAction}] == "true"`
    );
    
    return isValidAction;
}

function enableInlineEdit(row) {
    row.classList.add('editing');
    
    // Configuration de l'éditeur de conditions
    const conditionsCell = row.querySelector('.conditions-cell');
    const conditionsInput = conditionsCell.querySelector('.edit-input');
    const conditionsContent = conditionsCell.querySelector('.content');
    
    // Configuration de l'éditeur d'action
    const actionCell = row.querySelector('.action-cell');
    const actionSelect = actionCell.querySelector('.edit-input');
    const actionContent = actionCell.querySelector('.content');

    // Afficher les éditeurs
    conditionsInput.classList.remove('d-none');
    actionSelect.classList.remove('d-none');
    conditionsContent.classList.add('d-none');
    actionContent.classList.add('d-none');

    // Masquer/Afficher les boutons appropriés
    row.querySelector('.edit-inline').classList.add('d-none');
    row.querySelector('.edit-modal').classList.add('d-none');
    row.querySelector('.delete-rule').classList.add('d-none');
    row.querySelector('.save-inline').classList.remove('d-none');
    row.querySelector('.cancel-inline').classList.remove('d-none');

    // Ajouter l'auto-complétion pour les conditions
    setupConditionsAutocomplete(conditionsInput);

    // Focus sur l'input des conditions
    conditionsInput.focus();
}

function setupConditionsAutocomplete(input) {
    // Liste des suggestions courantes
    const suggestions = [
        ...keysList.map(key => `[${key}]`),
        ...Object.values(modsListCache).map(mod => `[${mod}]`),
        ' == ', ' != ', ' >= ', ' <= ', ' > ', ' < ',
        ' && ', ' || ',
        '"Normal"', '"Magic"', '"Rare"', '"Unique"'
    ];

    // Créer un élément pour la liste de suggestions
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'suggestions-list';
    input.parentNode.appendChild(suggestionsList);

    input.addEventListener('input', () => {
        const cursorPos = input.selectionStart;
        const inputValue = input.value;
        const lastWord = getLastWord(inputValue, cursorPos);

        if (lastWord) {
            const matches = suggestions.filter(s => 
                s.toLowerCase().startsWith(lastWord.toLowerCase())
            );

            if (matches.length > 0) {
                showSuggestions(matches, input, suggestionsList, lastWord);
            } else {
                hideSuggestions(suggestionsList);
            }
        } else {
            hideSuggestions(suggestionsList);
        }
    });
}

function saveInlineEdit(row) {
    const index = parseInt(row.dataset.index);
    const conditions = row.querySelector('.conditions-cell .edit-input').value;
    const action = row.querySelector('.action-cell .edit-input').value;

    if (!validateInlineEdit(conditions, action)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Input',
            html: `Please check your input format:<br>
                  Conditions: [Key] Operator "Value"<br>
                  Multiple conditions can be joined with && or ||<br>
                  Action must be one of the predefined actions`,
            showClass: { popup: 'animate__animated animate__fadeInDown' }
        });
        return;
    }

    // Mise à jour des données
    rules[index].conditions = conditions;
    rules[index].action = action;
    
    // Mise à jour de l'affichage
    row.querySelector('.conditions-cell .content').textContent = conditions;
    row.querySelector('.action-cell .content').textContent = action;
    
    cancelInlineEdit(row);
    hasUnsavedChanges = true;

    // Notification de succès
    const toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000
    });
    toast.fire({
        icon: 'success',
        title: 'Rule updated successfully'
    });
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
                actionsCell.className = 'actions-cell';
                actionsCell.innerHTML = `
                    <div class="btn-group">
                        <button class="btn btn-primary" onclick="editRule(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick="deleteRule(${index})" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
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

        // Mise à jour de l'appel initial
        document.addEventListener('DOMContentLoaded', async () => {
            await loadModsList();  // Appel direct sans vérification de fichier
        });

        // Mise à jour de la fonction getModName pour être plus robuste
        function getModName(index) {
            if (!index || isNaN(index)) return 'Invalid Mod Index';
            return modsListCache[index] || `Unknown Mod (${index})`;
        }

        function createValueInput(key, index, value = '') {
            const baseClass = 'form-control form-control-sm bg-dark text-light border-secondary';
    
            if (!isNaN(key)) {
                return `
                    <div class="input-group input-group-sm">
                        <input type="text" 
                               class="${baseClass}"
                               id="condition-value-${index}" 
                               value="${value}" 
                               onchange="updatePreview()">
                        <span class="input-group-text bg-dark text-light border-secondary">
                            <i class="fas fa-info-circle" title="${getModName(key)}"></i>
                        </span>
                    </div>`;
            }
        
            if (key === 'Category') {
                return `
                    <select id="condition-value-${index}" 
                            class="form-select form-select-sm bg-dark text-light border-secondary" 
                            onchange="updatePreview()">
                        <option value="">Select Category</option>
                        ${categoryList.map(cat => 
                            `<option value="${cat}" ${value === cat ? 'selected' : ''}>${cat}</option>`
                        ).join('')}
                    </select>`;
            }
        
            // ... reste des cas spéciaux
        
            return `
                <input type="text" 
                       class="${baseClass}"
                       id="condition-value-${index}" 
                       value="${value}" 
                       onchange="updatePreview()">`;
        }

        function onKeyChange(index) {
            const keySelect = document.getElementById(`condition-key-${index}`);
            const key = keySelect.value;
            const valueCell = document.getElementById(`value-cell-${index}`);
            const currentValue = document.getElementById(`condition-value-${index}`)?.value || '';
            
            // Si la clé est un nombre, vérifier dans la base de données des mods
            if (!isNaN(key) && modsDatabase[key]) {
                valueCell.innerHTML = createValueInput(key, index, currentValue);
            } else {
                valueCell.innerHTML = createValueInput(key, index, currentValue);
            }
            updatePreview();
        }

        function editRule(index, newRule = null) {
            const rule = index >= 0 ? rules[index] : newRule;
            let preIdConditions = [];
            let postIdConditions = [];
            let operatorsArray = [];
            let currentAction = rule ? rule.action.replace(/\[|\]\s*==\s*"true"/g, '') : actionsList[0]; // Définir currentAction
            
            if (rule.conditions) {
                // Split conditions if there's a post-identification part
                const [preId, postId] = rule.conditions.split(/\s*&&\s*(?=\[base_)/);
                
                if (preId) {
                    preIdConditions = preId.split(/\s*(?:&&|\|\|)\s*/).map(cond => {
                        const matches = cond.trim().match(/\[(\w+)\]\s*([=!<>]+)\s*"([^"]*)"/) || [];
                        return {
                            key: matches[1] || keysList[0],
                            operator: matches[2] || '==',
                            value: matches[3] || ''
                        };
                    });
                }

                if (postId) {
                    postIdConditions = postId.split(/\s*&&\s*/).map(cond => {
                        const matches = cond.trim().match(/\[(\w+)\]\s*([=!<>]+)\s*"([^"]*)"/) || [];
                        return {
                            key: matches[1] || '',
                            operator: matches[2] || '>=',
                            value: matches[3] || ''
                        };
                    });
                }
            }

            // Assurer qu'il y a au moins une ligne pour la saisie
            if (preIdConditions.length === 0) {
                preIdConditions = [{
                    key: keysList[0],
                    operator: '==',
                    value: ''
                }];
            }

            let editDialog = `
                <div class="edit-container">
                    <!-- En-tête -->
                    <div class="section-header mb-3">
                        <h5 class="mb-0">Pre-Identification Conditions</h5>
                        <small class="text-muted">Define conditions to check before identifying the item</small>
                    </div>
        
                    <!-- Table des conditions pré-identification -->
                    <div class="conditions-table mb-4">
                        <table class="table table-sm table-dark">
                            <thead>
                                <tr>
                                    <th style="width: 35%">Key</th>
                                    <th style="width: 20%">Operator</th>
                                    <th style="width: 35%">Value</th>
                                    <th style="width: 10%">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="conditions-container">
                                ${preIdConditions.map((cond, i) => `
                                    <tr class="condition-row">
                                        <td>
                                            <select class="form-select form-select-sm bg-dark text-light border-secondary" 
                                                    id="condition-key-${i}" 
                                                    onchange="onKeyChange(${i}); updatePreview()">
                                                ${keysList.map(k => `
                                                    <option value="${k}" ${k === cond.key ? 'selected' : ''}>${k}</option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <select class="form-select form-select-sm bg-dark text-light border-secondary" 
                                                    id="condition-op-${i}" 
                                                    onchange="updatePreview()">
                                                ${operatorsList.map(op => `
                                                    <option value="${op.value}" ${op.value === cond.operator ? 'selected' : ''}>${op.label}</option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td id="value-cell-${i}">
                                            ${createValueInput(cond.key, i, cond.value)}
                                        </td>
                                        <td class="text-center">
                                            <button class="btn btn-danger btn-sm" onclick="removeCondition(${i})">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
        
                    <!-- Boutons d'ajout de conditions -->
                    <div class="button-group mb-4">
                        <button class="btn btn-outline-primary btn-sm me-2" onclick="addCondition('&&')">
                            <i class="fas fa-plus me-1"></i> Add AND Condition
                        </button>
                        <button class="btn btn-outline-primary btn-sm" onclick="addCondition('||')">
                            <i class="fas fa-plus me-1"></i> Add OR Condition
                        </button>
                    </div>
        
                    <!-- Section Post-Identification -->
                    <div class="section-header mb-3">
                        <h5 class="mb-0">Post-Identification Conditions</h5>
                        <small class="text-muted">Define conditions to check after identifying the item</small>
                    </div>
        
                    <!-- Table des conditions post-identification -->
                    <div class="conditions-table mb-4">
                        <table class="table table-sm table-dark">
                            <thead>
                                <tr>
                                    <th style="width: 35%">Mod</th>
                                    <th style="width: 20%">Operator</th>
                                    <th style="width: 35%">Value</th>
                                    <th style="width: 10%">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="post-id-conditions-container">
                                ${postIdConditions.map((cond, i) => `
                                    <tr>
                                        <td>
                                            <input type="text" 
                                                id="post-id-key-${i}" 
                                                value="${cond.key}"
                                                placeholder="base_maximum_life"
                                                onchange="updatePreview()">
                                        </td>
                                        <td>
                                            <select id="post-id-op-${i}" onchange="updatePreview()">
                                                ${['>=', '<=', '==', '>', '<'].map(op => 
                                                    `<option value="${op}" ${op === cond.operator ? 'selected' : ''}>${op}</option>`
                                                ).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <input type="text" 
                                                id="post-id-value-${i}" 
                                                value="${cond.value}"
                                                onchange="updatePreview()">
                                        </td>
                                        <td>
                                            <button class="btn btn-danger btn-sm" onclick="removePostIdCondition(${i})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <button class="btn btn-outline-primary btn-sm mt-2" onclick="addPostIdCondition()">
                            <i class="fas fa-plus me-1"></i> Add Post-ID Condition
                        </button>
                    </div>
        
                    <!-- Section Action -->
                    <div class="section-header mb-3">
                        <h5 class="mb-0">Action</h5>
                        <small class="text-muted">Select the action to perform when conditions are met</small>
                    </div>
                    <div class="action-section mb-4">
                        <select id="edit-action" class="form-select bg-dark text-light border-secondary" onchange="updatePreview()">
                            ${actionsList.map(action => `
                                <option value="${action}" ${action === currentAction ? 'selected' : ''}>${action}</option>
                            `).join('')}
                        </select>
                    </div>
        
                    <!-- Preview -->
                    <div class="preview-section">
                        <h5 class="mb-2">Rule Preview</h5>
                        <div id="preview" class="p-2 bg-dark border border-secondary rounded"></div>
                    </div>
                </div>
            `;
        
            // Style personnalisé pour la popup
            const customClass = {
                container: 'edit-rule-modal',
                popup: 'bg-dark text-light',
                header: 'border-bottom border-secondary',
                content: 'p-0',
                confirmButton: 'btn btn-success',
                cancelButton: 'btn btn-outline-danger'
            };
        
            Swal.fire({
                title: index >= 0 ? 'Edit Rule' : 'New Rule',
                html: editDialog,
                width: '900px',
                background: '#2b2b2b',
                color: '#ffffff',
                customClass: customClass,
                showCancelButton: true,
                confirmButtonText: 'Save',
                cancelButtonText: 'Cancel',
                didOpen: () => {
                    updatePreview();
                },
                preConfirm: () => {
                    const conditions = Array.from(document.querySelectorAll('#conditions-container tr')).map((row, i) => {
                        const key = document.getElementById(`condition-key-${i}`).value;
                        const op = document.getElementById(`condition-op-${i}`).value;
                        const value = document.getElementById(`condition-value-${i}`).value;
                        return `[${key}] ${op} "${value}"`;
                    }).join(' && ');
                    const postIdConditions = Array.from(document.querySelectorAll('#post-id-conditions-container tr')).map((row, i) => {
                        const key = document.getElementById(`post-id-key-${i}`).value;
                        const op = document.getElementById(`post-id-op-${i}`).value;
                        const value = document.getElementById(`post-id-value-${i}`).value;
                        return `[${key}] ${op} "${value}"`;
                    }).join(' && ');
                    const action = `[${document.getElementById('edit-action').value}] == "true"`;
                    
                    if (conditions && action) {
                        const fullConditions = postIdConditions ? `${conditions} && ${postIdConditions}` : conditions;
                        if (index >= 0) {
                            rules[index].conditions = fullConditions;
                            rules[index].action = action;
                        } else {
                            rules.push({
                                line: rules.length + 1,
                                conditions: fullConditions,
                                action: action
                            });
                        }
                        refreshTable();
                        return true;
                    }
                    return false;
                }
            });
        }

        function addCondition(operator) {
            const container = document.getElementById('conditions-container');
            const index = container.children.length;
            
            // Ajouter l'opérateur à la dernière ligne existante si ce n'est pas la première condition
            if (index > 0) {
                const lastRow = container.children[index - 1];
                if (!lastRow.querySelector('select[id^="condition-join-"]')) {
                    const operatorCell = document.createElement('td');
                    operatorCell.innerHTML = `
                        <select id="condition-join-${index - 1}" onchange="updatePreview()">
                            <option value="&&" ${operator === '&&' ? 'selected' : ''}>AND</option>
                            <option value="||" ${operator === '||' ? 'selected' : ''}>OR</option>
                        </select>
                    `;
                    lastRow.appendChild(operatorCell);
                }
            }

            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>
                    <select id="condition-key-${index}" onchange="onKeyChange(${index}); updatePreview()">
                        ${keysList.map(key => `<option value="${key}">${key}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <select id="condition-op-${index}" onchange="updatePreview()">
                        ${['==', '!=', '<=', '>=', '<', '>'].map(op => 
                            `<option value="${op}">${op}</option>`
                        ).join('')}
                    </select>
                </td>
                <td id="value-cell-${index}">
                    ${createValueInput('', index)}
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removeCondition(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(newRow);
            updatePreview();
        }

        /**
         * Suppression d'une condition dans la fenêtre d'édition
         * Version : 1.3.1
         */
        function removeCondition(index) {
            const container = document.getElementById('conditions-container');
            const rows = container.getElementsByTagName('tr');
            if (rows[index]) {
                rows[index].remove();
                // Recalculer les index des conditions restantes
                Array.from(rows).forEach((row, i) => {
                    const key = row.querySelector('select[id^="condition-key-"]');
                    const op = row.querySelector('select[id^="condition-op-"]');
                    const value = row.querySelector('[id^="condition-value-"]');
                    const join = row.querySelector('select[id^="condition-join-"]');
                    
                    if (key) key.id = `condition-key-${i}`;
                    if (op) op.id = `condition-op-${i}`;
                    if (value) value.id = `condition-value-${i}`;
                    if (join) join.id = `condition-join-${i}`;
                });
                updatePreview();
            }
        }

        function updatePreview() {
    const container = document.getElementById('conditions-container');
    const postIdContainer = document.getElementById('post-id-conditions-container');
    let conditions = '';
    
    if (container) {
        // Pre-ID conditions
        const preIdConditions = Array.from(container.querySelectorAll('tr')).map((row, i) => {
            const keyElement = document.getElementById(`condition-key-${i}`);
            const opElement = document.getElementById(`condition-op-${i}`);
            const valueElement = document.getElementById(`condition-value-${i}`);
            const joinOpElement = document.getElementById(`condition-join-${i}`);
            
            if (keyElement && opElement && valueElement) {
                const key = keyElement.value;
                const op = opElement.value;
                const value = valueElement.value;
                const joinOp = joinOpElement ? joinOpElement.value : '';
                
                return `[${key}] ${op} "${value}"${joinOp ? ` ${joinOp} ` : ''}`;
            }
            return '';
        }).filter(condition => condition).join(' && ');

        conditions = preIdConditions;
    }

    if (postIdContainer) {
        // Post-ID conditions
        const postIdConditions = Array.from(postIdContainer.querySelectorAll('tr')).map((row, i) => {
            const keyElement = document.getElementById(`post-id-key-${i}`);
            const opElement = document.getElementById(`post-id-op-${i}`);
            const valueElement = document.getElementById(`post-id-value-${i}`);
            
            if (keyElement && opElement && valueElement) {
                const key = keyElement.value;
                const op = opElement.value;
                const value = valueElement.value;
                
                return `[${key}] ${op} "${value}"`;
            }
            return '';
        }).filter(condition => condition).join(' && ');

        if (postIdConditions) {
            conditions += conditions ? ` && ${postIdConditions}` : postIdConditions;
        }
    }

    const actionElement = document.getElementById('edit-action');
    if (actionElement) {
        const action = `[${actionElement.value}] == "true"`;
        document.getElementById('preview').innerHTML = `<strong>Preview:</strong> ${conditions} # ${action}`;
    }
}

        function addPostIdCondition() {
            const container = document.getElementById('post-id-conditions-container');
            const index = container.children.length;
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>
                    <input type="text" 
                        id="post-id-key-${index}" 
                        placeholder="base_maximum_life"
                        onchange="updatePreview()">
                </td>
                <td>
                    <select id="post-id-op-${index}" onchange="updatePreview()">
                        ${['>=', '<=', '==', '>', '<'].map(op => 
                            `<option value="${op}">${op}</option>`
                        ).join('')}
                    </select>
                </td>
                <td>
                    <input type="text" 
                        id="post-id-value-${index}" 
                        onchange="updatePreview()">
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="removePostIdCondition(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            container.appendChild(newRow);
            updatePreview();
        }

        function removePostIdCondition(index) {
            const container = document.getElementById('post-id-conditions-container');
            const rows = container.getElementsByTagName('tr');
            if (rows[index]) {
                rows[index].remove();
                updatePreview();
            }
        }

        function deleteRule(index) {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    rules.splice(index, 1);
                    refreshTable();
                    Swal.fire(
                        'Deleted!',
                        'Your rule has been deleted.',
                        'success'
                    );
                }
            });
        }

        function filterRules() {
            const search = document.getElementById('search').value.toLowerCase();
            const filteredRules = rules.filter(rule => rule.conditions.toLowerCase().includes(search));
            const tbody = document.querySelector('#rulesTable tbody');
            tbody.innerHTML = '';
            filteredRules.forEach((rule, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${rule.line}</td>
                    <td>${rule.conditions}</td>
                    <td>${rule.action}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="editRule(${index})">
                            Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRule(${index})">
                            Delete
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        function validateRule(rule) {
            // Vérifie si la règle a des conditions et une action
            if (!rule.conditions || !rule.action) {
                return false;
            }

            // Vérifie le format des conditions
            const conditionParts = rule.conditions.split(/\s*(?:&&|\|\|)\s*/);
            for (const condition of conditionParts) {
                // Vérifie si chaque condition suit le format [Key] operator "Value"
                const isValid = /^\[[\w\s]+\]\s*([=!<>]=?)\s*"[^"]*"$/.test(condition.trim());
                if (!isValid) {
                    return false;
                }
            }

            // Vérifie le format de l'action
            const actionFormat = /^\[(\w+)\]\s*==\s*"true"$/;
            if (!actionFormat.test(rule.action)) {
                return false;
            }

            return true;
        }

        function exportFile() {
            // Vérifie si il y a des règles à exporter
            if (rules.length === 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'No rules to export',
                    text: 'Please add some rules before exporting.'
                });
                return;
            }

            // Vérifie la validité de toutes les règles
            const invalidRules = rules.filter((rule, index) => !validateRule(rule));
            if (invalidRules.length > 0) {
                const invalidIndexes = rules
                    .map((rule, index) => !validateRule(rule) ? index + 1 : null)
                    .filter(index => index !== null);
                
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid rules detected',
                    text: `Please check rules at lines: ${invalidIndexes.join(', ')}`
                });
                return;
            }

            // Génère le contenu du fichier
            const fileContent = [
                '// Exported from Pickit Editor',
                '// ' + new Date().toISOString(),
                '',
                ...rules.map(rule => `${rule.conditions} # ${rule.action}`),
                '',
                '//END'
            ].join('\n');

            // Crée et télécharge le fichier
            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const filename = 'exported_rules_' + new Date().toISOString().slice(0,10) + '.ipd';
            
            try {
                saveAs(blob, filename);
                Swal.fire({
                    icon: 'success',
                    title: 'Export successful',
                    text: `File saved as ${filename}`
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Export failed',
                    text: error.message
                });
            }
        }

        // Ajout de la fonction de vérification des redondances
        function checkRedundancies() {
            const redundanciesContainer = document.getElementById('redundanciesContainer');
            redundanciesContainer.innerHTML = '';
            
            // Grouper les règles par type
            const rulesByType = {};
            rules.forEach((rule, index) => {
                const typeMatch = rule.conditions.match(/\[Type\]\s*==\s*"([^"]+)"/);
                if (typeMatch) {
                    const type = typeMatch[1];
                    if (!rulesByType[type]) {
                        rulesByType[type] = [];
                    }
                    rulesByType[type].push({ index, rule });
                }
            });

            // Vérifier les redondances
            let foundRedundancies = false;
            for (const type in rulesByType) {
                if (rulesByType[type].length > 1) {
                    foundRedundancies = true;
                    const warning = document.createElement('div');
                    warning.className = 'redundancy-warning';
                    warning.innerHTML = `
                        <h4>Potential redundant rules for type "${type}":</h4>
                        <ul>
                            ${rulesByType[type].map(({ index, rule }) => `
                                <li>Line ${rule.line}: ${rule.conditions} # ${rule.action}</li>
                            `).join('')}
                        </ul>
                        <p>Suggestion: These rules could be simplified into a single rule:</p>
                        <pre>[Type] == "${type}" # [StashItem] == "true"</pre>
                    `;
                    redundanciesContainer.appendChild(warning);
                }
            }

            if (!foundRedundancies) {
                redundanciesContainer.innerHTML = '<div class="alert alert-success">No redundant rules found.</div>';
            }
        }

        // Add new function to parse debug data
        function parseDebugData(text) {
            const debugLines = text.split('\n').filter(line => line.includes('[dump] ->'));
            let parsedData = {};
            
            debugLines.forEach(line => {
                const value = line.split('[dump] ->')[1].trim();
                if (value.startsWith('Mod Index:')) {
                    const modIndex = parseInt(value.split(':')[1].trim());
                    // Get mod name from mods_list.txt based on index
                    const modName = getModName(modIndex);
                    parsedData['Mod'] = `${modIndex} (${modName})`;
                } else if (value.startsWith('Value:')) {
                    parsedData['Value'] = value.split(':')[1].trim();
                } else if (value.startsWith('Category:')) {
                    parsedData['Category'] = value.split(':')[1].trim();
                }
                // Add other data types as needed
            });
            
            return parsedData;
        }

        // Function to format parsed data as HTML
        function formatParsedDataAsHtml(parsedData) {
            return `
                <div class="parsed-data" style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0;">Parsed Data:</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        ${Object.entries(parsedData).map(([key, value]) => `
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #ddd; font-weight: bold;">${key}:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #ddd;">${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `;
        }

        // Modify showPasteDialog to include live parsing
        function showPasteDialog() {
            // Charger dynamiquement le fichier mods_list.js si nécessaire
            if (typeof MODS_LIST === 'undefined') {
                const script = document.createElement('script');
                script.src = './js/mods_list.js';
                script.onload = () => {
                    // Une fois le fichier chargé, initialiser modsListCache
                    loadModsList();
                    // Puis afficher le dialogue
                    showPasteDialogUI();
                };
                script.onerror = () => {
                    console.warn('Could not load mods list, using default mods');
                    loadModsList(); // Utilisera les mods par défaut
                    showPasteDialogUI();
                };
                document.head.appendChild(script);
            } else {
                // Si déjà chargé, afficher directement le dialogue
                showPasteDialogUI();
            }
        }

        function showPasteDialogUI() {
            Swal.fire({
                title: 'Paste Item Data',
                html: `
                    <div class="paste-container" style="margin: 20px 0;">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="rule-name" style="display: block; margin-bottom: 5px;">Rule Name:</label>
                            <input type="text" 
                                id="rule-name" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                                placeholder="Enter a short name for this rule">
                        </div>
                        <p class="hint" style="margin-bottom: 10px; font-size: 0.9em; color: #666;">
                            Paste the raw item text containing [dump] -> lines
                        </p>
                        <textarea id="rule-text" 
                            style="width: 100%; height: 150px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;"
                            placeholder="Paste the raw item text here..."
                            oninput="updateParsedItemPreview(this.value)"></textarea>
                        <div id="parsed-preview"></div>
                        <div class="form-group" style="margin-top: 15px;">
                            <label for="mod-search" style="display: block; margin-bottom: 5px;">Search Mod:</label>
                            <input type="text" 
                                id="mod-search" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                                placeholder="Search for a mod..."
                                oninput="filterModList()">
                        </div>
                        <div class="form-group" style="margin-top: 15px;">
                            <label for="mod-select" style="display: block; margin-bottom: 5px;">Add Mod Condition:</label>
                            <select id="mod-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="">Select Mod</option>
                                ${Object.entries(modsListCache).sort((a, b) => a[1].localeCompare(b[1])).map(([index, name]) => 
                                    `<option value="${index}">${name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin-top: 15px;">
                            <label for="mod-operator" style="display: block; margin-bottom: 5px;">Operator:</label>
                            <select id="mod-operator" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                ${['==', '!=', '>=', '<=', '>', '<'].map(op => 
                                    `<option value="${op}">${op}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin-top: 15px;">
                            <label for="mod-value" style="display: block; margin-bottom: 5px;">Value:</label>
                            <input type="text" 
                                id="mod-value" 
                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                                placeholder="Enter mod value">
                        </div>
                        <button class="btn btn-secondary" style="margin-top: 10px;" onclick="addModCondition()">
                            <i class="fas fa-plus"></i> Add Mod Condition
                        </button>
                        <div id="mod-conditions-container" style="margin-top: 15px;"></div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Create Rule',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#28a745',
                width: '800px',
                preConfirm: handlePasteDialogConfirm
            }).then(handlePasteDialogResult);
        }

        function filterModList() {
            const searchValue = document.getElementById('mod-search').value.toLowerCase();
            const modSelect = document.getElementById('mod-select');
            const options = Object.entries(modsListCache)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .filter(([index, name]) => name.toLowerCase().includes(searchValue))
                .map(([index, name]) => `<option value="${index}">${name}</option>`)
                .join('');
            modSelect.innerHTML = `<option value="">Select Mod</option>${options}`;
        }

        function addModCondition() {
            const modSelect = document.getElementById('mod-select');
            const modOperator = document.getElementById('mod-operator');
            const modValue = document.getElementById('mod-value');
            const modConditionsContainer = document.getElementById('mod-conditions-container');

            if (!modSelect.value || !modOperator.value || !modValue.value) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Mod Condition',
                    text: 'Please select a mod, operator, and enter a value.'
                });
                return;
            }

            const modName = modsListCache[modSelect.value];
            const condition = `[${modName}] ${modOperator.value} "${modValue.value}"`;

            const conditionElement = document.createElement('div');
            conditionElement.textContent = condition;
            modConditionsContainer.appendChild(conditionElement);

            // Clear inputs
            modSelect.value = '';
            modOperator.value = '==';
            modValue.value = '';
        }

        function handlePasteDialogConfirm() {
            const ruleName = document.getElementById('rule-name').value.trim();
            const rawText = document.getElementById('rule-text').value.trim();

            if (!ruleName) {
                Swal.showValidationMessage('Please enter a name for the rule');
                return false;
            }

            if (!rawText.includes('[dump]')) {
                Swal.showValidationMessage('No [dump] data found in the text');
                return false;
            }

            // Créer les données parsées et les retourner immédiatement
            const newParsedData = parseRawText(rawText);
            if (!newParsedData.type && !newParsedData.rarity && newParsedData.mods.length === 0) {
                Swal.showValidationMessage('No valid data could be extracted from the text');
                return false;
            }

            // Mettre à jour la variable globale parsedData
            parsedData = newParsedData;
            return { parsedData: newParsedData, ruleName };
        }

        function handlePasteDialogResult(result) {
            if (result.isConfirmed && result.value) {
                const rulesText = generateRulesFromParsedData(result.value.parsedData);
                
                if (rulesText && rulesText.length > 0) {
                    rulesText.forEach((ruleText, index) => {
                        const [conditions, actionPart] = ruleText.split(' # ');
                        rules.push({
                            line: rules.length + 1,
                            conditions: conditions,
                            action: actionPart || '[StashItem] == "true"'
                        });
                    });

                    // Forcer le rafraîchissement de l'affichage
                    renderRules();
                    
                    // Mettre à jour le statut des modifications
                    hasUnsavedChanges = true;

                    // Afficher la confirmation
                    Swal.fire({
                        icon: 'success',
                        title: 'Règle(s) créée(s)',
                        text: `${rulesText.length} règle(s) ajoutée(s)`,
                        timer: 2000
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erreur',
                        text: 'Aucune règle n\'a pu être générée',
                        timer: 2000
                    });
                }
            }
        }

        function parseRawText(text) {
            if (!text) return {
                name: '',
                type: '',
                rarity: '',
                properties: [],
                rarity: '',
                properties: [],
                requirements: [],
                sockets: '',
                mods: [],
                flavorText: '',
                itemLevel: '',
                quality: '',
                stackSize: '',
                identified: false,
                imageUrl: ''
            };

            // Séparer le texte en lignes et filtrer les lignes vides
            const lines = text.split('\n').filter(line => line && typeof line === 'string');
            const parsed = {
                name: '',
                type: '',
                rarity: '',
                properties: [],
                requirements: [],
                sockets: '',
                mods: [],
                flavorText: '',
                itemLevel: '',
                quality: '',
                stackSize: '',
                identified: false,
                imageUrl: ''
            };

            lines.forEach(line => {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.includes('[dump]')) return;

                const dumpParts = trimmedLine.split('[dump] ->');
                if (dumpParts.length < 2) return;

                const value = dumpParts[1].trim();
                
                // Utiliser un switch pour un meilleur contrôle du flux
                switch (true) {
                    case value.startsWith('Short name :'):
                        parsed.name = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Type :'):
                        const itemType = value.split(':')[1]?.trim() || '';
                        parsed.type = itemType;
                        
                        // Vérifier si c'est une arme en cherchant dans le chemin du type
                        const isWeapon = weaponTypes.some(weaponType => 
                            itemType.toLowerCase().includes(weaponType.toLowerCase())
                        );
                        
                        if (isWeapon) {
                            // Si c'est une arme, on extrait le type d'arme du chemin
                            const weaponMatch = weaponTypes.find(weaponType => 
                                itemType.toLowerCase().includes(weaponType.toLowerCase())
                            );
                            if (weaponMatch) {
                                parsed.isWeapon = true;
                                parsed.weaponType = weaponMatch;
                            }
                        }
                        break;
                    case value.startsWith('Category :'):
                        parsed.category = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Item Level :'):
                        parsed.itemLevel = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Required Level :'):
                        const reqLevel = value.split(':')[1]?.trim();
                        if (reqLevel) parsed.requirements.push(`Required Level: ${reqLevel}`);
                        break;
                    case value.startsWith('Rarity :'):
                        parsed.rarity = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Quality :'):
                        parsed.quality = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Stack :'):
                        parsed.stackSize = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Socket number :'):
                        parsed.sockets = value.split(':')[1]?.trim() || '';
                        break;
                    case value.startsWith('Item identified'):
                        parsed.identified = true;
                        break;
                    case value.startsWith('Mod index :'):
                        try {
                            const [indexPart, valuePart] = value.split(', Value :');
                            const modIndex = parseInt(indexPart.split(':')[1]?.trim());
                            const modValue = parseInt(valuePart?.trim());
                            
                            if (!isNaN(modIndex) && !isNaN(modValue) && modsListCache[modIndex]) {
                                parsed.mods.push({
                                    index: modIndex,
                                    name: modsListCache[modIndex],
                                    value: modValue,
                                    operator: '>=' // Opérateur par défaut
                                });
                            }
                        } catch (e) {
                            console.warn('Failed to parse mod:', value);
                        }
                        break;
                    case value.startsWith('Image URL :'):
                        parsed.imageUrl = value.split(':')[1]?.trim() || '';
                        break;
                }
            });

            return parsed;
        }

        function formatParsedDataPreview(parsedData) {
            return `
                <div style="width: 600px; border: 2px solid #555; padding: 20px; background-color: #2b2b2b; margin: 10px auto;">
                    <!-- Item Image -->
                    ${parsedData.imageUrl ? `<img src="${parsedData.imageUrl}" alt="${parsedData.name}" style="max-width: 100%; height: auto; margin-bottom: 15px;">` : ''}
                    <!-- Item Name and Rarity Checkboxes -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <div style="color: ${getRarityColor(parsedData.rarity)}; font-size: 18px; font-weight: bold;">
                            ${parsedData.name || 'Unknown Item'}
                        </div>
                        <div>
                            <label style="color: #c8c8c8;"><input type="checkbox" id="rarity-normal" ${parsedData.rarity === 'Normal' ? 'checked' : ''} onchange="updatePreview()"> Normal</label>
                            <label style="color: #8888ff;"><input type="checkbox" id="rarity-magic" ${parsedData.rarity === 'Magic' ? 'checked' : ''} onchange="updatePreview()"> Magic</label>
                            <label style="color: #ffff77;"><input type="checkbox" id="rarity-rare" ${parsedData.rarity === 'Rare' ? 'checked' : ''} onchange="updatePreview()"> Rare</label>
                            <label style="color: #af6025;"><input type="checkbox" id="rarity-unique" ${parsedData.rarity === 'Unique' ? 'checked' : ''} onchange="updatePreview()"> Unique</label>
                        </div>
                    </div>
                    
                    <!-- Item Type and Properties -->
                    <div style="color: #b8b8b8; font-size: 14px; margin-left: 10px;">
                        <p style="margin: 4px 0;"><strong>${parsedData.type || 'Unknown Type'}</strong></p>
                        ${parsedData.quality ? `
                            <p style="margin: 6px 0; display: flex; justify-content: space-between; align-items: center; min-height: 24px;">
                                <span style="margin-right: 10px;"><strong>Quality:</strong></span>
                                <span style="color: rgb(136, 136, 255); margin-right: auto;">+${parsedData.quality}%</span>
                                <span><i class="fas fa-edit" style="cursor: pointer; margin-right: 5px;"></i><i class="fas fa-trash" style="cursor: pointer;" onclick="removeProperty('quality')"></i></span>
                            </p>` : ''}
                        ${parsedData.itemLevel ? `
                            <p style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span style="margin-right: 10px;"><strong>Item Level:</strong></span>
                                <span style="color: #fff; margin-right: auto;">${parsedData.itemLevel}</span>
                                <span><i class="fas fa-edit" style="cursor: pointer; margin-right: 5px;"></i><i class="fas fa-trash" style="cursor: pointer;" onclick="removeProperty('itemLevel')"></i></span>
                            </p>` : ''}
                        ${parsedData.requirements.map((req, index) => `
                            <p style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span style="margin-right: 10px;"><strong>${req}</strong></span>
                                <span><i class="fas fa-edit" style="cursor: pointer; margin-right: 5px;"></i><i class="fas fa-trash" style="cursor: pointer;" onclick="removeRequirement(${index})"></i></span>
                            </p>`).join('')}
                    </div>

                    <!-- Item Properties -->
                    <div style="color: #66bbff; font-size: 14px; margin-top: 15px; margin-left: 10px;">
                        ${parsedData.properties.map((prop, index) => `
                            <p style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span style="margin-right: 10px;">${prop}</span>
                                <span><i class="fas fa-edit" style="cursor: pointer; margin-right: 5px;"></i><i class="fas fa-trash" style="cursor: pointer;" onclick="removeProperty('properties', ${index})"></i></span>
                            </p>`).join('')}
                        ${parsedData.sockets ? `
                            <p style="margin: 4px 0; display: flex; justify-content: space-between; align-items: center;">
                                <span style="margin-right: 10px;"><strong>Sockets:</strong></span>
                                <span style="color: #fff; margin-right: auto;">${parsedData.sockets}</span>
                                <span><i class="fas fa-edit" style="cursor: pointer; margin-right: 5px;"></i><i class="fas fa-trash" style="cursor: pointer;" onclick="removeProperty('sockets')"></i></span>
                            </p>` : ''}
                    </div>

                    <!-- Modifiers -->
                    <div style="color: #d6b370; font-size: 14px; margin-top: 15px;">
    <div style="display: grid; grid-template-columns: 250px 80px 80px 30px; gap: 10px;">
        ${parsedData.mods.map((mod, index) => `
            <div style="display: contents;">
                <span style="text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${mod.name}:
                </span>
                <select id="mod-op-${index}" 
                        onchange="updateModCondition(${index})" 
                        style="background: #333; color: #fff; border: none; padding: 4px; width: 100%;">
                    <option value=">=" ${!mod.operator || mod.operator === '>=' ? 'selected' : ''}>>=</option>
                    <option value="==" ${mod.operator === '==' ? 'selected' : ''}>=</option>
                    <option value="<=" ${mod.operator === '<=' ? 'selected' : ''}><=</option>
                    <option value=">" ${mod.operator === '>' ? 'selected' : ''}>></option>
                    <option value="<" ${mod.operator === '<' ? 'selected' : ''}><</option>
                </select>
                <input type="text" 
                       id="mod-value-${index}" 
                       value="${mod.value}"
                       style="width: 100%; background: #333; color: #fff; border: 1px solid #555; padding: 3px 5px; text-align: right;"
                       onchange="updateModCondition(${index})"
                >
                <i class="fas fa-trash" 
                   style="cursor: pointer; color: #dc3545; text-align: center;" 
                   onclick="removeMod(${index})">
                </i>
            </div>
        `).join('')}
    </div>
</div>

                    <!-- Rule Preview -->
                    <div style="color: #b8b8b8; font-size: 13px; margin-top: 15px; margin-left: 10px;">
                        <strong>Generated Rule:</strong>
                        <pre style="background-color: #1e1e1e; padding: 10px; border-radius: 4px; color: #fff; white-space: pre-wrap; word-break: break-word;">${generateRulesFromParsedData(parsedData).join('\n')}</pre>
                    </div>
                </div>
            `;
        }

        function generateRuleFromParsedData(parsedData) {
            let preIdConditions = [];
            let postIdConditions = [];
            
            // Pre-identification conditions
            if (parsedData.type) {
                preIdConditions.push(`[Type] == "${parsedData.type}"`);
            }
            const rarityNormal = document.getElementById('rarity-normal');
            const rarityMagic = document.getElementById('rarity-magic');
            const rarityRare = document.getElementById('rarity-rare');
            const rarityUnique = document.getElementById('rarity-unique');

            if (rarityNormal && rarityNormal.checked) {
                preIdConditions.push(`[Rarity] == "Normal"`);
            }
            if (rarityMagic && rarityMagic.checked) {
                preIdConditions.push(`[Rarity] == "Magic"`);
            }
            if (rarityRare && rarityRare.checked) {
                preIdConditions.push(`[Rarity] == "Rare"`);
            }
            if (rarityUnique && rarityUnique.checked) {
                preIdConditions.push(`[Rarity] == "Unique"`);
            }
            
            // Post-identification conditions
            parsedData.mods.forEach(mod => {
                if (mod.name) {
                    postIdConditions.push(`[${mod.name}] >= "${mod.value}"`);
                }
            });
            
            const preIdConditionsStr = preIdConditions.join(' && ');
            const postIdConditionsStr = postIdConditions.join(' && ');
            
            return `${preIdConditionsStr} # [StashItem] == "true" ${postIdConditionsStr ? `&& ${postIdConditionsStr}` : ''}`;
        }

        function removeProperty(property, index = null) {
            if (!parsedData) return;
            
            if (index !== null) {
                parsedData[property].splice(index, 1);
            } else {
                delete parsedData[property];
            }
            updateParsedItemPreview(parsedData);
        }

        function removeRequirement(index) {
            if (!parsedData) return;
            parsedData.requirements.splice(index, 1);
            updateParsedItemPreview(parsedData);
        }

        function removeMod(index) {
            if (!parsedData) return;
            parsedData.mods.splice(index, 1);
            updateParsedItemPreview(parsedData);
        }

        // Mise à jour de la fonction getRarityColor pour correspondre aux couleurs PoE
        function getRarityColor(rarity) {
            switch (rarity) {
                case '0':
                case 'Normal': return '#c8c8c8';
                case '1':
                case 'Magic': return '#8888ff';
                case '2':
                case 'Rare': return '#ffff77';
                case '3':
                case 'Unique': return '#af6025';
                default: return '#c8c8c8';
            }
        }

        function updateParsedItemPreview(input) {
            const container = document.getElementById('parsed-preview');
            
            if (typeof input === 'string' && input.includes('[dump]')) {
                parsedData = parseRawText(input);
            } else if (typeof input === 'object') {
                parsedData = input;
            } else {
                parsedData = null;
                container.innerHTML = '';
                return;
            }

            container.innerHTML = formatParsedDataPreview(parsedData);
        }

        function generateRulesFromParsedData(data) {
    if (!data) return [];
    
    let rules = [];
    let preIdConditions = [];
    
    // Pre-identification conditions
    if (data.type) {
        // Si c'est une arme reconnue, utiliser WeaponCategory au lieu de Type
        if (data.isWeapon && data.weaponType) {
            preIdConditions.push(`[WeaponCategory] == "${data.weaponType}"`);
        } else {
            preIdConditions.push(`[Type] == "${data.type}"`);
        }
    }
    
    // Vérifier les cases à cocher de rareté
    const rarities = [
        { id: 'rarity-normal', value: 'Normal' },
        { id: 'rarity-magic', value: 'Magic' },
        { id: 'rarity-rare', value: 'Rare' },
        { id: 'rarity-unique', value: 'Unique' }
    ];

    // Extraire tous les mods
    const modConditions = data.mods.map(mod => `[${mod.name}] == "${mod.value}"`);

    let hasCheckedRarity = false;
    rarities.forEach(rarity => {
        const rarityElement = document.getElementById(rarity.id);
        if (rarityElement && rarityElement.checked) {
            hasCheckedRarity = true;
            let conditions = [...preIdConditions];
            conditions.push(`[Rarity] == "${rarity.value}"`);
            
            // Construire la règle complète avec tous les mods
            let fullRule;
            if (modConditions.length > 0) {
                fullRule = `${conditions.join(' && ')} # [StashItem] == "true" && ${modConditions.join(' && ')}`;
            } else {
                fullRule = `${conditions.join(' && ')} # [StashItem] == "true"`;
            }
            
            rules.push(fullRule);
        }
    });

    // Si aucune rareté n'est sélectionnée, créer une règle avec juste le type et les mods
    if (!hasCheckedRarity && preIdConditions.length > 0) {
        let fullRule;
        if (modConditions.length > 0) {
            fullRule = `${preIdConditions.join(' && ')} # [StashItem] == "true" && ${modConditions.join(' && ')}`;
        } else {
            fullRule = `${preIdConditions.join(' && ')} # [StashItem] == "true"`;
        }
        rules.push(fullRule);
    }

    return rules;
}

        function handlePasteDialogResult(result) {
    if (result.isConfirmed && result.value && result.value.parsedData) {
        // Générer les règles à partir des données parsées
        const rulesText = generateRulesFromParsedData(result.value.parsedData);
        const currentLength = rules.length; // Pour la numérotation des lignes

        rulesText.forEach((ruleText, index) => {
            const [conditions, actionPart] = ruleText.split(' # ');
            rules.push({
                line: currentLength + index + 1,
                conditions: conditions,
                action: actionPart || '[StashItem] == "true"'
            });
        });

        // Rafraîchir l'affichage de la table
        renderRules();
        
        // Indiquer que des modifications ont été effectuées
        hasUnsavedChanges = true;

        Swal.fire({
            icon: 'success',
            title: 'Règle(s) créée(s)',
            text: `${rulesText.length} règle(s) ajoutée(s)`,
            timer: 2000
        });
    }
}

function renderRules() {
    const tbody = document.querySelector('#rulesTable tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    tbody.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.className = 'rule-row';
        
        // Colonne numéro de ligne
        row.innerHTML = `
            <td>${rule.line}</td>
            <td class="conditions-cell">
                <div class="editable-content">
                    <span class="content">${rule.conditions}</span>
                    <input type="text" class="edit-input d-none form-control" value="${rule.conditions}">
                </div>
            </td>
            <td class="action-cell">
                <div class="editable-content">
                    <span class="content">${rule.action}</span>
                    <select class="edit-input d-none form-control">
                        ${actionsList.map(action => 
                            `<option value="[${action}] == &quot;true&quot;" ${rule.action === `[${action}] == "true"` ? 'selected' : ''}>
                                ${action}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            </td>
            <td class="actions-cell">
                <div class="btn-group">
                    <button class="btn btn-outline-secondary edit-inline" title="Quick Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-outline-primary edit-modal" title="Advanced Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-rule" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="btn btn-outline-success save-inline d-none" title="Save">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-outline-danger cancel-inline d-none" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;

        // Ajout des gestionnaires d'événements
        const editInlineBtn = row.querySelector('.edit-inline');
        const editModalBtn = row.querySelector('.edit-modal');
        const deleteBtn = row.querySelector('.delete-rule');
        const saveBtn = row.querySelector('.save-inline');
        const cancelBtn = row.querySelector('.cancel-inline');
        const editInputs = row.querySelectorAll('.edit-input');
        const contents = row.querySelectorAll('.content');

        editInlineBtn.addEventListener('click', () => enableInlineEdit(row));
        editModalBtn.addEventListener('click', () => editRule(index));
        deleteBtn.addEventListener('click', () => deleteRule(index));
        saveBtn.addEventListener('click', () => saveInlineEdit(row));
        cancelBtn.addEventListener('click', () => cancelInlineEdit(row));

        tbody.appendChild(row);
    });
}

// ...existing code...

function createTableRow(rule, index) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${rule.condition}</td>
        <td>${rule.action}</td>
        <td>
            <button class="btn btn-primary" onclick="editRule(${index})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="deleteRule(${index})">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    `;
    return tr;
}
// ...existing code...

function refreshTable() {
    const tbody = document.querySelector("#rulesTable tbody");
    tbody.innerHTML = "";
    rules.forEach((rule, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = rule.line;
        row.insertCell().textContent = rule.conditions;
        row.insertCell().textContent = rule.action;
        const actionsCell = row.insertCell();
        actionsCell.className = 'actions-cell';
        actionsCell.innerHTML = `
            <div class="btn-group">
                <button class="btn btn-primary" onclick="editRule(${index})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteRule(${index})" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
    });
}

// ...existing code...

// Ajouter cet écouteur d'événements quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Gestionnaire pour le chargement de fichier
    document.getElementById('fileInput').addEventListener('change', loadFile);
    
    // Charger la liste des mods (déjà existant)
    loadModsList();
});

// Corriger la fonction loadFile
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
                        if (conditions.includes('[') && conditions.includes(']')) {
                            rules.push({
                                line: lineNumber,
                                conditions,
                                action
                            });
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

        if (errors.length > 0) {
            console.warn('Avertissements lors du chargement:', errors);
            Swal.fire({
                icon: 'warning',
                title: 'Fichier chargé avec des avertissements',
                html: `${rules.length} règles chargées<br>${errors.length} avertissements:<br>${errors.join('<br>')}`,
                width: '600px'
            });
        }

        refreshTable();
        
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erreur de chargement',
            text: error.message
        });
    }
}

// ...existing code...

// Ajouter ce gestionnaire d'événements après les déclarations de variables globales
document.addEventListener('DOMContentLoaded', function() {
    // Délégation d'événements pour la table
    document.querySelector('#rulesTable').addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        
        // Si on clique sur un bouton, ne pas déclencher l'édition en ligne
        if (e.target.closest('.btn-group')) return;
        
        const index = row.dataset.index;
        if (index !== undefined) {
            // Si on clique sur une cellule éditable, activer l'édition pour cette cellule
            if (e.target.closest('.conditions-cell, .action-cell')) {
                const cell = e.target.closest('.conditions-cell, .action-cell');
                makeEditable(cell);
            }
            // Sinon, activer l'édition pour toute la ligne
            else {
                editInline(parseInt(index));
            }
        }
    });

    // ...existing code...
});

function renderRules() {
    const tbody = document.querySelector('#rulesTable tbody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }

    tbody.innerHTML = '';
    
    rules.forEach((rule, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.className = 'rule-row';
        
        row.innerHTML = `
            <td>${rule.line}</td>
            <td class="conditions-cell">
                <div class="editable-content">
                    <span class="content">${rule.conditions}</span>
                    <input type="text" class="edit-input d-none" value="${rule.conditions}">
                </div>
            </td>
            <td class="action-cell">
                <div class="editable-content">
                    <span class="content">${rule.action}</span>
                    <select class="edit-input d-none">
                        ${actionsList.map(action => 
                            `<option value="[${action}] == &quot;true&quot;" ${rule.action === `[${action}] == "true"` ? 'selected' : ''}>
                                ${action}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            </td>
            <td class="actions-cell">
                <div class="btn-group">
                    <button class="btn btn-outline-secondary edit-inline" title="Quick Edit">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-outline-primary edit-modal" title="Advanced Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger delete-rule" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}
