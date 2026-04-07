// @ts-ignore: Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno runtime
import { google } from "npm:googleapis";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// @ts-ignore: Deno runtime
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { eventId, title, description, startTime, endTime } = await req.json();

    if (!eventId || !title || !startTime || !endTime) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // @ts-ignore: Deno runtime
    const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    // @ts-ignore: Deno runtime
    let privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

    if (!email || !privateKey) {
      return new Response(JSON.stringify({ error: "Google credentials not configured" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: email, private_key: privateKey },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const CALENDAR_ID = '493ab9c7c42b49f90d556b5289689f1659b06e7decead50b3b3734e7a5adb899@group.calendar.google.com';

    // Sanitize eventId: FullCalendar's Google plugin sometimes appends
    // the calendar email to the ID (e.g. "eventid_20260404@google.com").
    // The Google Calendar API expects the raw base event ID only.
    const cleanEventId = eventId.split('_').length > 2
      ? eventId  // recurring event instance ID, keep as-is
      : eventId.replace(/@.*$/, ''); // strip trailing @domain if present

    console.log("[update-google-event] Raw eventId:", eventId);
    console.log("[update-google-event] Clean eventId:", cleanEventId);
    console.log("[update-google-event] Payload:", { title, startTime, endTime });

    // Parse and validate dates — ensures proper RFC3339 format for Google API
    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);

    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid date format", startTime, endTime }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log("[update-google-event] Parsed start:", parsedStart.toISOString());
    console.log("[update-google-event] Parsed end:", parsedEnd.toISOString());

    // Build clean patch body with only mutable fields
    // IMPORTANT: date: null clears the all-day "date" field on collaborator events.
    // Without this, PATCH merges dateTime WITH the existing date, causing
    // both to be set simultaneously — which Google rejects as "Invalid start time."
    const patchBody: any = {
      summary: title,
      description: description || '',
      start: {
        date: null,
        dateTime: parsedStart.toISOString(),
        timeZone: 'Asia/Manila',
      },
      end: {
        date: null,
        dateTime: parsedEnd.toISOString(),
        timeZone: 'Asia/Manila',
      },
    };

    const response = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId: cleanEventId,
      requestBody: patchBody,
    });

    return new Response(JSON.stringify({ success: true, event: response.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Extract full Google API error details 
    const googleError = error?.response?.data?.error || {};
    const status = googleError.code || error.code || 500;
    const message = googleError.message
        || (error.errors && error.errors[0]?.message) 
        || error.message 
        || "Failed to update event";
    const details = googleError.errors || error.errors || [];

    console.error(`[update-google-event ERROR ${status}]:`, message);
    console.error("[update-google-event DETAILS]:", JSON.stringify(details));

    return new Response(JSON.stringify({ error: message, code: status, details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status >= 400 && status < 600 ? status : 500,
    });
  }
});
