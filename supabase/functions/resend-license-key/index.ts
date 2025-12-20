// Edge Function: resend-license-key
// Resends the license key email to an existing beta tester

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  email: string;
}

interface SignupWithLicense {
  id: string;
  name: string;
  email: string;
  license_id: string;
  licenses: { license_key: string } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as ResendRequest;

    // Validate input
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the signup
    const { data: signup, error: lookupError } = await supabase
      .from("beta_signups")
      .select(`
        id,
        name,
        email,
        license_id,
        licenses (
          license_key
        )
      `)
      .eq("email", email.toLowerCase())
      .single() as { data: SignupWithLicense | null; error: unknown };

    if (lookupError || !signup) {
      // Don't reveal if email exists or not for privacy
      return new Response(
        JSON.stringify({
          success: true,
          message: "If you're registered, you'll receive an email with your license key shortly."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const licenseKey = signup.licenses?.license_key;
    const name = signup.name;

    if (!licenseKey) {
      return new Response(
        JSON.stringify({ error: "License not found. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send the license key email
    await sendLicenseEmail(email.toLowerCase(), name, licenseKey);

    // Update email_sent_at
    await supabase
      .from("beta_signups")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", signup.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "If you're registered, you'll receive an email with your license key shortly."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Resend error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendLicenseEmail(email: string, name: string, licenseKey: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  const downloadUrl = Deno.env.get("DOWNLOAD_URL") || "https://your-download-url.com";
  const fromEmail = Deno.env.get("FROM_EMAIL") || "beta@speakeasy.app";

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .license-key { background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .license-key code { font-size: 24px; font-weight: bold; color: #0369a1; letter-spacing: 1px; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .steps { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hey ${name}!</h1>

        <p>Here's your SpeakEasy license key, as requested:</p>

        <div class="license-key">
          <code>${licenseKey}</code>
        </div>

        <div class="steps">
          <h3>Quick Reminder:</h3>
          <ol>
            <li><strong>Download SpeakEasy</strong> - <a href="${downloadUrl}">Click here to download</a></li>
            <li><strong>Install</strong> - Run the installer and follow the prompts</li>
            <li><strong>Activate</strong> - Enter your license key when prompted</li>
          </ol>
        </div>

        <p>Having trouble? Just reply to this email and I'll help you out.</p>

        <p>Thanks for being a beta tester!</p>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: "Your SpeakEasy License Key (Resent)",
        html: htmlBody,
        reply_to: Deno.env.get("ADMIN_EMAIL") || fromEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
    }
  } catch (error) {
    console.error("Email sending error:", error);
  }
}
