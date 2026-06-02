// Nigerian Governance Framework — based on the 1999 Constitution (as amended).
// Source: user-provided "Nigerian_Governance_Framework.docx".
// Used to ground AI classification of citizen complaints, requests, enquiries,
// reports, applications, and registrations to the responsible tier of government.

export type GovTier = "federal" | "state" | "local";

export const TIER_LABELS: Record<GovTier, string> = {
  federal: "Federal Government (Exclusive List)",
  state: "State Government (Residual + Concurrent)",
  local: "Local Government (Fourth Schedule)",
};

export const TIER_OFFICERS: Record<GovTier, string> = {
  federal: "President of the Federal Republic of Nigeria",
  state: "Governor of the State",
  local: "Local Government Area (LGA) Chairman",
};

export interface ResponsibilityArea {
  tier: GovTier;
  category: string;        // High-level domain (e.g. "Roads & Transport")
  scope: string;           // One-line description
  items: string[];         // Concrete responsibilities
  keywords: string[];      // Matching keywords (lowercase)
  responsible: string;     // Officer ultimately accountable
  contact?: string;        // Who to contact
}

export const GOVERNANCE_FRAMEWORK: ResponsibilityArea[] = [
  // ───────────── TIER 1 — FEDERAL (Exclusive List, 68 items) ─────────────
  {
    tier: "federal",
    category: "Security & Defence",
    scope: "Armed forces, federal police, intelligence, border control, federal prisons.",
    items: [
      "Nigerian Army, Navy and Air Force",
      "Nigeria Police Force (federal control)",
      "DSS, NIA and federal intelligence",
      "Declaration of war and troop deployment",
      "Immigration, deportation and border control",
      "Federal prisons and correctional services",
    ],
    keywords: ["army", "navy", "air force", "military", "police", "dss", "nia", "intelligence", "border", "immigration", "deportation", "prison", "correctional"],
    responsible: "President / Inspector-General of Police / Service Chiefs",
    contact: "Nigeria Police Force, NIS, DSS — federal channels",
  },
  {
    tier: "federal",
    category: "Economy, Finance & Trade",
    scope: "Currency, federal taxes, customs, banking, capital markets, IP.",
    items: [
      "Naira — currency, coinage and legal tender",
      "Customs and excise duties at ports and borders",
      "Companies Income Tax, Petroleum Profit Tax, Capital Gains Tax",
      "External borrowing for the Federation",
      "CBN, NDIC, SEC regulation",
      "Insurance regulation nationwide",
      "Bankruptcy and insolvency",
      "Copyright, patents and trademarks",
      "Stock exchange and capital markets",
    ],
    keywords: ["naira", "currency", "customs", "import", "export", "duty", "company tax", "cit", "petroleum tax", "capital gains", "central bank", "cbn", "ndic", "sec", "bank", "insurance", "bankruptcy", "patent", "trademark", "copyright", "stock exchange"],
    responsible: "President / Minister of Finance / CBN Governor",
    contact: "Federal Ministry of Finance, CBN, FIRS, Customs",
  },
  {
    tier: "federal",
    category: "Infrastructure & Natural Resources",
    scope: "Federal highways, railways, ports, aviation, oil & gas, minerals, telecoms.",
    items: [
      "Federal trunk roads (inter-state highways)",
      "Railways construction and operation",
      "Ports, harbours and navigable inland waterways",
      "Civil aviation, airports and airspace",
      "Petroleum and natural gas — NNPC",
      "Mines and solid minerals licensing",
      "Inter-state water resources",
      "Nuclear energy and radioactive substances",
      "Posts, telegraphs and telecommunications",
      "National broadcasting (NTA, FRCN)",
    ],
    keywords: ["federal road", "trunk road", "highway", "expressway", "railway", "train", "port", "harbour", "waterway", "airport", "airspace", "aviation", "airline", "petroleum", "oil", "gas", "nnpc", "mining", "mineral", "nuclear", "telecom", "telecoms", "nta", "frcn", "broadcasting"],
    responsible: "President / Minister of Works / Minister of Petroleum / NCC",
    contact: "Federal Ministry of Works, NNPC, NCC, FAAN, NRC",
  },
  {
    tier: "federal",
    category: "Governance & Administration",
    scope: "Citizenship, passports, census, federal elections, NAFDAC, epidemics.",
    items: [
      "Nigerian citizenship",
      "Passports and travel documents",
      "National population census; births & deaths registration framework",
      "Presidential, National Assembly and Governorship elections (INEC)",
      "Registration of political parties",
      "Federal civil service and parastatals",
      "Constitutional amendment",
      "National honours",
      "Drugs and poisons regulation (NAFDAC)",
      "National quarantine and disease control",
      "Meteorology",
    ],
    keywords: ["citizenship", "passport", "nin", "national id", "nimc", "census", "inec", "voter", "pvc", "election", "political party", "federal civil service", "national honour", "nafdac", "fake drug", "quarantine", "epidemic", "pandemic", "meteorology", "weather"],
    responsible: "President / INEC / NIMC / NAFDAC",
    contact: "INEC, NIMC, NAFDAC, NIS",
  },
  {
    tier: "federal",
    category: "Foreign Affairs & International Relations",
    scope: "Diplomacy, treaties, extradition, foreign exchange.",
    items: [
      "Embassies, consulates and foreign missions",
      "Treaties and international agreements",
      "Extradition",
      "Membership of UN, AU, ECOWAS",
      "Foreign exchange regulation",
    ],
    keywords: ["embassy", "consulate", "diplomat", "treaty", "extradition", "un", "african union", "ecowas", "foreign exchange", "fx", "forex"],
    responsible: "President / Minister of Foreign Affairs",
    contact: "Federal Ministry of Foreign Affairs",
  },
  {
    tier: "federal",
    category: "Federal Justice & Courts",
    scope: "Supreme Court, Court of Appeal, Federal High Court, Evidence Act.",
    items: [
      "Supreme Court, Court of Appeal, Federal High Court",
      "Federal criminal law and crimes against the state",
      "Attorney-General of the Federation",
      "Presidential prerogative of mercy",
      "Evidence Act (rules of evidence nationwide)",
    ],
    keywords: ["supreme court", "court of appeal", "federal high court", "federal crime", "attorney general of the federation", "presidential pardon", "evidence act"],
    responsible: "President / Attorney-General of the Federation / Chief Justice of Nigeria",
    contact: "Federal Ministry of Justice",
  },

  // ───────────── TIER 2 — STATE (Residual + Concurrent) ─────────────
  {
    tier: "state",
    category: "Education (State)",
    scope: "State-owned primary, secondary and tertiary education.",
    items: [
      "State primary and secondary schools",
      "Recruitment and discipline of public school teachers",
      "State universities, polytechnics and colleges of education",
      "State bursaries and scholarships for indigenes",
      "Adult and vocational education in the state",
    ],
    keywords: ["public school", "state school", "secondary school", "primary school", "teacher", "state university", "polytechnic", "college of education", "bursary", "state scholarship", "wassce", "neco"],
    responsible: "State Governor / Commissioner for Education",
    contact: "State Ministry of Education",
  },
  {
    tier: "state",
    category: "Healthcare (State)",
    scope: "General and specialist hospitals, ambulances, state health insurance.",
    items: [
      "General and specialist hospitals at state level",
      "Ambulance and state emergency medical response",
      "State health insurance (e.g. LASHMA, KSHS)",
      "Community health and maternal care",
      "State-level epidemics and public health emergencies",
    ],
    keywords: ["state hospital", "general hospital", "specialist hospital", "ambulance", "lashma", "kshs", "state health insurance", "maternal care"],
    responsible: "State Governor / Commissioner for Health",
    contact: "State Ministry of Health",
  },
  {
    tier: "state",
    category: "State Roads & Transport",
    scope: "All state roads and bridges, intra-state transport, vehicle inspection.",
    items: [
      "State roads and bridges (not federal trunk roads)",
      "Intra-state transport policy and bus services",
      "Road traffic laws and vehicle inspection within the state",
      "State-managed ferries and waterways within the state",
    ],
    keywords: ["state road", "intra-state", "vehicle inspection", "vio", "brt", "state transport", "state ferry", "pothole", "bad road"],
    responsible: "State Governor / Commissioner for Works",
    contact: "State Ministry of Works and Transport",
  },
  {
    tier: "state",
    category: "Agriculture (State)",
    scope: "State extension services, farms, food security, irrigation, inland fishing.",
    items: [
      "State agricultural extension services",
      "State farms and agricultural development",
      "Food security and production initiatives",
      "Irrigation projects within state boundaries",
      "Fishing in inland rivers, lakes and ponds in the state",
    ],
    keywords: ["state farm", "extension service", "fertiliser", "fertilizer", "irrigation", "inland fishing", "food security", "farmer support"],
    responsible: "State Governor / Commissioner for Agriculture",
    contact: "State Ministry of Agriculture",
  },
  {
    tier: "state",
    category: "Land & Housing",
    scope: "Land Use Act administration, C of O, housing schemes, urban planning.",
    items: [
      "Administration of all land under the Land Use Act",
      "Certificate of Occupancy (C of O) issuance",
      "State housing schemes",
      "Urban planning, zoning and building permits",
    ],
    keywords: ["land", "land use act", "certificate of occupancy", "c of o", "housing scheme", "zoning", "building permit", "urban planning"],
    responsible: "State Governor / Commissioner for Lands & Housing",
    contact: "State Ministry of Lands, Housing and Urban Development",
  },
  {
    tier: "state",
    category: "Chieftaincy & Culture",
    scope: "Traditional rulers, chieftaincy titles, local festivals — exclusively state matter.",
    items: [
      "Recognition and deposition of traditional rulers",
      "Award of chieftaincy titles",
      "Regulation of cultural festivals and traditional institutions",
    ],
    keywords: ["chieftaincy", "traditional ruler", "oba", "emir", "obi", "igwe", "festival", "cultural"],
    responsible: "State Governor",
    contact: "State Ministry of Local Government and Chieftaincy Affairs",
  },
  {
    tier: "state",
    category: "State Justice & Courts",
    scope: "State High Court, Magistrate, Customary and Sharia Courts; state AG.",
    items: [
      "State High Court",
      "Magistrate, Customary and Sharia Courts (where applicable)",
      "Attorney-General of the State",
      "Gubernatorial prerogative of mercy",
      "State laws on public order and morality",
    ],
    keywords: ["state high court", "magistrate court", "customary court", "sharia court", "state attorney general", "gubernatorial pardon"],
    responsible: "State Governor / Attorney-General of the State",
    contact: "State Ministry of Justice",
  },
  {
    tier: "state",
    category: "Environment (State)",
    scope: "State EPAs, waste policy, conservation, state parks.",
    items: [
      "State environmental protection agency (e.g. LASEPA)",
      "State waste management policy and solid waste disposal",
      "Forestation, land reclamation, conservation",
      "State parks, nature reserves and wildlife",
    ],
    keywords: ["lasepa", "state environment", "pollution", "deforestation", "state park", "nature reserve", "wildlife"],
    responsible: "State Governor / Commissioner for Environment",
    contact: "State Ministry of Environment",
  },
  {
    tier: "state",
    category: "State Revenue & Finance",
    scope: "State personal income tax (PAYE), state CGT, fees and FAAC share.",
    items: [
      "Personal income tax — PAYE for workers in the state",
      "State capital gains tax",
      "State fees, levies and licences",
      "State share of FAAC allocation",
    ],
    keywords: ["paye", "state tax", "personal income tax", "state levy", "state licence", "state licensing", "faac", "state irs", "sirs", "lirs"],
    responsible: "State Governor / State IRS Chairman",
    contact: "State Internal Revenue Service",
  },
  {
    tier: "state",
    category: "Commerce & Internal Trade",
    scope: "Cooperatives, industrial zones, state markets and consumer protection.",
    items: [
      "Cooperative society registration",
      "State industrial development zones and free trade areas",
      "State markets and trade fairs",
      "State-level consumer protection",
    ],
    keywords: ["cooperative", "industrial zone", "free trade zone", "trade fair", "state market", "consumer protection"],
    responsible: "State Governor / Commissioner for Commerce",
    contact: "State Ministry of Commerce and Industry",
  },
  {
    tier: "state",
    category: "Internal Security (State)",
    scope: "State Security Committee, Civil Defence liaison, community policing.",
    items: [
      "State Security Committee chaired by the Governor",
      "Liaison with NPF state command",
      "Civil Defence Corps at state level",
      "Community policing and vigilance oversight",
    ],
    keywords: ["state security", "civil defence", "nscdc", "vigilante", "community policing", "amotekun", "ebube agu"],
    responsible: "State Governor (State Security Committee)",
    contact: "Office of the Governor / State Security Adviser",
  },
  {
    tier: "state",
    category: "Electricity (State)",
    scope: "Generation and distribution within the state; rural electrification.",
    items: [
      "Generation and distribution of electricity within the state (concurrent with federal)",
      "State rural electrification and mini-grid projects",
    ],
    keywords: ["state electricity", "mini grid", "rural electrification", "state power", "embedded generation"],
    responsible: "State Governor / State Electricity Regulator",
    contact: "State Ministry of Power",
  },

  // ───────────── TIER 3 — LOCAL GOVERNMENT (Fourth Schedule) ─────────────
  {
    tier: "local",
    category: "LGA Revenue & Licensing",
    scope: "Local rates, radio/TV licences, bicycle/canoe/cart licences, liquor licensing.",
    items: [
      "Collection of rates, radio and television licences",
      "Licensing of bicycles, canoes, wheelbarrows, carts",
      "Licensing and control of sale of liquor",
    ],
    keywords: ["radio licence", "tv licence", "bicycle licence", "canoe licence", "cart licence", "liquor licence", "tenement rate"],
    responsible: "Local Government Chairman",
    contact: "LGA Secretariat — Revenue Unit",
  },
  {
    tier: "local",
    category: "Markets, Motor Parks & Public Spaces",
    scope: "Markets, motor parks, slaughterhouses, public toilets, parks and gardens.",
    items: [
      "Establishment and regulation of markets",
      "Motor parks and lorry parks",
      "Slaughterhouses and slaughter slabs",
      "Public conveniences (toilets)",
      "Parks and open gardens",
    ],
    keywords: ["local market", "motor park", "lorry park", "slaughterhouse", "abattoir", "public toilet", "park", "open garden", "touts"],
    responsible: "Local Government Chairman",
    contact: "LGA Secretariat",
  },
  {
    tier: "local",
    category: "Local Roads, Drains & Street Infrastructure",
    scope: "Local roads, street lighting, drains, street naming, house numbering.",
    items: [
      "Construction and maintenance of local roads and streets",
      "Street lighting and drains",
      "Naming of roads and streets",
      "Numbering of houses and buildings",
    ],
    keywords: ["local road", "feeder road", "street light", "streetlight", "drain", "gutter", "blocked drain", "street name", "house number"],
    responsible: "Local Government Chairman",
    contact: "LGA Works Department",
  },
  {
    tier: "local",
    category: "Sanitation & Welfare (LGA)",
    scope: "Sewage, refuse collection, cemeteries, homes for the destitute.",
    items: [
      "Sewage systems",
      "Refuse collection and disposal",
      "Cemeteries and burial grounds",
      "Homes for the destitute and infirm",
    ],
    keywords: ["sewage", "refuse", "rubbish", "waste", "garbage", "cemetery", "burial ground", "destitute"],
    responsible: "Local Government Chairman",
    contact: "LGA Sanitation / Environmental Health Unit",
  },
  {
    tier: "local",
    category: "Registration & Local Regulation",
    scope: "Births, deaths, marriages; rating of buildings; outdoor adverts; shop regulation.",
    items: [
      "Registration of births, deaths and marriages",
      "Assessment and rating of privately owned buildings",
      "Outdoor advertising and hoardings",
      "Regulation of movement and keeping of pets",
      "Regulation of shops, kiosks, restaurants, bakeries and food-sale premises",
      "Regulation of laundries",
    ],
    keywords: ["birth certificate", "death certificate", "marriage certificate", "rating", "valuation", "outdoor advert", "billboard", "hoarding", "pet", "shop licence", "kiosk", "restaurant licence", "bakery", "laundry"],
    responsible: "Local Government Chairman",
    contact: "LGA Registry / Environmental Health Unit",
  },
  {
    tier: "local",
    category: "Primary Education (LGA + State)",
    scope: "Primary schools, adult literacy, vocational centres — shared with state.",
    items: [
      "Primary schools",
      "Adult literacy programmes",
      "Vocational training centres",
    ],
    keywords: ["primary school", "adult literacy", "vocational centre", "vocational training"],
    responsible: "Local Government Chairman with State Government",
    contact: "LGA Education Authority / SUBEB",
  },
  {
    tier: "local",
    category: "Primary Healthcare (LGA + State)",
    scope: "Health centres, dispensaries, maternal and child health — shared with state.",
    items: [
      "Primary health centres",
      "Dispensaries",
      "Maternal and child health care",
    ],
    keywords: ["primary health", "phc", "dispensary", "immunisation", "immunization", "maternal", "child health"],
    responsible: "Local Government Chairman with State Government",
    contact: "LGA Primary Healthcare Department",
  },
  {
    tier: "local",
    category: "Community Agriculture (LGA + State)",
    scope: "Community-level agriculture and natural resources (not mining).",
    items: [
      "Development of community-level agriculture",
      "Natural resources at community level (excluding mining)",
    ],
    keywords: ["community agriculture", "community farm", "community natural resources"],
    responsible: "Local Government Chairman with State Government",
    contact: "LGA Agriculture Department",
  },
];

// ───────────── Concurrent List (Federal + State) ─────────────

export interface ConcurrentMatter {
  area: string;
  explanation: string;
  keywords: string[];
}

export const CONCURRENT_LIST: ConcurrentMatter[] = [
  { area: "Revenue allocation", explanation: "Sharing of the Federation Account among the three tiers.", keywords: ["revenue allocation", "federation account", "faac"] },
  { area: "Antiquities & monuments", explanation: "Protection of historical sites, artefacts and cultural monuments.", keywords: ["antiquity", "monument", "historical site", "artefact", "heritage"] },
  { area: "Collection of taxes (stamp duties, personal income tax, pools betting)", explanation: "Federal sets framework; States collect PAYE and stamp duties.", keywords: ["stamp duty", "pools betting", "lottery tax"] },
  { area: "Electricity (generation & distribution)", explanation: "Both levels may develop power projects (Electricity Act 2023).", keywords: ["electricity", "power", "disco", "genco", "blackout", "phcn", "nepa"] },
  { area: "Industrial, commercial & agricultural development", explanation: "Both can establish and regulate factories, businesses and agric zones.", keywords: ["industrial development", "commercial development", "agricultural development"] },
  { area: "Scientific & technological research", explanation: "Both can fund research centres and innovation hubs.", keywords: ["scientific research", "technological research", "innovation hub", "r&d"] },
  { area: "Statistics", explanation: "Both levels may collect and publish statistical data.", keywords: ["statistics", "data collection", "national bureau of statistics", "nbs"] },
  { area: "Voter registration (LGA elections)", explanation: "States register voters for LGA elections; INEC handles federal and governorship.", keywords: ["lga election", "local government election", "voter registration"] },
  { area: "University & tertiary education", explanation: "Federal and State may both establish universities and polytechnics.", keywords: ["university", "tertiary education", "polytechnic", "college of education"] },
];

export const CONFLICT_RULE =
  "Where a State law is inconsistent with a valid Federal law, the Federal law prevails and the State law is void to the extent of the inconsistency (Section 4(5), 1999 Constitution).";

// Lightweight keyword-based matcher used for autocomplete + fallback routing.
// The AI in `analyze-civic` does the authoritative classification.
export function suggestResponsibility(query: string, limit = 5): ResponsibilityArea[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const scored = GOVERNANCE_FRAMEWORK.map((area) => {
    let score = 0;
    for (const kw of area.keywords) {
      if (q.includes(kw)) score += 3;
      else if (kw.includes(q)) score += 1;
    }
    if (area.category.toLowerCase().includes(q)) score += 2;
    return { area, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.area);
}
