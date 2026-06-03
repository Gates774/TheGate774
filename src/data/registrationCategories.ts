export interface RegistrationSubcategory {
  id: string;
  label: string;
  hint: string;
}

export interface RegistrationCategory {
  id: string;
  label: string;
  blurb: string;
  icon:
    | "identity"
    | "voter"
    | "vital"
    | "tax"
    | "social"
    | "health"
    | "education"
    | "business"
    | "property"
    | "professional";
  subcategories: RegistrationSubcategory[];
}

export const REGISTRATION_CATEGORIES: RegistrationCategory[] = [
  {
    id: "identity",
    label: "National Identity",
    blurb: "NIN, BVN, SIM linkage",
    icon: "identity",
    subcategories: [
      { id: "nin", label: "NIN enrolment (new)", hint: "NIMC" },
      { id: "nin-update", label: "NIN modification / update", hint: "NIMC" },
      { id: "bvn", label: "BVN enrolment", hint: "CBN / your bank" },
      { id: "sim", label: "SIM–NIN linkage", hint: "NCC / mobile network" },
    ],
  },
  {
    id: "voter",
    label: "Voter & Civic",
    blurb: "PVC, transfer of registration",
    icon: "voter",
    subcategories: [
      { id: "pvc-new", label: "New voter registration (PVC)", hint: "INEC CVR" },
      { id: "pvc-transfer", label: "Transfer of voter registration", hint: "INEC" },
      { id: "pvc-replace", label: "PVC replacement (lost / damaged)", hint: "INEC LGA office" },
      { id: "party-member", label: "Political party membership", hint: "Registered political party" },
    ],
  },
  {
    id: "vital",
    label: "Vital Records",
    blurb: "Births, marriages, deaths",
    icon: "vital",
    subcategories: [
      { id: "birth", label: "Birth registration (NPC)", hint: "National Population Commission" },
      { id: "death", label: "Death registration", hint: "NPC / LGA registry" },
      { id: "marriage-court", label: "Court / Registry marriage", hint: "Marriage Registry" },
      { id: "marriage-customary", label: "Customary marriage registration", hint: "LGA Marriage Registry" },
    ],
  },
  {
    id: "tax",
    label: "Tax & Pension",
    blurb: "TIN, RSA (pension), NHF",
    icon: "tax",
    subcategories: [
      { id: "tin-individual", label: "Personal TIN", hint: "JTB / State IRS" },
      { id: "rsa", label: "RSA (Retirement Savings Account)", hint: "PenCom / PFA" },
      { id: "nhf", label: "National Housing Fund (NHF)", hint: "FMBN" },
    ],
  },
  {
    id: "social",
    label: "Social Register",
    blurb: "National Social Register, N-Power",
    icon: "social",
    subcategories: [
      { id: "nsr", label: "National Social Register (NSR)", hint: "NASSCO / State Operations Coord. Unit" },
      { id: "n-power", label: "N-Power enrolment", hint: "Ministry of Humanitarian Affairs" },
      { id: "npower-cash", label: "Conditional Cash Transfer enrolment", hint: "NCTO" },
    ],
  },
  {
    id: "health",
    label: "Health Schemes",
    blurb: "NHIA, state health insurance",
    icon: "health",
    subcategories: [
      { id: "nhia", label: "NHIA enrolment", hint: "National Health Insurance Authority" },
      { id: "state-hia", label: "State Health Insurance Scheme", hint: "State Contributory Health Agency" },
      { id: "vaccine", label: "Routine immunisation enrolment", hint: "NPHCDA via PHC" },
    ],
  },
  {
    id: "education",
    label: "Education & Exams",
    blurb: "JAMB profile, NYSC, school enrolment",
    icon: "education",
    subcategories: [
      { id: "jamb-profile", label: "JAMB e-Facility profile", hint: "JAMB" },
      { id: "nysc-profile", label: "NYSC pre-mobilisation profile", hint: "NYSC" },
      { id: "public-school", label: "Public primary / secondary enrolment", hint: "State Ministry of Education" },
    ],
  },
  {
    id: "business",
    label: "Business & MSME",
    blurb: "CAC, SMEDAN, trader registers",
    icon: "business",
    subcategories: [
      { id: "cac-bn", label: "Business Name registration (CAC)", hint: "Corporate Affairs Commission" },
      { id: "cac-ltd", label: "Limited company registration (CAC)", hint: "Corporate Affairs Commission" },
      { id: "smedan", label: "SMEDAN MSME registration", hint: "SMEDAN" },
      { id: "ngo", label: "NGO / association registration", hint: "CAC Part F" },
    ],
  },
  {
    id: "property",
    label: "Property & Vehicle",
    blurb: "Vehicle, land, deed registration",
    icon: "property",
    subcategories: [
      { id: "vehicle", label: "Vehicle registration", hint: "FRSC / State VIO" },
      { id: "deed", label: "Deed of Assignment registration", hint: "State Lands Registry" },
      { id: "title-perfect", label: "Title perfection (Governor's consent)", hint: "State Lands Bureau" },
    ],
  },
  {
    id: "professional",
    label: "Professional Bodies",
    blurb: "NMA, NBA, COREN, ICAN…",
    icon: "professional",
    subcategories: [
      { id: "nma", label: "Medical & Dental Council (MDCN)", hint: "MDCN" },
      { id: "nba", label: "Nigerian Bar Association (NBA)", hint: "NBA" },
      { id: "coren", label: "Council for Regulation of Engineering (COREN)", hint: "COREN" },
      { id: "ican", label: "Accountancy body (ICAN / ANAN)", hint: "ICAN / ANAN" },
    ],
  },
];