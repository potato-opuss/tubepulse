import { Youtube } from 'lucide-react';
import type { Channel } from '../../lib/youtube/types';
import { formatCount, formatSubscribers } from '../../lib/format';
import { Badge, Card } from '../ui';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 px-2 py-2.5 text-center">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export function ChannelResultCard({ channel }: { channel: Channel }) {
  return (
    <Card className="space-y-4" aria-label="Channel test result">
      <div className="flex items-center gap-3">
        {channel.thumbnailUrl ? (
          <img
            src={channel.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-12 w-12 shrink-0 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-line/30 text-muted">
            <Youtube className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{channel.title}</p>
          <p className="truncate text-xs text-muted">
            {channel.handle ?? channel.id}
          </p>
        </div>
        <Badge tone="real">Real</Badge>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Metric
          label="Subscribers"
          value={formatSubscribers(channel.subscriberCount, channel.subscribersIsRounded)}
        />
        <Metric
          label="Views"
          value={channel.viewCount === null ? '—' : formatCount(channel.viewCount)}
        />
        <Metric
          label="Videos"
          value={channel.videoCount === null ? '—' : formatCount(channel.videoCount)}
        />
      </dl>

      {channel.subscriberCount === null ? (
        <p className="text-xs text-muted">
          This channel hides its subscriber count, so TubePulse shows “Hidden” instead of a number.
        </p>
      ) : channel.subscribersIsRounded ? (
        <p className="text-xs text-muted">
          “≈” means YouTube publicly rounds subscriber counts above 1,000. TubePulse cannot see the
          exact number.
        </p>
      ) : null}
    </Card>
  );
}
