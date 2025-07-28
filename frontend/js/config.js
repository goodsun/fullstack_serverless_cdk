// Configuration for the frontend app
const CONFIG = {
    // API endpoint: auto-configured > localStorage > empty
    API_ENDPOINT: (window.API_CONFIG && window.API_CONFIG.apiEndpoint) || 
                  localStorage.getItem('apiEndpoint') || 
                  '',
    
    // Check if API is managed by deployment
    IS_API_MANAGED: window.API_CONFIG && window.API_CONFIG.isManaged,
    
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