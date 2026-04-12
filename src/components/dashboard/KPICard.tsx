import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'primary' | 'accent' | 'info' | 'warning';
}

const colorMap = {
  primary: { icon: 'bg-primary/10 text-primary', value: 'text-foreground' },
  accent: { icon: 'bg-accent/10 text-accent', value: 'text-foreground' },
  info: { icon: 'bg-info/10 text-info', value: 'text-foreground' },
  warning: { icon: 'bg-warning/10 text-warning', value: 'text-foreground' },
};

const KPICard = ({ icon: Icon, label, value, color = 'primary' }: KPICardProps) => {
  const c = colorMap[color];
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-4 shadow-warm transition-all hover:shadow-warm-lg hover:-translate-y-0.5">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className={`font-heading text-xl font-800 ${c.value}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

export default KPICard;
