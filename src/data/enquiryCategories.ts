export interface EnquirySubcategory {
  id: string;
  label: string;
  hint: string;
}

export interface EnquiryCategory {
  id: string;
  label: string;
  blurb: string;
  icon:
    | "rights"
    | "procedures"
    | "status"
    | "documents"
    | "education"
    | "health"
    | "tax"
    | "elections"
    | "land"
    | "benefits";
  subcategories: EnquirySubcategory[];
}

export const ENQUIRY_CATEGORIES: EnquiryCategory[] = [
  {
    id: "rights",
    label: "Your Rights",
    blurb: "Constitutional rights, fair hearing, legal aid",
    icon: "rights",
    subcategories: [
      { id: "fundamental", label: "Fundamental human rights", hint: "Chapter IV of the 1999 Constitution" },
      { id: "fair-hearing", label: "Right to fair hearing", hint: "Police, court & administrative bodies" },
      { id: "legal-aid", label: "Free legal aid eligibility", hint: "Legal Aid Council of Nigeria" },
      { id: "foia", label: "Freedom of Information (FOIA 2011)", hint: "Request public records" },
    ],
  },
  {
    id: "procedures",
    label: "How-to & Procedures",
    blurb: "Step-by-step on any government process",
    icon: "procedures",
    subcategories: [
      { id: "complaint-route", label: "How to lodge a complaint", hint: "Right office, right format" },
      { id: "appeal", label: "How to appeal a government decision", hint: "Administrative & court routes" },
      { id: "petition", label: "How to write a petition", hint: "To the Assembly, EFCC, ICPC, etc." },
      { id: "court", label: "How to access state / magistrate courts", hint: "Filing, fees, representation" },
    ],
  },
  {
    id: "status",
    label: "Status & Tracking",
    blurb: "Check progress of an existing case or application",
    icon: "status",
    subcategories: [
      { id: "nin-status", label: "NIN registration status", hint: "NIMC enrolment / modification" },
      { id: "passport-status", label: "Passport application status", hint: "Nigeria Immigration Service" },
      { id: "jamb-status", label: "JAMB / admission status", hint: "UTME, post-UTME" },
      { id: "complaint-status", label: "Status of a filed complaint / petition", hint: "EFCC, ICPC, PSC, NHRC" },
    ],
  },
  {
    id: "documents",
    label: "Documents & IDs",
    blurb: "What you need, where to get it, what it costs",
    icon: "documents",
    subcategories: [
      { id: "birth-cert", label: "Birth certificate requirements", hint: "NPC / LGA registry" },
      { id: "indigene-letter", label: "Letter of Indigeneship process", hint: "LGA Secretariat" },
      { id: "pcc", label: "Police Character Certificate", hint: "Nigeria Police Force" },
      { id: "drivers", label: "Driver's licence renewal", hint: "FRSC / VIO" },
    ],
  },
  {
    id: "education",
    label: "Education & Schools",
    blurb: "Admissions, certifications, accreditations",
    icon: "education",
    subcategories: [
      { id: "school-fees", label: "Public school fees & enrolment", hint: "State Ministry of Education" },
      { id: "waec-neco", label: "WAEC / NECO result verification", hint: "Examination bodies" },
      { id: "scholarship-info", label: "Scholarship eligibility & deadlines", hint: "Federal / State / LGA" },
      { id: "school-accred", label: "School / university accreditation", hint: "NUC, NBTE, NCCE" },
    ],
  },
  {
    id: "health",
    label: "Health Services",
    blurb: "Insurance, vaccines, free care entitlements",
    icon: "health",
    subcategories: [
      { id: "nhia-info", label: "NHIA coverage & enrolment", hint: "National Health Insurance" },
      { id: "free-care", label: "Free maternal & child care", hint: "State PHC Board" },
      { id: "vaccine-info", label: "Vaccine schedule & access", hint: "NPHCDA via local PHC" },
      { id: "drug-safety", label: "Drug & food safety enquiries", hint: "NAFDAC" },
    ],
  },
  {
    id: "tax",
    label: "Tax & Revenue",
    blurb: "TIN, PAYE, VAT, land-use charge",
    icon: "tax",
    subcategories: [
      { id: "tin", label: "How to get a TIN", hint: "FIRS / Joint Tax Board" },
      { id: "paye", label: "PAYE & State income tax", hint: "State IRS" },
      { id: "vat", label: "VAT obligations for small business", hint: "FIRS" },
      { id: "land-charge", label: "Land use charge / tenement rate", hint: "State / LGA revenue" },
    ],
  },
  {
    id: "elections",
    label: "Elections & Civic Life",
    blurb: "Voting, PVC, transfer, observation",
    icon: "elections",
    subcategories: [
      { id: "pvc-collect", label: "PVC collection & transfer", hint: "INEC" },
      { id: "voter-register", label: "Voter registration windows", hint: "INEC CVR" },
      { id: "candidate-info", label: "How to verify a candidate", hint: "INEC / political parties" },
      { id: "observers", label: "Becoming an election observer", hint: "Accredited civil society" },
    ],
  },
  {
    id: "land",
    label: "Land & Housing",
    blurb: "Titles, surveys, allocations, planning",
    icon: "land",
    subcategories: [
      { id: "c-of-o-info", label: "C of O process & timeline", hint: "State Lands Bureau" },
      { id: "survey", label: "Land survey & perimeter", hint: "Office of the Surveyor-General" },
      { id: "fha-info", label: "FHA housing eligibility", hint: "Federal Housing Authority" },
      { id: "planning", label: "Building approval & planning", hint: "State / LGA planning authority" },
    ],
  },
  {
    id: "benefits",
    label: "Benefits & Pensions",
    blurb: "Social register, pensions, gratuities",
    icon: "benefits",
    subcategories: [
      { id: "social-register", label: "National Social Register", hint: "NASSCO / Humanitarian Affairs" },
      { id: "pension", label: "Pension (RSA) enquiries", hint: "PenCom / PFA" },
      { id: "gratuity", label: "Gratuity & retirement benefits", hint: "Civil service" },
      { id: "widow-elderly-info", label: "Widow & elderly support eligibility", hint: "Humanitarian Affairs" },
    ],
  },
];