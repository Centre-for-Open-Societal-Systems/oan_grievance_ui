export type GrievanceStatus = 'Assigned' | 'Submitted' | 'Pending Submit' | 'In Progress' | 'More Info Needed' | 'Resolved' | 'Rejected' | 'Under Review';
export type GrievancePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type GrievanceCategory = 'Input' | 'Schemes' | 'Payments' | 'Markets' | 'Infrastructure' | 'Other';

export interface Grievance {
  id: string;
  ticketId: string;
  title: string;
  location: string;
  type: string;
  responses: number;
  category: GrievanceCategory;
  status: GrievanceStatus;
  priority: GrievancePriority;
  submittedAt: string;
}

const mockGrievancesBase: Grievance[] = [
  {
    id: "1",
    ticketId: "SOMA-JIG-INP-09905",
    title: "Fertiliser allocation delivered 6 weeks late, crop season missed",
    location: "Jijiga Woreda Agriculture Office - Somali, Jijiga",
    type: "Fertilizer non-delivery or shortage",
    responses: 2,
    category: "Input",
    status: "Assigned",
    priority: "High",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "2",
    ticketId: "SOMA-JIG-INP-09906",
    title: "PSNP safety net scheme payment not disbursed for Q1 2026",
    location: "Almaz Worku - Oromia, Sebeta",
    type: "Government scheme benefit not received",
    responses: 1,
    category: "Schemes",
    status: "Submitted",
    priority: "High",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "3",
    ticketId: "SOMA-JIG-INP-09907",
    title: "Teff produce payment overdue by 45 days",
    location: "Debrezion Farmers Cooperative - Amhara, Bahir Dar Zuria",
    type: "Payment delay (>SLA)",
    responses: 4,
    category: "Payments",
    status: "Pending Submit",
    priority: "Critical",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "4",
    ticketId: "SOMA-JIG-INP-09908",
    title: "Certified maize seed supplied with poor germination rate",
    location: "Abebe Bekele - Oromia, Bishoftu",
    type: "Seed quality / germination failure",
    responses: 4,
    category: "Input",
    status: "In Progress",
    priority: "High",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "5",
    ticketId: "SOMA-JIG-INP-09909",
    title: "Weighing scale irregularity at Nekemte grain market",
    location: "Nekemte Market - Oromia, East Welega",
    type: "Market irregularity",
    responses: 1,
    category: "Markets",
    status: "More Info Needed",
    priority: "Medium",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "6",
    ticketId: "SOMA-JIG-INP-09910",
    title: "Irrigation canal blocked by debris",
    location: "Abebe Bekele - Oromia, Bishoftu",
    type: "Infrastructure issue",
    responses: 5,
    category: "Other",
    status: "Resolved",
    priority: "Medium",
    submittedAt: "May 14, 2026, 10:42 AM",
  },
  {
    id: "7",
    ticketId: "SOMA-JIG-INP-09911",
    title: "Subsidized tractor rental not available",
    location: "Almaz Worku - Oromia, Sebeta",
    type: "Service unavailability",
    responses: 4,
    category: "Input",
    status: "Rejected",
    priority: "High",
    submittedAt: "May 1, 2026, 10:42 AM",
  },
  {
    id: "8",
    ticketId: "SOMA-JIG-INP-09912",
    title: "Market prices not updated on the platform",
    location: "Debrezion Farmers Cooperative - Amhara, Bahir Dar Zuria",
    type: "Information delay",
    responses: 4,
    category: "Schemes",
    status: "Under Review",
    priority: "Critical",
    submittedAt: "May 28, 2026, 10:42 AM",
  },
  {
    id: "9",
    ticketId: "SOMA-JIG-INP-09913",
    title: "Pesticide quality is questionable",
    location: "Abebe Bekele - Oromia, Bishoftu",
    type: "Input quality issue",
    responses: 3,
    category: "Payments",
    status: "Assigned",
    priority: "Low",
    submittedAt: "May 15, 2026, 10:42 AM",
  },
  {
    id: "10",
    ticketId: "SOMA-JIG-INP-09914",
    title: "Extension worker did not visit as scheduled",
    location: "Nekemte Market - Oromia, East Welega",
    type: "Service failure",
    responses: 3,
    category: "Markets",
    status: "Submitted",
    priority: "Medium",
    submittedAt: "May 27, 2026, 10:42 AM",
  }
];

export const mockGrievances: Grievance[] = [];
for (let i = 0; i < 6; i++) {
  mockGrievancesBase.forEach((g) => {
    mockGrievances.push({
      ...g,
      id: `${g.id}-${i}`,
      ticketId: `${g.ticketId}-${i}`,
    });
  });
}
