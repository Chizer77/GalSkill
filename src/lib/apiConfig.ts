export interface APIConfig {
    baseUrl: string
    modelName: string
    apiKey: string
}

const CONFIG_KEY = 'galskill_api_config'

const DEFAULT_CONFIG: APIConfig = {
    baseUrl: '',
    modelName: '',
    apiKey: ''
}

/**
 * Persistance helpers for API configuration
 */
export const ApiConfigManager = {
    save(config: APIConfig): void {
        if (typeof window === 'undefined') return
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
        } catch (error) {
            console.error('Failed to save API config:', error)
        }
    },

    load(): APIConfig {
        if (typeof window === 'undefined') return DEFAULT_CONFIG
        try {
            const stored = localStorage.getItem(CONFIG_KEY)
            return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG
        } catch (error) {
            console.error('Failed to load API config:', error)
            return DEFAULT_CONFIG
        }
    },

    clear(): void {
        if (typeof window === 'undefined') return
        localStorage.removeItem(CONFIG_KEY)
    },

    validate(config: APIConfig): { valid: boolean; error?: string } {
        if (!config.baseUrl) return { valid: false, error: 'Base URL is required' }
        if (!config.modelName) return { valid: false, error: 'Model name is required' }
        if (!config.apiKey) return { valid: false, error: 'API Key is required' }

        try {
            new URL(config.baseUrl)
        } catch {
            return { valid: false, error: 'Invalid Base URL format' }
        }

        return { valid: true }
    }
}
