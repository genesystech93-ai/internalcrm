// Utilities for Closer Campaign Intake parsing and Client Submission formatting

export function parseIntakeAnswers(notes?: string | null): Record<string, string> {
  if (!notes) return {};
  try {
    if (notes.includes("=== CLOSER INTAKE CASE FACTS ===")) {
      const match = notes.match(/=== CLOSER INTAKE CASE FACTS ===\n([\s\S]*?)(?:\n\n=== GENERAL NOTES ===|$)/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
    } else if (notes.trim().startsWith("{") && notes.trim().endsWith("}")) {
      return JSON.parse(notes);
    }
  } catch {
    // Ignore parse error
  }
  return {};
}

export function formatClientSubmissionScript(
  lead: {
    customerName: string;
    mobile: string;
    address: string;
    email: string;
    dob: string;
    campaignName?: string;
  },
  intakeAnswers: Record<string, string>
): string {
  const cName = lead.campaignName || "MVA (Motor vehicle accident)";
  const dobFormatted = lead.dob ? new Date(lead.dob).toLocaleDateString("en-US") : "N/A";

  const lines: string[] = [
    `Case Name:-${cName}`,
    ``,
    `Name:- ${lead.customerName}`,
    `Phone:-  ${lead.mobile}`,
    `Address:- ${lead.address}`,
    `Email:-  ${lead.email}`,
    `DOB:- ${dobFormatted}`,
    `Gender:- ${intakeAnswers["gender"] || "Not specified"}`,
    ``,
    `Can you confirm the year and month of the accident?:- ${intakeAnswers["accident_date_time"] || "N/A"}`,
    `Place of accident :- ${intakeAnswers["accident_place"] || "N/A"}`,
    `Were you injured in the car accident :- ${intakeAnswers["were_you_injured"] || "Yes"}`,
    `Are you still being treated for your injuries? :-${intakeAnswers["still_treating"] || "Yes"}`,
    ``,
    `Symptoms:- ${intakeAnswers["symptoms"] || "N/A"}`,
    ``,
    `Who was AT FAULT for the accident? Did you receive a ticket?:- ${intakeAnswers["at_fault"] || "Other Party"}`,
    `Did you have insurance at the time of the accident?:- ${intakeAnswers["client_had_insurance"] || "Yes"}`,
    `Have you hired or are you currently represented by an attorney?:- ${intakeAnswers["attorney_represented"] || "No"}`,
    ``,
    `Vehicle name:-  ${intakeAnswers["vehicle_name"] || "N/A"}`,
    `Insurance company :- ${intakeAnswers["insurance_company"] || "N/A"}`,
    `Do you know if you have Uninsured Motorist coverage on policy?:- ${intakeAnswers["uninsured_motorist_coverage"] || "No"}`,
    `Did the AT FAULT driver have Car insurance?:- ${intakeAnswers["at_fault_had_insurance"] || "Yes"}`,
    ``,
    `Test:- ${intakeAnswers["tests_done"] || "X-rays, CT scans, and MRI scan"}`,
    `Did you go to the hospital, doctor, emergency room due to those injuries? ${intakeAnswers["went_to_hospital"] || "Yes"}`,
    ``,
    `Hospital: ${intakeAnswers["hospital_name"] || "N/A"}`,
    `Hospital address: ${intakeAnswers["hospital_address"] || "N/A"}`,
    `Hospital Phone: ${intakeAnswers["hospital_phone"] || "N/A"}`,
    `How many day's in hospitalized: ${intakeAnswers["days_hospitalized"] || "N/A"}`,
    ``,
    `Doctor: ${intakeAnswers["doctor_name"] || "N/A"}`,
    `Designation: ${intakeAnswers["doctor_designation"] || "Orthopedic Surgeon"}`,
    ``,
    `Treatments:- ${intakeAnswers["treatments"] || "N/A"}`,
    ``,
    `Did you received treatment for your injuries? (Must be 14 days from the accident):- ${intakeAnswers["treatment_within_14_days"] || "N/A"}`,
    `When was the last time that you were treated for these injuries?: ${intakeAnswers["last_treatment_date"] || "N/A"}`,
    ``,
    `Where were your injured?: ${intakeAnswers["injury_locations"] || "N/A"}`,
    `Did you get transported from the accident scene in an ambulance?:- ${intakeAnswers["ambulance_transport"] || "Yes"}`,
    `Do you have accident report or incident report Number ?:- ${intakeAnswers["has_accident_report"] || "Yes I have it"}`,
    ``,
    `Police Department: ${intakeAnswers["police_dept_name"] || "N/A"}`,
    `Address: ${intakeAnswers["police_dept_address"] || "N/A"}`,
    `Phone: ${intakeAnswers["police_dept_phone"] || "N/A"}`,
    ``,
    `Officer Name: ${intakeAnswers["officer_name"] || "N/A"}`,
    `Badge Number: ${intakeAnswers["badge_number"] || "N/A"}`,
    ``,
    `Ambulance Services Provided Name: ${intakeAnswers["ambulance_service_name"] || "N/A"}`,
    `Complaint Number: ${intakeAnswers["complaint_number"] || "N/A"}`,
    `Insurance Claim Number: ${intakeAnswers["insurance_claim_number"] || "N/A"}`,
    ``,
    `1) Do you have an attorney or lawyer for this case?`,
    ` ${intakeAnswers["legal_q1_attorney"] || "No"}`,
    ``,
    ` 2) Did you sign any legal documents before my call regarding this claim ?`,
    ` ${intakeAnswers["legal_q2_signed_docs"] || "No"}`,
    ``,
    ` 3) Do you have medical records with you ?`,
    ` ${intakeAnswers["legal_q3_medical_records"] || "They are at the hospital."}`,
    ``,
    ` 4) Do you give permission to the law firm to pull out your medical records from the hospital ?`,
    ` ${intakeAnswers["legal_q4_records_permission"] || "Yes"}`,
    ``,
    ` 5) Is the information given by you true and matches with your medical records ?`,
    ` ${intakeAnswers["legal_q5_info_true"] || "Yes"}`,
    ``,
    ` 6) Is there anyone trying to coach you, train you for getting this compensation ?`,
    ` ${intakeAnswers["legal_q6_coaching"] || "No"}`,
    ``,
    ` 7) Then how did you come to know about the lawsuit ?`,
    ` ${intakeAnswers["legal_q7_how_known"] || "I saw ads on Facebook"}`,
  ];

  return lines.join("\n");
}
