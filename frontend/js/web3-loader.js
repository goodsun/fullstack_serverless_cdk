// Web3 configuration loader
window.Web3ConfigLoader = {
    async loadConfig() {
        try {
            let apiEndpoint = window.API_CONFIG?.apiEndpoint || localStorage.getItem('apiEndpoint')
            console.log('Loading Web3 config from:', apiEndpoint)
            
            if (!apiEndpoint) {
                console.warn('No API endpoint configured')
                return null
            }
            
            // Remove trailing slash if present
            apiEndpoint = apiEndpoint.replace(/\/$/, '')

            const url = `${apiEndpoint}/settings/app_config`
            console.log('Fetching:', url)
            const response = await fetch(url)
            if (!response.ok) {
                console.warn(`Failed to load Web3 config: ${response.status} ${response.statusText}`)
                return null
            }

            const data = await response.json()
            if (!data.data?.web3) {
                console.warn('No Web3 configuration found')
                return null
            }

            const web3Config = data.data.web3
            if (!web3Config.reownProjectId) {
                console.warn('No Reown project ID configured')
                return null
            }

            return {
                projectId: web3Config.reownProjectId,
                supportedChains: web3Config.supportedChains || [1],
                walletConnectEnabled: web3Config.enableWalletConnect !== false
            }
        } catch (error) {
            console.error('Error loading Web3 config:', error)
            return null
        }
    }
}