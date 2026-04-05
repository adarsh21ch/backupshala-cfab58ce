import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  children?: React.ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, actionTo, children }: EmptyStateProps) => (
  <div className="rounded-xl border border-border bg-card p-10 text-center">
    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
      <Icon className="h-8 w-8 text-muted-foreground/40" />
    </div>
    <h3 className="font-heading text-lg font-700">{title}</h3>
    <p className="mt-1.5 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
    {actionLabel && actionTo && (
      <Button asChild className="mt-5 rounded-lg">
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    )}
    {children}
  </div>
);

export default EmptyState;
