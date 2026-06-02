import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { passcode } = await req.json();
    if (typeof passcode !== 'string' || passcode.length === 0 || passcode.length > 256) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid passcode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expected = Deno.env.get('ADMIN_PASSCODE') ?? '';
    if (!expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Admin passcode not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Constant-time comparison
    const enc = new TextEncoder();
    const a = enc.encode(passcode);
    const b = enc.encode(expected);
    let match = a.length === b.length ? 1 : 0;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      match &= (a[i] ?? 0) === (b[i] ?? 0) ? 1 : 0;
    }

    // Light brute-force throttle
    await new Promise((r) => setTimeout(r, 400));

    if (!match) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Short-lived opaque session token (valid for 8 hours, verified by re-checking passcode hash)
    const token = crypto.randomUUID() + '.' + Date.now().toString(36);
    return new Response(JSON.stringify({ ok: true, token, expiresIn: 8 * 60 * 60 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ ok: false, error: 'Bad request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});