// ───── Medical Billing & Coding Knowledge Base ─────
// Used by the AI call assistant to answer provider questions during calls
export const billingKnowledgeBase = [
    {
        topic: 'CPT Code 99214',
        keywords: ['99214', 'established patient', 'moderate', 'e&m'],
        answer: 'CPT 99214 is for an established patient office visit requiring a medically appropriate history and/or examination and moderate level of medical decision making. Total time typically 25-29 minutes. Documentation must support at least 2 out of 3 key components: history, exam, or MDM at moderate level. Reimbursement approximately $110-130 depending on payer.',
    },
    {
        topic: 'CPT Code 99213',
        keywords: ['99213', 'established patient', 'low', 'e&m'],
        answer: 'CPT 99213 is for an established patient visit with low level of medical decision making. Total time typically 20-24 minutes. Requires 2 out of 3: expanded problem-focused history, expanded problem-focused exam, low complexity MDM. Reimbursement approximately $75-95.',
    },
    {
        topic: 'ICD-10 Coding',
        keywords: ['icd-10', 'diagnosis code', 'specificity'],
        answer: 'ICD-10-CM codes must be coded to the highest level of specificity available. For example, E11.9 (Type 2 diabetes without complications) should be specified further if complications exist. Always code documented conditions, not just symptoms when an definitive diagnosis is established. Sequence principal diagnosis first.',
    },
    {
        topic: 'Denial Management',
        keywords: ['denial', 'appeal', 'rejected', 'claim denied'],
        answer: 'Common denial reasons: 1) Missing or invalid CPT/HCPCS code — verify code matches documentation. 2) Medical necessity — submit relevant clinical notes and test results. 3) Timely filing — file within 90-180 days of service. 4) Coordination of benefits — verify primary vs secondary insurance. Appeal timeline: most payers allow 30-180 days for appeal. Submit a written appeal letter with medical records and supporting documentation.',
    },
    {
        topic: 'Modifier 25',
        keywords: ['modifier 25', 'significant separately identifiable', 'e&m and procedure'],
        answer: 'Modifier 25 is appended to an E&M code when a significant, separately identifiable E&M service is performed by the same physician on the same day as a procedure. Documentation must clearly describe both the E&M service and the procedure separately. Common audits target this modifier — ensure distinct documentation for each service.',
    },
    {
        topic: 'Modifier 59',
        keywords: ['modifier 59', 'distinct procedural', 'separate session'],
        answer: 'Modifier 59 indicates a distinct procedural service. Use when procedures are performed at different anatomical sites, separate sessions, or different procedures. CMS recommends using X{EPSU} modifiers instead of 59 when possible: XE (separate encounter), XS (separate structure), XP (separate practitioner), XU (unusual non-overlapping).',
    },
    {
        topic: 'Medicare Billing',
        keywords: ['medicare', 'part b', 'mcr', 'cms-1500'],
        answer: 'Medicare Part B claims are submitted on CMS-1500 form or electronically via 837P. NPI of rendering provider is required. Medicare is secondary to other insurance if patient is still working. PAR providers accept Medicare assignment. Non-PAR providers may charge up to 115% of the fee schedule. MIPS reporting affects reimbursement rates.',
    },
    {
        topic: 'Medicaid Billing',
        keywords: ['medicaid', 'state program', 'dual eligible'],
        answer: 'Medicaid billing varies by state. Most states use CMS-1500 or 837P. For dual-eligible patients (Medicare + Medicaid), Medicare pays first, then Medicaid as secondary. Verify eligibility before each visit. Some services require prior authorization. TCN (Transaction Control Number) is used for claim tracking.',
    },
    {
        topic: 'Prior Authorization',
        keywords: ['prior authorization', 'pre-auth', 'precertification'],
        answer: 'Prior authorization (PA) is required for many specialty services, DME, and high-cost medications. Submit PA requests with supporting clinical documentation. Typical turnaround: 3-14 days. Expedited requests available for urgent cases (24-72 hours). Track PA numbers and expiration dates. Services rendered without required PA may be denied entirely.',
    },
    {
        topic: 'Revenue Cycle Management',
        keywords: ['rcm', 'revenue cycle', 'billing cycle', 'claim lifecycle'],
        answer: 'Revenue cycle stages: 1) Patient registration and insurance verification. 2) Charge capture and coding. 3) Claim submission (within 24-48 hours of service). 4) Payment posting and reconciliation. 5) Denial management and appeals. 6) Patient billing and collections. Average days in A/R target: 30-45 days. Clean claim rate target: 95%+. First-pass resolution rate target: 85%+.',
    },
    {
        topic: 'Telehealth Billing',
        keywords: ['telehealth', 'telemedicine', 'virtual visit', 'audio-only'],
        answer: 'Telehealth E&M codes use place of service 02. Use modifier 95 for synchronous telehealth. Audio-only visits use modifier 93. Medicare pays telehealth at the same rate as in-person through 2024. Private payer policies vary widely. Document the telehealth platform used and patient consent. Originating site fees may apply for facility-based telehealth.',
    },
    {
        topic: 'E&M Coding Changes',
        keywords: ['e&m', 'evaluation and management', '1995', '2021', 'mdm', 'time-based'],
        answer: '2023 E&M guidelines: For office/outpatient visits, code selection is based on MDM or total time. History and exam are no longer key components for code level — document what is medically appropriate. Time includes both face-to-face and non-face-to-face time on the date of service. Prolonged services use modifier 99417 or G2212.',
    },
    {
        topic: 'Workers Compensation',
        keywords: ['workers comp', 'workers compensation', 'wc', 'l&i'],
        answer: 'Workers compensation billing uses specific forms depending on state (e.g., CMS-1500 with WC modifier, state-specific forms). Use diagnosis code from the accident/injury. Bill the WC carrier directly. Some states have fee schedules. Lost wages and disability require separate forms. Medical records must clearly link treatment to the workplace injury.',
    },
    {
        topic: 'HCPCS Codes',
        keywords: ['hcpcs', 'j code', 'c code', 'g code', 'q code'],
        answer: 'HCPCS Level II codes are used for supplies, equipment, drugs, and services not covered by CPT. J-codes (J0120-J9999) are for drugs administered. G-codes are temporary Medicare codes. Q-codes are temporary codes for services/supplies. C-codes are for hospital outpatient use. Ensure NDC number is included for drug claims when required.',
    },
    {
        topic: 'Claim Resubmission',
        keywords: ['resubmit', 'corrected claim', 'replacement', 'void'],
        answer: 'To correct a submitted claim: Use the claim adjustment reason code and the appropriate frequency code. For 837P: use frequency code 7 (replacement) to correct a paid claim. Use frequency code 8 (void) to cancel an entire claim. Include the original ICN/DCN. For paper: write CORRECTED CLAIM on the CMS-1500 or use the red "VOID" stamp. Timely filing limits apply.',
    },
    {
        topic: 'NPI',
        keywords: ['npi', 'national provider identifier', 'type 1', 'type 2'],
        answer: 'NPI is a 10-digit identifier. Type 1 NPI is for individual providers. Type 2 NPI is for organizations. Providers must use their own NPI, not the group NPI, for services rendered. The NPI replaced UPIN and PIN. Taxonomy codes indicate specialty. Medicare requires NPI on all claims. Check NPPES database for NPI validation.',
    },
    {
        topic: 'Superbill',
        keywords: ['superbill', 'encounter form', 'charge slip'],
        answer: 'A superbill is the source document for medical billing. It includes: patient demographics, date of service, CPT codes, ICD-10 codes, modifiers, rendering provider NPI, referring provider if applicable, and place of service. The superbill must be signed by the provider. It serves as the basis for claim generation. Retain superbills for 7 years (or as required by state law).',
    },
    {
        topic: 'Coordination of Benefits',
        keywords: ['cob', 'coordination of benefits', 'primary insurance', 'secondary insurance'],
        answer: 'CoB determines which insurance pays first. For a child: birthday rule — the parent whose birthday comes first in the calendar year has primary insurance. For an employed spouse: the patient\'s employer is primary. Medicare is primary for patients 65+ with employer coverage if employer has fewer than 20 employees. COB claims require the primary payer\'s EOB/Remittance Advice.',
    },
    {
        topic: 'Claim Timely Filing',
        keywords: ['timely filing', 'filing limit', 'deadline', '90 days', '180 days'],
        answer: 'Medicare: 12 months from date of service (except for crossover claims). Most private insurers: 90-180 days from date of service. Medicaid: varies by state (typically 90-365 days). Workers comp: varies by state. File appeals within the payer\'s timely filing limit for corrected/replacement claims. Set up internal tracking to submit claims within 48 hours of service.',
    },
    {
        topic: 'Appeal Process',
        keywords: ['appeal process', 'level 1 appeal', 'redetermination', 'reconsideration'],
        answer: 'Medicare 5-level appeal process: Level 1: Redetermination by the MAC (120 days). Level 2: Reconsideration by QIC (180 days). Level 3: ALJ hearing (60 days from QIC decision). Level 4: Medicare Appeals Council review. Level 5: Federal District Court. For private payers, follow their specific appeal process. Include a cover letter, copy of the original claim, medical records, and any supporting documentation. Track all appeal deadlines.',
    },
    {
        topic: 'Coding Audit',
        keywords: ['audit', 'coding audit', 'compliance', 'oig', 'rAC'],
        answer: 'RAC (Recovery Audit Contractors) review Medicare claims for improper payments. Common targets: evaluation and management coding, medical necessity, inpatient vs observation status, DRG coding. Maintain a compliance plan. Conduct internal audits quarterly. OIG work plan lists annual focus areas. Document medical necessity thoroughly. Use AHIMA or AAPC certified coders.',
    },
    {
        topic: 'Place of Service Codes',
        keywords: ['pos', 'place of service', 'facility', 'non-facility'],
        answer: 'Common POS codes: 11 = Office, 22 = Outpatient hospital, 21 = Inpatient hospital, 23 = Emergency room, 24 = Ambulatory surgical center, 31 = Skilled nursing facility, 32 = Nursing facility, 61 = Inpatient rehab, 81 = Independent lab, 02 = Telehealth. POS affects reimbursement significantly — facility vs non-facility rates differ by 20-50% for the same CPT code.',
    },
    {
        topic: 'Accounts Receivable Management',
        keywords: ['accounts receivable', 'a/r', 'aging', 'collection'],
        answer: 'Manage A/R by aging buckets: 0-30 days (current), 31-60 days, 61-90 days, 91-120 days, 120+ days. Follow up on claims over 30 days. Submit appeals within timely filing limits. Consider a third-party collection agency for accounts over 120 days. Write off accounts only after exhausting all appeal options. Monitor A/R days and clean claim rate monthly.',
    },
    {
        topic: 'HIPAA Compliance',
        keywords: ['hipaa', 'privacy', 'security', 'phi', 'breach'],
        answer: 'HIPAA requires: Notice of Privacy Practices, patient authorization for disclosures (except for TPO), minimum necessary standard, administrative/physical/technical safeguards for ePHI, breach notification within 60 days, Business Associate Agreements with vendors. Conduct annual risk assessments. Train all staff on HIPAA annually. Penalties up to $1.5M per violation category per year.',
    },
    {
        topic: 'Evaluation and Management Time',
        keywords: ['time-based', 'total time', 'counseling', 'coordination of care'],
        answer: 'For time-based E&M coding, total time on the date of service includes: preparing to see the patient (reviewing charts), obtaining/reviewing history, exam, counseling, ordering meds/tests, documenting in the medical record, communicating results to the patient/family, and coordinating care. For established patients: 99211 (10 min), 99212 (20 min), 99213 (30 min), 99214 (40 min), 99215 (55 min). More than 50% of the visit must be spent in counseling/coordination of care for time-based coding.',
    },
];
export function findBillingAnswer(query) {
    const lower = query.toLowerCase();
    const results = [];
    for (const item of billingKnowledgeBase) {
        let relevance = 0;
        for (const kw of item.keywords) {
            if (lower.includes(kw))
                relevance++;
        }
        const words = lower.split(/\s+/);
        for (const w of words) {
            if (w.length > 3 && (item.topic.toLowerCase().includes(w) || item.answer.toLowerCase().includes(w))) {
                relevance += 0.5;
            }
        }
        if (relevance > 0) {
            results.push({ topic: item.topic, answer: item.answer, relevance });
        }
    }
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
}
export const specialtyObjections = {
    Cardiology: {
        valueProps: [
            'Reduce echo billing denials by proper documentation support',
            'Optimize stent and catheterization coding',
            'Stress test medical necessity justification templates',
            'Heart failure DRG optimization for inpatient stays',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'Many cardiology practices use us as a secondary audit partner — we typically find 5-8% in missed revenue from echo and stress test denials alone. Would a free 30-day audit make sense?' },
            { objection: 'Too expensive', response: 'We offer a free denial audit first. If we do not identify savings, there is no cost. Our cardiology clients see an average 22% reduction in denials within 60 days.' },
            { objection: 'We handle billing in-house', response: 'Understood. Many in-house teams benefit from our denial management and coding audit services on a per-claim basis with no long-term commitment.' },
            { objection: 'Not interested right now', response: 'I understand. Would it be alright if I send you our monthly cardiology billing compliance report? It covers Medicare changes and denial trends specific to cardiology.' },
        ],
        commonPainPoints: ['Echo billing denials', 'Stent and catheterization coding', 'Stress test medical necessity', 'Modifier 26 and TC billing', 'Heart failure DRG coding'],
    },
    'Orthopedic Surgery': {
        valueProps: [
            'Modifier 25 and 59 audit support for surgical practices',
            'ASC vs hospital outpatient coding optimization',
            'Knee and hip replacement DRG optimization',
            'Physical therapy billing compliance',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'Orthopedic surgery has some of the highest audit risks. Our compliance review catches modifier and bundling issues that most billing services miss.' },
            { objection: 'Too expensive', response: 'We start with a free surgical coding audit — typically we find 3-5% in under-coded procedures.' },
        ],
        commonPainPoints: ['Modifier 25 audits', 'ASC billing rules', 'Global period management', 'Physical therapy caps', 'Workers comp billing'],
    },
    'Family Medicine': {
        valueProps: [
            'E&M coding optimization under 2023 guidelines',
            'Preventive vs diagnostic visit separation',
            'Immunization administration coding',
            'Chronic care management billing',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'Family medicine has the highest E&M coding variation. Our audit typically finds 10-15% of visits are under-coded by one level.' },
            { objection: 'Not interested', response: 'No problem. May I send you our free E&M coding guide for 2024? It covers the latest MDM and time-based changes.' },
        ],
        commonPainPoints: ['E&M coding levels', 'Preventive vs diagnostic', 'CCM billing', 'Immunization codes', 'Medicare wellness visits'],
    },
    Dermatology: {
        valueProps: [
            'Biopsy and excision coding optimization',
            'Mohs surgery billing compliance',
            'Destruction of lesion coding',
            'Pathology billing integration',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'Dermatology has unique Mohs and pathology billing requirements. Our specialists ensure every layer and lesion is coded correctly.' },
        ],
        commonPainPoints: ['Mohs surgery coding', 'Pathology billing', 'Destruction codes', 'Biopsy site identification', 'Phototherapy billing'],
    },
    Neurology: {
        valueProps: [
            'EMG and nerve conduction study coding',
            'EEG interpretation billing',
            'Neurological injection coding (Botox, nerve blocks)',
            'Cognitive assessment and dementia coding',
        ],
        objections: [
            { objection: 'Coding is too complex for our specialty', response: 'That is exactly why neurologists work with us. EMG, EEG, and injection coding have specific documentation requirements we handle end-to-end.' },
        ],
        commonPainPoints: ['EMG/NCS coding', 'EEG billing', 'Botox injection coding', 'Cognitive testing', 'Headache management billing'],
    },
    'Internal Medicine': {
        valueProps: [
            'Risk adjustment coding for Medicare Advantage',
            'Chronic condition management billing',
            'Preventive service coding',
            'Care coordination and transitional care management',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'Internal medicine has significant RAF score opportunities. Our risk adjustment coding review typically identifies 8-12% in under-documented conditions.' },
        ],
        commonPainPoints: ['Risk adjustment coding', 'Chronic care management', 'Transitional care management', 'Advanced care planning', 'Preventive service billing'],
    },
    'Radiation Oncology': {
        valueProps: [
            'Complex radiation treatment planning coding',
            'IMRT, SBRT, and proton therapy billing',
            'Physics consultation and special procedure coding',
            'Fractionation and treatment management optimization',
        ],
        objections: [],
        commonPainPoints: ['Treatment planning codes', 'IMRT/SBRT billing', 'Physics consults', 'Fractionation documentation', 'Modifier usage'],
    },
    Urology: {
        valueProps: [
            'Cystoscopy and urologic procedure coding',
            'Urodynamic study billing',
            'Prostate biopsy and treatment coding',
            'Stone management procedure optimization',
        ],
        objections: [],
        commonPainPoints: ['Cystoscopy coding', 'Urodynamics billing', 'Prostate procedure codes', 'Stone management', 'Modifier 59 usage'],
    },
    'General Practice': {
        valueProps: [
            'E&M coding from 99202 to 99215 optimization',
            'Preventive medicine and wellness billing',
            'Care plan oversight services',
            'Telehealth service billing under PHE flexibilities',
        ],
        objections: [
            { objection: 'We already have a billing service', response: 'General practice has broad coding variability. Our E&M coding reviews typically find 10-15% improvement in code accuracy.' },
            { objection: 'Not interested', response: 'I understand. Would you be open to receiving our monthly coding update? No obligation, just industry news relevant to your practice.' },
        ],
        commonPainPoints: ['E&M code selection', 'Preventive vs diagnostic', 'Telehealth billing', 'Care plan oversight', 'Prolonged services'],
    },
};
export function getSpecialtyData(specialty) {
    const lower = specialty.toLowerCase();
    for (const [key, data] of Object.entries(specialtyObjections)) {
        if (lower.includes(key.toLowerCase()))
            return data;
        if (data.commonPainPoints.some(p => lower.includes(p.toLowerCase())))
            return data;
    }
    return specialtyObjections['General Practice'];
}
export function getObjectionResponse(specialty, objection) {
    const data = getSpecialtyData(specialty);
    const lower = objection.toLowerCase();
    for (const entry of data.objections) {
        if (lower.includes(entry.objection.toLowerCase().slice(0, 10)))
            return entry.response;
    }
    // Generic fallback
    return `I understand your concern. Many ${specialty.toLowerCase()} practices we work with felt the same way initially. Would you be open to a brief, no-obligation discussion to see if we can address your specific needs?`;
}
export function getValuePropositions(specialty) {
    return getSpecialtyData(specialty).valueProps;
}
export function getCommonPainPoints(specialty) {
    return getSpecialtyData(specialty).commonPainPoints;
}
export const outreachPhases = [
    {
        id: 'hook',
        label: 'Phase 1: The Hook (0-30s)',
        strategy: 'Establish immediate credibility and avoid sounding like a generic telemarketer',
        pivot: "I'm not calling to do a full demo right now—I know you're likely in the middle of patient rounds/admin work. Do you have 2 minutes to see if we might be able to find some 'leaked' revenue in your current A/R?",
        detection_keywords: ['hello', 'hi', 'who', 'speaking', 'this is', 'calling'],
        success_metric_mention: '98% Clean Claim Rate',
    },
    {
        id: 'discovery',
        label: 'Phase 2: Discovery & History (2-5 min)',
        strategy: 'Let the provider talk. Use clinical-credible questions to identify gaps.',
        detection_keywords: ['struggling', 'denial', 'prior auth', 'staff', 'time', 'burden', 'slow', 'payer', 'coding', 'billing', 'claims', 'process', 'workflow', 'staff', 'pressure', 'behind'],
        questions: [
            "Walk me through how you handle your denial management today. Where does that process usually break down?",
            "Who feels the most pressure when a claim is stuck in A/R for 60+ days—is it your front desk staff or the billing team?",
            "What is your current Days in AR average? Most practices we speak with are struggling to keep it under 40 days right now.",
        ],
    },
    {
        id: 'value_proposition',
        label: 'Phase 3: Value Proposition (The Diagnosis)',
        strategy: 'Connect your service directly to their specific headache.',
        detection_keywords: ['how does', 'what do', 'tell me', "what's", 'cost', 'pricing', 'works', 'process', 'solution', 'how much', 'explain', 'describe'],
    },
    {
        id: 'close',
        label: 'Phase 4: The Close',
        strategy: 'Get a firm commitment for a short, high-value follow-up.',
        detection_keywords: ['yes', 'interested', 'next steps', 'schedule', 'send', 'follow', "let's", 'okay', 'sure', 'sounds good', 'go ahead', 'tell me more'],
    },
];
export const outreachObjectionMap = {
    we_do_in_house: {
        trigger_patterns: ['in-house', 'in house', 'do our own', 'handle ourselves', 'internal', 'we already have'],
        response: "That's great—it usually means you have better control. Many of the in-house teams we partner with actually use us just for Denial Management so they can focus on patient intake. Would you be open to seeing how we supplement in-house teams?",
        alternatives: [
            'I love hearing that. How many FTEs do you have dedicated to denials alone? We often find that one specialized AI agent can do the work of 3 manual staff members.',
            'Great—most in-house teams achieve 70-80% clean claim rate. We help push that to 98% for the subset of claims they hand off to us. Could we run a 30-day pilot on just your top denial codes?',
        ],
        strategy: 'acknowledge + pivot to supplemental value',
    },
    happy_with_vendor: {
        trigger_patterns: ['happy with', 'current vendor', 'already have', 'existing contract', 'satisfied', 'already use'],
        response: "I'm glad to hear that! When was the last time they did a Payer Contract Audit for you to ensure your reimbursement rates haven't stagnated?",
        alternatives: [
            "That's wonderful. If you don't mind me asking—is your net collection rate above 96%? Most practices think they're at 95% but are actually collecting at 89-92% once write-offs are factored in.",
            "What's your current days in A/R? If it's above 35, there's likely revenue sitting on the table even with a good vendor. We can show you exactly where in a 15-minute audit.",
        ],
        strategy: 'challenge with a question + value-add',
    },
    no_time: {
        trigger_patterns: ["don't have time", 'no time', 'busy', 'too busy', 'not now', 'not right now', 'not a good time', 'call back'],
        response: 'I completely understand. That is actually exactly why I am calling—our platform is designed to give you back about 5-10 hours of admin time a week. Can I send you a 1-page Executive Summary and follow up next Tuesday?',
        alternatives: [
            'I respect your time. What if I send you a 2-minute video showing exactly how we reduce denial follow-up time by 30%? You can watch it whenever works for you.',
            'No problem at all. Is there a better time this week? I have Thursday morning open or Friday afternoon—whichever is less disruptive for you.',
        ],
        strategy: 'empathy + low-friction alternative ask',
    },
    too_expensive: {
        trigger_patterns: ['too expensive', 'cost', 'pricing', 'budget', 'afford', 'how much', 'expensive'],
        response: 'We offer a free 30-day denial audit. If we do not identify at least 5% in recoverable revenue, there is no cost. Does that remove the risk for you?',
        alternatives: [
            'Our clients typically see a 3:1 ROI within 90 days. The average practice recovers $8,000-12,000 in the first month alone. Would you be open to a no-obligation estimate?',
            'We start with a free Revenue Audit. Most practices find 5-10% in lost revenue just from that 15-minute review. If we do not find savings, there is zero commitment.',
        ],
        strategy: 'risk reversal + outcome-based',
    },
    not_interested: {
        trigger_patterns: ['not interested', "don't need", 'no thanks', 'stop calling', 'not needed'],
        response: 'I understand. Would you be open to receiving our monthly industry report on denial trends specific to your specialty? No sales pitch—just useful data.',
        alternatives: [
            'I respect that. Before I go, I would like to send you a one-page comparison of your specialty current denial benchmarks vs. the national average. It might be useful reference material regardless.',
            'Completely fair. If something changes or a new denial trend hits your specialty, may I check back in 90 days?',
        ],
        strategy: 'low-friction value add + permission to follow up',
    },
};
export const specialtyKPIs = {
    Cardiology: { clean_claim: '96%', days_in_ar: '42', net_collection: '95%' },
    'Mental Health': { clean_claim: '93%', days_in_ar: '48', net_collection: '92%' },
    Orthopedics: { clean_claim: '94%', days_in_ar: '44', net_collection: '93%' },
    'Primary Care': { clean_claim: '97%', days_in_ar: '35', net_collection: '96%' },
    Dermatology: { clean_claim: '95%', days_in_ar: '38', net_collection: '94%' },
    'Internal Medicine': { clean_claim: '96%', days_in_ar: '36', net_collection: '95%' },
    Family: { clean_claim: '97%', days_in_ar: '35', net_collection: '96%' },
    Urology: { clean_claim: '94%', days_in_ar: '40', net_collection: '93%' },
    Neurology: { clean_claim: '93%', days_in_ar: '45', net_collection: '92%' },
};
export const specialtyPowerPhrases = {
    Cardiology: 'Complex diagnostic coding and prior auths are the number one reason cardiology practices leave money on the table.',
    'Mental Health': 'With frequent telehealth reimbursement changes, most mental health practices are under-coding by at least one level.',
    Orthopedics: 'Global surgery period mismanagement costs orthopedic practices an average of $18,000 per surgeon per year.',
    'Primary Care': 'MIPS reporting fatigue is real—but it also means most primary care practices are leaving 5-8% in bonus payments unclaimed.',
    Dermatology: 'Modifier 25 audits are the most common target for dermatology and the easiest to fix with proper documentation support.',
    Urology: 'Urology has some of the highest denial rates for diagnostic procedures. A focused review typically recovers 8-12% in denied revenue.',
    Neurology: 'EMG and nerve conduction study denials are rising. Our neurology-specific audit finds an average of $15,000 in missed reimbursement per provider.',
    'Internal Medicine': 'Risk adjustment coding for Medicare Advantage is the single biggest missed revenue opportunity for internal medicine.',
};
export function getSpecialtyKPI(specialty) {
    const lower = specialty.toLowerCase();
    for (const [key, val] of Object.entries(specialtyKPIs)) {
        if (lower.includes(key.toLowerCase()))
            return val;
    }
    return { clean_claim: '95%', days_in_ar: '40', net_collection: '94%' };
}
export function getPowerPhrase(specialty) {
    const lower = specialty.toLowerCase();
    for (const [key, val] of Object.entries(specialtyPowerPhrases)) {
        if (lower.includes(key.toLowerCase()))
            return val;
    }
    return 'Our goal is not just to bill—it is to ensure that for every hour of care you provide, you are actually capturing 100% of the allowable reimbursement.';
}
export function detectPhase(query, currentPhase, conversationLength) {
    const lower = query.toLowerCase();
    // If conversation is long enough and last phase was value_prop → close
    if (conversationLength >= 4 || currentPhase === 'close') {
        return { phase: outreachPhases[3], progress: 100 };
    }
    // Check for close keywords
    if (conversationLength >= 3) {
        for (const kw of outreachPhases[3].detection_keywords) {
            if (lower.includes(kw))
                return { phase: outreachPhases[3], progress: 100 };
        }
    }
    // Check for value proposition keywords
    if (currentPhase === 'discovery' || currentPhase === 'value_proposition') {
        for (const kw of outreachPhases[2].detection_keywords) {
            if (lower.includes(kw))
                return { phase: outreachPhases[2], progress: 75 };
        }
    }
    // Check for discovery keywords
    if (currentPhase === 'hook' || currentPhase === 'discovery') {
        for (const kw of outreachPhases[1].detection_keywords) {
            if (lower.includes(kw))
                return { phase: outreachPhases[1], progress: 50 };
        }
    }
    // Advance based on conversation length
    if (conversationLength >= 2)
        return { phase: outreachPhases[2], progress: 75 };
    if (conversationLength >= 1)
        return { phase: outreachPhases[1], progress: 50 };
    return { phase: outreachPhases[0], progress: 25 };
}
export function matchObjection(query) {
    const lower = query.toLowerCase();
    const order = ['we_do_in_house', 'happy_with_vendor', 'no_time', 'too_expensive', 'not_interested'];
    for (const key of order) {
        const entry = outreachObjectionMap[key];
        for (const pattern of entry.trigger_patterns) {
            if (lower.includes(pattern))
                return entry;
        }
    }
    return null;
}
export function getOutreachResponse(query, specialty, currentPhase, conversationLog) {
    const phaseResult = detectPhase(query, currentPhase, conversationLog.length);
    const objection = matchObjection(query);
    const kpi = getSpecialtyKPI(specialty);
    if (objection) {
        return {
            phase: 'value_proposition',
            phase_label: 'Phase 3: Value Proposition (The Diagnosis)',
            progress_percent: 75,
            suggested_response: objection.response,
            alternative_responses: objection.alternatives,
            strategy: objection.strategy,
            next_step: 'Ask about their current denial rate or schedule the free Revenue Audit',
            key_metric: `Clean Claim Rate: >95% | Days in AR: <35 | Net Collection: >96%`,
            power_phrase: getPowerPhrase(specialty),
        };
    }
    switch (phaseResult.phase.id) {
        case 'hook':
            return {
                phase: 'hook',
                phase_label: 'Phase 1: The Hook (0-30s)',
                progress_percent: 25,
                suggested_response: `Hi [Decision Maker Name], this is [Your Name] with Aethera Healthcare Solutions. I am calling because we recently helped a ${specialty} practice increase their clean claim rate to 98%, and I wanted to see if your team is seeing similar results. ${phaseResult.phase.pivot || ''}`,
                alternative_responses: [
                    `The reason I am reaching out specifically to you is that we have noticed many ${specialty} practices are seeing a spike in denials for medical necessity lately. Are you finding that your staff is spending more time on the phone with payers than they were six months ago?`,
                ],
                strategy: 'Establish credibility — pattern interrupt',
                next_step: `Wait for response. If they engage, ask about their current billing challenges.`,
                key_metric: `Clean Claim Rate: ${kpi.clean_claim} | Days in AR: ${kpi.days_in_ar}`,
                power_phrase: getPowerPhrase(specialty),
            };
        case 'discovery':
            return {
                phase: 'discovery',
                phase_label: 'Phase 2: Discovery & History (2-5 min)',
                progress_percent: 50,
                suggested_response: phaseResult.phase.questions?.[0] || phaseResult.phase.questions?.[0] || 'Walk me through how you handle your denial management today. Where does that process usually break down?',
                alternative_responses: [
                    'On a scale of 1 to 10, how confident are you that your current billing process is capturing 100% of the allowable reimbursement for every patient visit?',
                    'Who feels the most pressure when a claim is stuck in A/R for 60+ days—is it your front desk staff or the billing team?',
                ],
                strategy: 'Let the provider talk. Use clinical-credible questions to identify gaps.',
                next_step: 'Listen for pain points — if they mention denials, prior auth, or staff burden, transition to value proposition',
                key_metric: `Days in AR: ${kpi.days_in_ar} (specialty avg) | Net Collection: ${kpi.net_collection}`,
                power_phrase: getPowerPhrase(specialty),
            };
        case 'value_proposition':
            return {
                phase: 'value_proposition',
                phase_label: 'Phase 3: Value Proposition (The Diagnosis)',
                progress_percent: 75,
                suggested_response: 'It sounds like denials and follow-up are pulling your staff away from patient care. We actually use an AI-driven process that automates that step, typically reducing manual follow-up time by 30%. Our goal is not just to bill—it is to ensure that for every hour of care you provide, you are actually capturing 100% of the allowable reimbursement.',
                alternative_responses: [
                    'What we typically do is a Free Revenue Audit where we look at your top 3 denial codes and show you exactly where the revenue is stalling. Most practices find an extra 5-10% in lost revenue just from that 15-minute review.',
                    'I am not here to suggest you overhaul your entire system today. What we do is identify the specific bottlenecks causing your denials and fix them one at a time. Would a focused look at your top denial code make sense?',
                ],
                strategy: 'Connect your service directly to their specific headache. Outcome focus.',
                next_step: 'Transition to closing — suggest the 15-minute Revenue Audit',
                key_metric: `Net Collection Rate: ${kpi.net_collection} | Clean Claim Rate: ${kpi.clean_claim}`,
                power_phrase: getPowerPhrase(specialty),
            };
        case 'close':
            return {
                phase: 'close',
                phase_label: 'Phase 4: The Close',
                progress_percent: 100,
                suggested_response: 'Instead of a long meeting, would you be open to a 15-minute Revenue Audit? I can show you exactly where your top 3 denial reasons are coming from compared to the industry average for your specialty.',
                alternative_responses: [
                    'Does Tuesday at 10:00 AM or Wednesday at 2:00 PM work better for a quick screen-share?',
                    'Can I send you a 1-page Executive Summary that covers exactly what we discussed and follow up next week to answer any questions?',
                ],
                strategy: 'Get a firm commitment for a short, high-value follow-up.',
                next_step: 'Confirm a specific time and date',
                key_metric: `Clean Claim Rate: ${kpi.clean_claim} | Industry target: 98%`,
                power_phrase: getPowerPhrase(specialty),
            };
        default:
            return {
                phase: 'discovery',
                phase_label: 'Phase 2: Discovery & History (2-5 min)',
                progress_percent: 50,
                suggested_response: 'That is exactly the kind of challenge we help practices solve. Tell me more about what has been happening with your current process.',
                alternative_responses: ['Walk me through how you handle denials today—where does that usually break down?'],
                strategy: 'Let the provider talk. Identify gaps.',
                next_step: 'Ask a discovery question',
                key_metric: `Days in AR: ${kpi.days_in_ar}`,
                power_phrase: getPowerPhrase(specialty),
            };
    }
}
