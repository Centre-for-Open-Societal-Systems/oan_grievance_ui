export const dashboardData = {
  kpis: [
    { title: "Total Grievances", value: 128, trend: 12, type: "percentage" },
    { title: "Awaiting Action", value: 40, trend: 5, type: "number" },
    { title: "Resolved", value: 48, trend: 8, type: "number" },
    { title: "Escalated", value: 1, trend: null, type: "alert" },
  ],
  monthlyTrend: [
    { month: "Nov 2025", submitted: 55, resolved: 35 },
    { month: "Dec 2025", submitted: 62, resolved: 42 },
    { month: "Jan 2026", submitted: 48, resolved: 30 },
    { month: "Feb 2026", submitted: 70, resolved: 55 },
    { month: "Mar 2026", submitted: 85, resolved: 70 },
    { month: "Apr 2026", submitted: 130, resolved: 115 },
  ],
  statusDistribution: [
    { name: "Submitted", value: 64, color: "#4f46e5" },
    { name: "Assigned", value: 21, color: "#3b82f6" },
    { name: "In Progress", value: 14, color: "#6366f1" },
    { name: "More Info Needed", value: 7, color: "#f97316" },
    { name: "Resolved", value: 21, color: "#10b981" },
    { name: "Closed", value: 8, color: "#374151" },
  ],
  serviceCategories: [
    { name: "Inputs", value: 34, max: 40, color: "bg-[#2563eb]" },
    { name: "Schemes", value: 28, max: 40, color: "bg-[#6366f1]" },
    { name: "Payments", value: 31, max: 40, color: "bg-[#a855f7]" },
    { name: "Credit", value: 19, max: 40, color: "bg-[#c084fc]" },
    { name: "Markets", value: 16, max: 40, color: "bg-[#d8b4fe]" },
  ],
};

// Derived from the mock data itself rather than redeclared per-component —
// once this is fetched from a real backend, these move to wherever that
// response type lives, but every chart/card component below can keep
// importing from here.
export type KpiCard = (typeof dashboardData)['kpis'][number];
export type MonthlyTrendPoint = (typeof dashboardData)['monthlyTrend'][number];
export type StatusDistributionSlice = (typeof dashboardData)['statusDistribution'][number];
export type ServiceCategoryStat = (typeof dashboardData)['serviceCategories'][number];
