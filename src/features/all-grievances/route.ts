import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "success",
    data: [
      { id: "OROM-BISH-INP-12345", category: "Inputs", status: "In Progress", priority: "High" },
      { id: "AMHA-BAHE-PAY-00621", category: "Payments", status: "Pending Submission", priority: "Critical" },
    ],
    message: "Grievances list skeleton API endpoint",
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Skeleton implementation for creating a grievance
  return NextResponse.json({
    status: "success",
    message: "Grievance created successfully (Skeleton)",
    data: {
      id: "NEW-GRV-0001",
      ...body
    }
  }, { status: 201 });
}
