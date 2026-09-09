// Genesoft Infotech CRM - Campaign Intake Criteria Templates & Types

export type QuestionInputType = "text" | "textarea" | "yes_no" | "date" | "number";

export interface CampaignQuestion {
  id: string;
  section: string;
  label: string;
  type: QuestionInputType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

export interface CampaignCriteria {
  campaignId: string;
  templateName: string;
  sections: string[];
  questions: CampaignQuestion[];
}

// 1. MVA (Motor Vehicle Accident) Gold-Standard Pre-Loaded Template
export const MVA_STANDARD_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-mva",
  templateName: "MVA (Motor Vehicle Accident)",
  sections: [
    "1. Accident & Incident Details",
    "2. Injuries, Symptoms & Vehicle Details",
    "3. Medical Treatment, Hospital & Doctor Information",
    "4. Police Report, Officer, Ambulance & Claim Numbers",
    "5. Legal Affirmation & Qualification Checklist",
  ],
  questions: [
    // Section 1: Accident & Incident Details
    {
      id: "accident_date_time",
      section: "1. Accident & Incident Details",
      label: "Can you confirm the year and month of the accident?",
      type: "text",
      required: true,
      placeholder: "e.g. September 09 2025 (3.20 PM)",
    },
    {
      id: "accident_place",
      section: "1. Accident & Incident Details",
      label: "Place of accident",
      type: "text",
      required: true,
      placeholder: "e.g. 30 W Winnemucca Blvd, Winnemucca, NV 89445",
    },
    {
      id: "at_fault",
      section: "1. Accident & Incident Details",
      label: "Who was AT FAULT for the accident? Did you receive a ticket?",
      type: "text",
      required: true,
      placeholder: "e.g. Other Party / No ticket received",
    },
    {
      id: "at_fault_had_insurance",
      section: "1. Accident & Incident Details",
      label: "Did the AT FAULT driver have Car insurance?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },

    // Section 2: Injuries, Symptoms & Vehicle Details
    {
      id: "were_you_injured",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Were you injured in the car accident?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "still_treating",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Are you still being treated for your injuries?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "symptoms",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Symptoms",
      type: "textarea",
      required: true,
      placeholder: "e.g. intense pain, Heavy swelling, bruising, Body Ache",
    },
    {
      id: "injury_locations",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Where were your injured?",
      type: "text",
      required: true,
      placeholder: "e.g. Left leg, Right Ankle, Left Hand, and elbow fracture",
    },
    {
      id: "vehicle_name",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Vehicle name",
      type: "text",
      required: true,
      placeholder: "e.g. 2005 Mazda 6",
    },
    {
      id: "client_had_insurance",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Did you have insurance at the time of the accident?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "insurance_company",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Insurance company",
      type: "text",
      required: true,
      placeholder: "e.g. Progressive Insurance Company",
    },
    {
      id: "uninsured_motorist_coverage",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Do you know if you have Uninsured Motorist coverage on policy?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },
    {
      id: "attorney_represented",
      section: "2. Injuries, Symptoms & Vehicle Details",
      label: "Have you hired or are you currently represented by an attorney?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },

    // Section 3: Medical Treatment, Hospital & Doctor Information
    {
      id: "tests_done",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Test",
      type: "text",
      required: true,
      placeholder: "e.g. X-rays, CT scans, and MRI scan",
    },
    {
      id: "went_to_hospital",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Did you go to the hospital, doctor, emergency room due to those injuries?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "hospital_name",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital",
      type: "text",
      required: true,
      placeholder: "e.g. Humboldt General Hospital",
    },
    {
      id: "hospital_address",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital address",
      type: "text",
      required: true,
      placeholder: "e.g. 118 E Haskell St, Winnemucca, NV 89445",
    },
    {
      id: "hospital_phone",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Hospital Phone",
      type: "text",
      required: true,
      placeholder: "e.g. (775) 623-5222",
    },
    {
      id: "days_hospitalized",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "How many day's in hospitalized",
      type: "text",
      required: true,
      placeholder: "e.g. 16 day's",
    },
    {
      id: "doctor_name",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Doctor",
      type: "text",
      required: true,
      placeholder: "e.g. Dr. Timothy Musick, MD",
    },
    {
      id: "doctor_designation",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Designation",
      type: "text",
      required: true,
      placeholder: "e.g. Orthopedic Surgeon",
    },
    {
      id: "treatments",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Treatments",
      type: "textarea",
      required: true,
      placeholder: "e.g. plaster, exercise , medications, physiotheraphy",
    },
    {
      id: "treatment_within_14_days",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "Did you received treatment for your injuries? (Must be 14 days from the accident)",
      type: "text",
      required: true,
      placeholder: "e.g. September 26 2025 (yes immediately I gone through X RAYS)",
    },
    {
      id: "last_treatment_date",
      section: "3. Medical Treatment, Hospital & Doctor Information",
      label: "When was the last time that you were treated for these injuries?",
      type: "text",
      required: true,
      placeholder: "e.g. Oct 06 2025",
    },

    // Section 4: Police Report, Officer, Ambulance & Claim Numbers
    {
      id: "ambulance_transport",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Did you get transported from the accident scene in an ambulance?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "has_accident_report",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Do you have accident report or incident report Number ?",
      type: "text",
      required: true,
      placeholder: "e.g. Yes I have it",
    },
    {
      id: "police_dept_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Department",
      type: "text",
      required: true,
      placeholder: "e.g. Winnemucca Police Department",
    },
    {
      id: "police_dept_address",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Dept Address",
      type: "text",
      required: true,
      placeholder: "e.g. 500 E Winnemucca Blvd, Winnemucca, NV 89445",
    },
    {
      id: "police_dept_phone",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Police Dept Phone",
      type: "text",
      required: true,
      placeholder: "e.g. (775) 623-6396",
    },
    {
      id: "officer_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Officer Name",
      type: "text",
      required: true,
      placeholder: "e.g. Officer Sean Wilkin",
    },
    {
      id: "badge_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Badge Number",
      type: "text",
      required: true,
      placeholder: "e.g. #7515",
    },
    {
      id: "ambulance_service_name",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Ambulance Services Provided Name",
      type: "text",
      required: true,
      placeholder: "e.g. HGH EMS Rescue",
    },
    {
      id: "complaint_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Complaint Number",
      type: "text",
      required: true,
      placeholder: "e.g. ODN-45-56942",
    },
    {
      id: "insurance_claim_number",
      section: "4. Police Report, Officer, Ambulance & Claim Numbers",
      label: "Insurance Claim Number",
      type: "text",
      required: true,
      placeholder: "e.g. CIO-78-986451",
    },

    // Section 5: Legal Affirmation & Qualification Checklist (Questions 1 to 7)
    {
      id: "legal_q1_attorney",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "1) Do you have an attorney or lawyer for this case?",
      type: "text",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q2_signed_docs",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "2) Did you sign any legal documents before my call regarding this claim ?",
      type: "text",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q3_medical_records",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "3) Do you have medical records with you ?",
      type: "text",
      required: true,
      placeholder: "e.g. They are at the hospital.",
    },
    {
      id: "legal_q4_records_permission",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "4) Do you give permission to the law firm to pull out your medical records from the hospital ?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "legal_q5_info_true",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "5) Is the information given by you true and matches with your medical records ?",
      type: "yes_no",
      required: true,
      defaultValue: "Yes",
    },
    {
      id: "legal_q6_coaching",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "6) Is there anyone trying to coach you, train you for getting this compensation ?",
      type: "yes_no",
      required: true,
      defaultValue: "No",
    },
    {
      id: "legal_q7_how_known",
      section: "5. Legal Affirmation & Qualification Checklist",
      label: "7) Then how did you come to know about the lawsuit ?",
      type: "text",
      required: true,
      placeholder: "e.g. I saw ads on Facebook",
    },
  ],
};

// 2. Slip & Fall / Premises Liability Template
export const SLIP_AND_FALL_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-slip-fall",
  templateName: "Slip & Fall (Premises Liability)",
  sections: [
    "1. Incident & Premises Details",
    "2. Hazard & Fall Conditions",
    "3. Medical & Hospital Care",
    "4. Incident Report & Witnesses",
    "5. Legal Affirmation Checklist",
  ],
  questions: [
    { id: "sf_date_time", section: "1. Incident & Premises Details", label: "Date and time of the fall", type: "text", required: true, placeholder: "e.g. August 14 2025 (2:15 PM)" },
    { id: "sf_location", section: "1. Incident & Premises Details", label: "Exact location / Store / Business name & address", type: "text", required: true, placeholder: "e.g. Walmart, 1200 Market St" },
    { id: "sf_hazard", section: "2. Hazard & Fall Conditions", label: "What caused you to fall? (Spill, ice, broken flooring, poor lighting)", type: "textarea", required: true, placeholder: "e.g. Liquid spill in aisle with no warning sign" },
    { id: "sf_warning_signs", section: "2. Hazard & Fall Conditions", label: "Were there any warning signs or cones present?", type: "yes_no", required: true, defaultValue: "No" },
    { id: "sf_injuries", section: "2. Hazard & Fall Conditions", label: "Where were you injured and what are your symptoms?", type: "textarea", required: true, placeholder: "e.g. Lower back pain, fractured wrist" },
    { id: "sf_hospital", section: "3. Medical & Hospital Care", label: "Hospital / Urgent care visited", type: "text", required: true, placeholder: "e.g. Metro Health ER" },
    { id: "sf_doctor", section: "3. Medical & Hospital Care", label: "Treating doctor and treatments received", type: "text", required: true, placeholder: "e.g. Dr. Patel - Cast & physical therapy" },
    { id: "sf_incident_report", section: "4. Incident Report & Witnesses", label: "Was an incident report filed with management on-site?", type: "yes_no", required: true, defaultValue: "Yes" },
    { id: "sf_report_number", section: "4. Incident Report & Witnesses", label: "Incident report number or manager name", type: "text", required: false, placeholder: "e.g. IR-89211" },
    { id: "sf_legal_q1", section: "5. Legal Affirmation Checklist", label: "Do you have an attorney for this claim?", type: "yes_no", required: true, defaultValue: "No" },
    { id: "sf_legal_q2", section: "5. Legal Affirmation Checklist", label: "Do you give permission to obtain incident photos and medical records?", type: "yes_no", required: true, defaultValue: "Yes" },
  ],
};

// 3. Workers' Compensation Template
export const WORKERS_COMP_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-workers-comp",
  templateName: "Workers' Compensation",
  sections: [
    "1. Employment & Notice Details",
    "2. Incident & Workplace Injury",
    "3. Medical Treatment & Restrictions",
    "4. Legal Affirmation Checklist",
  ],
  questions: [
    { id: "wc_employer", section: "1. Employment & Notice Details", label: "Employer company name & location", type: "text", required: true, placeholder: "e.g. Apex Logistics, Reno NV" },
    { id: "wc_job_title", section: "1. Employment & Notice Details", label: "Job title / duties when injured", type: "text", required: true, placeholder: "e.g. Warehouse Forklift Operator" },
    { id: "wc_reported_date", section: "1. Employment & Notice Details", label: "When was injury reported to supervisor?", type: "text", required: true, placeholder: "e.g. Same day / Next morning" },
    { id: "wc_supervisor_name", section: "1. Employment & Notice Details", label: "Supervisor name & title", type: "text", required: true, placeholder: "e.g. Dave Miller, Floor Lead" },
    { id: "wc_incident_desc", section: "2. Incident & Workplace Injury", label: "How did the injury occur?", type: "textarea", required: true, placeholder: "e.g. Heavy crate fell on shoulder" },
    { id: "wc_injuries", section: "2. Incident & Workplace Injury", label: "Injuries sustained", type: "text", required: true, placeholder: "e.g. Torn rotator cuff, cervical strain" },
    { id: "wc_clinic", section: "3. Medical Treatment & Restrictions", label: "Occupational clinic / Doctor visited", type: "text", required: true, placeholder: "e.g. Concentra Urgent Care" },
    { id: "wc_work_status", section: "3. Medical Treatment & Restrictions", label: "Current work status (Off work, light duty, full duty)", type: "text", required: true, placeholder: "e.g. Off work by doctor orders" },
    { id: "wc_legal_q1", section: "4. Legal Affirmation Checklist", label: "Do you already have a workers' comp lawyer?", type: "yes_no", required: true, defaultValue: "No" },
  ],
};

// 4. General Personal Injury Template
export const PERSONAL_INJURY_TEMPLATE: CampaignCriteria = {
  campaignId: "preset-pi",
  templateName: "General Personal Injury",
  sections: [
    "1. Incident Overview",
    "2. Injuries & Ongoing Symptoms",
    "3. Medical Treatment & Facility",
    "4. Legal Affirmation",
  ],
  questions: [
    { id: "pi_date", section: "1. Incident Overview", label: "Date and location of incident", type: "text", required: true, placeholder: "e.g. July 2025, Las Vegas NV" },
    { id: "pi_type", section: "1. Incident Overview", label: "Type of incident (Product defect, dog bite, assault, general)", type: "text", required: true, placeholder: "e.g. Defective equipment" },
    { id: "pi_injuries", section: "2. Injuries & Ongoing Symptoms", label: "Specific bodily injuries & pain levels", type: "textarea", required: true, placeholder: "e.g. Severe burns, nerve damage" },
    { id: "pi_treatment", section: "3. Medical Treatment & Facility", label: "Hospitals, surgeries or therapy received", type: "textarea", required: true, placeholder: "e.g. Valley Hospital, 2 surgeries" },
    { id: "pi_legal_q1", section: "4. Legal Affirmation", label: "Are you represented by an attorney?", type: "yes_no", required: true, defaultValue: "No" },
  ],
};
