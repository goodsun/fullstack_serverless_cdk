// Configuration for the frontend app
const CONFIG = {
    // API endpoint from localStorage or empty
    API_ENDPOINT: localStorage.getItem('apiEndpoint') || '',
    
    // API paths
    ITEMS_PATH: '/items',
    
    // UI settings
    DEBOUNCE_DELAY: 300,
    
    // Error messages
    ERRORS: {
        NETWORK: 'Network error. Please check your connection.',
        GENERAL: 'An error occurred. Please try again.',
        NOT_FOUND: 'Item not found.',
        VALIDATION: 'Please fill in all required fields.',
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);