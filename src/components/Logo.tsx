import navyMask from '@/assets/backupshala-icon-navy.png';
import orangeSrc from '@/assets/backupshala-icon-orange.png';

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
 * Backupshala logo — icon + wordmark in Space Grotesk.
 * Icon is two stacked layers: the navy "B" uses `currentColor` (text-foreground)
 * so it appears dark navy in light mode and cream-white in dark mode.
 * The orange cap & book stay saffron in both modes.
 */
const Logo = ({
  iconSize = 28,
  iconOnly = false,
  textClassName = 'text-xl',
  badge,
  className = '',
}: LogoProps) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <span
      role="img"
      aria-label="Backupshala"
      className="relative shrink-0 select-none text-foreground"
      style={{ width: iconSize, height: iconSize }}
    >
      {/* Navy layer — recolored via CSS mask so it follows the theme */}
      <span
        aria-hidden
        className="absolute inset-0 bg-current"
        style={{
          WebkitMaskImage: `url(${navyMask})`,
          maskImage: `url(${navyMask})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
      {/* Orange cap + book — fixed brand color in both modes */}
      <img
        src={orangeSrc}
        alt=""
        width={iconSize}
        height={iconSize}
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />
    </span>
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
