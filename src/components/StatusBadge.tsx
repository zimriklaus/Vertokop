import type { EventDisplayStatus } from '../lib/poolMath';

interface StatusBadgeProps {
  status: EventDisplayStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 bg-[#e4002b] text-[#ffffff] border-2 border-[#111111] rounded-[2px] font-mono-tabular text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        Cancelled
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 bg-[#111111] text-[#ffffff] border-2 border-[#111111] rounded-[2px] font-mono-tabular text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        Completed
      </span>
    );
  }
  if (status === 'CLOSED') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 bg-[#c9ced6] text-[#111111] border-2 border-[#111111] rounded-[2px] font-mono-tabular text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
        Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 bg-[#ffc83d] text-[#111111] border-2 border-[#111111] rounded-[2px] font-mono-tabular text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0">
      Open
    </span>
  );
}
