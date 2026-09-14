export interface SlaCategory {
    id: string;
    category: string; // e.g. "Inputs", "Markets", "Credit"
    categoryColor: string; // e.g. "bg-green-100 text-green-700"
    department: string; // e.g. "Inputs Supply & Distribution Agency"
    slaDays: number;
    autoEscalate: boolean;
    notifyOnBreach: boolean;
    priority?: string; // e.g. "High Priority"
    notifyOnEscalation: boolean; // Expanded form toggle
    progressPercentage?: number;
}

export const MOCK_SLA_CATEGORIES: SlaCategory[] = [
    {
        id: '1',
        category: 'Inputs',
        categoryColor: 'bg-[#DCFCE7] text-[#008236] border border-[#99E8B5]',
        department: 'Inputs Supply & Distribution Agency',
        slaDays: 14,
        autoEscalate: true,
        notifyOnBreach: true,
        priority: 'High Priority',
        notifyOnEscalation: false,
        progressPercentage: 95
    },
    {
        id: '2',
        category: 'Markets',
        categoryColor: 'bg-[#FFEDD4] text-[#CA3500] border border-[#F9CA96]',
        department: 'Market Development & Trade Bureau',
        slaDays: 10,
        autoEscalate: true,
        notifyOnBreach: true,
        priority: 'High Priority',
        notifyOnEscalation: false,
        progressPercentage: 40
    },
    {
        id: '3',
        category: 'Credit',
        categoryColor: 'bg-[#F3E8FF] text-[#BB4D00] border border-[#E2C7FF]',
        department: 'Agricultural Finance Institute (AFI)',
        slaDays: 14,
        autoEscalate: true,
        notifyOnBreach: true,
        notifyOnEscalation: false,
        progressPercentage: 85
    },
    {
        id: '4',
        category: 'Payments',
        categoryColor: 'bg-[#FEF3C6] text-[#8200DB] border border-[#F8DB67]',
        department: 'Cooperative Promotion Agency',
        slaDays: 10,
        autoEscalate: true,
        notifyOnBreach: true,
        priority: 'High Priority',
        notifyOnEscalation: false,
        progressPercentage: 45
    },
    {
        id: '5',
        category: 'Schemes',
        categoryColor: 'bg-[#DBEAFE] text-[#1447E6] border border-[#BEDBFF]',
        department: 'Ministry of Agriculture (MoA)',
        slaDays: 14,
        autoEscalate: true,
        notifyOnBreach: true,
        notifyOnEscalation: false,
        progressPercentage: 95
    }
];
