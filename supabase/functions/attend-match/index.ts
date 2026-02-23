// Supabase Edge Function: Attend Match
// Provides AI-powered match attendance planning
// Features: Weather forecasts, Ticket deep links, Travel options, AI tips

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenWeather API Configuration
const OPENWEATHER_API_KEY = 'ef3861afb3079a4166b2a60a3100aab9';
const OPENWEATHER_BASE = 'https://api.openweathermap.org/data/2.5';

// Stadium/venue city coordinates for weather lookups
const VENUE_COORDINATES: Record<string, { lat: number; lon: number; country: string }> = {
  // Premier League
  'london': { lat: 51.5074, lon: -0.1278, country: 'UK' },
  'manchester': { lat: 53.4808, lon: -2.2426, country: 'UK' },
  'liverpool': { lat: 53.4084, lon: -2.9916, country: 'UK' },
  'birmingham': { lat: 52.4862, lon: -1.8904, country: 'UK' },
  'leeds': { lat: 53.8008, lon: -1.5491, country: 'UK' },
  'newcastle': { lat: 54.9783, lon: -1.6178, country: 'UK' },
  'brighton': { lat: 50.8225, lon: -0.1372, country: 'UK' },
  'southampton': { lat: 50.9097, lon: -1.4044, country: 'UK' },
  'leicester': { lat: 52.6369, lon: -1.1398, country: 'UK' },
  'wolverhampton': { lat: 52.5866, lon: -2.1293, country: 'UK' },
  'nottingham': { lat: 52.9548, lon: -1.1581, country: 'UK' },
  'bournemouth': { lat: 50.7192, lon: -1.8808, country: 'UK' },
  'brentford': { lat: 51.4875, lon: -0.3087, country: 'UK' },
  'fulham': { lat: 51.4749, lon: -0.2216, country: 'UK' },
  'crystal palace': { lat: 51.4232, lon: -0.0827, country: 'UK' },
  
  // La Liga
  'madrid': { lat: 40.4168, lon: -3.7038, country: 'Spain' },
  'barcelona': { lat: 41.3851, lon: 2.1734, country: 'Spain' },
  'sevilla': { lat: 37.3891, lon: -5.9845, country: 'Spain' },
  'valencia': { lat: 39.4699, lon: -0.3763, country: 'Spain' },
  'bilbao': { lat: 43.2630, lon: -2.9350, country: 'Spain' },
  'villarreal': { lat: 39.9400, lon: -0.1064, country: 'Spain' },
  'girona': { lat: 41.9794, lon: 2.8214, country: 'Spain' },
  
  // Serie A
  'milan': { lat: 45.4642, lon: 9.1900, country: 'Italy' },
  'rome': { lat: 41.9028, lon: 12.4964, country: 'Italy' },
  'roma': { lat: 41.9028, lon: 12.4964, country: 'Italy' },
  'naples': { lat: 40.8518, lon: 14.2681, country: 'Italy' },
  'napoli': { lat: 40.8518, lon: 14.2681, country: 'Italy' },
  'turin': { lat: 45.0703, lon: 7.6869, country: 'Italy' },
  'florence': { lat: 43.7696, lon: 11.2558, country: 'Italy' },
  'bologna': { lat: 44.4949, lon: 11.3426, country: 'Italy' },
  'bergamo': { lat: 45.6983, lon: 9.6773, country: 'Italy' },
  
  // Bundesliga
  'munich': { lat: 48.1351, lon: 11.5820, country: 'Germany' },
  'dortmund': { lat: 51.5136, lon: 7.4653, country: 'Germany' },
  'leipzig': { lat: 51.3397, lon: 12.3731, country: 'Germany' },
  'leverkusen': { lat: 51.0459, lon: 7.0192, country: 'Germany' },
  'stuttgart': { lat: 48.7758, lon: 9.1829, country: 'Germany' },
  'frankfurt': { lat: 50.1109, lon: 8.6821, country: 'Germany' },
  'wolfsburg': { lat: 52.4273, lon: 10.7823, country: 'Germany' },
  'gladbach': { lat: 51.1854, lon: 6.4426, country: 'Germany' },
  
  // Ligue 1
  'paris': { lat: 48.8566, lon: 2.3522, country: 'France' },
  'marseille': { lat: 43.2965, lon: 5.3698, country: 'France' },
  'lyon': { lat: 45.7640, lon: 4.8357, country: 'France' },
  'lille': { lat: 50.6292, lon: 3.0573, country: 'France' },
  'nice': { lat: 43.7102, lon: 7.2620, country: 'France' },
  'monaco': { lat: 43.7384, lon: 7.4246, country: 'Monaco' },
  'rennes': { lat: 48.1173, lon: -1.6778, country: 'France' },
  'lens': { lat: 50.4292, lon: 2.8308, country: 'France' },
  
  // Primeira Liga
  'lisbon': { lat: 38.7223, lon: -9.1393, country: 'Portugal' },
  'lisboa': { lat: 38.7223, lon: -9.1393, country: 'Portugal' },
  'porto': { lat: 41.1579, lon: -8.6291, country: 'Portugal' },
  
  // Eredivisie
  'amsterdam': { lat: 52.3676, lon: 4.9041, country: 'Netherlands' },
  'rotterdam': { lat: 51.9225, lon: 4.4792, country: 'Netherlands' },
  'eindhoven': { lat: 51.4416, lon: 5.4697, country: 'Netherlands' },
  
  // Champions League / Other European cities
  'vienna': { lat: 48.2082, lon: 16.3738, country: 'Austria' },
  'brussels': { lat: 50.8503, lon: 4.3517, country: 'Belgium' },
  'copenhagen': { lat: 55.6761, lon: 12.5683, country: 'Denmark' },
  'athens': { lat: 37.9838, lon: 23.7275, country: 'Greece' },
  'istanbul': { lat: 41.0082, lon: 28.9784, country: 'Turkey' },
  'warsaw': { lat: 52.2297, lon: 21.0122, country: 'Poland' },
  'prague': { lat: 50.0755, lon: 14.4378, country: 'Czech Republic' },
  'glasgow': { lat: 55.8642, lon: -4.2518, country: 'UK' },
  'edinburgh': { lat: 55.9533, lon: -3.1883, country: 'UK' },
  'dublin': { lat: 53.3498, lon: -6.2603, country: 'Ireland' },
  'zurich': { lat: 47.3769, lon: 8.5417, country: 'Switzerland' },
  'geneva': { lat: 46.2044, lon: 6.1432, country: 'Switzerland' },
  
  // Other major football cities
  'moscow': { lat: 55.7558, lon: 37.6173, country: 'Russia' },
  'kiev': { lat: 50.4501, lon: 30.5234, country: 'Ukraine' },
  'bucharest': { lat: 44.4268, lon: 26.1025, country: 'Romania' },
  'belgrade': { lat: 44.7866, lon: 20.4489, country: 'Serbia' },
  'zagreb': { lat: 45.8150, lon: 15.9819, country: 'Croatia' },
  'lisbon': { lat: 38.7223, lon: -9.1393, country: 'Portugal' },
  'benfica': { lat: 38.7528, lon: -9.1849, country: 'Portugal' },
  
  // International
  'doha': { lat: 25.2854, lon: 51.5310, country: 'Qatar' },
  'dubai': { lat: 25.2048, lon: 55.2708, country: 'UAE' },
  'riyadh': { lat: 24.7136, lon: 46.6753, country: 'Saudi Arabia' },
  'jeddah': { lat: 21.4858, lon: 39.1925, country: 'Saudi Arabia' },
};

interface AttendMatchRequest {
  match: {
    homeTeam: string;
    awayTeam: string;
    venue: string;
    city: string;
    country: string;
    date: string;
    time: string;
    league: string;
  };
  userLocation?: { city: string; country: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Attend Match] Received request');

  try {
    const data: AttendMatchRequest = await req.json();
    console.log('[Attend Match] Match:', data.match.homeTeam, 'vs', data.match.awayTeam);
    console.log('[Attend Match] City:', data.match.city, 'Country:', data.match.country);

    // 1. Get Weather Forecast
    const weather = await getWeatherForecast(data.match.city, data.match.date);

    // 2. Generate Ticket Links (Deep links to multiple platforms)
    const tickets = generateTicketLinks(data.match);

    // 3. Generate Transportation Links
    const transportation = generateTransportationLinks(data.match, data.userLocation);

    // 4. Generate AI Tips
    const aiTips = await generateAITips(data.match, weather);

    const response = {
      success: true,
      data: {
        tickets,
        transportation,
        weather,
        aiTips,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Attend Match] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch match attendance data',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ================= WEATHER FUNCTIONS =================

async function getWeatherForecast(city: string, matchDate: string): Promise<{
  temperature: number | null;
  condition: string;
  description: string;
  recommendation: string;
} | null> {
  console.log('[Weather] Getting forecast for:', city);
  
  // Find coordinates for the city
  const cityLower = city.toLowerCase().trim();
  let coords = VENUE_COORDINATES[cityLower];
  
  // Try partial match if exact match not found
  if (!coords) {
    for (const [key, value] of Object.entries(VENUE_COORDINATES)) {
      if (key.includes(cityLower) || cityLower.includes(key)) {
        coords = value;
        console.log('[Weather] Matched city:', key);
        break;
      }
    }
  }
  
  if (!coords) {
    console.log('[Weather] City not found in coordinates map');
    return null;
  }
  
  try {
    // Check if match is within 5 days (OpenWeather free tier forecast limit)
    const matchDateTime = new Date(matchDate);
    const now = new Date();
    const daysUntilMatch = Math.ceil((matchDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let url: string;
    
    if (daysUntilMatch <= 5 && daysUntilMatch >= 0) {
      // Use 5-day forecast API
      url = `${OPENWEATHER_BASE}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    } else {
      // Use current weather for far future matches (just as reference)
      url = `${OPENWEATHER_BASE}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('[Weather] API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('[Weather] API response received');
    
    let weatherData;
    
    if (data.list) {
      // Forecast response - find closest time to match
      const matchTimestamp = matchDateTime.getTime() / 1000;
      let closest = data.list[0];
      let minDiff = Math.abs(closest.dt - matchTimestamp);
      
      for (const item of data.list) {
        const diff = Math.abs(item.dt - matchTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closest = item;
        }
      }
      
      weatherData = closest;
    } else {
      // Current weather response
      weatherData = data;
    }
    
    const temp = weatherData.main?.temp ?? null;
    const condition = weatherData.weather?.[0]?.main ?? 'Unknown';
    const description = weatherData.weather?.[0]?.description ?? '';
    
    return {
      temperature: temp ? Math.round(temp) : null,
      condition,
      description: description.charAt(0).toUpperCase() + description.slice(1),
      recommendation: getWeatherRecommendation(condition, temp),
    };
    
  } catch (error) {
    console.error('[Weather] Error:', error);
    return null;
  }
}

function getWeatherRecommendation(condition: string, temp: number | null): string {
  const lower = condition.toLowerCase();
  
  if (lower.includes('rain') || lower.includes('drizzle')) {
    return 'Bring an umbrella and waterproof jacket. Stadium seating may be uncovered, so consider a poncho.';
  }
  if (lower.includes('snow')) {
    return 'Dress warmly in layers. Wear waterproof boots and bring hand warmers. Stadium may be very cold.';
  }
  if (lower.includes('thunderstorm')) {
    return 'Check for match delays. Bring rain gear and be prepared for potential weather delays.';
  }
  if (lower.includes('clear') || lower.includes('sun')) {
    if (temp && temp > 25) {
      return 'Hot weather! Bring sunscreen, a hat, and stay hydrated. Light clothing recommended.';
    }
    return 'Great weather for football! Light jacket recommended for evening matches.';
  }
  if (lower.includes('cloud')) {
    if (temp && temp < 10) {
      return 'Cool and cloudy - bring a warm jacket. Perfect football weather!';
    }
    return 'Mild conditions expected. A light jacket should suffice.';
  }
  
  if (temp !== null) {
    if (temp < 5) return 'Very cold! Dress in warm layers, bring gloves and a hat.';
    if (temp < 15) return 'Cool weather - bring a jacket or sweater.';
    if (temp < 25) return 'Pleasant temperature - light clothing with a backup layer.';
    return 'Warm weather - dress comfortably and stay hydrated.';
  }
  
  return 'Check local weather forecasts closer to match day for the best preparation.';
}

// ================= TICKET LINKS =================

function generateTicketLinks(match: {
  homeTeam: string;
  awayTeam: string;
  venue: string;
  city: string;
  date: string;
}): {
  ticketmaster: Array<{
    id: string;
    name: string;
    url: string;
    date: string;
    time: string;
    venue: string;
    minPrice: number | null;
    maxPrice: number | null;
    currency: string;
    status: string;
  }>;
  alternativeSources: Array<{ name: string; url: string }>;
} {
  const eventName = `${match.homeTeam} vs ${match.awayTeam}`;
  const encodedEvent = encodeURIComponent(eventName);
  const encodedEventWithCity = encodeURIComponent(`${eventName} ${match.city}`);
  const dateStr = new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  return {
    ticketmaster: [], // No API access, use alternatives
    alternativeSources: [
      {
        name: 'SeatGeek',
        url: `https://seatgeek.com/search?search=${encodedEvent}`,
      },
      {
        name: 'StubHub',
        url: `https://www.stubhub.com/search?q=${encodedEvent}`,
      },
      {
        name: 'Viagogo',
        url: `https://www.viagogo.com/ww/search?q=${encodedEvent}`,
      },
      {
        name: 'Ticketmaster',
        url: `https://www.ticketmaster.com/search?q=${encodedEvent}`,
      },
      {
        name: 'Live Football Tickets',
        url: `https://www.livefootballtickets.com/search/?q=${encodeURIComponent(match.homeTeam)}`,
      },
      {
        name: 'Google Tickets',
        url: `https://www.google.com/search?q=${encodedEvent}+tickets+${dateStr}`,
      },
      {
        name: 'Sports Events 365',
        url: `https://www.sportsevents365.com/search.html?search=${encodedEvent}`,
      },
      {
        name: 'Football Ticket Net',
        url: `https://www.footballticketnet.com/search?q=${encodeURIComponent(match.homeTeam)}`,
      },
    ],
  };
}

// ================= TRANSPORTATION LINKS =================

function generateTransportationLinks(
  match: { city: string; venue: string; country: string; date: string; time: string },
  userLocation?: { city: string; country: string }
): {
  flights: string;
  trains: string;
  driving: string;
  localTransport: string;
} {
  const venueCity = match.city;
  const venueCountry = match.country;
  const venueQuery = encodeURIComponent(`${match.venue || venueCity} Stadium`);
  const cityQuery = encodeURIComponent(venueCity);
  
  // Format date for travel searches (next day usually for return)
  const matchDate = new Date(match.date);
  const returnDate = new Date(matchDate);
  returnDate.setDate(returnDate.getDate() + 1);
  
  const departDate = matchDate.toISOString().split('T')[0];
  const returnDateStr = returnDate.toISOString().split('T')[0];
  
  // Use user location if available, otherwise general search
  const fromCity = userLocation?.city || '';
  const fromQuery = encodeURIComponent(fromCity);
  
  return {
    flights: fromCity
      ? `https://www.skyscanner.net/transport/flights/${fromQuery}/${cityQuery}/${departDate}/${returnDateStr}/`
      : `https://www.skyscanner.net/transport/flights/Anywhere/${cityQuery}/${departDate}/${returnDateStr}/`,
    
    trains: fromCity
      ? `https://www.trainline.eu/search/${fromQuery}/${cityQuery}/${departDate}`
      : `https://www.raileurope.com/search?destination=${cityQuery}`,
    
    driving: `https://www.google.com/maps/dir/?api=1&destination=${venueQuery},${cityQuery}`,
    
    localTransport: `https://www.google.com/maps/search/${venueQuery}+station+${cityQuery}`,
  };
}

// ================= AI TIPS =================

async function generateAITips(
  match: { homeTeam: string; awayTeam: string; venue: string; city: string; country: string; league: string },
  weather: { temperature: number | null; condition: string } | null
): Promise<{
  arrival: string;
  parking: string;
  food: string;
  atmosphere: string;
  safety: string;
}> {
  console.log('[AI Tips] Generating tips for:', match.homeTeam, 'vs', match.awayTeam);
  
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    console.log('[AI Tips] No OpenAI key, using fallback');
    return generateFallbackTips(match, weather);
  }
  
  try {
    const weatherInfo = weather
      ? `Weather: ${weather.temperature}°C, ${weather.condition}`
      : 'Weather: Unknown';
    
    const systemPrompt = `You are a local football fan expert. Provide practical, friendly advice for away fans attending a match. Be specific and helpful. Respond with ONLY valid JSON.`;

    const userPrompt = `Give tips for attending ${match.homeTeam} vs ${match.awayTeam} at ${match.venue || match.homeTeam + ' Stadium'} in ${match.city}, ${match.country}.
League: ${match.league}
${weatherInfo}

JSON format only:
{"arrival":"1-2 sentences about when to arrive and best entry gates","parking":"1-2 sentences about parking or public transport options","food":"1-2 sentences about nearby food/drink recommendations","atmosphere":"1-2 sentences about fan culture and what to expect","safety":"1-2 sentences about safety tips for away fans"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    console.log('[AI Tips] OpenAI response received');

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.log('[AI Tips] Failed to parse JSON, using fallback');
    }

    return generateFallbackTips(match, weather);
    
  } catch (error) {
    console.error('[AI Tips] Error:', error);
    return generateFallbackTips(match, weather);
  }
}

function generateFallbackTips(
  match: { homeTeam: string; awayTeam: string; venue: string; city: string; country: string },
  weather: { temperature: number | null; condition: string } | null
): {
  arrival: string;
  parking: string;
  food: string;
  atmosphere: string;
  safety: string;
} {
  const isDerby = match.homeTeam.toLowerCase().includes('united') && match.awayTeam.toLowerCase().includes('city') ||
                  match.homeTeam.toLowerCase().includes('city') && match.awayTeam.toLowerCase().includes('united');
  
  const coldWeather = weather && weather.temperature !== null && weather.temperature < 10;
  const rainyWeather = weather && weather.condition.toLowerCase().includes('rain');
  
  return {
    arrival: `Arrive at least 90 minutes before kickoff to soak in the atmosphere and find your seat. Gates typically open 2 hours before the match.`,
    
    parking: `Public transport is recommended for most major stadiums. Check local transit apps for the best routes to ${match.venue || match.homeTeam + ' Stadium'}.`,
    
    food: `Try local favorites near the stadium - ask locals for their matchday recommendations. Stadium food options are available but can be pricey.`,
    
    atmosphere: `${match.homeTeam} fans are known for their passionate support. ${isDerby ? 'This is a derby match - expect intense atmosphere!' : 'Expect a lively matchday experience.'}`,
    
    safety: `${coldWeather ? 'Dress warmly for the weather. ' : ''}${rainyWeather ? 'Bring rain gear. ' : ''}Stay with fellow fans if you're visiting as an away supporter. Keep valuables secure and know your exit routes.`,
  };
}
