import { useEffect, useRef } from 'react';
import { Users, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CommunityLink {
  id: string;
  title: string;
  url: string;
  type: string;
  description?: string;
}

interface Props {
  title: string;
  description?: string;
  resources: CommunityLink[];
  onAutoComplete: () => void;
  isCompleted: boolean;
}

const CommunityModuleView = ({ title, description, resources, onAutoComplete, isCompleted }: Props) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: platformLinks } = useQuery({
    queryKey: ['community-links'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value')
        .in('key', ['telegram_community_link', 'whatsapp_community_link', 'community_description']);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  useEffect(() => {
    if (!isCompleted) {
      timerRef.current = setTimeout(() => onAutoComplete(), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isCompleted, onAutoComplete]);

  // Use course-specific community links if available, else platform defaults
  const communityLinks = resources?.filter(r => r.type === 'community_link') || [];
  const hasCourseLinks = communityLinks.length > 0;

  const telegramLink = hasCourseLinks
    ? communityLinks.find(l => l.title?.toLowerCase().includes('telegram'))?.url
    : platformLinks?.telegram_community_link;
  const whatsappLink = hasCourseLinks
    ? communityLinks.find(l => l.title?.toLowerCase().includes('whatsapp'))?.url
    : platformLinks?.whatsapp_community_link;
  const communityDesc = description || platformLinks?.community_description || '';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-4">
        <Users className="h-16 w-16 text-primary mx-auto" />
        <h1 className="font-heading text-2xl font-700">👥 You've Unlocked Community Access!</h1>
        {communityDesc && <p className="text-sm text-muted-foreground max-w-lg mx-auto">{communityDesc}</p>}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {telegramLink && (
            <Button size="lg" className="rounded-md bg-[hsl(200,80%,45%)] hover:bg-[hsl(200,80%,40%)] text-white" onClick={() => window.open(telegramLink, '_blank')}>
              📱 Join Telegram <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          )}
          {whatsappLink && (
            <Button size="lg" className="rounded-md bg-primary hover:bg-primary/90" onClick={() => window.open(whatsappLink, '_blank')}>
              <MessageCircle className="h-4 w-4 mr-1" /> Join WhatsApp <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {!isCompleted && (
          <p className="text-xs text-muted-foreground">✓ Auto-marked complete in 3 seconds</p>
        )}
      </div>
    </div>
  );
};

export default CommunityModuleView;
