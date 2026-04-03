// Auth Hook Custom Access Token : renvoie les claims reçus tels quels (pass-through).
import { serve } from "std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const claims = typeof body?.claims === "object" && body.claims !== null ? body.claims : {};

    // Toujours renvoyer { claims } au format attendu (pass-through sans modification).
    return new Response(JSON.stringify({ claims }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ claims: {} }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
