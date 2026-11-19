import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  deriveEventDisplayStatus,
  formatBpsAsPercent,
  formatTokenAmount,
  shortAddress,
  type VertokopEvent,
} from '../lib/poolMath';
import { useTokenMeta } from '../hooks/useVertokopContract';
import { StatusBadge } from './StatusBadge';

interface EventCardProps {
  event: VertokopEvent;
  nowSeconds: number;
}

export function EventCard({ event, nowSeconds }: EventCardProps) {
  const tokenMeta = useTokenMeta(event.token);
  const displayStatus = deriveEventDisplayStatus(event, nowSeconds);
  const deadlineDate = new Date(Number(event.deadline) * 1000);
  const formattedFee = formatTokenAmount(event.entryFee, tokenMeta.decimals);
  const formattedPool = formatTokenAmount(event.totalPool, tokenMeta.decimals);

  return (
    <Link
      to={`/events/${event.id.toString()}`}
      className="group block bg-[#ffffff] border-2 border-[#111111] rounded p-5 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#111111]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="font-mono-tabular text-xs font-bold text-[#4f4634]">
          Event #{event.id.toString()} · {tokenMeta.symbol}
        </span>
        <StatusBadge status={displayStatus} />
      </div>

      <h3 className="font-display font-bold text-xl text-[#111111] mb-2 group-hover:underline">
        {event.name}
      </h3>
      <p className="text-sm text-[#4f4634] line-clamp-2 mb-5 min-h-[40px]">
        {event.description || 'No description provided.'}
      </p>

      <div className="grid grid-cols-2 gap-3 border-t-2 border-[#111111] pt-4 mb-4">
        <div>
          <p className="font-mono-tabular text-[11px] uppercase text-[#4f4634]">
            Current Pool
          </p>
          <p className="font-mono-tabular text-base font-bold text-[#111111]">
            {formattedPool} {tokenMeta.symbol}
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-[11px] uppercase text-[#4f4634]">
            Entry Fee
          </p>
          <p className="font-mono-tabular text-base font-bold text-[#111111]">
            {formattedFee} {tokenMeta.symbol}
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-[11px] uppercase text-[#4f4634]">
            Entrants
          </p>
          <p className="font-mono-tabular text-sm font-bold text-[#111111]">
            {event.entrantCount} / {event.entrantCap}
          </p>
        </div>
        <div>
          <p className="font-mono-tabular text-[11px] uppercase text-[#4f4634]">
            Prize Split
          </p>
          <p className="font-mono-tabular text-sm font-bold text-[#111111] truncate">
            {event.prizeSplitBps.length > 0
              ? event.prizeSplitBps.map((b) => formatBpsAsPercent(b)).join(' / ')
              : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs font-mono-tabular text-[#4f4634] border-t border-[#e5e2e1] pt-3">
        <span>
          By {shortAddress(event.organizer)} ·{' '}
          {Number(event.deadline) > 0
            ? deadlineDate.toLocaleDateString()
            : 'No deadline'}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-[#111111]">
          Open <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
