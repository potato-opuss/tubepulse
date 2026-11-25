import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, EmptyState } from '../components/ui';

export function VideosPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <PageHeader title="Videos" description="Per-video performance and estimated value." />

      <EmptyState
        icon={Video}
        title="No videos yet"
        description="Once a channel is connected, each video's views and estimated revenue range will appear here. TubePulse needs 7 days of data per video before estimating."
        action={<Button onClick={() => navigate('/settings')}>Connect channel</Button>}
      />
    </section>
  );
}
