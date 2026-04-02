import { Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CommunityDashboardCard = () => {
  const { data: links } = useQuery({
    queryKey: ['community-links'],
    queryFn: async () => {
      const { data } = await supabase.from('platform_settings').select('key, value')
        .in('key', ['telegram_community_link', 'whatsapp_community_link']);
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  const telegram = links?.telegram_community_link;
  const whatsapp = links?.whatsapp_community_link;

  if (!telegram && !whatsapp) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-sm font-600">Join Our Community</h3>
      </div>
      <p className="text-xs text-muted-foreground">Connect with fellow learners</p>
      <div className="flex gap-2">
        {telegram && (
          <Button size="sm" variant="outline" className="rounded-md text-xs flex-1" onClick={() => window.open(telegram, '_blank')}>
            📱 Telegram <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
        {whatsapp && (
          <Button size="sm" variant="outline" className="rounded-md text-xs flex-1" onClick={() => window.open(whatsapp, '_blank')}>
            💬 WhatsApp <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CommunityDashboardCard;
