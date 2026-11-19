import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { PodiumIllustration } from '../components/PodiumIllustration';
import { usePlatformStats } from '../hooks/useVertokopContract';

const ABOUT_STEPS = [
  {
    num: '01',
    title: 'Entry Fee Escrow',
    body: 'An organizer creates an event with an entry fee in USDC or EURC, an entrant cap, a registration deadline, and a fixed prize split. Every player pays the exact fee into the contract pool.',
  },
  {
    num: '02',
    title: 'Locked Basis Point Split',
    body: 'Prize splits are stored on chain in basis points totaling 10,000 (100%). Percentages are fixed before the first player joins so payout terms cannot shift mid-event.',
  },
  {
    num: '03',
    title: 'Organizer Winner Payouts',
    body: 'When the event finishes, the organizer declares the winning addresses on chain. The contract pays every winner directly from the pool in that same transaction.',
  },
  {
    num: '04',
    title: 'Cancellation Refunds',
    body: 'If the organizer cancels an event before declaring winners, the pool stops accepting entries and every entrant can claim a full refund of their entry fee.',
  },
];

const ROADMAP_PHASES = [
  {
    phase: 'Phase 1',
    state: 'Live',
    title: 'Core Events Live',
    description:
      'Event creation with USDC and EURC pools, basis-point splits, entrant caps, organizer winner payouts, and full cancellation refunds.',
  },
  {
    phase: 'Phase 2',
    state: 'Next',
    title: 'Organizer Deposits And Reputation',
    description:
      'Optional organizer security deposits alongside verifiable on-chain history of settled events and refund records.',
  },
  {
    phase: 'Phase 3',
    state: 'Planned',
    title: 'Brackets And Match Reporting',
    description:
      'Structured single and double elimination bracket views with round-by-round match result submissions.',
  },
  {
    phase: 'Phase 4',
    state: 'Planned',
    title: 'Multi Organizer Events',
    description:
      'Shared tournament committees allowing multiple designated judges to co-sign final winner declarations.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Who decides the winners',
    answer:
      'The organizer wallet that created the event declares the winning addresses once the competition ends. The contract validates that winners match the split count and distributes the pool immediately.',
  },
  {
    question: 'What if an event is cancelled',
    answer:
      'If the organizer cancels an event before winners are declared, the event status switches to Cancelled and every entrant can claim a 100% refund of their entry fee from the contract.',
  },
  {
    question: 'Can I leave after joining',
    answer:
      'No. Once you approve the token transfer and join an active pool, your entry fee remains locked inside the contract until the organizer declares winners or cancels the event.',
  },
  {
    question: 'When are prizes paid',
    answer:
      'Prizes pay out directly from the pool in the exact same transaction when the organizer calls declare winners on chain.',
  },
];

export function HomePage() {
  const { stats, isLoading: statsLoading } = usePlatformStats();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[#111111] text-[#ffffff] border-b-4 border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-widest text-[#ffc83d]">
              Built on Arc
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-6xl leading-[1.04] tracking-tight text-[#ffffff]">
              Prize Pools Built On Arc
            </h1>
            <p className="text-base sm:text-lg text-[#c9ced6] max-w-2xl leading-relaxed">
              Organize competitions with an entry fee in USDC or EURC and a fixed basis-point prize split. Players fund the pool on chain, organizers declare winners, and payouts settle directly.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/create"
                className="arena-btn-gold px-6 py-3.5 text-xs inline-flex items-center gap-2 whitespace-nowrap"
              >
                Create An Event <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link
                to="/events"
                className="inline-flex items-center gap-2 px-6 py-3.5 border-2 border-[#ffffff] rounded font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffffff] hover:bg-[#ffffff] hover:text-[#111111] transition-colors whitespace-nowrap"
              >
                Browse Events
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <PodiumIllustration />
          </div>
        </div>
      </section>

      {/* Platform Stats Strip */}
      <section className="bg-[#ffffff] border-b-[3px] border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-[#111111]">
              Platform Totals
            </h2>
            <span className="font-mono-tabular text-xs uppercase text-[#4f4634]">
              Available on Arc
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 border-2 border-[#111111] rounded overflow-hidden">
            <div className="p-5 bg-[#ffffff] border-b-2 lg:border-b-0 border-r-2 border-[#111111]">
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#4f4634] mb-1">
                Total Events
              </p>
              <p className="font-mono-tabular text-3xl font-bold text-[#111111]">
                {statsLoading ? '—' : stats.totalEvents}
              </p>
            </div>
            <div className="p-5 bg-[#ffc83d]/15 border-b-2 lg:border-b-0 lg:border-r-2 border-[#111111]">
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#4f4634] mb-1">
                Active Pools
              </p>
              <p className="font-mono-tabular text-3xl font-bold text-[#111111]">
                {statsLoading ? '—' : stats.activeEvents}
              </p>
            </div>
            <div className="p-5 bg-[#ffffff] border-r-2 border-[#111111]">
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#4f4634] mb-1">
                Completed Events
              </p>
              <p className="font-mono-tabular text-3xl font-bold text-[#111111]">
                {statsLoading ? '—' : stats.completedEvents}
              </p>
            </div>
            <div className="p-5 bg-[#f6f3f2]">
              <p className="font-mono-tabular text-[11px] uppercase tracking-wider text-[#4f4634] mb-1">
                Total Entrants
              </p>
              <p className="font-mono-tabular text-3xl font-bold text-[#111111]">
                {statsLoading ? '—' : stats.totalEntrants}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-[#fcf9f8] border-b-[3px] border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="max-w-2xl mb-10">
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-2">
              How Vertokop Works
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#111111]">
              How The Pool Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ABOUT_STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-[#ffffff] border-2 border-[#111111] rounded p-6 arena-shadow-sm"
              >
                <div className="flex items-center justify-between border-b-2 border-[#111111] pb-3 mb-4">
                  <span className="font-mono-tabular text-sm font-bold text-[#111111] bg-[#ffc83d] px-2.5 py-0.5 border border-[#111111] rounded-[2px]">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl text-[#111111] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-[#4f4634] leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="bg-[#ffffff] border-b-[3px] border-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="max-w-2xl mb-10">
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-2">
              Development Milestones
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#111111]">
              Product Roadmap
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROADMAP_PHASES.map((item, idx) => (
              <div
                key={item.phase}
                className={`border-2 border-[#111111] rounded p-5 flex flex-col justify-between ${
                  idx === 0 ? 'bg-[#111111] text-[#ffffff]' : 'bg-[#ffffff] text-[#111111]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`font-mono-tabular text-xs font-bold uppercase ${
                        idx === 0 ? 'text-[#ffc83d]' : 'text-[#4f4634]'
                      }`}
                    >
                      {item.phase}
                    </span>
                    <span
                      className={`font-mono-tabular text-[11px] font-bold uppercase px-2 py-0.5 rounded-[2px] border ${
                        idx === 0
                          ? 'bg-[#ffc83d] text-[#111111] border-[#ffc83d]'
                          : idx === 1
                            ? 'bg-[#c9ced6] text-[#111111] border-[#111111]'
                            : 'bg-[#f6f3f2] text-[#111111] border-[#111111]'
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-lg mb-2">
                    {item.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      idx === 0 ? 'text-[#c9ced6]' : 'text-[#4f4634]'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-[#fcf9f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="max-w-2xl mb-10">
            <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-2">
              Rules And Settlement
            </p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#111111]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={item.question}
                  className="bg-[#ffffff] border-2 border-[#111111] rounded overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-[#f6f3f2] transition-colors"
                  >
                    <span className="font-display font-bold text-base sm:text-lg text-[#111111]">
                      {item.question}
                    </span>
                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className={`shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t-2 border-[#111111] bg-[#ffffff] text-sm sm:text-base text-[#4f4634] leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
