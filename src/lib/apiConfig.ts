// API Configuration
// This file contains configuration for external APIs

// API-Football Configuration
// Get your API key from https://www.api-football.com/
// PRO Plan: 7,500 requests/day for $19/month

let API_FOOTBALL_KEY = '';

/**
 * Initialize API-Football with your API key
 * Call this once at app startup
 */
export function initApiFootball(apiKey: string) {
  API_FOOTBALL_KEY = apiKey;
  
  // Also set it in the apiFootball module
  // This is done dynamically to support runtime configuration
  import('@/lib/apiFootball').then((module) => {
    module.apiFootball.setApiKey(apiKey);
  });
  
  console.log('[Config] API-Football initialized');
}

/**
 * Get the current API key (for checking if configured)
 */
export function getApiFootballKey(): string {
  return API_FOOTBALL_KEY;
}

/**
 * Check if API-Football is configured
 */
export function isApiFootballConfigured(): boolean {
  return API_FOOTBALL_KEY.length > 0;
}

/**
 * Configuration object for all external APIs
 */
export const apiConfig = {
  apiFootball: {
    init: initApiFootball,
    getKey: getApiFootballKey,
    isConfigured: isApiFootballConfigured,
  },
};

export default apiConfig;
