import { CIVIC_GUIDE } from "./civic_guide.ts";
import { formatLegalSources, searchLegalSources, searchMdaDirectory, formatMdaSources } from "./legal-search.ts";

// Defined locally — this file previously imported `corsHeaders` from
// "npm:@supabase/supabase-js@2/cors", but that subpath is not a real,
// resolvable export of supabase-js. Since this project no longer runs on
// Supabase infrastructure, that import was failing at module load time,
// which crashes the whole function before any request is handled (a blank
// screen with no useful stack trace — line 0, col 0).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

For specific laws, legal provisions, agencies, institutions, websites, addresses, contacts, submission destinations, procedures, penalties, remedies, or institutional mandates, you MUST rely ONLY on the retrieved legal sources and MDA directory candidates supplied below.

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
Split the citizen message into every distinct actionable issue. Never merge unrelated matters. Return one object per issue in "issues" and mirror the first issue in the top-level fields for backward compatibility. Each issue must have exactly one authority decision or an explicit no-auto-route status.

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
  "issues": [{ "issue_id": string, "issue_summary": string, "action_type": "COMPLAINT" | "REQUEST" | "ENQUIRY" | "REPORTING" | "APPLICATION" | "REGISTRATION", "secondary_categories": string[], "tier": "federal" | "state" | "local", "level": "exclusive" | "concurrent" | "residual", "category": string, "responsible_authority": { "name": string, "tier": "federal" | "state" | "local", "officer": string }, "mda": string, "officer": string, "constitutional_basis": string, "action_plan": string[], "documents_needed": string[], "escalation_path": string[], "rights_reminder": string, "rationale": string, "next_steps": string[], "contact": string, "submission_destination": { "institution": string, "website": string | null, "address_contact": string | null, "why_relevant": string, "verification_note": string }, "confidence": "high" | "medium" | "low", "routing_status": "routed" | "ambiguous" | "needs_clarification" | "do_not_auto_route", "clarifying_question": string | null, "out_of_scope": boolean, "emergency": boolean, "emergency_instruction": string | null, "evidence_basis": string[] }],
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
  "routing_status": "routed" | "ambiguous" | "needs_clarification" | "do_not_auto_route",
  "emergency": boolean,
  "emergency_instruction": string | null,
  "evidence_basis": string[],
  "clarifying_question": string | null,
  "out_of_scope": boolean,
  "empathy_note": string
}

RULES YOU MUST ALWAYS FOLLOW
- Use the Civic Action Guide as the primary framework for civic classification, government tier, responsible authority, and action planning.
- The Civic Action Guide may be used for general civic classification, government tier, routing logic, and action-plan structure. Do not use it to introduce specific legal provisions, agencies, institutions, websites, addresses, contacts, submission destinations, procedures, penalties, remedies, or institutional mandates unless those details are also supported by the retrieved legal sources or the retrieved MDA directory candidates.
- The Constitution is a foundation, not a substitute for identifying specific statutes, regulations, institutional rules, offences, remedies, or consequences.
- For every complaint or scenario, analyze the retrieved legal source and identify the materially relevant legal provisions contained in that retrieved source. Do not introduce additional laws or legal frameworks that are not present in the retrieved source.
- For each relevant law or institutional framework found in the retrieved legal source, identify its exact title and year, exact section/provision when present, a short direct quotation when the wording is present, the legal meaning, consequence or remedy, and the authority responsible for the relevant action.
- Never reconstruct or guess quotation wording. If exact wording is not present, provide only a clearly labelled paraphrase and state that the exact text should be verified from the official source.
- The retrieved legal source is supplemental legal evidence. Do not treat an unrelated or weakly matched retrieved source as applicable merely because it was returned by the search.
- Choose each issue's responsible institution ONLY from the MDA candidates retrieved for that issue. Compare the institution's specific mandate with that issue's facts, not with unrelated text in the full message.
- Use ONLY the retrieved MDA directory candidates provided by the server for specific MDA identification, institutional mandate, website, address, contact information, and submission destination.
- Select exactly ONE primary institution per issue only when its mandate clearly matches and the candidate is not ambiguous.
- Do NOT introduce, recommend, infer, or list additional institutions from general knowledge, the Civic Action Guide, or the model's own knowledge.
- Do NOT populate "other_relevant_authorities" or any issue destination with institutions that were not explicitly provided by the server in the retrieved MDA directory candidates.
- If no candidate clearly matches an issue, set routing_status to "needs_clarification" or "do_not_auto_route", set confidence to low, leave the institution blank, and do not invent an agency or contact.
- Do not default to Nigeria Police Force. Use Nigeria Police Force only when the retrieved legal context and the retrieved MDA directory candidates support it as the appropriate institution. For police discipline or misconduct, distinguish Nigeria Police Force from Police Service Commission only when that distinction is supported by the retrieved sources.
- When a retrieved MDA directory entry is relevant, identify the institution exactly as written in that entry and include its website and address/contact field exactly as supplied by the server.
- Set "submission_destination.institution" to the exact institution selected from the retrieved MDA directory candidates.
- Do not invent "submission_destination.website" or "submission_destination.address_contact"; the server will inject those values from the matched retrieved MDA record.
- Use only retrieved directory fields when describing the MDA's mandate, website, address, contact information, or submission destination.
- Never invent an agency, law, procedure, deadline, penalty, committee, remedy, contact, website, address, or submission channel.
- Always write in plain, simple English any Nigerian citizen can understand. Explain legal jargon immediately.
- If the issue is outside the guide, set "out_of_scope": true and in "action_plan" advise consulting a lawyer or the Legal Aid Council of Nigeria, while still giving the furthest supported actionable step. Do not introduce additional institution-specific legal claims unless supported by the retrieved sources.
- Be empathetic. Acknowledge frustration, fear, or confusion in "empathy_note" before the action plan.
- If the citizen's message is genuinely unclear, set "clarifying_question" to ONE question for the single most important missing detail; otherwise set it to null and proceed.
- Keep responses structured. Output VALID JSON ONLY — no prose outside the JSON.`;



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

function splitIssueQueries(content: string): string[] {
  const numbered = [...content.matchAll(/(?:^|\n)\s*(\d+)[.)]\s*([\s\S]*?)(?=\n\s*\d+[.)]\s*|$)/g)];
  if (numbered.length >= 2) {
    const prefix = content.slice(0, numbered[0].index ?? 0).trim();
    return numbered.slice(0, 8).map((match) => [prefix, `Specific issue: ${match[2].trim()}`].filter(Boolean).join("\n"));
  }
  return [content.trim()];
}

type StructuredIssue = {
  issue_id: string;
  facts: string[];
  subject: string;
  location: { state?: string; lga?: string; city?: string; specific_location?: string } | null;
};

function fallbackStructuredIssues(content: string): StructuredIssue[] {
  const numbered = splitIssueQueries(content);
  return numbered.map((query, index) => ({
    issue_id: `issue-${index + 1}`,
    facts: [query],
    subject: numbered.length > 1 ? "Unclassified citizen issue" : "Unclassified complaint",
    location: null,
  }));
}

function issueQuery(issue: StructuredIssue): string {
  return [
    `Subject: ${issue.subject}`,
    `Facts: ${issue.facts.join("; ")}`,
    issue.location ? `Incident location: ${JSON.stringify(issue.location)}` : "Incident location: not stated",
  ].join("\n");
}

async function decomposeIssueQueries(content: string): Promise<StructuredIssue[]> {
  const fallback = fallbackStructuredIssues(content);
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Extract every distinct factual complaint from the citizen's message. Return JSON only as {"issues":[{"issue_id":"issue-1","facts":["exact fact"],"subject":"short neutral subject","location":{"state":null,"lga":null,"city":null,"specific_location":null}}]}. Split unrelated events into separate issues even when the message is not numbered. Preserve only facts stated or clearly implied; never add facts, agencies, laws, remedies, or legal advice. Use null for unknown location fields. Return 1 to 8 issues.`,
          },
          { role: "user", content: content.slice(0, 4000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const issues = Array.isArray(parsed?.issues)
      ? parsed.issues.map((item: unknown, index: number) => {
          if (!item || typeof item !== "object") return null;
          const value = item as Record<string, unknown>;
          const facts = Array.isArray(value.facts)
            ? value.facts.filter((fact): fact is string => typeof fact === "string" && fact.trim().length >= 3).map((fact) => fact.trim()).slice(0, 8)
            : [];
          if (facts.length === 0) return null;
          const locationValue = value.location && typeof value.location === "object" ? value.location as Record<string, unknown> : null;
          return {
            issue_id: typeof value.issue_id === "string" && value.issue_id.trim() ? value.issue_id.trim() : `issue-${index + 1}`,
            facts,
            subject: typeof value.subject === "string" && value.subject.trim() ? value.subject.trim() : "Unclassified citizen issue",
            location: locationValue ? {
              state: typeof locationValue.state === "string" ? locationValue.state.trim() : undefined,
              lga: typeof locationValue.lga === "string" ? locationValue.lga.trim() : undefined,
              city: typeof locationValue.city === "string" ? locationValue.city.trim() : undefined,
              specific_location: typeof locationValue.specific_location === "string" ? locationValue.specific_location.trim() : undefined,
            } : null,
          } satisfies StructuredIssue;
        }).filter((issue): issue is StructuredIssue => Boolean(issue)).slice(0, 8)
      : [];
    return issues.length > 0 ? issues : fallback;
  } catch (error) {
    console.warn("Issue decomposition skipped; using conservative fallback", error);
    return fallback;
  }
}

function appendSection(existing: string, heading: string, body: string): string {
  const trimmedBody = body.trim();
  if (!trimmedBody) return existing.trim();
  return [existing.trim(), heading, trimmedBody].filter(Boolean).join("\n\n");
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

    const structuredIssues = await decomposeIssueQueries(content);
    const decompositionWasConservativeFallback = structuredIssues.length === 1 && structuredIssues[0]?.subject === "Unclassified complaint";
    if (decompositionWasConservativeFallback && /,\s+(?:and\s+)?(?:the|a|an|my)\s+/i.test(content)) {
      const clarification = {
        issue_id: "issue-1",
        facts: [content.trim()],
        subject: "Multiple complaints may be combined",
        location: null,
      } satisfies StructuredIssue;
      return new Response(JSON.stringify({ ok: true, analysis: {
        issues: [{ issue_id: clarification.issue_id, issue_summary: clarification.facts[0], confidence: "low", routing_status: "needs_clarification", clarifying_question: "This message may contain multiple separate complaints. Please separate them or tell us which issue you want help with first.", out_of_scope: false, emergency: false, emergency_instruction: null, action_plan: [], next_steps: [], documents_needed: [], escalation_path: [], evidence_basis: [], mda: "", contact: "", submission_destination: { institution: "", website: null, address_contact: null, why_relevant: "", verification_note: "Do not submit until the issues are separated." } }], confidence: "low", routing_status: "needs_clarification", clarifying_question: "This message may contain multiple separate complaints. Please separate them or tell us which issue you want help with first.", issue_summary: clarification.facts[0], action_plan: [], next_steps: [], mda: "", contact: "", submission_destination: { institution: "", website: null, address_contact: null, why_relevant: "", verification_note: "Do not submit until the issues are separated." }, out_of_scope: false, emergency: false, emergency_instruction: null } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    type IssueRetrieval = {
      query: string;
      issue: StructuredIssue;
      legalPassages: string;
      mdaSources: Awaited<ReturnType<typeof searchMdaDirectory>>;
    };
    const issueRetrieval: IssueRetrieval[] = await Promise.all(structuredIssues.map(async (issue) => {
      const query = issueQuery(issue);
      let legalPassages = "";
      try {
        const legalSources = await searchLegalSources(query, { maxResults: 2 });
        if (legalSources.length > 0) legalPassages = formatLegalSources(legalSources);
      } catch (error) {
        console.warn("Issue legal source retrieval skipped", error);
      }
      let mdaSources: Awaited<ReturnType<typeof searchMdaDirectory>> = [];
      try {
        // Authority retrieval must use issue facts only. Legal passages are validation evidence, not search input.
        mdaSources = await searchMdaDirectory(query, { maxResults: 6 });
      } catch (error) {
        console.warn("Issue MDA directory retrieval skipped", error);
      }
      return { query, issue, legalPassages, mdaSources };
    }));
    console.log("[analyze-civic] isolated issue retrieval", issueRetrieval.map((item, index) => ({
      issue: index + 1,
      issueId: item.issue.issue_id,
      query: item.query.slice(0, 240),
      legalSourceCount: item.legalPassages ? item.legalPassages.split("==========").length - 1 : 0,
      candidates: item.mdaSources.map((source) => ({ institution: source.institution, score: source.matchScore, mandate: source.mandate })),
    })));
    const firstIssue = issueRetrieval[0] ?? { query: content, issue: { issue_id: "issue-1", facts: [content], subject: "Unclassified citizen issue", location: null } satisfies StructuredIssue, legalPassages: "", mdaSources: [] };
    const retrievedLegalPassages = firstIssue.legalPassages;
    const enhancedSystemPrompt = SYSTEM_PROMPT;
    const issueContext = issueRetrieval.map((item, index) => [
      `========== ISSUE ${index + 1} — RETRIEVED EVIDENCE ==========` ,
      `Issue ID: ${item.issue.issue_id}\nSubject: ${item.issue.subject}\nFacts: ${item.issue.facts.join("; ")}\nIncident location: ${item.issue.location ? JSON.stringify(item.issue.location) : "not stated"}`,
      item.legalPassages ? `LEGAL SOURCES FOR THIS ISSUE:\n${item.legalPassages}` : "No legal source matched this issue.",
      item.mdaSources.length > 0 ? `MDA CANDIDATES FOR THIS ISSUE ONLY:\n${formatMdaSources(item.mdaSources)}` : "No MDA candidate matched this issue.",
      `========== END ISSUE ${index + 1} EVIDENCE ==========` ,
    ].join("\n\n")).join("\n\n");

    const userPrompt = `Hinted action type (citizen's chosen module — verify and override if wrong): ${action ?? "unknown"}

Residence State: ${residenceState ?? "unknown"}
Residence LGA: ${residenceLga ?? "unknown"}

Citizen message:
"""${content.slice(0, 4000)}"""

Run all three steps (Classify -> Identify Tier -> Produce Actionable Report). First split the citizen message into each distinct issue. For every issue, identify only materially relevant legal provisions and compare that issue only against the retrieved MDA candidates. Return one independent object in "issues" per issue, and mirror the first issue in the legacy top-level fields. Never route a whole paragraph to one authority. For each relevant law, provide the exact title and year, section/provision, a short direct source quotation when present or a clearly labelled paraphrase when not, its plain-English meaning, consequence/remedy, and why it applies. Keep submission-destination details separate from the legal rationale.

For each issue, use only the evidence block labelled for that issue. Never use a legal passage or MDA candidate from another issue. Populate "mda" and "submission_destination" only from that issue's retrieved MDA candidates whose mandate specifically matches that issue. The responsible authority and submission destination must be the same institution. If no candidate clearly matches, leave the institution blank, set confidence to low, set "routing_status" to "needs_clarification" or "do_not_auto_route", set "clarifying_question", and do not invent an agency or contact. Use only retrieved directory fields and never identify an institution merely because it appears somewhere in the full citizen message.

Issue-specific retrieved evidence:
${issueContext}

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
      const aiAuthorityName = aiDestinationInstitution || aiResponsibleAuthorityName;

      console.log("[analyze-civic] MDA validation request", {
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

      const normalizeIssueDestination = (issue: Record<string, unknown>, issueSources: Awaited<ReturnType<typeof searchMdaDirectory>>) => {
        const destination = issue.submission_destination && typeof issue.submission_destination === "object"
          ? issue.submission_destination as Record<string, unknown>
          : undefined;
        const ranked = [...issueSources]
          .filter((source) => source.matchScore >= 12 && source.routingScore >= 25)
          .sort((a, b) => b.routingScore - a.routingScore || b.matchScore - a.matchScore || a.institution.localeCompare(b.institution));
        const top = ranked[0];
        const second = ranked[1];
        // The model may explain or validate the result, but it never selects the winner.
        // The server selects only the deterministic top candidate from this issue's isolated set.
        const matched = top;
        const scoreGap = top && second ? top.routingScore - second.routingScore : Number.POSITIVE_INFINITY;
        if (!matched || matched.routingScore < 25 || matched.matchScore < 12 || scoreGap < 25) {
          issue.mda = "";
          issue.contact = "";
          issue.submission_destination = {
            institution: "",
            website: null,
            address_contact: null,
            why_relevant: "No directory-backed institution was matched to this specific issue.",
            verification_note: "Do not submit until the responsible authority is verified.",
          };
          issue.confidence = "low";
          issue.routing_status = "needs_clarification";
          return;
        }
        issue.mda = [`Primary institution: ${matched.institution}`, `Website: ${matched.website ?? "Not listed"}`, `Address / Contact: ${matched.addressContact ?? "Not listed"}`].join("\n");
        issue.submission_destination = {
          institution: matched.institution,
          website: matched.website,
          address_contact: matched.addressContact,
          why_relevant: `${matched.mandate} This authority matched the facts of this issue and the retrieved directory record.`,
          verification_note: "Confirm the current official submission channel before sending.",
        };
        issue.contact = matched.website ?? matched.addressContact ?? "";
        issue.routing_status = "routed";
      };

      if (Array.isArray(report.issues)) {
        report.issues = report.issues.slice(0, 8).map((item, index) => {
          const issue = item && typeof item === "object" ? { ...(item as Record<string, unknown>) } : {};
          issue.issue_id = typeof issue.issue_id === "string" && issue.issue_id.trim() ? issue.issue_id : `issue-${index + 1}`;
          normalizeIssueDestination(issue, issueRetrieval[index]?.mdaSources ?? []);
          return issue;
        });
        const primaryIssue = report.issues[0] as Record<string, unknown> | undefined;
        if (primaryIssue) {
          for (const key of ["action_type", "secondary_categories", "tier", "level", "category", "issue_summary", "responsible_authority", "mda", "officer", "constitutional_basis", "action_plan", "documents_needed", "escalation_path", "rights_reminder", "rationale", "next_steps", "contact", "submission_destination", "confidence", "routing_status", "emergency", "emergency_instruction", "evidence_basis"]) {
            if (key in primaryIssue) report[key] = primaryIssue[key];
          }
        }
      } else {
        normalizeIssueDestination(report, firstIssue.mdaSources);
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
