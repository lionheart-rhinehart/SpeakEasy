// Edge Function: keep-alive
// Simple health check to prevent Supabase free tier from pausing
// Called by GitHub Actions every 6 hours

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Simple query to keep database active
    const { error } = await supabase
      .from("licenses")
      .select("id")
      .limit(1);

    if (error) {
      throw new Error(`Health check query failed: ${error.message}`);
    }

    const timestamp = new Date().toISOString();
    console.log(`Keep-alive ping successful at ${timestamp}`);

    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp,
        message: "Supabase project is active",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Keep-alive error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
