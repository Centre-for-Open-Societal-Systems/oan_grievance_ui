import SubmitGrievancePage from "@/features/submit-grievance/page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Grievance | Grievance Management Dashboard",
};

export default function SubmitGrievance() {
  return <SubmitGrievancePage />;
}
