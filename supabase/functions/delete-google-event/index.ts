import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    let privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

    if (!email || !privateKey) {
      return new Response(JSON.stringify({ error: "Google credentials not configured" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Replace escaped newlines if they exist
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    
    // Hardcoded Calendar ID
    const CALENDAR_ID = '493ab9c7c42b49f90d556b5289689f1659b06e7decead50b3b3734e7a5adb899@group.calendar.google.com';

    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    return new Response(JSON.stringify({ success: true, message: "Event deleted successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    const status = error.code || 500;
    const message = error.errors ? error.errors[0].message : (error.message || "Failed to delete event");
    
    console.error(`[Google API Error ${status}]:`, message);

    return new Response(JSON.stringify({ 
      error: message,
      code: status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status >= 400 && status < 600 ? status : 500,
    });
  }
});
