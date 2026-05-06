import iconSrc from '@/assets/backupshala-icon.png';

interface LogoProps {
  /** Pixel size of the icon. Text scales with `textClassName`. */
  iconSize?: number;
  /** Hide the wordmark — show icon only (e.g. tight spaces). */
  iconOnly?: boolean;
  /** Tailwind classes for the wordmark text. */
  textClassName?: string;
  /** Optional badge node rendered after the wordmark (Creator/Admin pill). */
  badge?: React.ReactNode;
  className?: string;
}

/**
 * Backupshala logo — icon (graduation cap + open book) + wordmark in Space Grotesk.
 * Icon is two stacked layers: the navy half uses `currentColor` (text-foreground)
 * so it appears dark navy in light mode and cream-white in dark mode.
 * The orange cap, figure & left page stay saffron in both modes.
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
      className="shrink-0 select-none"
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
