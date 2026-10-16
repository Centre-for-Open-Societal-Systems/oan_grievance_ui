export const BRAND_NAME = 'Ethiopia OpenAgriNet';
export const BRAND_PRODUCT = 'Grievance Management';

interface BrandLockupProps {
  /** Logo only, for the collapsed sidebar. */
  compact?: boolean;
  size?: 'md' | 'lg';
}

/**
 * The portal's logo and name, the same on every screen: the login panel and
 * the dashboard sidebar. Both sit on the brand green, so it is drawn light.
 */
export function BrandLockup({ compact = false, size = 'md' }: BrandLockupProps) {
  const logoHeight = size === 'lg' ? 'h-[28px] sm:h-[34px]' : 'h-[30px]';

  return (
    <div className="flex items-center gap-3 min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt={compact ? BRAND_NAME : ''}
        width={1277}
        height={851}
        className={`${logoHeight} w-auto shrink-0`}
      />
      {!compact && (
        <div className="flex flex-col border-l-2 border-white/30 pl-3 overflow-hidden whitespace-nowrap">
          <span className="text-[13px] font-bold text-white leading-tight tracking-wide">{BRAND_NAME}</span>
          <span className="text-[11px] text-white/80 font-medium leading-tight tracking-wide">{BRAND_PRODUCT}</span>
        </div>
      )}
    </div>
  );
}
