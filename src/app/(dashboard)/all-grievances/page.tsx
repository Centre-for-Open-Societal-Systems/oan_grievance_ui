import AllGrievancesPage from "@/features/all-grievances/page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Grievances | Grievance Management Dashboard",
};

export default function AllGrievances() {
  return <AllGrievancesPage />;
}
