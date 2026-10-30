import { BackLink } from '@/components/auth/BackLink';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { LeftSidebar } from '@/components/auth/LeftSidebar';

interface PortalShellProps {
  /** Eyebrow on the green panel, naming the portal being signed in to. */
  badge?: string;
  /** Renders the "Back" link above the card, and is where it leads when there
   *  is no history to step back through. */
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}

/** The split-card chrome shared by the sign-in and sign-up screens. */
export function PortalShell({ badge, backHref, backLabel = 'Back', children }: PortalShellProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-start py-6 sm:py-10 px-4 sm:px-8 min-h-screen bg-gray-50">
      <div className="w-full max-w-5xl mb-4 shrink-0 min-h-[20px]">
        {backHref && <BackLink href={backHref} label={backLabel} />}
      </div>

      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row md:min-h-[720px] shrink-0 my-auto mb-8">
        <LeftSidebar {...(badge ? { badge } : {})} />
        <div className="w-full md:w-[55%] p-6 sm:p-10 md:p-12 flex flex-col bg-white">
          <div className="flex justify-end mb-8 relative">
            <LanguageSelector />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
