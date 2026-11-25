import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Banner, Button, EmptyState } from '../components/ui';

export function OverviewPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <PageHeader title="Overview" description="Channel health at a glance." />

      <Banner tone="info" title="Estimates, not guarantees">
        Revenue figures will be shown as low–high estimates until the YouTube Analytics API is
        connected. Nothing here is a promise of future earnings.
      </Banner>

      <EmptyState
        icon={Activity}
        title="Not enough data yet"
        description="TubePulse needs at least 7 days of channel data before it can show trends or revenue estimates. Connect your channel in Settings to start collecting daily snapshots."
        action={<Button onClick={() => navigate('/settings')}>Open Settings</Button>}
      />
    </section>
  );
}
