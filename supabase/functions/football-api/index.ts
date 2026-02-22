// Supabase Edge Function: Football API Proxy
// Proxies requests to TheSportsDB to bypass CORS

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

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
    
    const response = await fetch(`${THESPORTSDB_BASE}/${endpoint}`);
    console.log('[Football API Proxy] Response status:', response.status);
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const data = await response.json();
    console.log('[Football API Proxy] Data received:', JSON.stringify(data).substring(0, 200));
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Football API Proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
