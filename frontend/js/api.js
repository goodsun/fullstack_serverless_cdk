// API client for CRUD operations
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, finalOptions);
            
            if (response.status === 204) {
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Get all items
    async getItems() {
        return this.request(CONFIG.ITEMS_PATH);
    }

    // Get single item
    async getItem(id) {
        return this.request(`${CONFIG.ITEMS_PATH}/${id}`);
    }

    // Create new item
    async createItem(data) {
        return this.request(CONFIG.ITEMS_PATH, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Update existing item
    async updateItem(id, data) {
        return this.request(`${CONFIG.ITEMS_PATH}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Delete item
    async deleteItem(id) {
        return this.request(`${CONFIG.ITEMS_PATH}/${id}`, {
            method: 'DELETE',
        });
    }
}

// Create and export API client instance
const api = new ApiClient(CONFIG.API_ENDPOINT);