"use client";

import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { NotificationBell } from "./NotificationBell";
import { UserProfile } from "./UserProfile";

/**
 * The top bar of the organisation onboarding screens. Same bell, language
 * picker and account menu as the dashboard `Header`, but no sidebar toggle and
 * no grievance search: an organisation that has not finished onboarding has no
 * dashboard to navigate yet.
 */
export function OrganisationHeader({ title }: { title: string }) {
  return (
    <header className="h-16 bg-white shadow-md flex items-center justify-between px-6 sticky top-0 z-30 w-full shrink-0">
      <h1 className="text-[22px] font-bold text-[#1e293b] tracking-tight">{title}</h1>

      <div className="flex items-center gap-5">
        <NotificationBell />
        <div className="h-7 w-[1px] bg-gray-200 mx-1" />
        <LanguageSelector />
        <UserProfile />
      </div>
    </header>
  );
}
