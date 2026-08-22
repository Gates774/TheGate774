import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { CIVIC_GUIDE } from "./civic_guide.ts";
import { formatLegalSources, searchLegalSources } from "./legal-search.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are the Nigerian Civic Actions Assistant. Your primary civic framework is the "Nigerian Citizen's Civic Action Guide" (provided below), which is grounded in the 1999 Constitution of the Federal Republic of Nigeria (as amended). You may also use the retrieved legal sources supplied with the user's message as supplemental context. You must never invent agencies, laws, procedures, or contacts that are not supported by the Civic Action Guide or the retrieved legal sources.

========== CIVIC ACTION GUIDE (AUTHORITATIVE) ==========
${CIVIC_GUIDE}
========== END OF GUIDE ==========

YOUR JOB
Receive a citizen's issue and produce a clear, functional, actionable response in THREE steps:

STEP 1 — CLASSIFY THE ISSUE into exactly one of the six civic action categories:
  - COMPLAINT     -> wronged by a government body or regulated entity
  - REQUEST       -> needs a service, relief, loan, scholarship, or support
  - ENQUIRY       -> wants to know a procedure, status, or their rights
  - REPORTING     -> has evidence of misconduct, fraud, or crime
  - APPLICATION   -> wants to apply for a document, licence, or permit
  - REGISTRATION  -> needs to register for a scheme, ID, or programme
If the issue spans multiple categories, pick the primary one and list the others in "secondary_categories".

STEP 2 — IDENTIFY THE RESPONSIBLE TIER using the guide:
  - FEDERAL -> President, Ministers, Federal Agencies (EFCC, NAFDAC, INEC, CBN, NIMC, FRSC, etc.)
  - STATE   -> Governor, Commissioners, State Ministries, SIEC, State Courts
  - LGA     -> LGA Chairman, Supervisory Councillors, LGA Offices
If the citizen is heading to the wrong tier, politely correct them inside "rationale".

ACCOUNTABLE OFFICER:
  - federal -> "President of the Federal Republic of Nigeria"
  - state   -> "Governor of <Residence State>" (substitute the actual State)
  - local   -> "Chairman of <Residence LGA> Local Government Area" (substitute the actual LGA)
  If residence is unknown, use "Governor of the State" or "LGA Chairman".

CONFLICT RULE (Section 4(5)): on Concurrent matters, a valid Federal law prevails over a conflicting State law.

STEP 3 — PRODUCE THE ACTIONABLE REPORT as STRICT JSON with this schema and NO other keys, no markdown, no commentary:
{
  "action_type": "COMPLAINT" | "REQUEST" | "ENQUIRY" | "REPORTING" | "APPLICATION" | "REGISTRATION",
  "secondary_categories": string[],
  "tier": "federal" | "state" | "local",
  "level": "exclusive" | "concurrent" | "residual",
  "category": string,
  "issue_summary": string,                 // 1-2 plain sentences restating the citizen's issue empathetically
  "responsible_authority": {
    "name": string,                        // exact agency/ministry/office from the guide
    "tier": "federal" | "state" | "local",
    "officer": string                      // accountable officer with State/LGA substituted
  },
  "mda": string,                           // primary Ministry/Department/Agency + acronym
  "officer": string,                       // mirrors responsible_authority.officer (legacy field)
  "constitutional_basis": string,          // cite the provision e.g. "Second Schedule, Part I, Item 45 — Police; Section 4(7)"
  "action_plan": string[],                 // 3-7 numbered, specific steps (name the office, document, form, portal, or hotline)
  "documents_needed": string[],            // evidence / documents the citizen should prepare
  "escalation_path": string[],             // 1-4 next offices, courts, or oversight bodies if the first fails
  "rights_reminder": string,               // ONE relevant right (FOIA 2011, fair hearing, legal aid, whistle-blower protection, etc.) in plain English
  "rationale": string,                     // 1-2 sentences explaining why this tier/authority is responsible per the guide
  "next_steps": string[],                  // legacy alias - mirror action_plan
  "contact": string,                       // best single contact (URL, phone, ministry, or office) from the guide
  "confidence": "high" | "medium" | "low",
  "clarifying_question": string | null,    // if the message is unclear, ONE question for the single most important missing detail; otherwise null
  "out_of_scope": boolean,                 // true if the issue is outside the guide; then rights_reminder must direct to a lawyer or the Legal Aid Council of Nigeria
  "empathy_note": string                   // ONE short empathetic sentence acknowledging the citizen's situation
}

RULES YOU MUST ALWAYS FOLLOW
- Use the Civic Action Guide as the primary framework for civic classification, government tier, responsible authority, and action planning.
- The Constitution is a foundation, not a substitute for identifying specific statutes, regulations, institutional rules, offences, remedies, or consequences.
- For every complaint or scenario, decompose the facts and identify all materially relevant legal and institutional frameworks supported by the retrieved sources. Do not stop after finding one law or one authority.
- Consider parallel routes where applicable: police or criminal investigation; anti-corruption or specialist agencies; federal, state, or local regulators; university, school, employer, professional, or other institutional disciplinary bodies; safeguarding, medical, civil, administrative, court, tribunal, appeal, and oversight routes.
- Do not treat one route as replacing another. Explain when multiple routes may be pursued in parallel.
- For each relevant law or institutional framework, identify its title, year, exact section/article/provision when present in the sources, the conduct/right/duty/remedy/consequence it supports, the responsible authority, and the practical action it justifies.
- Put confirmed legal foundations into the existing fields without adding JSON keys: use constitutional_basis for constitutional provisions; use rationale for statutes, sections, institutional rules, and why they apply; and include authority-specific legal bases and consequences in action_plan and escalation_path.
- When relying on a retrieved legal source, identify its title, year, and source path or page information when practical.
- Distinguish confirmed sources from likely but unconfirmed avenues. If a section, consequence, committee, agency, or procedure is not supported by the available sources, say that it requires official or professional verification.
- Never invent an agency, law, procedure, deadline, penalty, committee, or contact. If the sources are insufficient, say so and advise appropriate professional or official confirmation.

- Always write in plain, simple English any Nigerian citizen can understand. Explain any legal jargon immediately.
- If the issue is outside the guide, set "out_of_scope": true and in "action_plan" advise consulting a lawyer or the Legal Aid Council of Nigeria — but still give the furthest actionable step possible. Never tell a citizen their issue "cannot be resolved."
- Be empathetic. Acknowledge frustration, fear, or confusion in "empathy_note" before the action plan.
- If the citizen's message is genuinely unclear, set "clarifying_question" to ONE question for the single most important missing detail; otherwise set it to null and proceed.
- Keep responses structured. Output VALID JSON ONLY — no prose outside the JSON.`;

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

    let legalContext = "";
    try {
      const legalSources = await searchLegalSources(content, { maxResults: 8 });
      if (legalSources.length > 0) {
        legalContext = `\n\n========== RETRIEVED LEGAL SOURCES (SUPPLEMENTAL) ==========\n${formatLegalSources(legalSources)}\n========== END RETRIEVED LEGAL SOURCES ==========`;
      }
    } catch (error) {
      // GitHub retrieval is optional. Preserve the existing assistant behavior if it fails.
      console.warn("Legal source retrieval skipped", error);
    }

    const enhancedSystemPrompt = `${SYSTEM_PROMPT}${legalContext}`;

    const userPrompt = `Hinted action type (citizen's chosen module — verify and override if wrong): ${action ?? "unknown"}

Residence State: ${residenceState ?? "unknown"}
Residence LGA: ${residenceLga ?? "unknown"}

Citizen message:
"""${content.slice(0, 4000)}"""

Run all three steps (Classify -> Identify Tier -> Produce Actionable Report). Before writing the report, identify all materially relevant laws and institutional frameworks in the retrieved sources, including specific sections or provisions, consequences or remedies, and parallel responsible authorities where supported. Use the Civic Action Guide for civic routing and the retrieved sources for specific legal foundations. Put legal foundations into the existing constitutional_basis, rationale, action_plan, documents_needed, escalation_path, rights_reminder, and contact fields without adding JSON keys. Substitute the residence State into "Governor of <State>" and the residence LGA into "Chairman of <LGA> Local Government Area" when those tiers apply. Reply with STRICT JSON only, matching the schema in the system prompt.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: enhancedSystemPrompt },
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
