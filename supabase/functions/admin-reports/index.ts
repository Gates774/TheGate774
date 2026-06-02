import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_PASSCODE = Deno.env.get("ADMIN_PASSCODE") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const passcode = req.headers.get("x-admin-passcode") ?? "";
  if (!ADMIN_PASSCODE || passcode !== ADMIN_PASSCODE) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    const q = supa.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
    const { data, error } = id ? await supa.from("reports").select("*").eq("id", id).maybeSingle() : await q;
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (req.method === "PATCH" && id) {
    const body = await req.json().catch(() => ({}));
    const { data, error } = await supa.from("reports").update({ status: body.status }).eq("id", id).select().maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});