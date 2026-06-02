import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are an expert on the Nigerian Constitution and the responsibilities of the three tiers of government.

Classify the user's civic message into the Nigerian constitutional list it belongs to:
- "exclusive" — only the Federal Government can act (e.g. passport, NIN, EFCC, ICPC, JAMB, immigration, customs, police, NAFDAC, SON, NHIS, pensions).
- "concurrent" — Federal and State both act (e.g. education, health, agriculture, highways, electricity post-2023, state taxes).
- "residual" — Local Government only (e.g. birth/death certificates, markets, refuse, drainage, streetlights, primary healthcare centres, abattoirs).

Identify the most likely Ministry, Department or Agency (MDA), and name the public officer ultimately responsible (President, Governor of the user's residence state, or Local Government Chairman of the user's residence LGA).

Reply ONLY with strict JSON, no markdown. Schema:
{
  "level": "exclusive" | "concurrent" | "residual",
  "category": string,                       // short label of the issue
  "mda": string,                            // primary MDA name + acronym if any
  "officer": string,                        // person/role accountable
  "rationale": string,                      // 1-2 sentence explanation
  "next_steps": string[],                   // 2-5 concrete actions for the citizen
  "contact": string                         // best contact (URL, phone, or office)
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
Residence: ${residenceLga ?? "?"}, ${residenceState ?? "?"}
Citizen message:
"""${content.slice(0, 4000)}"""`;

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