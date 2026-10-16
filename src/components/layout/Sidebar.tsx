"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { useSidebar } from "@/contexts/SidebarContext";
import { canAccessRoute, canViewAllGrievances } from "@/features/auth/rbac";
import { selectUser } from "@/features/auth/store/authSlice";
import { useAppSelector } from "@/store/hooks";
import { ORGANISATION_ROUTE, organisationKindOf } from "@/lib/organisationKind";
import {
  Building2,
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Users,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "All Grievances", href: "/all-grievances", icon: FileText },
  { name: "Submit Grievance", href: "/submit-grievance", icon: PlusCircle },
  { name: "Analytics & Reporting", href: "/analytics-reporting", icon: BarChart3 },
  { name: "User Management", href: "/user-management", icon: Users },
  { name: "Administration", href: "/administration", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed } = useSidebar();
  const user = useAppSelector(selectUser);
  // Reuses the same deny-by-default allow-list `proxy.ts` enforces
  // server-side — links a role can't open are hidden rather than left to a
  // 404/redirect. (`canAccessRoute` denies anything absent from both
  // ROUTE_ROLES and UNRESTRICTED_ROUTES in rbac.ts — adding a nav item here
  // for a route with no entry in either hides it for every role, including
  // Admin, until that entry is added.)
  // Memoized on the role set, not recomputed on every pathname change this
  // component re-renders for (usePathname changes on every navigation, but
  // the role set is stable for the whole session).
  const visibleNavItems = useMemo(() => {
    const userRoles = user?.roles ?? [];
    const seesAll = canViewAllGrievances(userRoles);
    // An NGO / FPO representative's way back to their organisation's status
    // (or to finishing its registration) from the rest of the portal.
    const organisationKind = organisationKindOf(user);
    const items = organisationKind
      ? [...navItems, { name: "My Organisation", href: ORGANISATION_ROUTE[organisationKind], icon: Building2 }]
      : navItems;
    return items
      .filter((item) => canAccessRoute(item.href, userRoles))
      .map((item) => {
        if (item.href === "/all-grievances" && !seesAll) {
          return { ...item, name: "My Grievances" };
        }
        return item;
      });
  }, [user]);

  return (
    <div className={`h-screen bg-[#0e3b25] flex flex-col flex-shrink-0 font-sans shadow-xl z-40 relative transition-all duration-300 ${isSidebarCollapsed ? 'w-[88px]' : 'w-[280px]'}`}>

      {/* Logo Section */}
      <div className={`pt-6 pb-6 flex items-center border-b border-[#184d31] transition-all duration-300 ${isSidebarCollapsed ? 'px-4 justify-center' : 'px-6 gap-3.5'}`}>
        <BrandLockup compact={isSidebarCollapsed} />
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 py-3">
        <ul className="space-y-2 px-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            // Determine active state (matching dashboard route for visual demonstration)
            const isActive = pathname === item.href || (item.name === "Dashboard" && pathname?.includes("dashboard"));

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center py-3 rounded-lg text-[15px] font-medium transition-all duration-200 ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-4'
                    } ${isActive
                      ? "bg-[#0b8535] text-white shadow-sm font-semibold"
                      : "text-[#a3cca8] hover:bg-[#144f33] hover:text-white"
                    }`}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-[22px] h-[22px] shrink-0 stroke-[1.5] ${isActive ? "text-white" : "text-[#a3cca8]"}`} />
                  {!isSidebarCollapsed && (
                    <span className="whitespace-nowrap overflow-hidden transition-all duration-300">
                      {item.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
