// Supabase Edge Function: Football API Proxy
// Proxies requests to football-data.org to bypass CORS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_TOKEN = '68c061d5ee694555966ea266bea15d46';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('[Football API Proxy] Received request');

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Football API Proxy] Fetching:', endpoint);
    
    const response = await fetch(`${FOOTBALL_DATA_BASE}${endpoint}`, {
      headers: {
        'X-Auth-Token': API_TOKEN,
      },
    });
    
    console.log('[Football API Proxy] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Football API Proxy] Error:', errorText);
      return new Response(JSON.stringify({ error: `API error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    console.log('[Football API Proxy] Data received successfully');
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Football API Proxy] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error)?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
