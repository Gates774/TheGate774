// Nigerian government responsibilities mapped to the three constitutional lists.
// Used by the AI to ground its reasoning and by the lookup UI to suggest MDAs.

export type GovLevel = "exclusive" | "concurrent" | "residual";

export interface MDA {
  name: string;
  acronym?: string;
  level: GovLevel;
  responsible: string; // The officer/office that is ultimately accountable
  scope: string;       // One-line description of what they handle
  keywords: string[];  // Keywords used for autocomplete + matching
  contact?: string;    // Phone, email, or URL
}

export const MDAS: MDA[] = [
  // ───────── EXCLUSIVE LIST (Federal Government) ─────────
  { name: "National Identity Management Commission", acronym: "NIMC", level: "exclusive", responsible: "President / Federal Government", scope: "National ID Card (NIN) registration and management", keywords: ["nin", "national id", "national identity", "identity card", "nimc"], contact: "https://nimc.gov.ng" },
  { name: "Independent National Electoral Commission", acronym: "INEC", level: "exclusive", responsible: "President / INEC Chairman", scope: "Voter registration, PVC, federal/state elections", keywords: ["voter", "pvc", "voter card", "voter's card", "inec", "election", "register to vote"], contact: "https://inec.gov.ng" },
  { name: "Nigeria Immigration Service", acronym: "NIS", level: "exclusive", responsible: "President / Comptroller-General of Immigration", scope: "International passports, visas, ECOWAS travel", keywords: ["passport", "international passport", "visa", "immigration", "ecowas"], contact: "https://immigration.gov.ng" },
  { name: "Joint Admissions and Matriculation Board", acronym: "JAMB", level: "exclusive", responsible: "President / JAMB Registrar", scope: "UTME, university admissions", keywords: ["jamb", "utme", "admission", "university entrance"], contact: "https://jamb.gov.ng" },
  { name: "Federal Road Safety Corps", acronym: "FRSC", level: "exclusive", responsible: "President / FRSC Corps Marshal", scope: "Drivers' licence, vehicle plate numbers, road safety", keywords: ["driver licence", "drivers license", "license", "number plate", "vehicle plate", "frsc", "road safety"], contact: "https://frsc.gov.ng" },
  { name: "Economic and Financial Crimes Commission", acronym: "EFCC", level: "exclusive", responsible: "President / EFCC Chairman", scope: "Economic and financial crimes, fraud, money laundering", keywords: ["efcc", "fraud", "scam", "money laundering", "financial crime", "419"], contact: "https://efcc.gov.ng" },
  { name: "Independent Corrupt Practices Commission", acronym: "ICPC", level: "exclusive", responsible: "President / ICPC Chairman", scope: "Corruption and bribery in public service", keywords: ["icpc", "corruption", "bribery", "public servant", "kickback"], contact: "https://icpc.gov.ng" },
  { name: "Standards Organisation of Nigeria", acronym: "SON", level: "exclusive", responsible: "President / SON Director-General", scope: "Product standards, fake goods, substandard products", keywords: ["son", "fake product", "substandard", "product quality", "standards"], contact: "https://son.gov.ng" },
  { name: "National Agency for Food and Drug Administration and Control", acronym: "NAFDAC", level: "exclusive", responsible: "President / NAFDAC Director-General", scope: "Fake drugs, expired food, unsafe consumables", keywords: ["nafdac", "fake drug", "expired", "food safety", "drug"], contact: "https://nafdac.gov.ng" },
  { name: "National Health Insurance Authority", acronym: "NHIA", level: "exclusive", responsible: "President / NHIA Director-General", scope: "NHIS health insurance enrolment and claims", keywords: ["nhis", "nhia", "health insurance", "hmo"], contact: "https://nhia.gov.ng" },
  { name: "National Pension Commission", acronym: "PenCom", level: "exclusive", responsible: "President / PenCom DG", scope: "Pensions, retirement savings", keywords: ["pension", "retirement", "pencom", "rsa"], contact: "https://pencom.gov.ng" },
  { name: "Nigeria Police Force", acronym: "NPF", level: "exclusive", responsible: "President / Inspector-General of Police", scope: "Crime, PCC (Police Character Certificate), public safety", keywords: ["police", "pcc", "police character", "crime", "robbery", "kidnap", "ipob"], contact: "https://npf.gov.ng" },
  { name: "Legal Aid Council of Nigeria", level: "exclusive", responsible: "President / Attorney-General of the Federation", scope: "Free legal aid for indigent Nigerians", keywords: ["legal aid", "lawyer", "free legal", "court case help"], contact: "https://legalaidcouncil.gov.ng" },
  { name: "Federal Scholarships Board", level: "exclusive", responsible: "Minister of Education", scope: "Federal scholarships (BEA, local & foreign)", keywords: ["scholarship", "bea", "federal scholarship", "bursary"], contact: "https://education.gov.ng" },
  { name: "Nigerian Communications Commission", acronym: "NCC", level: "exclusive", responsible: "President / NCC EVC", scope: "Telecoms, SIM registration, network quality", keywords: ["ncc", "sim", "telecom", "network", "mtn", "glo", "airtel", "9mobile", "call drop"], contact: "https://ncc.gov.ng" },
  { name: "Nigeria Customs Service", level: "exclusive", responsible: "President / Comptroller-General of Customs", scope: "Customs, import/export duties, smuggling", keywords: ["customs", "import", "export", "smuggling", "duty"], contact: "https://customs.gov.ng" },
  { name: "Federal Inland Revenue Service", acronym: "FIRS", level: "exclusive", responsible: "President / FIRS Chairman", scope: "Federal taxes (VAT, CIT, PAYE for FCT)", keywords: ["firs", "vat", "company tax", "tin", "federal tax"], contact: "https://firs.gov.ng" },

  // ───────── CONCURRENT LIST (Federal + State) ─────────
  { name: "Federal & State Ministries of Education", level: "concurrent", responsible: "President & State Governor", scope: "Primary, secondary & tertiary education policy and funding", keywords: ["school", "education", "teacher", "wassce", "neco", "secondary school", "tertiary"], contact: "Contact your State Ministry of Education" },
  { name: "Federal & State Ministries of Health", level: "concurrent", responsible: "President & State Governor", scope: "Public hospitals, primary health, disease control", keywords: ["hospital", "health", "clinic", "doctor", "nurse", "vaccine", "malaria"], contact: "Contact your State Ministry of Health" },
  { name: "Federal & State Ministries of Works", level: "concurrent", responsible: "President & State Governor", scope: "Federal & state highways, road construction", keywords: ["road", "highway", "pothole", "expressway", "bridge"], contact: "Contact your State Ministry of Works" },
  { name: "Federal & State Ministries of Agriculture", level: "concurrent", responsible: "President & State Governor", scope: "Agriculture, food security, farmer support", keywords: ["agriculture", "farmer", "fertiliser", "fertilizer", "farm", "crop", "livestock"], contact: "Contact your State Ministry of Agriculture" },
  { name: "State Internal Revenue Service", acronym: "SIRS", level: "concurrent", responsible: "State Governor", scope: "State taxes (PAYE, land use charge)", keywords: ["state tax", "paye", "land use charge", "sirs", "lirs"], contact: "Contact your State IRS" },
  { name: "State Power & Energy", level: "concurrent", responsible: "President & State Governor (post-2023 Electricity Act)", scope: "Electricity supply, DISCOs, transmission complaints", keywords: ["electricity", "power", "light", "nepa", "phcn", "disco", "ikeja electric", "eko electric", "blackout"], contact: "Contact your State Electricity Regulator or DISCO" },
  { name: "State Ministry of Justice", level: "concurrent", responsible: "State Governor / State Attorney-General", scope: "State courts, magistrate courts, prosecution", keywords: ["court", "magistrate", "state court", "justice", "prosecution"], contact: "Contact your State Ministry of Justice" },

  // ───────── RESIDUAL LIST (Local Government) ─────────
  { name: "Local Government Council", level: "residual", responsible: "Local Government Chairman", scope: "Birth & death registration, market regulation, refuse, primary education support", keywords: ["birth certificate", "death certificate", "market", "refuse", "garbage", "waste", "local market", "abattoir"], contact: "Visit your LGA Secretariat" },
  { name: "Local Government Health (PHC)", level: "residual", responsible: "Local Government Chairman / PHC Director", scope: "Primary healthcare centres, immunisation outreach", keywords: ["primary health", "phc", "immunisation", "immunization", "local clinic"], contact: "Visit your LGA Secretariat" },
  { name: "Local Sanitation & Environment", level: "residual", responsible: "Local Government Chairman", scope: "Street cleaning, drainage, sanitation, gutter", keywords: ["sanitation", "drainage", "gutter", "street cleaning", "blocked drain"], contact: "Visit your LGA Secretariat" },
  { name: "Local Streetlights & Minor Roads", level: "residual", responsible: "Local Government Chairman", scope: "Streetlights, local feeder roads", keywords: ["streetlight", "street light", "local road", "feeder road"], contact: "Visit your LGA Secretariat" },
];

export const LEVEL_LABELS: Record<GovLevel, string> = {
  exclusive: "Exclusive List (Federal Government)",
  concurrent: "Concurrent List (Federal & State Government)",
  residual: "Residual List (Local Government)",
};

export const ACTION_TYPES = [
  { id: "complaints", label: "Complaints", desc: "Lodge a grievance and find who is responsible" },
  { id: "request", label: "Request", desc: "Request a service (Legal Aid, PCC, Scholarships…)" },
  { id: "enquiries", label: "Enquiries", desc: "Ask about access, info, procedures" },
  { id: "reporting", label: "Reporting", desc: "Report misconduct with evidence (EFCC, ICPC, SON…)" },
  { id: "application", label: "Application", desc: "Apply for JAMB, Licence, Passport, etc." },
  { id: "registration", label: "Registration", desc: "Register for NIN, NHIS, PVC, Pension…" },
] as const;

export type ActionId = typeof ACTION_TYPES[number]["id"];

// Quick keyword-based suggestion for autocomplete (returns top N matching MDAs)
export function suggestMDAs(query: string, limit = 5): MDA[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const scored = MDAS.map((m) => {
    let score = 0;
    for (const kw of m.keywords) {
      if (q.includes(kw)) score += 3;
      else if (kw.includes(q)) score += 1;
    }
    if (m.name.toLowerCase().includes(q)) score += 2;
    if (m.acronym && q.includes(m.acronym.toLowerCase())) score += 4;
    return { m, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.m);
}