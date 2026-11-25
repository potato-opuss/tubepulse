import { Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, EmptyState } from '../components/ui';

export function InsightsPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <PageHeader title="Insights" description="Plain-language patterns, with the math explained." />

      <EmptyState
        icon={Lightbulb}
        title="Not enough data yet"
        description="Insights compare periods and need at least 7 days of history before saying anything useful. Each insight will include a “How is this calculated?” explanation."
        action={<Button onClick={() => navigate('/settings')}>Add data source</Button>}
      />
    </section>
  );
}
