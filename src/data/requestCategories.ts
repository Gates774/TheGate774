export interface RequestSubcategory {
  id: string;
  label: string;
  hint: string;
}

export interface RequestCategory {
  id: string;
  label: string;
  blurb: string;
  icon:
    | "welfare"
    | "loans"
    | "scholarships"
    | "health"
    | "utilities"
    | "documents"
    | "land"
    | "agriculture"
    | "security"
    | "business";
  subcategories: RequestSubcategory[];
}

export const REQUEST_CATEGORIES: RequestCategory[] = [
  {
    id: "welfare",
    label: "Welfare & Relief",
    blurb: "Cash transfers, food relief, displacement support",
    icon: "welfare",
    subcategories: [
      { id: "ncts", label: "National Conditional Cash Transfer (N-CTS)", hint: "Poorest & most vulnerable households" },
      { id: "n-power", label: "N-Power stipend / placement", hint: "Graduate empowerment" },
      { id: "idp-relief", label: "IDP / disaster relief", hint: "NEMA / SEMA support" },
      { id: "widow-elderly", label: "Widow & elderly support", hint: "Ministry of Humanitarian Affairs" },
    ],
  },
  {
    id: "loans",
    label: "Loans & Grants",
    blurb: "Government-backed credit, MSME and trader funds",
    icon: "loans",
    subcategories: [
      { id: "tcf", label: "Trader-Moni / MarketMoni", hint: "Micro-loans for small traders" },
      { id: "agsmeis", label: "AGSMEIS loan (CBN)", hint: "Agric & MSME loan" },
      { id: "nirsal", label: "NIRSAL MFB loan", hint: "Targeted MSME credit" },
      { id: "boi", label: "Bank of Industry (BOI) loan", hint: "Industrial financing" },
      { id: "youth-grant", label: "Youth empowerment grant", hint: "Federal/State youth schemes" },
    ],
  },
  {
    id: "scholarships",
    label: "Scholarships & Bursaries",
    blurb: "Federal, State and LGA student support",
    icon: "scholarships",
    subcategories: [
      { id: "fed-scholarship", label: "Federal Scholarship Board award", hint: "Federal Ministry of Education" },
      { id: "state-bursary", label: "State bursary / scholarship", hint: "Indigene support" },
      { id: "ptdf", label: "PTDF scholarship", hint: "Oil & gas postgraduate" },
      { id: "tetfund", label: "TETFund sponsorship", hint: "Tertiary institution staff" },
      { id: "lga-bursary", label: "LGA student bursary", hint: "Local government support" },
    ],
  },
  {
    id: "health",
    label: "Healthcare Support",
    blurb: "Insurance, free care, drug & vaccine access",
    icon: "health",
    subcategories: [
      { id: "nhia", label: "NHIA enrolment", hint: "National Health Insurance" },
      { id: "free-mch", label: "Free maternal & child care", hint: "State Primary Healthcare Board" },
      { id: "drug-relief", label: "Drug / treatment subsidy", hint: "Federal teaching hospital relief" },
      { id: "immunisation", label: "Immunisation / vaccine request", hint: "NPHCDA via PHC" },
    ],
  },
  {
    id: "utilities",
    label: "Utilities & Infrastructure",
    blurb: "Power, water, roads, waste — request a fix or service",
    icon: "utilities",
    subcategories: [
      { id: "meter", label: "Prepaid meter request (DisCo / MAP)", hint: "NERC-supervised" },
      { id: "water", label: "Water connection / borehole request", hint: "State Water Corporation" },
      { id: "road", label: "Road grading / drainage request", hint: "Federal/State/LGA road" },
      { id: "refuse", label: "Refuse collection request", hint: "LGA Environmental dept" },
      { id: "street-light", label: "Street-light installation", hint: "LGA Works dept" },
    ],
  },
  {
    id: "documents",
    label: "Documents & IDs",
    blurb: "Replacement, certified copies, letters of identification",
    icon: "documents",
    subcategories: [
      { id: "nin-update", label: "NIN modification / re-issue", hint: "NIMC" },
      { id: "indigene", label: "Letter of Indigeneship", hint: "LGA Secretariat" },
      { id: "id-replacement", label: "ID replacement (driver, voter)", hint: "FRSC / INEC" },
      { id: "certified-copy", label: "Certified true copy of certificate", hint: "WAEC / NECO / NYSC" },
    ],
  },
  {
    id: "land",
    label: "Land & Housing",
    blurb: "Allocations, C of O, housing schemes",
    icon: "land",
    subcategories: [
      { id: "c-of-o", label: "Certificate of Occupancy (C of O)", hint: "State Lands Bureau" },
      { id: "fha", label: "FHA housing application", hint: "Federal Housing Authority" },
      { id: "state-housing", label: "State housing scheme allocation", hint: "State Ministry of Housing" },
      { id: "land-allocation", label: "LGA land allocation", hint: "LGA Lands office (residual)" },
    ],
  },
  {
    id: "agriculture",
    label: "Agriculture & Inputs",
    blurb: "Subsidised seedlings, fertilisers, extension support",
    icon: "agriculture",
    subcategories: [
      { id: "fert-subsidy", label: "Fertiliser / seedling subsidy", hint: "Federal/State Ministry of Agriculture" },
      { id: "extension", label: "Extension officer visit", hint: "ADP / LGA agric desk" },
      { id: "cbn-anchor", label: "CBN Anchor Borrowers / RIFAN", hint: "Smallholder farmer credit" },
    ],
  },
  {
    id: "security",
    label: "Security & Protection",
    blurb: "Patrols, escort, protection order requests",
    icon: "security",
    subcategories: [
      { id: "patrol", label: "Police patrol / community visit", hint: "DPO / Area Command" },
      { id: "vigilante", label: "LGA vigilante / community guard", hint: "LGA Security Council" },
      { id: "protection-order", label: "Protection / restraining order", hint: "State Magistrate court" },
      { id: "witness-protection", label: "Witness protection request", hint: "EFCC / NPF / NJI" },
    ],
  },
  {
    id: "business",
    label: "Business & Commerce",
    blurb: "Permits, MSME registration, tax relief",
    icon: "business",
    subcategories: [
      { id: "smedan", label: "SMEDAN business support", hint: "Federal MSME agency" },
      { id: "trade-permit", label: "LGA trade / shop permit", hint: "LGA Revenue dept" },
      { id: "signage", label: "Signage / advertisement permit", hint: "State Signage Agency" },
      { id: "tax-relief", label: "Tax relief / waiver request", hint: "FIRS / State IRS" },
    ],
  },
];