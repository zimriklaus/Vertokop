import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { useAllEvents } from '../hooks/useVertokopContract';
import { EventCard } from '../components/EventCard';
import { SUPPORTED_TOKENS, isContractConfigured } from '../lib/config';
import { filterEvents, type EventDisplayStatus } from '../lib/poolMath';

const STATUS_OPTIONS: { value: 'ALL' | EventDisplayStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function BrowseEventsPage() {
  const { events, isLoading, error } = useAllEvents();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventDisplayStatus>('ALL');
  const [tokenFilter, setTokenFilter] = useState<'ALL' | string>('ALL');

  const nowSeconds = Math.floor(Date.now() / 1000);

  const filteredEvents = useMemo(
    () =>
      filterEvents(events, {
        search,
        statusFilter,
        tokenFilter,
        nowSeconds,
      }),
    [events, search, statusFilter, tokenFilter, nowSeconds]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-[3px] border-[#111111] pb-6 mb-8">
        <div>
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-1">
            Available on Arc
          </p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#111111]">
            Browse Events
          </h1>
        </div>
        <Link
          to="/create"
          className="arena-btn-gold px-5 py-3 text-xs inline-flex items-center gap-2 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus size={15} aria-hidden="true" /> Create Event
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-[#f6f3f2] border-2 border-[#111111] rounded p-4 sm:p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-5 relative">
            <label htmlFor="event-search" className="sr-only">
              Search events
            </label>
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4f4634]"
              aria-hidden="true"
            />
            <input
              id="event-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event name, description, or ID"
              className="arena-input w-full pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="lg:col-span-4 flex flex-wrap items-center gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-2 border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer transition-colors whitespace-nowrap ${
                  statusFilter === opt.value
                    ? 'bg-[#111111] text-[#ffc83d]'
                    : 'bg-[#ffffff] text-[#111111] hover:bg-[#e5e2e1]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 flex flex-wrap items-center lg:justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setTokenFilter('ALL')}
              className={`px-3 py-2 border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer transition-colors whitespace-nowrap ${
                tokenFilter === 'ALL'
                  ? 'bg-[#ffc83d] text-[#111111]'
                  : 'bg-[#ffffff] text-[#111111] hover:bg-[#e5e2e1]'
              }`}
            >
              All Tokens
            </button>
            {SUPPORTED_TOKENS.map((tok) => (
              <button
                key={tok.address}
                type="button"
                onClick={() => setTokenFilter(tok.address)}
                className={`px-3 py-2 border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer transition-colors whitespace-nowrap ${
                  tokenFilter.toLowerCase() === tok.address.toLowerCase()
                    ? 'bg-[#ffc83d] text-[#111111]'
                    : 'bg-[#ffffff] text-[#111111] hover:bg-[#e5e2e1]'
                }`}
              >
                {tok.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((n) => (
            <div
              key={n}
              className="border-2 border-[#111111] rounded p-5 bg-[#ffffff] animate-pulse space-y-4"
            >
              <div className="h-4 w-1/3 bg-[#e5e2e1] rounded" />
              <div className="h-6 w-3/4 bg-[#e5e2e1] rounded" />
              <div className="h-10 w-full bg-[#f0edec] rounded" />
              <div className="h-20 w-full bg-[#f6f3f2] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && isContractConfigured && (
        <div className="border-2 border-[#111111] rounded p-8 bg-[#ffffff] text-center max-w-xl mx-auto">
          <span className="inline-block px-2.5 py-1 bg-[#e4002b] text-[#ffffff] rounded-[2px] font-mono-tabular text-xs font-bold uppercase mb-3">
            Read Error
          </span>
          <h2 className="font-display font-bold text-2xl text-[#111111] mb-2">
            Could Not Load Contract Events
          </h2>
          <p className="text-sm text-[#4f4634] break-all">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredEvents.length === 0 && (
        <div className="border-[3px] border-[#111111] rounded p-10 bg-[#ffffff] text-center max-w-xl mx-auto arena-shadow">
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111111] mb-3">
            {events.length === 0 ? 'No Events On Chain Yet' : 'No Matching Events'}
          </h2>
          <p className="text-sm sm:text-base text-[#4f4634] mb-6 leading-relaxed">
            {events.length === 0
              ? 'No prize pool events have been created on the deployed contract yet. Be the first organizer to launch one.'
              : 'Try clearing your search query or switching status and token filters.'}
          </p>
          {events.length === 0 ? (
            <Link to="/create" className="arena-btn-gold px-6 py-3 text-xs inline-block">
              Create An Event
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setTokenFilter('ALL');
              }}
              className="arena-btn-dark px-6 py-3 text-xs cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id.toString()} event={event} nowSeconds={nowSeconds} />
          ))}
        </div>
      )}
    </div>
  );
}
