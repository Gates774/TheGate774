export interface ReportingSubcategory {
  id: string;
  label: string;
  hint: string;
}

export interface ReportingCategory {
  id: string;
  label: string;
  blurb: string;
  icon:
    | "corruption"
    | "financial"
    | "drugs"
    | "standards"
    | "police"
    | "election"
    | "human-rights"
    | "trafficking"
    | "environment"
    | "cyber";
  subcategories: ReportingSubcategory[];
}

export const REPORTING_CATEGORIES: ReportingCategory[] = [
  {
    id: "corruption",
    label: "Corruption & Bribery",
    blurb: "Public servants demanding bribes or abusing office",
    icon: "corruption",
    subcategories: [
      { id: "bribe-demand", label: "Bribe demanded by a public officer", hint: "ICPC primary jurisdiction" },
      { id: "contract-fraud", label: "Public contract fraud / inflation", hint: "ICPC / EFCC" },
      { id: "ghost-worker", label: "Ghost worker / payroll fraud", hint: "ICPC" },
      { id: "abuse-office", label: "Abuse of office by a public servant", hint: "ICPC / Code of Conduct Bureau" },
    ],
  },
  {
    id: "financial",
    label: "Financial & Economic Crime",
    blurb: "Fraud, money laundering, advance fee scams",
    icon: "financial",
    subcategories: [
      { id: "419", label: "Advance fee fraud (419)", hint: "EFCC" },
      { id: "money-laundering", label: "Money laundering", hint: "EFCC" },
      { id: "ponzi", label: "Ponzi scheme / unregistered investment", hint: "SEC / EFCC" },
      { id: "bank-fraud", label: "Bank fraud / cheque fraud", hint: "EFCC" },
    ],
  },
  {
    id: "drugs",
    label: "Fake Drugs & Unsafe Food",
    blurb: "Counterfeit drugs, expired or unsafe consumables",
    icon: "drugs",
    subcategories: [
      { id: "fake-drug", label: "Counterfeit / fake drug", hint: "NAFDAC" },
      { id: "expired-food", label: "Expired or contaminated food", hint: "NAFDAC" },
      { id: "illegal-pharmacy", label: "Illegal / unregistered pharmacy", hint: "PCN / NAFDAC" },
      { id: "unsafe-cosmetic", label: "Unsafe cosmetic / chemical product", hint: "NAFDAC" },
    ],
  },
  {
    id: "standards",
    label: "Substandard Goods",
    blurb: "Fake or unsafe industrial & consumer products",
    icon: "standards",
    subcategories: [
      { id: "fake-product", label: "Fake / substandard product", hint: "SON" },
      { id: "unsafe-electronics", label: "Unsafe electronics / appliances", hint: "SON" },
      { id: "weights-measures", label: "Wrong weights & measures", hint: "Federal Ministry of Trade" },
      { id: "smuggled-goods", label: "Smuggled goods", hint: "Nigeria Customs Service" },
    ],
  },
  {
    id: "police",
    label: "Police Misconduct",
    blurb: "Brutality, extortion, unlawful detention",
    icon: "police",
    subcategories: [
      { id: "brutality", label: "Police brutality / assault", hint: "PSC / NHRC" },
      { id: "extortion", label: "Extortion at checkpoint", hint: "PCRRU / PSC" },
      { id: "unlawful-detention", label: "Unlawful arrest or detention", hint: "PSC / NHRC" },
      { id: "missing-case", label: "Missing / mishandled case file", hint: "Area Command / PSC" },
    ],
  },
  {
    id: "election",
    label: "Election Offences",
    blurb: "Vote-buying, ballot stuffing, voter intimidation",
    icon: "election",
    subcategories: [
      { id: "vote-buying", label: "Vote buying / inducement", hint: "INEC / NPF" },
      { id: "ballot-stuffing", label: "Ballot stuffing / snatching", hint: "INEC" },
      { id: "voter-intimidation", label: "Voter intimidation / suppression", hint: "INEC / NPF" },
      { id: "false-result", label: "Falsification of results", hint: "INEC / Election Tribunal" },
    ],
  },
  {
    id: "human-rights",
    label: "Human Rights Abuse",
    blurb: "Torture, discrimination, denial of fair hearing",
    icon: "human-rights",
    subcategories: [
      { id: "torture", label: "Torture / inhuman treatment", hint: "NHRC" },
      { id: "discrimination", label: "Discrimination (ethnic, religious, disability)", hint: "NHRC" },
      { id: "gbv", label: "Gender-based violence", hint: "NAPTIP / NHRC / NPF" },
      { id: "child-rights", label: "Child rights violation", hint: "Ministry of Women Affairs / NHRC" },
    ],
  },
  {
    id: "trafficking",
    label: "Trafficking & Smuggling",
    blurb: "Human trafficking, modern slavery, smuggling routes",
    icon: "trafficking",
    subcategories: [
      { id: "human-trafficking", label: "Human trafficking", hint: "NAPTIP" },
      { id: "child-labour", label: "Child labour / forced labour", hint: "NAPTIP / Labour Ministry" },
      { id: "migrant-smuggling", label: "Migrant smuggling", hint: "NAPTIP / Immigration" },
    ],
  },
  {
    id: "environment",
    label: "Environmental Harm",
    blurb: "Oil spill, pollution, illegal dumping, deforestation",
    icon: "environment",
    subcategories: [
      { id: "oil-spill", label: "Oil spill / gas flaring", hint: "NOSDRA / NUPRC" },
      { id: "pollution", label: "Industrial pollution / waste dumping", hint: "NESREA / State Env" },
      { id: "deforestation", label: "Illegal logging / deforestation", hint: "Federal Ministry of Environment" },
      { id: "noise", label: "Excessive noise / nuisance", hint: "State Environmental Protection Agency" },
    ],
  },
  {
    id: "cyber",
    label: "Cybercrime",
    blurb: "Online fraud, hacking, impersonation, harassment",
    icon: "cyber",
    subcategories: [
      { id: "online-fraud", label: "Online fraud / phishing", hint: "EFCC Cybercrime / NPF Cybercrime" },
      { id: "hacking", label: "Hacking / unauthorised access", hint: "NITDA / NPF Cybercrime" },
      { id: "impersonation", label: "Online impersonation", hint: "NPF Cybercrime" },
      { id: "online-harassment", label: "Online harassment / stalking", hint: "NPF Cybercrime / NHRC" },
    ],
  },
];