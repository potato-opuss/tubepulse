import { DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, EmptyState } from '../components/ui';

export function RevenuePage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <PageHeader title="Revenue" description="Estimated and real earnings in USD and TRY." />

      <EmptyState
        icon={DollarSign}
        title="Not enough data yet"
        description="Revenue estimates need at least 7 days of views and RPM inputs. Real earnings require the YouTube Analytics API. Add your API key in Settings to get started."
        action={<Button onClick={() => navigate('/settings')}>Add API key</Button>}
      />
    </section>
  );
}
