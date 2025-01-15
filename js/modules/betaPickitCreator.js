export class BetaPickitCreator {
    static categories = [
        { id: 'currency', name: 'Currency' },
        { id: 'ultimatum', name: 'Ultimatum' },
        { id: 'breach', name: 'Breach' },
        { id: 'delirium', name: 'Delirium' },
        { id: 'essences', name: 'Essences' },
        { id: 'fragments', name: 'Fragments' },
        { id: 'expedition', name: 'Expedition' },
        { id: 'ritual', name: 'Ritual' },
        { id: 'runes', name: 'Runes' }
    ];

    static async init() {
        const accordion = document.getElementById('categoryAccordion');
        
        for (const category of this.categories) {
            const items = await this.fetchItems(category.id);
            this.createCategoryPanel(accordion, category, items);
        }
    }

    static async fetchItems(category) {
        try {
            const response = await fetch(`https://poe2scout.com/api/items/${category}?&league=Standard`, {
                mode: 'no-cors',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            // Note: en mode no-cors, on ne peut pas accéder au contenu de la réponse
            // Il faudra peut-être stocker les données localement ou utiliser une autre approche
            
            return []; // Retourner des données par défaut ou mockées
        } catch (error) {
            console.error(`Error fetching ${category} items:`, error);
            return [];
        }
    }

    static createCategoryPanel(accordion, category, items) {
        const panel = document.createElement('div');
        panel.className = 'category-accordion';
        panel.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${category.id}')">
                <div>
                    <i class="fas fa-box category-icon"></i>
                    ${category.name}
                </div>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div id="content-${category.id}" class="category-content" style="display: none;">
                <table class="items-table">
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>
                                    <input type="checkbox" class="item-checkbox" 
                                           data-category="${category.id}" 
                                           data-item="${item.name}" 
                                           id="item-${category.id}-${item.id}">
                                    <label for="item-${category.id}-${item.id}">${item.name}</label>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        accordion.appendChild(panel);
    }

    static generateRules() {
        const selectedItems = document.querySelectorAll('.item-checkbox:checked');
        const rules = Array.from(selectedItems).map(checkbox => {
            return {
                conditions: `Name = "${checkbox.dataset.item}"`,
                action: "StashItem"
            };
        });
        return rules;
    }
}

// Fonctions globales
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

window.showBetaPickitCreator = () => {
    document.querySelectorAll('.container > .card').forEach(card => card.style.display = 'none');
    document.getElementById('betaPickitCreator').style.display = 'block';
    BetaPickitCreator.init();
};

window.generatePickitRules = () => {
    const rules = BetaPickitCreator.generateRules();
    // Ajouter les règles générées à la liste principale des règles
    rules.forEach(rule => window.addRule(rule));
};
