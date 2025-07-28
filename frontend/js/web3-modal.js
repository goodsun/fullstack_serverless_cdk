// Reown AppKit implementation
import { createAppKit } from '@reown/appkit'
import { mainnet, polygon, arbitrum, sepolia } from '@reown/appkit/networks'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

let modal = null
let wagmiAdapter = null

// Initialize Web3Modal
async function initWeb3Modal() {
    const config = await window.Web3ConfigLoader.loadConfig()
    
    if (!config || !config.projectId) {
        console.warn('Web3 configuration not available')
        updateWalletUI(false)
        return false
    }

    // Configure networks based on settings
    const networkMap = {
        1: mainnet,
        137: polygon,
        42161: arbitrum,
        11155111: sepolia
    }
    
    const networks = config.supportedChains
        .map(chainId => networkMap[chainId])
        .filter(Boolean)
    
    if (networks.length === 0) networks.push(mainnet)

    // Configure Wagmi adapter
    wagmiAdapter = new WagmiAdapter({
        projectId: config.projectId,
        networks
    })

    // Metadata
    const metadata = {
        name: 'Fullstack Serverless App',
        description: 'Web3 enabled serverless application',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/179229932']
    }

    // Create modal
    modal = createAppKit({
        adapters: [wagmiAdapter],
        networks,
        metadata,
        projectId: config.projectId,
        features: {
            analytics: true
        },
        // Disable auto-connect on page load
        enableOnramp: false,
        enableWalletConnect: config.walletConnectEnabled,
        defaultChain: networks[0]
    })

    // Subscribe to account changes
    modal.subscribeAccount(account => {
        console.log('Account changed:', account)
        if (account.isConnected && account.address) {
            updateWalletUI(true, account.address)
            checkAdminStatus(account.address)
        } else {
            updateWalletUI(false)
        }
    })
    
    // Subscribe to disconnection events
    modal.subscribeEvents(event => {
        console.log('Modal event:', event)
        console.log('Event type:', event.data?.event)
        if (event.data?.event === 'DISCONNECT' || event.data?.event === 'disconnect') {
            updateWalletUI(false)
        }
    })
    
    // Also subscribe to wagmi state changes
    wagmiAdapter.wagmiConfig.subscribe(
        (state) => state.connections,
        (connections) => {
            console.log('Connections changed:', connections)
            if (connections.size === 0) {
                updateWalletUI(false)
            }
        }
    )

    console.log('Reown AppKit initialized')
    updateWalletUI(false)
}

// Connect wallet
window.connectWallet = async function() {
    if (!modal) {
        const config = await window.Web3ConfigLoader.loadConfig()
        if (!config) {
            alert('Please configure Web3 settings first.\\n\\nGo to Settings and add your Reown Project ID.')
            return
        }
        alert('Wallet connection is initializing. Please try again in a moment.')
        return
    }

    try {
        await modal.open()
    } catch (error) {
        console.error('Failed to connect:', error)
        alert('Failed to connect wallet. Please try again.')
    }
}

// Disconnect wallet
window.disconnectWallet = async function() {
    try {
        // Clear all storage first
        console.log('Clearing wallet storage...')
        
        // Clear localStorage items related to wallet connections
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('wagmi') || key.includes('wc@') || key.includes('walletconnect') || key.includes('reown'))) {
                keysToRemove.push(key)
            }
        }
        keysToRemove.forEach(key => {
            console.log('Removing localStorage key:', key)
            localStorage.removeItem(key)
        })
        
        // Clear sessionStorage too
        sessionStorage.clear()
        
        // Now disconnect
        if (wagmiAdapter?.wagmiConfig) {
            const { disconnect } = await import('@wagmi/core')
            await disconnect(wagmiAdapter.wagmiConfig)
        }
        
        if (modal) {
            await modal.disconnect()
        }
        
        // Update UI immediately
        updateWalletUI(false)
        
        // Reload after a short delay
        setTimeout(() => {
            window.location.reload()
        }, 100)
        
    } catch (error) {
        console.error('Error disconnecting:', error)
        window.location.reload()
    }
}

// Check if address is admin
async function checkAdminStatus(address) {
    if (!address) return
    
    try {
        const apiEndpoint = window.API_CONFIG?.apiEndpoint || localStorage.getItem('apiEndpoint')
        if (!apiEndpoint) return
        
        const response = await fetch(`${apiEndpoint.replace(/\/$/, '')}/settings/app_config`)
        if (!response.ok) return
        
        const data = await response.json()
        const adminAddresses = data.data?.admin?.addresses || []
        
        const isAdmin = adminAddresses.some(admin => 
            admin.toLowerCase() === address.toLowerCase()
        )
        
        const settingsLink = document.querySelector('.settings-link')
        if (settingsLink) {
            settingsLink.style.display = isAdmin ? 'inline-block' : 'none'
        }
    } catch (error) {
        console.error('Failed to check admin status:', error)
    }
}

// Update UI
function updateWalletUI(connected, address = null) {
    const connectBtn = document.getElementById('connectWallet')
    const walletInfo = document.getElementById('walletInfo')
    const walletError = document.getElementById('walletError')

    if (walletError) {
        walletError.style.display = 'none'
    }

    if (connected && address) {
        if (connectBtn) {
            connectBtn.textContent = 'Disconnect'
            connectBtn.onclick = window.disconnectWallet
        }
        if (walletInfo) {
            const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
            walletInfo.innerHTML = `<span class="wallet-address">🔗 ${shortAddress}</span>`
            walletInfo.style.display = 'inline-block'
        }
        
        window.walletAddress = address
    } else {
        if (connectBtn) {
            connectBtn.textContent = 'Connect Wallet'
            connectBtn.onclick = window.connectWallet
        }
        if (walletInfo) {
            walletInfo.style.display = 'none'
        }
        
        window.walletAddress = null
        
        // Hide settings link when not connected
        const settingsLink = document.querySelector('.settings-link')
        if (settingsLink) {
            settingsLink.style.display = 'none'
        }
    }
}

// Debug function to check connection state
window.debugWeb3State = function() {
    console.log('Modal:', modal)
    console.log('WagmiAdapter:', wagmiAdapter)
    console.log('Current connections:', wagmiAdapter?.wagmiConfig?.state?.connections)
    console.log('Modal state:', modal?.getState())
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    await initWeb3Modal()
})

// Export for other modules
export { modal, wagmiAdapter }