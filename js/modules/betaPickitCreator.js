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

    static loadingStatus = new Map();
    static loadedData = new Map();

    static async init() {
        this.initProgressBar();
        this.startBackgroundLoading();
    }

    static initProgressBar() {
        const accordion = document.getElementById('categoryAccordion');
        accordion.innerHTML = `
            <div class="loading-status mb-3">
                <div class="progress">
                    <div id="loadingProgress" class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <div id="loadingText" class="text-center mt-2">Chargement des données en arrière-plan...</div>
                <div id="loadingDetails" class="text-muted small"></div>
            </div>
        `;
    }

    static async startBackgroundLoading() {
        const totalCategories = this.categories.length;
        let loadedCategories = 0;

        for (const category of this.categories) {
            this.loadingStatus.set(category.id, 'pending');
            this.updateLoadingProgress(loadedCategories, totalCategories);

            this.loadCategoryData(category).then(() => {
                loadedCategories++;
                this.updateLoadingProgress(loadedCategories, totalCategories);
                this.loadingStatus.set(category.id, 'completed');
                this.renderCategory(category);
            }).catch(error => {
                console.error(`Erreur chargement ${category.name}:`, error);
                this.loadingStatus.set(category.id, 'error');
                this.updateLoadingProgress(loadedCategories, totalCategories);
            });
        }
    }

    static async loadCategoryData(category) {
        try {
            const response = await fetch(`https://poe2scout.com/api/items/${category.endpoint}?page=1&per_page=25&league=Standard`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.loadedData.set(category.id, data);
            return data;
        } catch (error) {
            console.error(`Error loading ${category.name}:`, error);
            this.loadedData.set(category.id, []);
            throw error;
        }
    }

    static updateLoadingProgress(loaded, total) {
        const progress = Math.round((loaded / total) * 100);
        const progressBar = document.getElementById('loadingProgress');
        const loadingText = document.getElementById('loadingText');
        const loadingDetails = document.getElementById('loadingDetails');

        if (progressBar) progressBar.style.width = `${progress}%`;
        if (loadingText) loadingText.textContent = `Chargement des données: ${progress}%`;
        
        const details = Array.from(this.loadingStatus.entries())
            .map(([id, status]) => {
                const category = this.categories.find(c => c.id === id);
                const statusText = status === 'completed' ? '✓' : status === 'error' ? '✗' : '⌛';
                return `${category.name}: ${statusText}`;
            })
            .join(' | ');
        
        if (loadingDetails) loadingDetails.textContent = details;
    }

    static renderCategory(category) {
        const items = this.loadedData.get(category.id) || [];
        const accordion = document.getElementById('categoryAccordion');
        
        // Crée ou met à jour le panneau de catégorie
        let categoryPanel = document.getElementById(`category-${category.id}`);
        if (!categoryPanel) {
            categoryPanel = document.createElement('div');
            categoryPanel.id = `category-${category.id}`;
            categoryPanel.className = 'category-accordion mb-3';
            accordion.appendChild(categoryPanel);
        }

        categoryPanel.innerHTML = `
            <div class="category-header" onclick="toggleCategory('${category.id}')">
                <div>
                    <i class="fas fa-box category-icon"></i>
                    ${category.name} (${items.length} items)
                    ${this.loadingStatus.get(category.id) === 'error' ? 
                        '<span class="text-danger ml-2"><i class="fas fa-exclamation-triangle"></i></span>' : ''}
                </div>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div id="content-${category.id}" class="category-content" style="display: none;">
                ${this.renderItems(items, category)}
            </div>
        `;
    }

    static renderItems(items, category) {
        if (!items.length) {
            return '<p class="text-muted">Aucun item disponible</p>';
        }

        return `
            <table class="items-table">
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <input type="checkbox" class="item-checkbox" 
                                       data-category="${category.id}" 
                                       data-item="${item.name || ''}" 
                                       id="item-${category.id}-${item.id || Math.random()}">
                                <label for="item-${category.id}-${item.id || Math.random()}">
                                    ${item.name || 'Unnamed Item'}
                                </label>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
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
