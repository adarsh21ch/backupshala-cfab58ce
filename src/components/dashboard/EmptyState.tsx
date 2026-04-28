import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  /** When true, renders a more compact variant (used on dashboard sections). */
  compact?: boolean;
  children?: React.ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, actionTo, compact = false, children }: EmptyStateProps) => (
  <div className={`rounded-xl border border-border bg-card text-center ${compact ? 'p-6' : 'p-8'}`}>
    <div className={`mx-auto mb-3 flex items-center justify-center rounded-full bg-muted/50 ${compact ? 'h-12 w-12' : 'h-14 w-14'}`}>
      <Icon className={`text-muted-foreground/50 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`} />
    </div>
    <h3 className="font-heading text-base font-bold">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
    {actionLabel && actionTo && (
      <Button asChild size="sm" className="mt-4 rounded-lg">
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    )}
    {children}
  </div>
);

export default EmptyState;
