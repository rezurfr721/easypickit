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
        await this.loadAllData();
    }

    static async loadAllData(league = 'Standard', forceRefresh = false) {
        const accordion = document.getElementById('categoryAccordion');
        accordion.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Chargement des données...</div>';

        try {
            for (const category of this.categories) {
                const items = await this.fetchCategoryData(category.endpoint, league);
                this.createCategoryPanel(accordion, category, items);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            accordion.innerHTML = '<div class="alert alert-danger">Erreur lors du chargement des données</div>';
        }
    }

    static async fetchCategoryData(endpoint, league, page = 1, perPage = 25) {
        try {
            const corsProxy = 'https://cors-anywhere.herokuapp.com/';
            const url = `${corsProxy}https://poe2scout.com/api/items/${endpoint}?page=${page}&per_page=${perPage}&league=${league}`;
            
            const response = await fetch(url, {
                headers: {
                    'Origin': window.location.origin
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching ${endpoint} data:`, error);
            return [];
        }
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
