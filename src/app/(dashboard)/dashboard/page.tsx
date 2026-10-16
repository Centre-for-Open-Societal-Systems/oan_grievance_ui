import type { Metadata } from "next";
import { DashboardOverview } from "@/features/dashboard";
import { RecentGrievances } from "./components/RecentGrievances";

export const metadata: Metadata = {
  title: "Dashboard | Grievance Management Portal",
};

export default function DashboardPage() {
  return <DashboardOverview recentGrievances={<RecentGrievances />} />;
}
