import { RealtimeConnection } from "@/components/realtime/RealtimeConnection";
import { IdleSessionGuard } from "@/features/auth/components/IdleSessionGuard";

/**
 * The shell for NGO / FPO onboarding: the signed-in session guards of the
 * dashboard layout, but no sidebar — an organisation still being onboarded has
 * no dashboard yet. Each page renders its own header, since its title depends
 * on whether the organisation is registered.
 */
export default function OrganisationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#f3f4f6]">{children}</div>
      <IdleSessionGuard />
      <RealtimeConnection />
    </>
  );
}
