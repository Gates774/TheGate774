import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { CIVIC_GUIDE } from "./civic_guide.ts";
import { formatLegalSources, searchLegalSources, searchMdaDirectory, formatMdaSources } from "./legal-search.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const MDA_SOURCE_LABEL = "Nigerian MDA directory";
const MDA_REQUEST_TIMEOUT_MS = 7000;
const MAX_MDA_CONTEXT_CHARS = 12000;


const SYSTEM_PROMPT = `You are the Nigerian Civic Actions Assistant. Your primary civic framework is the "Nigerian Citizen's Civic Action Guide" (provided below), which is grounded in the 1999 Constitution of the Federal Republic of Nigeria (as amended). You may also use the retrieved legal sources and MDA directory entries supplied with the user's message as supplemental context. You must never invent agencies, laws, procedures, contacts, websites, addresses, or submission channels that are not supported by the Civic Action Guide, retrieved legal sources, or retrieved MDA directory entries.

========== CIVIC ACTION GUIDE (AUTHORITATIVE) ==========
${CIVIC_GUIDE}
========== END OF GUIDE ==========

SOURCE BOUNDARY RULE:
The Civic Action Guide may be used ONLY for general civic classification, government tier, routing logic, and action-plan structure.

For specific laws, legal provisions, agencies, institutions, websites, addresses, contacts, submission destinations, procedures, penalties, remedies, or institutional mandates, you MUST rely ONLY on the retrieved legal source and the single retrieved MDA record supplied below.

Do NOT use the Civic Action Guide or your own knowledge to introduce additional specific institutions, laws, agencies, contacts, websites, or legal provisions that are not present in the retrieved sources.


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
  - federal -> "President of <country>" or the appropriate accountable federal officer
  - state   -> "Governor of <Residence State>"
  - local   -> "Chairman of <Residence LGA> Local Government Area"
  If residence is unknown, use "Governor of the State" or "LGA Chairman" where appropriate.

CONFLICT RULE (Section 4(5)): on Concurrent matters, a valid Federal law prevails over a conflicting State law.

STEP 3 — PRODUCE THE ACTIONABLE REPORT as STRICT JSON with this schema and NO other keys, no markdown, no commentary:
{
  "action_type": "COMPLAINT" | "REQUEST" | "ENQUIRY" | "REPORTING" | "APPLICATION" | "REGISTRATION",
  "secondary_categories": string[],
  "tier": "federal" | "state" | "local",
  "level": "exclusive" | "concurrent" | "residual",
  "category": string,
  "issue_summary": string,
  "responsible_authority": {
    "name": string,
    "tier": "federal" | "state" | "local",
    "officer": string
  },
  "mda": string,
  "officer": string,
  "constitutional_basis": string,
  "action_plan": string[],
  "documents_needed": string[],
  "escalation_path": string[],
  "rights_reminder": string,
  "rationale": string,
  "next_steps": string[],
  "contact": string,
  "submission_destination": {
    "institution": string,
    "website": string | null,
    "address_contact": string | null,
    "why_relevant": string,
    "verification_note": string
  },
  "other_relevant_authorities": Array<object>,
  "confidence": "high" | "medium" | "low",
  "clarifying_question": string | null,
  "out_of_scope": boolean,
  "empathy_note": string
}

RULES YOU MUST ALWAYS FOLLOW
- Use the Civic Action Guide as the primary framework for civic classification, government tier, responsible authority, and action planning.
- The Civic Action Guide may be used for general civic classification, government tier, routing logic, and action-plan structure. Do not use it to introduce specific legal provisions, agencies, institutions, websites, addresses, contacts, submission destinations, procedures, penalties, remedies, or institutional mandates unless those details are also supported by the retrieved legal source or the single retrieved MDA directory record.
- The Constitution is a foundation, not a substitute for identifying specific statutes, regulations, institutional rules, offences, remedies, or consequences.
- For every complaint or scenario, analyze the retrieved legal source and identify the materially relevant legal provisions contained in that retrieved source. Do not introduce additional laws or legal frameworks that are not present in the retrieved source.
- For each relevant law or institutional framework found in the retrieved legal source, identify its exact title and year, exact section/provision when present, a short direct quotation when the wording is present, the legal meaning, consequence or remedy, and the authority responsible for the relevant action.
- Never reconstruct or guess quotation wording. If exact wording is not present, provide only a clearly labelled paraphrase and state that the exact text should be verified from the official source.
- The retrieved legal source is supplemental legal evidence. Do not treat an unrelated or weakly matched retrieved source as applicable merely because it was returned by the search.
- Choose the primary responsible institution ONLY from the single retrieved MDA directory candidate supplied by the server when that candidate is relevant to the citizen's issue.
- Use ONLY the single retrieved MDA directory candidate provided by the server for specific MDA identification, institutional mandate, website, address, contact information, and submission destination.
- Select exactly ONE primary institution when a matching MDA directory candidate exists.
- Do NOT introduce, recommend, infer, or list additional institutions from general knowledge, the Civic Action Guide, or the model's own knowledge.
- Do NOT populate "other_relevant_authorities" with institutions that were not explicitly provided by the server in the single retrieved MDA directory candidate.
- If no MDA candidate is retrieved, do not invent or recommend an MDA from general knowledge. Leave institution-specific directory fields unsupported and use only information that is explicitly available from the retrieved sources.
- Do not default to Nigeria Police Force. Use Nigeria Police Force only when the retrieved legal context and the single retrieved MDA directory candidate support it as the appropriate institution. For police discipline or misconduct, distinguish Nigeria Police Force from Police Service Commission only when that distinction is supported by the retrieved sources.
- When a retrieved MDA directory entry is relevant, identify the institution exactly as written in that entry and include its website and address/contact field exactly as supplied by the server.
- Set "submission_destination.institution" to the exact institution selected from the single retrieved MDA directory record.
- Do not invent "submission_destination.website" or "submission_destination.address_contact"; the server will inject those values from the retrieved MDA record.
- Use only retrieved directory fields when describing the MDA's mandate, website, address, contact information, or submission destination.
- Never invent an agency, law, procedure, deadline, penalty, committee, remedy, contact, website, address, or submission channel.
- Always write in plain, simple English any Nigerian citizen can understand. Explain legal jargon immediately.
- If the issue is outside the guide, set "out_of_scope": true and in "action_plan" advise consulting a lawyer or the Legal Aid Council of Nigeria, while still giving the furthest supported actionable step. Do not introduce additional institution-specific legal claims unless supported by the retrieved sources.
- Be empathetic. Acknowledge frustration, fear, or confusion in "empathy_note" before the action plan.
- If the citizen's message is genuinely unclear, set "clarifying_question" to ONE question for the single most important missing detail; otherwise set it to null and proceed.
- Keep responses structured. Output VALID JSON ONLY — no prose outside the JSON.';



function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MDA_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    if (!response.ok) throw new Error(`MDA fetch failed: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}


function mdaSearchTerms(query: string): string[] {
  const value = normalize(query);
  const terms = new Set(
    value
      .split(" ")
      .filter((term) => term.length >= 3),
  );

  const groups: Record<string, string[]> = {
    oil: [
      "oil",
      "petroleum",
      "pipeline",
      "oilfield",
      "oil mining",
      "licence",
      "license",
      "permit",
      "upstream",
      "midstream",
      "downstream",
      "spill",
      "pollution",
      "gas",
      "refinery",
      "local content",
    ],
    education: [
      "education",
      "student",
      "school",
      "university",
      "examination",
      "exam",
      "academic",
      "tertiary",
    ],
    health: ["health", "hospital", "medical", "drug", "medicine", "patient"],
    crime: ["police", "crime", "fraud", "corruption", "investigation", "victim"],
    environment: ["environment", "pollution", "spill", "waste", "flood", "water"],
    labour: ["labour", "employment", "worker", "employer", "workplace"],
    complaint: ["complaint", "petition", "report", "redress", "ombudsman"],
  };

  for (const phrases of Object.values(groups)) {
    if (phrases.some((phrase) => value.includes(phrase))) {
      phrases.forEach((phrase) => terms.add(phrase));
    }
  }

  return [...terms];
}

function relevantMdaExcerpt(directory: string, query: string): string {
  const lines = directory.replace(/\r/g, "").split("\n");
  const terms = mdaSearchTerms(query);
  const normalizedLines = lines.map(normalize);
  const hitIndexes = normalizedLines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => terms.some((term) => line.includes(term)))
    .map(({ index }) => index);

  const selected = new Set<number>();
  for (const index of hitIndexes.slice(0, 40)) {
    for (let offset = -3; offset <= 5; offset += 1) {
      const candidate = index + offset;
      if (candidate >= 0 && candidate < lines.length) selected.add(candidate);
    }
  }

  if (selected.size === 0) {
    return "No matching MDA directory entry was found for this complaint.";
  }

  const output: string[] = [];
  let previous = -2;
  for (const index of [...selected].sort((a, b) => a - b)) {
    if (index > previous + 1) output.push("[... separate directory passage ...]");
    output.push(lines[index]);
    previous = index;
  }

  return output.join("\n").slice(0, MAX_MDA_CONTEXT_CHARS).trim();
}

function mdaContextBlock(excerpt: string): string {
  return `========== RETRIEVED MDA DIRECTORY MATCHES ==========\nSource file: ${MDA_SOURCE_LABEL}\nThe following are directory passages only. Use an institution, website, and address/contact only when it appears in these passages.\n\n${excerpt}\n========== END RETRIEVED MDA DIRECTORY MATCHES ==========`;
}

function appendSection(existing: string, heading: string, body: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) return existing.trim();
  return [existing.trim(), heading, trimmedBody].filter(Boolean).join("\n\n");
}

function selectAiDesignatedMda(
  sources: Awaited<ReturnType<typeof searchMdaDirectory>>,
  authorityName: string,
) {
  const requested = normalize(authorityName);
  if (!requested) return undefined;

  const exact = sources.find((source) => normalize(source.institution) === requested);
  if (exact) return exact;

  const containing = sources.find((source) => {
    const institution = normalize(source.institution);
    return institution.includes(requested) || requested.includes(institution);
  });
  if (containing) return containing;

  const requestedTerms = new Set(requested.split(" ").filter((term) => term.length >= 3));
  return sources
    .map((source) => {
      const institutionTerms = normalize(source.institution).split(" ");
      const overlap = institutionTerms.filter((term) => requestedTerms.has(term)).length;
      return { source, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)[0]?.source;
}

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
    let retrievedLegalPassages = "";
    try {
      const legalSources = await searchLegalSources(content, { maxResults: 1 });
      if (legalSources.length > 0) {
        retrievedLegalPassages = formatLegalSources(legalSources);
        legalContext = `\n\n========== RETRIEVED LEGAL SOURCES (SUPPLEMENTAL) ==========\n${retrievedLegalPassages}\n========== END RETRIEVED LEGAL SOURCES ==========`;
      }
    } catch (error) {
      console.warn("Legal source retrieval skipped", error);
    }

    let retrievedMdaExcerpt = "";
    let retrievedMdaSources: Awaited<ReturnType<typeof searchMdaDirectory>> = [];
    let mdaContext = "";
    try {
      retrievedMdaSources = await searchMdaDirectory(`${content}\n${retrievedLegalPassages}`, { maxResults: 1 });
      console.log("[analyze-civic] searchMdaDirectory returned", retrievedMdaSources.length, "candidates:",
        retrievedMdaSources.slice(0, 3).map((s) => s.institution));
      if (retrievedMdaSources.length > 0) {
        // Use the structured parser so the Website and Address / Contact columns
        // cannot be lost or confused with legal rationale text.
        retrievedMdaExcerpt = formatMdaSources(retrievedMdaSources);
      }
      mdaContext = `\n\n${mdaContextBlock(retrievedMdaExcerpt)}`;
    } catch (error) {
      console.warn("MDA directory retrieval skipped", error);
    }

    const enhancedSystemPrompt = `${SYSTEM_PROMPT}${legalContext}${mdaContext}`;

    const userPrompt = `Hinted action type (citizen's chosen module — verify and override if wrong): ${action ?? "unknown"}

Residence State: ${residenceState ?? "unknown"}
Residence LGA: ${residenceLga ?? "unknown"}

Citizen message:
"""${content.slice(0, 4000)}"""

Run all three steps (Classify -> Identify Tier -> Produce Actionable Report). First identify the materially relevant legal provisions contained in the single retrieved legal source, if one was retrieved. Then identify the responsible institution in the retrieved MDA directory passages. For each relevant law, provide the exact title and year, section/provision, a short direct source quotation when present or a clearly labelled paraphrase when not, its plain-English meaning, consequence/remedy, and why it applies. Immediately connect the law to the submission destination.

For the single retrieved MDA, populate the existing "mda" field with the institution name, website, address/contact, why it is relevant, and a verification note. Populate "contact" with the best supported official website or contact route. Add a practical MDA submission step to "action_plan". Put a readable source-grounded law-and-MDA block into "rationale". Use only the retrieved directory fields and never invent missing contact details. Do not identify, recommend, infer, or list additional institutions.

Use the Civic Action Guide for civic routing and the retrieved law and MDA sources for specific legal foundations and submission destinations. In constitutional_basis, include a source-grounded quotation only if actual constitutional wording is present; otherwise state that the constitutional quotation is unavailable. Do not invent or reconstruct wording. Put all legal and MDA foundations into the existing fields without adding JSON keys. Substitute residence details where applicable. Reply with STRICT JSON only, matching the schema in the system prompt.`;

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
      parsed = {
        level: "concurrent",
        category: "general",
        mda: "Unknown",
        officer: "Unknown",
        rationale: raw,
        next_steps: [],
        action_plan: [],
        contact: "",
      };
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const report = parsed as Record<string, unknown>;
      const existingRationale = typeof report.rationale === "string" ? report.rationale : "";
      const existingMda = typeof report.mda === "string" ? report.mda : "";
      const existingContact = typeof report.contact === "string" ? report.contact : "";

      const aiDestination = report.submission_destination && typeof report.submission_destination === "object"
        ? report.submission_destination as Record<string, unknown>
        : undefined;
      const aiDestinationInstitution = typeof aiDestination?.institution === "string" ? aiDestination.institution.trim() : "";
      const aiResponsibleAuthorityName = report.responsible_authority && typeof report.responsible_authority === "object"
        ? String((report.responsible_authority as Record<string, unknown>).name ?? "").trim()
        : "";
      // Bug fix: the AI's schema requires submission_destination.institution as a
      // string, so it often comes back as "" when no MDA candidates were retrieved.
      // The previous check only tested `typeof === "string"`, which is true for ""
      // too, so it never fell through to responsible_authority.name — leaving
      // aiAuthorityName empty and skipping the fallback below entirely.
      const aiAuthorityName = aiDestinationInstitution || aiResponsibleAuthorityName;

      console.log("[analyze-civic] MDA diagnostics", {
        retrievedMdaSourceCount: retrievedMdaSources.length,
        retrievedMdaExcerptEmpty: !retrievedMdaExcerpt,
        aiDestinationInstitution,
        aiResponsibleAuthorityName,
        aiAuthorityName,
      });

      if (retrievedLegalPassages) {
        report.rationale = appendSection(
          existingRationale,
          "RETRIEVED LEGAL PROVISIONS",
          retrievedLegalPassages,
        );
      }

      if (retrievedMdaExcerpt && !retrievedMdaExcerpt.startsWith("No matching")) {
        const primaryMda = aiAuthorityName
          ? selectAiDesignatedMda(retrievedMdaSources, aiAuthorityName)
          : retrievedMdaSources[0];
        const secondaryMdas = [];
        const primaryMdaFields = primaryMda
          ? [
              `Primary institution: ${primaryMda.institution}`,
              `Website: ${primaryMda.website === "—" ? "Not listed" : primaryMda.website}`,
              `Address / Contact: ${primaryMda.addressContact || "Not listed"}`,
            ].join("\n")
          : "";
        const mdaSubmissionBlock = [
          "WHERE TO SUBMIT THIS REPORT",
          "The following MDA directory data is source-grounded. Use the primary institution identified by the legal analysis and verify the current submission channel before sending.",
          primaryMdaFields,
          retrievedMdaExcerpt,
          `Directory source: ${MDA_SOURCE_LABEL}`,
        ].filter(Boolean).join("\n");

        report.rationale = appendSection(existingRationale, "MDA SUBMISSION DESTINATION", mdaSubmissionBlock);
        report.mda = mdaSubmissionBlock;
        if (retrievedMdaSources.length > 0 && primaryMda) {
          report.submission_destination = {
            institution: primaryMda.institution,
            website: primaryMda.website,
            address_contact: primaryMda.addressContact,
            why_relevant: `${primaryMda.mandate} This authority was selected because its mandate and the retrieved legal context match the citizen's issue.`,
            verification_note: "Confirm the current submission channel on the institution's official website before sending.",
          };
          report.other_relevant_authorities = secondaryMdas.map((source) => ({
            institution: source.institution,
            website: source.website,
            address_contact: source.addressContact,
            condition: `Consider this authority when the facts specifically concern ${source.mandate.toLowerCase()}`,
            verification_note: "Confirm the current submission channel on the institution's official website before sending.",
          }));
          report.contact = primaryMda.website ?? primaryMda.addressContact ?? existingContact;
        } else if (!existingContact) {
          report.contact = `See the MDA directory entries in the report; verify the current official submission channel. Source: ${MDA_SOURCE_LABEL}`;
        }
      } else if (aiAuthorityName && !report.submission_destination) {
        // The GitHub-hosted MDA directory returned no candidates for this request
        // (fetch failure/timeout after retries, or genuinely no scoring match).
        // Previously this left submission_destination unset entirely, so the
        // Institution/Website/Address fields rendered as "—" even though the AI
        // (via the Civic Action Guide) already knew the right institution.
        // Website/address are intentionally left null here rather than invented.
        const fallbackNote = "The live MDA directory lookup did not return a match for this request, so only the institution name is shown here. Search for this institution's official website and contact details directly, and verify before submitting.";
        report.submission_destination = {
          institution: aiAuthorityName,
          website: null,
          address_contact: null,
          why_relevant: "Identified from the Civic Action Guide and the citizen's facts; not cross-checked against the MDA directory for this request.",
          verification_note: fallbackNote,
        };
        report.mda = appendSection(
          existingMda,
          "WHERE TO SUBMIT THIS REPORT",
          `Primary institution: ${aiAuthorityName}\n${fallbackNote}`,
        );
        if (!existingContact) {
          report.contact = `Directory lookup unavailable — verify ${aiAuthorityName}'s official contact channel directly.`;
        }
      }

      if (Array.isArray(report.action_plan) && report.submission_destination) {
        const steps = report.action_plan.map((step) => String(step));
        if (!steps.some((step) => /mda|website|institution|submit|complaint channel|regulatory authority/i.test(step))) {
          steps.push("Confirm the primary institution's current official submission channel using the website and address/contact shown in the MDA directory block before sending this report.");
          report.action_plan = steps.slice(0, 7);
        }
      }

      if (existingContact && typeof report.contact !== "string") report.contact = existingContact;
      parsed = report;
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
