// Test module to verify Vite is working correctly with ES modules
import dayjs from 'dayjs'

// Function to display current time
export function displayCurrentTime() {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const element = document.getElementById('current-time')
    if (element) {
        element.textContent = `Current time (via dayjs): ${now}`
    }
}

// Function to show relative time
export function showRelativeTime() {
    const lastUpdated = dayjs().subtract(5, 'minute')
    const relative = dayjs().to(lastUpdated)
    
    const element = document.getElementById('relative-time')
    if (element) {
        element.textContent = `Last updated: ${relative}`
    }
}

// Make functions available globally for testing
window.displayCurrentTime = displayCurrentTime
window.showRelativeTime = showRelativeTime

console.log('Test module loaded successfully')
console.log('dayjs is available:', typeof dayjs === 'function')
console.log('Current time:', dayjs().format())

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentTime()
    showRelativeTime()
})