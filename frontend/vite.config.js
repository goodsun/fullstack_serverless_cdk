import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Don't empty outDir on build
    emptyOutDir: true,
    
    // Asset handling
    assetsDir: 'assets',
    
    // Multiple entry points for different HTML pages
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        settings: resolve(__dirname, 'settings.html'),
        error: resolve(__dirname, 'error.html')
      }
    },
    
    // Keep file names consistent for CDK deployment
    assetsInlineLimit: 0, // Don't inline any assets
    
    // Source maps for debugging
    sourcemap: false
  },
  
  // Preserve folder structure for assets
  publicDir: 'assets'
})