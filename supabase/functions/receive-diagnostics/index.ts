// Edge Function: receive-diagnostics
// Receives diagnostic log data from the SpeakEasy app, inserts into Supabase,
// and sends email notification to admin. Uses service_role to bypass PostgREST.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticPayload {
  machine_id: string;
  app_version: string;
  os_info?: string;
  log_entries: string;
  line_count: number;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: DiagnosticPayload = await req.json();

    // Validate required fields
    if (!payload.machine_id || !payload.log_entries || !payload.app_version) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service_role (bypasses RLS and PostgREST cache)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Insert diagnostic log
    const { error: insertError } = await supabase
      .from("diagnostic_logs")
      .insert({
        machine_id: payload.machine_id,
        app_version: payload.app_version,
        os_info: payload.os_info || null,
        log_entries: payload.log_entries,
        line_count: payload.line_count || 0,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert diagnostic log", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up user email from activations table
    let userEmail = "Unknown user";
    try {
      const { data: activations } = await supabase
        .from("activations")
        .select("user_email, user_name")
        .eq("machine_id", payload.machine_id)
        .limit(1);

      if (activations && activations.length > 0 && activations[0].user_email) {
        userEmail = activations[0].user_email;
        if (activations[0].user_name) {
          userEmail = `${activations[0].user_name} (${activations[0].user_email})`;
        }
      }
    } catch {
      // Non-fatal: just use "Unknown user"
    }

    // Send email notification
    await sendNotification(payload, userEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Diagnostic handler error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendNotification(payload: DiagnosticPayload, userEmail: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  const fromEmail = Deno.env.get("FROM_EMAIL") || "beta@speakeasy.app";

  if (!resendApiKey || !adminEmail) {
    console.warn("Skipping notification: RESEND_API_KEY or ADMIN_EMAIL not set");
    return;
  }

  // Truncate log entries for email (max 5000 chars)
  let logPreview = payload.log_entries;
  let truncated = false;
  if (logPreview.length > 5000) {
    logPreview = logPreview.substring(0, 5000);
    truncated = true;
  }

  const machineShort = payload.machine_id.substring(0, 20);
  const hasCrash = payload.log_entries.includes("[CRASH]") || payload.log_entries.includes("PANIC");
  const severity = hasCrash ? "CRASH" : "WARN/ERROR";
  const subject = `SpeakEasy ${severity}: ${payload.line_count} entries from ${userEmail !== "Unknown user" ? userEmail.split("(")[0].trim() : machineShort} (v${payload.app_version})`;

  const html = `
    <div style="font-family: sans-serif; max-width: 700px;">
      <h2 style="color: ${hasCrash ? '#dc2626' : '#d97706'};">SpeakEasy Diagnostic Report</h2>
      <table style="border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 4px 12px; font-weight: bold;">User:</td><td>${userEmail}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Machine ID:</td><td>${payload.machine_id}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">App Version:</td><td>${payload.app_version}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">OS:</td><td>${payload.os_info || "Unknown"}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Error Count:</td><td>${payload.line_count}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Time:</td><td>${new Date().toISOString()}</td></tr>
      </table>
      <h3>Log Entries</h3>
      <pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; max-height: 600px; overflow-y: auto;">${logPreview.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      ${truncated ? `<p style="color: #666; font-style: italic;">Truncated — ${payload.log_entries.length - 5000} more characters not shown</p>` : ""}
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: adminEmail,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send notification:", error);
    } else {
      console.log("Notification sent to", adminEmail);
    }
  } catch (error) {
    console.error("Notification error:", error);
  }
}
