import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Visual color tone for the icon + accent. */
  color?: 'primary' | 'accent' | 'info' | 'warning' | 'success' | 'destructive' | 'purple';
  /** Optional small caption below the value (e.g. "View"). */
  subtitle?: React.ReactNode;
  /** Color the value text the same as the icon. Defaults to false. */
  vibrantValue?: boolean;
}

const colorMap = {
  primary: { tint: 'bg-primary/10 text-primary', value: 'text-primary' },
  accent:  { tint: 'bg-accent/10 text-accent',   value: 'text-accent' },
  info:    { tint: 'bg-info/10 text-info',       value: 'text-info' },
  warning: { tint: 'bg-warning/10 text-warning', value: 'text-warning' },
  success: { tint: 'bg-primary/10 text-primary', value: 'text-primary' },
  destructive: { tint: 'bg-destructive/10 text-destructive', value: 'text-destructive' },
  purple:  { tint: 'bg-[hsl(265_85%_55%/0.12)] text-[hsl(265_85%_60%)]', value: 'text-[hsl(265_85%_60%)]' },
} as const;

const KPICard = ({ icon: Icon, label, value, color = 'primary', subtitle, vibrantValue = false }: KPICardProps) => {
  const c = colorMap[color];
  return (
    <div className="group rounded-[14px] border border-border/70 bg-card p-5 shadow-soft transition-all hover:shadow-soft-hover hover:-translate-y-0.5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${c.tint}`}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <p className={`font-heading text-[28px] leading-none font-bold tracking-tight ${vibrantValue ? c.value : 'text-foreground'}`}>{value}</p>
      <p className="mt-2 text-[13px] text-muted-foreground">{label}</p>
      {subtitle && <div className="mt-1.5 text-[11px]">{subtitle}</div>}
    </div>
  );
};

export default KPICard;
