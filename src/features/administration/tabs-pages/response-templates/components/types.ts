export interface ResponseTemplate {
    id: string;
    title: string;
    category: string;
    subcategory: string;
    statusBadge: 'Partially Resolved' | 'Resolved' | 'Requires further info';
    useCount: number;
    actionTaken: string;
    resolutionSummary: string;
    lastUsed: string;
}

export const MOCK_RESPONSE_TEMPLATES: ResponseTemplate[] = [
    {
        id: 'RT-001',
        title: 'Seed Quality — Lab Testing Initiated',
        category: 'Inputs',
        subcategory: 'Seed quality / germination failure',
        statusBadge: 'Partially Resolved',
        useCount: 18,
        actionTaken: 'Seed batch samples collected and submitted to the National Agricultural Inputs Quality Control Laboratory (NAIQCL) for germination rate and purity testing. Batch number and lot details recorded.',
        resolutionSummary: "Investigation is under way. Laboratory results are expected within 10 working days. The farmer's affected plot has been documented with GPS coordinates and photographic evidence.If the batch is confirmed substandard, replacement seed will be issued and the supplier sanctioned per MoA Directive No. 12/2023.",
        lastUsed: '28 Apr 2026'
    },
    {
        id: 'RT-002',
        title: 'Seed Quality — Confirmed Substandard, Replacement Issued',
        category: 'Inputs',
        subcategory: 'Seed quality / germination failure',
        statusBadge: 'Resolved',
        useCount: 11,
        actionTaken: 'Lab results confirmed germination rate below minimum standard (40% actual vs 85% required). Replacement seed consignment sourced from certified stock. Supplier issued with formal notice.',
        resolutionSummary: 'Replacement certified seed issued to the affected farmer(s) at no cost. Supplier has been placed on probation and the batch recalled from distribution. Compensation for crop loss to be assessed via the woreda extension office within 21 days.',
        lastUsed: '25 Apr 2026'
    },
    {
        id: 'RT-003',
        title: 'Fertiliser Delay — Supply Chain Investigation',
        category: 'Inputs',
        subcategory: 'Fertilizer non-delivery or shortage',
        statusBadge: 'Partially Resolved',
        useCount: 14,
        actionTaken: 'Delivery records reviewed at regional warehouse and cooperative input store. Transport schedule and allocation manifest obtained. Woreda logistics officer contacted for ground-level verification.',
        resolutionSummary: "Delay attributed to transport breakdown at regional distribution hub. Rescheduled delivery confirmed for [DATE]. Affected farmers have been identified and placed at top of priority list for next delivery window. A formal apology and explanation has been issued to the woreda.",
        lastUsed: '24 Apr 2026'
    },
    {
        id: 'RT-004',
        title: 'Payment Delay — Transfer Confirmed',
        category: 'Payments',
        subcategory: 'Payment delay (>SLA)',
        statusBadge: 'Resolved',
        useCount: 22,
        actionTaken: 'Payment records reviewed with buyer finance team and cooperative union accounts. Bank transfer order located and clearance status verified.',
        resolutionSummary: 'Payment of ETB {{amount}} has been initiated and transfer confirmation obtained from the bank. Expected clearance: 2–3 working days. If clearance is not received by [DATE], escalation to union leadership will be triggered automatically. Farmer/cooperative to confirm receipt upon clearance.',
        lastUsed: '23 Apr 2026'
    },
    {
        id: 'RT-005',
        title: 'Payment — Underpayment, Rate Reconciliation',
        category: 'Payments',
        subcategory: 'Underpayment or deduction dispute',
        statusBadge: 'Resolved',
        useCount: 9,
        actionTaken: 'Procurement contract and payment voucher reviewed against market rate on the delivery date. Deduction calculation verified against cooperative by-laws.',
        resolutionSummary: "Deduction reviewed and found to be {{valid/erroneous}}. If erroneous: difference of ETB {{amount}} credited to submitter's account within 5 working days.If valid: a detailed written explanation has been sent to the submitter with itemised deduction breakdown.",
        lastUsed: '21 Apr 2026'
    },
    {
        id: 'RT-006',
        title: 'Scheme Benefit — Eligibility Under Review',
        category: 'Schemes',
        subcategory: 'Government scheme benefit not received',
        statusBadge: 'Partially Resolved',
        useCount: 26,
        actionTaken: 'Beneficiary registry cross-checked against Fayda ID and household registration. Woreda PSNP / scheme office contacted to verify enrolment status and payment batch records.',
        resolutionSummary: 'Enrolment confirmed / not confirmed in the scheme registry. If confirmed: payment batch error identified and arrears of ETB {{amount}} to be disbursed within 10 working days. If not confirmed: eligibility assessment to be completed by the woreda office within 14 days and submitter notified of outcome.',
        lastUsed: '20 Apr 2026'
    },
    {
        id: 'RT-007',
        title: 'Credit — Loan Application, Missing Documentation',
        category: 'Credit',
        subcategory: 'Loan application rejected without reason',
        statusBadge: 'Requires further info',
        useCount: 15,
        actionTaken: 'Loan file retrieved and reviewed. Reason for rejection identified from the credit committee minutes and applicant file checklist.',
        resolutionSummary: 'Rejection was due to the following missing or incomplete documentation: {{documentList}}. Applicant has been notified of the specific requirements. A resubmission window of 30 days has been opened. Upon resubmission, the application will be fast-tracked for review within 7 working days.',
        lastUsed: '19 Apr 2026'
    },
    {
        id: 'RT-008',
        title: 'Credit — Interest Rate Correction',
        category: 'Credit',
        subcategory: 'Interest rate or fee dispute',
        statusBadge: 'Resolved',
        useCount: 7,
        actionTaken: 'Original loan agreement retrieved and compared against rate applied in the system. Discrepancy between contract rate and system entry identified and flagged to branch manager.',
        resolutionSummary: "Rate corrected to the agreed contract rate of {{rate}}%. Overcharged amount of ETB {{amount}} credited to farmer's loan account.Branch staff retrained on loan data entry protocol.An updated loan statement has been issued to the submitter.",
        lastUsed: '18 Apr 2026'
    },
    {
        id: 'RT-009',
        title: 'Market Access — Licence Verification',
        category: 'Markets',
        subcategory: 'Market access denied',
        statusBadge: 'Resolved',
        useCount: 8,
        actionTaken: 'Trading licence and market access registration verified against market authority records. Market official on duty contacted for explanation of denial.',
        resolutionSummary: "Trading licence confirmed as valid. Market official's denial was not in accordance with market regulations.A formal instruction has been issued to the market management authority reinstating the submitter's access rights. A written apology has been issued and the incident logged for market officer performance review.",
        lastUsed: '17 Apr 2026'
    },
    {
        id: 'RT-010',
        title: 'Market — Weighing Scale Calibration Dispute',
        category: 'Markets',
        subcategory: 'Weighing / measurement dispute',
        statusBadge: 'Partially Resolved',
        useCount: 5,
        actionTaken: 'Market scale certification records checked with the Ethiopian Standards Authority regional office. Scale serial numbers and last calibration dates verified.',
        resolutionSummary: 'Scale certification confirmed current / expired. If expired: market officially suspended from using uncertified scales. Recalibration scheduled. Farmers who transacted during the uncertified period to be offered independent re-weighing of retained samples or compensation assessed based on transaction records.',
        lastUsed: '16 Apr 2026'
    }
];
