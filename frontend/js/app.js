// Main application logic
class App {
    constructor() {
        this.form = document.getElementById('itemForm');
        this.itemsList = document.getElementById('itemsList');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.submitBtn = document.getElementById('submitBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.itemIdField = document.getElementById('itemId');
        
        this.editingItemId = null;
        
        this.init();
    }

    init() {
        // Load items on page load
        this.loadItems();
        
        // Setup event listeners
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.cancelBtn.addEventListener('click', () => this.resetForm());
    }

    async loadItems() {
        this.showLoading(true);
        this.hideError();
        
        try {
            const response = await api.getItems();
            this.renderItems(response.items || []);
        } catch (error) {
            this.showError(error.message || CONFIG.ERRORS.GENERAL);
        } finally {
            this.showLoading(false);
        }
    }

    renderItems(items) {
        if (items.length === 0) {
            this.itemsList.innerHTML = `
                <div class="empty-state">
                    <p>No items found. Create your first item!</p>
                </div>
            `;
            return;
        }

        this.itemsList.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item.id}">
                <h3>${this.escapeHtml(item.name || 'Untitled')}</h3>
                ${item.category ? `<span class="category">${this.escapeHtml(item.category)}</span>` : ''}
                ${item.description ? `<p>${this.escapeHtml(item.description)}</p>` : ''}
                <div class="meta">
                    Created: ${new Date(item.createdAt).toLocaleDateString()}
                    ${item.updatedAt !== item.createdAt ? `<br>Updated: ${new Date(item.updatedAt).toLocaleDateString()}` : ''}
                </div>
                <div class="item-actions">
                    <button class="edit-btn" onclick="app.editItem('${item.id}')">Edit</button>
                    <button class="delete-btn" onclick="app.deleteItem('${item.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(this.form);
        const data = {};
        
        // Convert FormData to object
        for (const [key, value] of formData.entries()) {
            if (value && key !== 'id') {
                data[key] = value;
            }
        }
        
        // Validate required fields
        if (!data.name) {
            this.showError(CONFIG.ERRORS.VALIDATION);
            return;
        }
        
        try {
            if (this.editingItemId) {
                // Update existing item
                await api.updateItem(this.editingItemId, data);
            } else {
                // Create new item
                await api.createItem(data);
            }
            
            this.resetForm();
            this.loadItems();
        } catch (error) {
            this.showError(error.message || CONFIG.ERRORS.GENERAL);
        }
    }

    async editItem(id) {
        try {
            const item = await api.getItem(id);
            
            // Populate form
            this.itemIdField.value = item.id;
            document.getElementById('name').value = item.name || '';
            document.getElementById('description').value = item.description || '';
            document.getElementById('category').value = item.category || '';
            
            // Update UI
            this.editingItemId = id;
            this.submitBtn.textContent = 'Update Item';
            this.cancelBtn.style.display = 'inline-block';
            
            // Scroll to form
            this.form.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            this.showError(error.message || CONFIG.ERRORS.GENERAL);
        }
    }

    async deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }
        
        try {
            await api.deleteItem(id);
            this.loadItems();
        } catch (error) {
            this.showError(error.message || CONFIG.ERRORS.GENERAL);
        }
    }

    resetForm() {
        this.form.reset();
        this.editingItemId = null;
        this.itemIdField.value = '';
        this.submitBtn.textContent = 'Add Item';
        this.cancelBtn.style.display = 'none';
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        this.error.textContent = message;
        this.error.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        this.error.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Save API endpoint
function saveApiEndpoint() {
    const input = document.getElementById('apiEndpoint');
    const endpoint = input.value.trim();
    
    if (endpoint) {
        localStorage.setItem('apiEndpoint', endpoint);
        location.reload();
    }
}

// Make it global
window.saveApiEndpoint = saveApiEndpoint;

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Show current API endpoint if set
    const savedEndpoint = localStorage.getItem('apiEndpoint');
    if (savedEndpoint) {
        document.getElementById('apiEndpoint').value = savedEndpoint;
    }
    
    app = new App();
});