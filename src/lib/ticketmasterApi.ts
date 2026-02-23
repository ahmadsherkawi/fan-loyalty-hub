// Ticketmaster Discovery API Service
// Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

// API Configuration
const TICKETMASTER_API_KEY = process.env.NEXT_PUBLIC_TICKETMASTER_API_KEY || 'YOUR_TICKETMASTER_API_KEY';
const TICKETMASTER_BASE = 'https://app.ticketmaster.com/discovery/v2';

// Cache configuration
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ================= TYPES =================

export interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  dates: {
    start: {
      localDate: string;
      localTime: string;
      dateTime: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  venue?: {
    name: string;
    city: { name: string };
    country: { name: string; countryCode: string };
    address?: { line1: string };
    location?: { latitude: string; longitude: string };
  };
  images?: Array<{
    url: string;
    ratio: string;
    width: number;
    height: number;
  }>;
  classifications?: Array<{
    segment: { name: string };
    genre: { name: string };
  }>;
}

export interface TicketSearchResult {
  id: string;
  name: string;
  url: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  country: string;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
  image: string | null;
  status: string;
}

// ================= API FUNCTIONS =================

/**
 * Search for events by keyword (team names, venue, etc.)
 */
export async function searchEvents(
  keyword: string,
  options: {
    countryCode?: string;
    city?: string;
    size?: number;
    page?: number;
  } = {}
): Promise<TicketSearchResult[]> {
  const cacheKey = `tm-search-${keyword}-${options.countryCode || 'all'}-${options.city || 'all'}`;
  const cached = getCached<TicketSearchResult[]>(cacheKey);
  if (cached) return cached;

  console.log('[Ticketmaster] Searching for:', keyword);

  try {
    const params = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      keyword: keyword,
      size: String(options.size || 20),
      page: String(options.page || 0),
      sort: 'date,asc',
    });

    if (options.countryCode) {
      params.append('countryCode', options.countryCode);
    }
    if (options.city) {
      params.append('city', options.city);
    }

    const response = await fetch(`${TICKETMASTER_BASE}/events.json?${params}`);
    
    if (!response.ok) {
      console.error('[Ticketmaster] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const events = data._embedded?.events || [];

    const results: TicketSearchResult[] = events.map((event: TicketmasterEvent) => ({
      id: event.id,
      name: event.name,
      url: event.url,
      date: event.dates?.start?.localDate || '',
      time: event.dates?.start?.localTime || '',
      venue: event.venue?.name || 'TBD',
      city: event.venue?.city?.name || '',
      country: event.venue?.country?.name || '',
      minPrice: event.priceRanges?.[0]?.min || null,
      maxPrice: event.priceRanges?.[0]?.max || null,
      currency: event.priceRanges?.[0]?.currency || 'USD',
      image: event.images?.[0]?.url || null,
      status: event.dates?.status?.code || 'onsale',
    }));

    console.log(`[Ticketmaster] Found ${results.length} events`);
    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('[Ticketmaster] Search error:', error);
    return [];
  }
}

/**
 * Search for football/soccer events by team name
 */
export async function searchFootballEvents(
  homeTeam: string,
  awayTeam?: string,
  countryCode?: string
): Promise<TicketSearchResult[]> {
  // Try various search combinations
  const searches = [
    `${homeTeam} ${awayTeam || ''}`.trim(),
    homeTeam,
  ];

  const allResults: TicketSearchResult[] = [];
  const seenIds = new Set<string>();

  for (const query of searches) {
    const results = await searchEvents(query, { countryCode, size: 10 });
    for (const result of results) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        allResults.push(result);
      }
    }
  }

  return allResults;
}

/**
 * Get event details by ID
 */
export async function getEventDetails(eventId: string): Promise<TicketSearchResult | null> {
  const cacheKey = `tm-event-${eventId}`;
  const cached = getCached<TicketSearchResult>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${TICKETMASTER_BASE}/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`
    );

    if (!response.ok) return null;

    const event: TicketmasterEvent = await response.json();
    
    const result: TicketSearchResult = {
      id: event.id,
      name: event.name,
      url: event.url,
      date: event.dates?.start?.localDate || '',
      time: event.dates?.start?.localTime || '',
      venue: event.venue?.name || 'TBD',
      city: event.venue?.city?.name || '',
      country: event.venue?.country?.name || '',
      minPrice: event.priceRanges?.[0]?.min || null,
      maxPrice: event.priceRanges?.[0]?.max || null,
      currency: event.priceRanges?.[0]?.currency || 'USD',
      image: event.images?.[0]?.url || null,
      status: event.dates?.status?.code || 'onsale',
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Ticketmaster] Get event error:', error);
    return null;
  }
}

// ================= DEEP LINK HELPERS =================

/**
 * Generate StubHub search URL (worldwide coverage via viagogo)
 */
export function getStubHubSearchUrl(eventName: string, city?: string): string {
  const query = encodeURIComponent(`${eventName} ${city || ''}`.trim());
  return `https://www.stubhub.com/search?q=${query}`;
}

/**
 * Generate viagogo search URL (international)
 */
export function getViagogoSearchUrl(eventName: string, city?: string): string {
  const query = encodeURIComponent(`${eventName} ${city || ''}`.trim());
  return `https://www.viagogo.com/ww/search?q=${query}`;
}

/**
 * Generate SeatGeek search URL (US-focused)
 */
export function getSeatGeekSearchUrl(eventName: string, city?: string): string {
  const query = encodeURIComponent(`${eventName} ${city || ''}`.trim());
  return `https://seatgeek.com/search?search=${query}`;
}

/**
 * Generate Google search URL for tickets
 */
export function getGoogleTicketsSearchUrl(eventName: string, date?: string): string {
  const query = encodeURIComponent(`${eventName} tickets ${date || ''}`.trim());
  return `https://www.google.com/search?q=${query}`;
}

// ================= EXPORT =================

export const ticketmasterApi = {
  searchEvents,
  searchFootballEvents,
  getEventDetails,
  getStubHubSearchUrl,
  getViagogoSearchUrl,
  getSeatGeekSearchUrl,
  getGoogleTicketsSearchUrl,
};
