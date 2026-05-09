import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Play, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  moduleId: string;
  courseId: string;
  enrolled: boolean;
}

const isYouTube = (url: string) =>
  url.includes('youtube.com') || url.includes('youtu.be');

const toYouTubeEmbed = (url: string): string => {
  const watch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = url.match(/youtu\.be\/([^?]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  if (url.includes('/embed/')) return url;
  return url;
};

const ChapterVideo = ({ chapter }: { chapter: any }) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [videoType, setVideoType] = useState<'r2' | 'youtube' | 'direct'>('direct');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Priority 1: signed R2 URL via video_asset_id
      if (chapter.video_asset_id) {
        try {
          const { data } = await supabase.functions.invoke('r2-get-playback-url', {
            body: { objectKey: chapter.video_asset_id },
          });
          if (!cancelled && data?.url) {
            setResolvedUrl(data.url);
            setVideoType('direct');
            return;
          }
        } catch (err) {
          console.warn('R2 signed URL failed, falling back', err);
        }
      }
      const url = chapter.video_url || '';
      if (cancelled) return;
      if (url && isYouTube(url)) {
        setResolvedUrl(toYouTubeEmbed(url));
        setVideoType('youtube');
      } else {
        setResolvedUrl(url);
        setVideoType('direct');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapter.video_url, chapter.video_asset_id]);

  if (!resolvedUrl) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-muted">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (videoType === 'youtube') {
    return (
      <iframe
        src={resolvedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={chapter.title}
      />
    );
  }

  return <video src={resolvedUrl} controls controlsList="nodownload" className="w-full h-full" />;
};

const ChapterList = ({ moduleId, courseId, enrolled }: Props) => {
  const { user } = useAuth();

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['module-chapters', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_chapters')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_published', true)
        .order('chapter_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!moduleId,
  });

  const downloadPdf = async (chapter: any) => {
    if (!chapter.pdf_url) return;
    try {
      if (user?.id) {
        supabase
          .from('pdf_download_logs')
          .insert({
            user_id: user.id,
            chapter_id: chapter.id,
            course_id: courseId,
          })
          .then(() => {});
      }
      window.open(chapter.pdf_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('PDF download log failed', err);
      window.open(chapter.pdf_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading chapters…
      </div>
    );
  }

  if (!chapters || chapters.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
        <p className="text-sm font-semibold">Chapters in this module</p>
      </div>
      <ul className="divide-y divide-border">
        {chapters.map((c: any, i: number) => {
          const canSee = enrolled || c.is_preview;
          const hasVideo = !!(c.video_url || c.video_asset_id);
          return (
            <li key={c.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{c.title}</p>
                    {c.is_preview && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent">
                        <Eye className="h-3 w-3" /> Preview
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    {hasVideo && (
                      <span className="inline-flex items-center gap-1">
                        <Play className="h-3 w-3" /> Video
                      </span>
                    )}
                    {c.duration_minutes > 0 && <span>{c.duration_minutes} min</span>}
                  </div>
                </div>

                {c.pdf_url &&
                  (canSee ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      onClick={() => downloadPdf(c)}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" /> Download Notes
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <FileText className="h-3 w-3" /> PDF (enroll to access)
                    </span>
                  ))}
              </div>

              {canSee && hasVideo && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border bg-black aspect-video">
                  <ChapterVideo chapter={c} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChapterList;
