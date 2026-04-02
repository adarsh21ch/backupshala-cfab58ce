import { useEffect, useRef } from 'react';
import { ExternalLink, Play, Mic, FileText, Wrench, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
  description?: string;
  thumbnail_url?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  youtube: <Play className="h-5 w-5 text-destructive" />,
  podcast: <Mic className="h-5 w-5 text-accent" />,
  article: <FileText className="h-5 w-5 text-primary" />,
  tool: <Wrench className="h-5 w-5 text-muted-foreground" />,
  other: <LinkIcon className="h-5 w-5 text-muted-foreground" />,
};

const typeLabels: Record<string, string> = {
  youtube: '▶️ YouTube',
  podcast: '🎙️ Podcast',
  article: '📄 Article',
  tool: '🛠️ Tool',
  other: '🔗 Link',
};

const getYouTubeThumbnail = (url: string): string | null => {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes('youtube.com')) videoId = u.searchParams.get('v');
    else if (u.hostname === 'youtu.be') videoId = u.pathname.slice(1);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  } catch {}
  return null;
};

interface Props {
  title: string;
  description?: string;
  resources: Resource[];
  onAutoComplete: () => void;
  isCompleted: boolean;
}

const ResourceModuleView = ({ title, description, resources, onAutoComplete, isCompleted }: Props) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isCompleted) {
      timerRef.current = setTimeout(() => onAutoComplete(), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isCompleted, onAutoComplete]);

  if (!resources || resources.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-xl font-700">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">📚 Resources</span>
        </div>
        <h1 className="font-heading text-xl font-700">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {resources.map((r) => {
          const thumb = r.type === 'youtube' ? (r.thumbnail_url || getYouTubeThumbnail(r.url)) : null;
          return (
            <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors">
              {thumb && (
                <img src={thumb} alt={r.title} className="w-full h-32 object-cover" loading="lazy" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {typeIcons[r.type] || typeIcons.other}
                  <span className="text-[10px] text-muted-foreground">{typeLabels[r.type] || typeLabels.other}</span>
                </div>
                <h3 className="text-sm font-medium line-clamp-2">{r.title}</h3>
                {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                <Button variant="outline" size="sm" className="w-full rounded-md text-xs" onClick={() => window.open(r.url, '_blank')}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Open Resource
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResourceModuleView;
