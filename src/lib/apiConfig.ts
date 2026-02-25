// API Configuration
// This file contains configuration for external APIs

// API-Football Configuration
// PRO Plan: 7,500 requests/day for $19/month
// API Key is pre-configured in apiFootball.ts

/**
 * Initialize API-Football (key is already configured)
 * This function exists for compatibility
 */
export function initApiFootball(_apiKey?: string) {
  // API key is already configured in apiFootball.ts
  console.log('[Config] API-Football PRO is ready (7,500 requests/day)');
}

/**
 * Check if API-Football is configured
 */
export function isApiFootballConfigured(): boolean {
  return true; // Key is pre-configured
}

/**
 * Configuration object for all external APIs
 */
export const apiConfig = {
  apiFootball: {
    init: initApiFootball,
    isConfigured: isApiFootballConfigured,
  },
};

export default apiConfig;
