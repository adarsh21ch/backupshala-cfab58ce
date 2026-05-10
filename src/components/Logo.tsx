import iconSrc from '@/assets/backupshala-icon.png';

interface LogoProps {
  iconSize?: number;
  iconOnly?: boolean;
  textClassName?: string;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Backupshala logo — full-color shield/cap mark + wordmark.
 * Renders the master PNG as-is to preserve every detail (cap, tassel, shield outline, orange U).
 */
const Logo = ({
  iconSize = 28,
  iconOnly = false,
  textClassName = 'text-xl',
  badge,
  className = '',
}: LogoProps) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <img
      src={iconSrc}
      alt="Backupshala"
      width={iconSize}
      height={iconSize}
      draggable={false}
      className="shrink-0 select-none object-contain rounded-md dark:bg-white dark:p-0.5 dark:ring-1 dark:ring-white/20"
      style={{ width: iconSize, height: iconSize }}
    />
    {!iconOnly && (
      <span className={`font-heading font-bold tracking-tight leading-none ${textClassName}`}>
        <span className="text-foreground">Backup</span>
        <span className="text-accent">shala</span>
      </span>
    )}
    {badge}
  </span>
);

export default Logo;
