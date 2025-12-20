// Edge Function: register-beta-tester
// Handles beta tester registration, license assignment, and welcome email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterRequest {
  name: string;
  email: string;
  turnstile_token: string;
}

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

interface SignupWithLicense {
  id: string;
  license_id: string;
  licenses: { license_key: string } | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, turnstile_token } = await req.json() as RegisterRequest;

    // Validate input
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
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

    // Verify Turnstile token
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (turnstileSecret && turnstile_token) {
      const turnstileResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${turnstileSecret}&response=${turnstile_token}`,
        }
      );
      const turnstileResult = await turnstileResponse.json() as TurnstileResponse;

      if (!turnstileResult.success) {
        return new Response(
          JSON.stringify({ error: "Security verification failed. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already registered
    const { data: existingSignup } = await supabase
      .from("beta_signups")
      .select("id, license_id, licenses(license_key)")
      .eq("email", email.toLowerCase())
      .single() as { data: SignupWithLicense | null };

    if (existingSignup) {
      // Resend the existing license key
      const licenseKey = existingSignup.licenses?.license_key;
      if (licenseKey) {
        await sendWelcomeEmail(email, name, licenseKey, true);
        return new Response(
          JSON.stringify({
            success: true,
            message: "You're already registered! We've resent your license key."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get an available license from the pool
    const { data: availableLicense, error: licenseError } = await supabase
      .rpc("get_available_license");

    if (licenseError || !availableLicense) {
      console.error("No licenses available:", licenseError);
      return new Response(
        JSON.stringify({ error: "Sorry, no beta spots available right now. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assign the license
    const { error: updateError } = await supabase
      .from("licenses")
      .update({
        assigned_to_email: email.toLowerCase(),
        assigned_to_name: name,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", availableLicense);

    if (updateError) {
      console.error("Failed to assign license:", updateError);
      throw new Error("Failed to assign license");
    }

    // Get the license key
    const { data: licenseData } = await supabase
      .from("licenses")
      .select("license_key")
      .eq("id", availableLicense)
      .single();

    const licenseKey = licenseData?.license_key;

    // Create beta signup record
    const { error: signupError } = await supabase
      .from("beta_signups")
      .insert({
        email: email.toLowerCase(),
        name,
        license_id: availableLicense,
        email_sent_at: new Date().toISOString(),
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      });

    if (signupError) {
      console.error("Failed to create signup record:", signupError);
      // Don't fail the request, license is already assigned
    }

    // Send welcome email with license key
    await sendWelcomeEmail(email, name, licenseKey, false);

    // Send admin notification
    await sendAdminNotification(name, email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome to the beta! Check your email for your license key."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWelcomeEmail(email: string, name: string, licenseKey: string, isResend: boolean) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return;
  }

  const downloadUrl = Deno.env.get("DOWNLOAD_URL") || "https://your-download-url.com";
  const fromEmail = Deno.env.get("FROM_EMAIL") || "beta@speakeasy.app";

  const subject = isResend
    ? "Your SpeakEasy License Key (Resent)"
    : "Your SpeakEasy Beta License Key";

  const intro = isResend
    ? "Here's your license key again, as requested:"
    : "Thank you for joining the SpeakEasy beta! Here's your license key:";

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

        <p>${intro}</p>

        <div class="license-key">
          <code>${licenseKey}</code>
        </div>

        <div class="steps">
          <h3>Getting Started:</h3>
          <ol>
            <li><strong>Download SpeakEasy</strong> - <a href="${downloadUrl}">Click here to download</a></li>
            <li><strong>Install</strong> - Run the installer and follow the prompts</li>
            <li><strong>Activate</strong> - Enter your license key when prompted</li>
            <li><strong>Start using it!</strong> - The app will run in your system tray</li>
          </ol>
        </div>

        <p>Having trouble? Just reply to this email and I'll help you out.</p>

        <p>Thanks for being a beta tester!</p>

        <p style="color: #64748b; font-size: 14px; margin-top: 40px;">
          This is beta software. Things might break, and that's okay - your feedback helps make it better!
        </p>
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
        subject,
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

async function sendAdminNotification(name: string, email: string) {
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
        subject: `New Beta Signup: ${name}`,
        html: `
          <p>New beta tester signed up!</p>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Time:</strong> ${new Date().toISOString()}</li>
          </ul>
        `,
      }),
    });
  } catch (error) {
    console.error("Admin notification error:", error);
  }
}
