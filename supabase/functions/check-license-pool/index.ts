// Edge Function: check-license-pool
// Monitors the license pool and auto-generates more when running low
// Can be triggered by a cron job or manually

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration
const MIN_POOL_SIZE = 10;  // Minimum licenses to keep available
const REFILL_AMOUNT = 20;  // How many to generate when pool is low

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Count available licenses
    const { data: countResult, error: countError } = await supabase
      .rpc("count_available_licenses");

    if (countError) {
      throw new Error(`Failed to count licenses: ${countError.message}`);
    }

    const availableCount = countResult as number;
    console.log(`Available licenses in pool: ${availableCount}`);

    let generated = 0;

    // Generate more if pool is low
    if (availableCount < MIN_POOL_SIZE) {
      const toGenerate = REFILL_AMOUNT;
      console.log(`Pool is low (${availableCount} < ${MIN_POOL_SIZE}). Generating ${toGenerate} new licenses...`);

      const { data: genResult, error: genError } = await supabase
        .rpc("generate_licenses", { count: toGenerate });

      if (genError) {
        throw new Error(`Failed to generate licenses: ${genError.message}`);
      }

      generated = genResult as number;
      console.log(`Generated ${generated} new licenses`);

      // Send notification email if configured
      await sendPoolNotification(availableCount, generated);
    }

    // Get updated count
    const { data: newCount } = await supabase.rpc("count_available_licenses");

    return new Response(
      JSON.stringify({
        success: true,
        previous_count: availableCount,
        generated,
        current_count: newCount,
        min_pool_size: MIN_POOL_SIZE,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Pool check error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendPoolNotification(previousCount: number, generated: number) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  const fromEmail = Deno.env.get("FROM_EMAIL") || "beta@speakeasy.app";

  if (!resendApiKey || !adminEmail) {
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmail,
        subject: `License Pool Refilled: +${generated} licenses`,
        html: `
          <p>The license pool was running low and has been automatically refilled.</p>
          <ul>
            <li><strong>Previous available:</strong> ${previousCount}</li>
            <li><strong>Generated:</strong> ${generated}</li>
            <li><strong>New total available:</strong> ${previousCount + generated}</li>
          </ul>
          <p style="color: #64748b; font-size: 14px;">
            This is an automated notification from the license pool manager.
          </p>
        `,
      }),
    });
  } catch (error) {
    console.error("Pool notification error:", error);
  }
}
