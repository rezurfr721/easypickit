export class BetaPickitCreator {
    static categories = [
        { id: 'currency', name: 'Currency', endpoint: 'currency' },
        { id: 'breach', name: 'Breach', endpoint: 'breachcatalyst' },
        { id: 'weapons', name: 'Weapons', endpoint: 'weapon' },
        { id: 'armour', name: 'Armour', endpoint: 'armour' },
        { id: 'accessories', name: 'Accessories', endpoint: 'accessory' },
        { id: 'delirium', name: 'Delirium', endpoint: 'deliriuminstill' },
        { id: 'essences', name: 'Essences', endpoint: 'essences' },
        { id: 'ritual', name: 'Ritual', endpoint: 'ritual' },
        { id: 'ultimatum', name: 'Ultimatum', endpoint: 'ultimatum' }
    ];

    static async init() {
        const accordion = document.getElementById('categoryAccordion');
        accordion.innerHTML = '<div class="text-center">Chargement des données...</div>';

        try {
            for (const category of this.categories) {
                const items = await this.loadLocalData(category.endpoint);
                this.createCategoryPanel(accordion, category, items);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            accordion.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des données</div>';
        }
    }

    static async loadLocalData(endpoint) {
        try {
            // Charger les données depuis un fichier JSON local
            const response = await fetch(`./data/${endpoint}.json`);
            if (!response.ok) throw new Error('Données non disponibles');
            return await response.json();
        } catch (error) {
            console.error(`Erreur chargement ${endpoint}:`, error);
            return this.getFallbackData(endpoint);
        }
    }

    static getFallbackData(endpoint) {
        // Données de secours en cas d'échec du chargement
        const fallbackData = {
            currency: [
                { id: 1, name: "Divine Orb" },
                { id: 2, name: "Chaos Orb" },
                // ... autres monnaies
            ],
            breachcatalyst: [
                { id: 1, name: "Xoph's Breachstone" },
                { id: 2, name: "Tul's Breachstone" },
                // ... autres items breach
            ],
            // ... autres catégories
        };

        return fallbackData[endpoint] || [];
    }

    static createCategoryPanel(accordion, category, items) {
        const panel = document.createElement('div');
        panel.className = 'category-accordion mb-3';
        panel.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${category.id}')">
                <div>
                    <i class="fas fa-box category-icon"></i>
                    ${category.name}
                </div>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div id="content-${category.id}" class="category-content" style="display: none;">
                <div class="items-container">
                    ${items.map(item => this.createItemCheckbox(category, item)).join('')}
                </div>
            </div>
        `;
        accordion.appendChild(panel);
    }

    static createItemCheckbox(category, item) {
        return `
            <div class="item-row">
                <input type="checkbox" 
                       id="item-${category.id}-${item.id}" 
                       class="item-checkbox"
                       data-category="${category.id}"
                       data-name="${item.name}"
                       data-price="${item.latest_price?.nominal_price || 0}">
                <label for="item-${category.id}-${item.id}">
                    ${item.name}
                    ${item.latest_price ? `<span class="text-muted">(${item.latest_price.nominal_price} divine)</span>` : ''}
                </label>
            </div>
        `;
    }

    static generateRules() {
        const selectedItems = document.querySelectorAll('.item-checkbox:checked');
        const rules = Array.from(selectedItems).map(checkbox => ({
            line: 0,
            conditions: `Name = "${checkbox.dataset.name}"`,
            action: "StashItem"
        }));

        if (rules.length > 0) {
            window.rules.push(...rules);
            window.UI.renderRules(window.rules);
            window.UI.showSuccess('Règles générées', `${rules.length} règles ont été ajoutées`);
        }
    }
}

// Expose necessary functions globally
window.toggleCategory = (categoryId) => {
    const content = document.getElementById(`content-${categoryId}`);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.fa-chevron-down');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
    }
};

window.generatePickitRules = () => {
    BetaPickitCreator.generateRules();
};
