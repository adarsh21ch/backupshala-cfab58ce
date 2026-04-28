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
 * Backupshala logo — icon (PNG) + wordmark rendered in Space Grotesk.
 * The "Backup" half adapts to the current theme via `text-foreground`.
 * "shala" stays saffron (accent) in both modes.
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
      style={{ width: iconSize, height: iconSize }}
      className="shrink-0 select-none"
      draggable={false}
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
