import { CARD_HOVER, CARD_WHITE } from "./cardStyles";

export function TopHeader() {
  return (
    <div className={`${CARD_WHITE} ${CARD_HOVER} p-6`}>
      <h1 className="text-[22px] font-bold text-[#111827]">OAN Grievance Dashboard</h1>
      <p className="text-sm text-gray-500 mt-1.5">
        Agriculture domain grievances — Ethiopia OAN Portal, Fiscal Year 2026
      </p>
    </div>
  );
}
