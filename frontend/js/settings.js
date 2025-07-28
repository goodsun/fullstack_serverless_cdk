// Settings management
const SETTINGS_KEY = 'app_config';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkApiEndpoint();
    loadSettings();
    
    // Form submit handler
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);
});

// Check if API endpoint is configured
function checkApiEndpoint() {
    if (!CONFIG.API_ENDPOINT) {
        showError('API endpoint not configured. Please configure it on the main page first.');
        document.getElementById('settings-loading').style.display = 'none';
        return false;
    }
    return true;
}

// Load settings from API
async function loadSettings() {
    if (!checkApiEndpoint()) return;
    
    const loading = document.getElementById('settings-loading');
    const error = document.getElementById('settings-error');
    const form = document.getElementById('settingsForm');
    
    loading.style.display = 'block';
    error.style.display = 'none';
    form.style.display = 'none';
    
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}/settings/${SETTINGS_KEY}`);
        
        if (response.status === 404) {
            // No settings yet, show empty form
            showForm({});
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.statusText}`);
        }
        
        const result = await response.json();
        showForm(result.data || {});
        
    } catch (err) {
        showError(`Failed to load settings: ${err.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// Display settings in form
function showForm(data) {
    const form = document.getElementById('settingsForm');
    
    // Web3 settings
    const web3 = data.web3 || {};
    document.getElementById('reownProjectId').value = web3.reownProjectId || '';
    document.getElementById('enableWalletConnect').checked = web3.enableWalletConnect || false;
    document.getElementById('defaultChainId').value = web3.defaultChainId || '1';
    
    // Supported chains
    const supportedChains = web3.supportedChains || [];
    document.querySelectorAll('input[name="chains"]').forEach(checkbox => {
        checkbox.checked = supportedChains.includes(parseInt(checkbox.value));
    });
    
    // Features
    const features = data.features || {};
    document.getElementById('requireAuthentication').checked = features.requireAuthentication || false;
    document.getElementById('maintenanceMode').checked = features.maintenanceMode || false;
    
    // Admin settings
    const admin = data.admin || {};
    const adminAddresses = admin.addresses || [];
    document.getElementById('adminAddresses').value = adminAddresses.join('\n');
    
    form.style.display = 'block';
}

// Save settings
async function saveSettings(event) {
    event.preventDefault();
    
    if (!checkApiEndpoint()) return;
    
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Disable form during save
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    // Collect form data
    const formData = new FormData(form);
    
    // Build settings object
    const settings = {
        web3: {
            reownProjectId: formData.get('reownProjectId'),
            enableWalletConnect: formData.get('enableWalletConnect') === 'on',
            supportedChains: Array.from(document.querySelectorAll('input[name="chains"]:checked'))
                .map(cb => parseInt(cb.value)),
            defaultChainId: parseInt(formData.get('defaultChainId'))
        },
        features: {
            requireAuthentication: formData.get('requireAuthentication') === 'on',
            maintenanceMode: formData.get('maintenanceMode') === 'on'
        },
        admin: {
            addresses: formData.get('adminAddresses')
                .split('\n')
                .map(addr => addr.trim())
                .filter(addr => addr.length > 0)
        }
    };
    
    try {
        const response = await fetch(`${CONFIG.API_ENDPOINT}/settings/${SETTINGS_KEY}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: settings })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save settings: ${response.statusText}`);
        }
        
        showSuccess('Settings saved successfully!');
        
    } catch (err) {
        showError(`Failed to save settings: ${err.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Settings';
    }
}

// Show error message
function showError(message) {
    const error = document.getElementById('settings-error');
    error.textContent = message;
    error.style.display = 'block';
}

// Show success message
function showSuccess(message) {
    // Create or update success message element
    let success = document.querySelector('.success');
    if (!success) {
        success = document.createElement('div');
        success.className = 'success';
        document.querySelector('main').insertBefore(success, document.getElementById('settingsForm'));
    }
    
    success.textContent = message;
    success.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        success.style.display = 'none';
    }, 3000);
}