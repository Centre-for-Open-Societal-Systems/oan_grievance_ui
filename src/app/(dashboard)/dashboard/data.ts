export const dashboardData = {
  kpis: [
    { title: "Total Grievances", value: 8, trend: 12, type: "percentage" },
    { title: "Awaiting Action", value: 4, trend: 5, type: "number" },
    { title: "Resolved", value: 3, trend: 8, type: "number" },
    { title: "Escalated", value: 1, trend: null, type: "alert" },
  ],
  monthlyTrend: [
    { month: "Nov 2025", submitted: 0, resolved: 0 },
    { month: "Dec 2025", submitted: 1, resolved: 0 },
    { month: "Jan 2026", submitted: 1, resolved: 0 },
    { month: "Feb 2026", submitted: 2, resolved: 1 },
    { month: "Mar 2026", submitted: 1, resolved: 1 },
    { month: "Apr 2026", submitted: 3, resolved: 1 },
  ],
  statusDistribution: [
    { name: "Submitted", value: 2, color: "#4f46e5" },
    { name: "Assigned", value: 1, color: "#3b82f6" },
    { name: "In Progress", value: 1, color: "#6366f1" },
    { name: "More Info Needed", value: 1, color: "#f97316" },
    { name: "Resolved", value: 2, color: "#10b981" },
    { name: "Closed", value: 1, color: "#374151" },
  ],
  serviceCategories: [
    { name: "Inputs", value: 3, max: 4, color: "bg-[#2563eb]" },
    { name: "Schemes", value: 2, max: 4, color: "bg-[#6366f1]" },
    { name: "Payments", value: 1, max: 4, color: "bg-[#a855f7]" },
    { name: "Credit", value: 1, max: 4, color: "bg-[#c084fc]" },
    { name: "Markets", value: 1, max: 4, color: "bg-[#d8b4fe]" },
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
