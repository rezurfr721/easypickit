export class UI {
    static showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: message
        });
    }

    static showSuccess(title, message) {
        Swal.fire({
            icon: 'success',
            title: title,
            text: message
        });
    }

    static showWarning(title, rulesCount, errors) {
        Swal.fire({
            icon: 'warning',
            title: title,
            html: `${rulesCount} règles chargées<br>${errors.length} avertissements:<br>${errors.map(e => `- ${e}<br>`).join('')}`,
            width: '600px'
        });
    }

    static renderRules(rules) {
        const tbody = document.querySelector('#rulesTable tbody');
        if (!tbody) {
            console.error('Table body not found');
            return;
        }

        console.log('Rendering rules:', rules);
        tbody.innerHTML = '';
        
        rules.forEach((rule, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${rule.line}</td>
                <td>${rule.conditions}</td>
                <td>${rule.action}</td>
                <td class="action-column">
                    <button class="btn btn-primary btn-sm" onclick="editRule(${index})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRule(${index})" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    static updatePreview() {
        // Implémentation de la mise à jour de l'aperçu
    }
}
