export interface ApplicationSubcategory {
  id: string;
  label: string;
  hint: string;
}

export interface ApplicationCategory {
  id: string;
  label: string;
  blurb: string;
  icon:
    | "travel"
    | "drive"
    | "education"
    | "work"
    | "tax"
    | "land"
    | "business"
    | "civic"
    | "health"
    | "import";
  subcategories: ApplicationSubcategory[];
}

export const APPLICATION_CATEGORIES: ApplicationCategory[] = [
  {
    id: "travel",
    label: "Travel & Identity",
    blurb: "Passport, ECOWAS card, visa endorsements",
    icon: "travel",
    subcategories: [
      { id: "passport-new", label: "New international passport", hint: "Nigeria Immigration Service (NIS)" },
      { id: "passport-renew", label: "Passport renewal / re-issue", hint: "NIS" },
      { id: "ecowas", label: "ECOWAS travel certificate", hint: "NIS" },
      { id: "visa-on-arrival", label: "Visa-on-arrival (for visitors)", hint: "NIS portal" },
    ],
  },
  {
    id: "drive",
    label: "Driving & Vehicle",
    blurb: "Licences, plates, road-worthiness",
    icon: "drive",
    subcategories: [
      { id: "drivers-licence", label: "Driver's licence (new / renew)", hint: "FRSC / VIO" },
      { id: "number-plate", label: "Vehicle number plate", hint: "FRSC" },
      { id: "roadworthy", label: "Road-worthiness certificate", hint: "State VIO" },
      { id: "hackney", label: "Hackney / commercial permit", hint: "LGA / State transport" },
    ],
  },
  {
    id: "education",
    label: "Education & Exams",
    blurb: "JAMB, WAEC, NYSC, transcripts",
    icon: "education",
    subcategories: [
      { id: "jamb", label: "JAMB / UTME application", hint: "JAMB" },
      { id: "waec", label: "WAEC / NECO registration", hint: "WAEC / NECO" },
      { id: "nysc", label: "NYSC mobilisation", hint: "NYSC" },
      { id: "transcript", label: "Academic transcript request", hint: "Your tertiary institution" },
    ],
  },
  {
    id: "work",
    label: "Work & Professional",
    blurb: "Work permits, professional licences",
    icon: "work",
    subcategories: [
      { id: "expat-permit", label: "Expatriate work permit (CERPAC)", hint: "NIS" },
      { id: "professional", label: "Professional body licence", hint: "NMA, NBA, COREN, ICAN etc." },
      { id: "police-clearance", label: "Police Character Certificate (PCC)", hint: "Nigeria Police Force" },
    ],
  },
  {
    id: "tax",
    label: "Tax & Revenue",
    blurb: "TIN, tax clearance, waivers",
    icon: "tax",
    subcategories: [
      { id: "tin", label: "TIN (Tax Identification Number)", hint: "JTB / FIRS" },
      { id: "tcc", label: "Tax Clearance Certificate (TCC)", hint: "State IRS / FIRS" },
      { id: "vat-reg", label: "VAT registration (business)", hint: "FIRS" },
      { id: "waiver", label: "Tax waiver / pioneer status", hint: "FIRS / NIPC" },
    ],
  },
  {
    id: "land",
    label: "Land & Building",
    blurb: "C of O, building plan, survey",
    icon: "land",
    subcategories: [
      { id: "c-of-o", label: "Certificate of Occupancy (C of O)", hint: "State Lands Bureau" },
      { id: "building-plan", label: "Building plan approval", hint: "State / LGA planning authority" },
      { id: "survey-plan", label: "Survey plan", hint: "Office of the Surveyor-General" },
      { id: "deed", label: "Deed of Assignment registration", hint: "State Lands Registry" },
    ],
  },
  {
    id: "business",
    label: "Business & Trade",
    blurb: "CAC, NAFDAC, SON, trade permits",
    icon: "business",
    subcategories: [
      { id: "cac", label: "Business / company registration (CAC)", hint: "Corporate Affairs Commission" },
      { id: "nafdac-reg", label: "Product registration (NAFDAC)", hint: "NAFDAC" },
      { id: "son-cert", label: "Product certification (SON / MANCAP)", hint: "SON" },
      { id: "trade-permit", label: "LGA trade / shop permit", hint: "LGA Revenue" },
      { id: "signage", label: "Signage / advertisement permit", hint: "State signage agency" },
    ],
  },
  {
    id: "civic",
    label: "Civic Documents",
    blurb: "Indigene, attestation, sworn declarations",
    icon: "civic",
    subcategories: [
      { id: "indigene", label: "Letter of Indigeneship", hint: "LGA Secretariat" },
      { id: "attestation", label: "Letter of attestation", hint: "Local authority / employer" },
      { id: "affidavit", label: "Sworn affidavit / declaration", hint: "Magistrate / High Court" },
      { id: "birth-cert", label: "Birth certificate (NPC)", hint: "National Population Commission" },
    ],
  },
  {
    id: "health",
    label: "Health & Practice",
    blurb: "Practice licences, facility approvals",
    icon: "health",
    subcategories: [
      { id: "mdcn", label: "Medical practising licence (MDCN)", hint: "Medical & Dental Council" },
      { id: "facility", label: "Health facility registration", hint: "State Ministry of Health" },
      { id: "pcn", label: "Pharmacy premises licence (PCN)", hint: "Pharmacists Council" },
    ],
  },
  {
    id: "import",
    label: "Import / Export",
    blurb: "Customs, NEPC, SON conformity",
    icon: "import",
    subcategories: [
      { id: "form-m", label: "Form M (import)", hint: "Nigeria Customs Service" },
      { id: "nxp", label: "NXP form (export)", hint: "CBN / Customs" },
      { id: "nepc", label: "NEPC exporter registration", hint: "Nigerian Export Promotion Council" },
      { id: "soncap", label: "SONCAP certificate (imports)", hint: "Standards Organisation of Nigeria" },
    ],
  },
];