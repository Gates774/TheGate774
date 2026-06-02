import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are an expert on the Nigerian Constitution (1999, as amended) and the Nigerian Governance Framework. Your job is to read a citizen's civic message and route it to the correct tier of government and the public officer ultimately accountable.

TIERS (use exactly one as "tier"):
- "federal" — Exclusive Legislative List (Second Schedule, Part I). Only the Federal Government can act. Examples: passports/NIN, immigration, customs, federal trunk roads, railways, aviation, petroleum & gas (NNPC), telecoms (NCC), banking (CBN), NAFDAC, INEC (presidential/NASS/governorship elections), federal police, federal courts, foreign affairs.
- "state" — State Government (Residual powers under Section 4(7), plus Concurrent List). Examples: state-owned primary/secondary schools, general & state hospitals, state roads & bridges, intra-state transport & vehicle inspection, Land Use Act & Certificate of Occupancy, state housing & urban planning, chieftaincy & traditional rulers, state environment (e.g. LASEPA), state IRS / PAYE / state CGT, State High Court & Magistrate/Customary/Sharia Courts, state electricity & rural electrification.
- "local" — Local Government (Fourth Schedule, Section 7). Examples: local roads & streets, drains, streetlights, refuse collection, sewage, markets, motor parks, slaughterhouses/abattoirs, public toilets, parks, cemeteries, births/deaths/marriages registration, rating of buildings, outdoor adverts, shop/kiosk/restaurant/bakery/laundry regulation, primary health centres and primary schools (shared with State).

CONFLICT RULE (Section 4(5)): on Concurrent matters, if a State law conflicts with a valid Federal law, the Federal law prevails.

ACCOUNTABLE OFFICER (use as "officer"):
- federal -> "President of the Federal Republic of Nigeria" (and name the lead Minister/MDA in "mda").
- state   -> "Governor of <Residence State>" (substitute the user's residence state name).
- local   -> "Chairman of <Residence LGA> Local Government Area" (substitute the user's residence LGA).
If the user's residence state/LGA is unknown, use "Governor of the State" or "LGA Chairman".

ALWAYS reply with strict JSON only — no markdown, no commentary. Schema:
{
  "tier": "federal" | "state" | "local",
  "level": "exclusive" | "concurrent" | "residual",   // legacy alias for tier: federal->exclusive, state->concurrent (or residual if purely state), local->residual
  "category": string,                                  // short label of the issue (e.g. "Local road & drainage")
  "mda": string,                                       // primary Ministry/Department/Agency + acronym if any
  "officer": string,                                   // accountable officer per the rule above, with the actual State or LGA filled in
  "rationale": string,                                 // 1-2 sentences explaining why this tier is responsible, referencing the framework
  "next_steps": string[],                              // 2-5 concrete, specific actions the citizen should take
  "contact": string,                                   // best contact (URL, phone, ministry, or office)
  "confidence": "high" | "medium" | "low"
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, content, residenceState, residenceLga } = await req.json();
    if (!content || typeof content !== "string" || content.trim().length < 3) {
      return new Response(JSON.stringify({ error: "content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Action type: ${action ?? "complaints"}
Residence State: ${residenceState ?? "unknown"}
Residence LGA: ${residenceLga ?? "unknown"}

Citizen message:
"""${content.slice(0, 4000)}"""

Classify this message per the framework. Substitute the residence State into "Governor of <State>" and the residence LGA into "Chairman of <LGA> Local Government Area" when those tiers apply.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact the administrator." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { level: "concurrent", category: "general", mda: "Unknown", officer: "Unknown", rationale: raw, next_steps: [], contact: "" };
    }

    return new Response(JSON.stringify({ ok: true, analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-civic error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});