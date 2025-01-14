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
                    <button class="btn btn-danger btn-sm" onclick='deleteRule(${index})'><i class="fas fa-trash'></i></button>
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

            let conditionsTable = `
                <div class="edit-container">
                    <div class="condition-type-label">Pre-Identification Conditions:</div>
                    <table class="edit-table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Operator</th>
                                <th>Value</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="conditions-container">
                            ${preIdConditions.map((cond, i) => `
                                <tr>
                                    <td>
                                        <select id="condition-key-${i}" onchange="onKeyChange(${i}); updatePreview()">
                                            ${keysList.map(k => `
                                                <option value="${k}" ${k === cond.key ? 'selected' : ''}>${k}</option>
                                            `).join('')}
                                        </select>
                                    </td>
                                    <td>
                                        <select id="condition-op-${i}" onchange="updatePreview()">
                                            ${['==', '!=', '<=', '>=', '<', '>'].map(op => `
                                                <option value="${op}" ${op === cond.operator ? 'selected' : ''}>${op}</option>
                                            `).join('')}
                                        </select>
                                    </td>
                                    <td id="value-cell-${i}">
                                        ${createValueInput(cond.key, i, cond.value)}
                                    </td>
                                    <td>
                                        <button class="btn btn-danger btn-sm" onclick="removeCondition(${i})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                    ${i < preIdConditions.length - 1 ? `
                                    <td>
                                        <select id="condition-join-${i}" onchange="updatePreview()">
                                            <option value="&&" ${operatorsArray[i] === '&&' ? 'selected' : ''}>AND</option>
                                            <option value="||" ${operatorsArray[i] === '||' ? 'selected' : ''}>OR</option>
                                        </select>
                                    </td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="condition-buttons">
                        <button class="btn btn-secondary" onclick="addCondition('&&')">
                            <i class="fas fa-plus"></i> Add AND Condition
                        </button>
                        <button class="btn btn-secondary" onclick="addCondition('||')">
                            <i class="fas fa-plus"></i> Add OR Condition
                        </button>
                    </div>

                    <div class="post-id-section">
                        <div class="post-id-header">Post-Identification Conditions:</div>
                        <div class="post-id-conditions">
                            <table class="edit-table" id="post-id-conditions-table">
                                <thead>
                                    <tr>
                                        <th>Mod</th>
                                        <th>Operator</th>
                                        <th>Value</th>
                                        <th>Action</th>
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
                            <button class="btn btn-secondary mt-2" onclick="addPostIdCondition()">
                                <i class="fas fa-plus"></i> Add Post-ID Condition
                            </button>
                        </div>
                    </div>

                    <div class="action-section">
                        <label for="edit-action"><strong>Action:</strong></label>
                        <select id="edit-action" class="action-select" onchange="updatePreview()">
                            ${actionsList.map(action => `
                                <option value="${action}" ${action === currentAction ? 'selected' : ''}>${action}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="preview-box">
                        <strong>Preview:</strong>
                        <div id="preview" class="mt-2"></div>
                    </div>
                </div>
            `;

            Swal.fire({
                title: index >= 0 ? 'Edit Rule' : 'New Rule',
                html: conditionsTable,
                width: '900px',
                showCancelButton: true,
                confirmButtonText: 'Save',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#dc3545',
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
            Swal.fire({
                title: 'Paste Rule Text',
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
                            Paste a rule text with debug data ([dump] -> lines)
                        </p>
                        <textarea id="rule-text" 
                            style="width: 100%; height: 150px; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 4px;"
                            placeholder="Paste your rule text here..."
                            oninput="updateParsedData(this.value)"></textarea>
                        <div id="parsed-data-container"></div>
                    </div>
                `,
                // ... rest of the existing showPasteDialog code ...
            });
        }

        // Function to update parsed data display
        function updateParsedData(text) {
            const container = document.getElementById('parsed-data-container');
            if (text.includes('[dump]')) {
                const parsedData = parseDebugData(text);
                container.innerHTML = formatParsedDataAsHtml(parsedData);
            } else {
                container.innerHTML = '';
            }
        }

        

        function getModName(index) {
            return modsListCache[index] || 'Unknown Mod';
        }

        // Load mods list on page load
        document.addEventListener('DOMContentLoaded', loadModsList);

        function showPasteDialog() {
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

        // Ajouter cette constante en haut du fichier avec les autres constantes
const weaponTypes = [
    "Claws", "Daggers", "Wands", "OneHandSwords", "OneHandAxes", "OneHandMaces", 
    "Sceptres", "Spears", "Flails", "Bows", "Staves", "TwoHandSwords", 
    "TwoHandAxes", "TwoHandMaces", "Quarterstaves", "Crossbows", "Traps", 
    "FishingRods", "Quivers", "Shields", "Foci"
];

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

        document.addEventListener('DOMContentLoaded', loadModsList);

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

// ...existing code...
