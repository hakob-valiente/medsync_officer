// @ts-ignore: Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Send Admin OTP Edge Function (No DB)
 * Uses Resend API to send an 8-digit OTP to cupslock1234@gmail.com.
 * Stable, modern, and table-less.
 */
// @ts-ignore: Deno runtime
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, otp } = await req.json();

    if (!username || !otp) {
      return new Response(JSON.stringify({ error: "Username and OTP are required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // @ts-ignore: Deno runtime
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const TARGET_EMAIL = "cupslock1234@gmail.com";

    if (!RESEND_API_KEY) {
      console.warn("[WARN] RESEND_API_KEY not found. OTP:", otp);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Development Mode: OTP logged to console.",
        email: TARGET_EMAIL, 
        dev: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ── Resend API Send ──
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Admin Auth <onboarding@resend.dev>",
        to: [TARGET_EMAIL],
        subject: `🔐 Admin Login OTP: ${otp}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #1e293b; text-align: center; margin-bottom: 8px;">PLV MedSync</h2>
            <p style="color: #64748b; font-size: 13px; text-align: center; margin-bottom: 32px;">Admin Identity Verification</p>
            
            <div style="background: #f1f5f9; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
              <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; font-weight: 700;">Your Verification Code</p>
              <p style="color: #2563eb; font-size: 48px; font-weight: 800; letter-spacing: 8px; margin: 0; font-family: 'Courier New', Courier, monospace;">${otp}</p>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6; margin: 0;">
              Enter this code to verify your session for <strong>${username}</strong>. <br/>
              This code will expire in 5 minutes.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Resend Error: ${error}`);
    }

    return new Response(JSON.stringify({ success: true, email: TARGET_EMAIL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("send-admin-otp error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
