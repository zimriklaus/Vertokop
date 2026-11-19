import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ConnectPrompt } from '../components/ConnectPrompt';
import { EventCard } from '../components/EventCard';
import { useMyEvents } from '../hooks/useVertokopContract';
import { shortAddress } from '../lib/poolMath';

export function MyEventsPage() {
  const { address, isConnected } = useAccount();
  const { organizedEvents, enteredEvents, isLoading } = useMyEvents();
  const [activeTab, setActiveTab] = useState<'organized' | 'entered'>('organized');

  const nowSeconds = Math.floor(Date.now() / 1000);
  const activeList = activeTab === 'organized' ? organizedEvents : enteredEvents;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="border-b-[3px] border-[#111111] pb-6 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-1">
            Connected Wallet Activity
          </p>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#111111]">
            My Events
          </h1>
        </div>
        {isConnected && address && (
          <span className="font-mono-tabular text-xs font-bold px-3 py-2 border-2 border-[#111111] rounded bg-[#f6f3f2] text-[#111111]">
            Wallet: {shortAddress(address)}
          </span>
        )}
      </div>

      {/* Wallet Gate: hide wallet-specific data until connected */}
      {!isConnected ? (
        <ConnectPrompt
          title="Connect Wallet To View Your Events"
          description="Only events created or joined by your connected wallet are shown here. Connect your wallet to load your on-chain history."
        />
      ) : (
        <div className="space-y-8">
          {/* Segmented Tabs */}
          <div className="inline-flex border-2 border-[#111111] rounded overflow-hidden bg-[#ffffff]">
            <button
              type="button"
              onClick={() => setActiveTab('organized')}
              className={`px-5 py-3 font-mono-tabular text-xs font-bold uppercase cursor-pointer transition-colors ${
                activeTab === 'organized'
                  ? 'bg-[#111111] text-[#ffc83d]'
                  : 'bg-[#ffffff] text-[#111111] hover:bg-[#f6f3f2]'
              }`}
            >
              Organized ({organizedEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('entered')}
              className={`px-5 py-3 font-mono-tabular text-xs font-bold uppercase border-l-2 border-[#111111] cursor-pointer transition-colors ${
                activeTab === 'entered'
                  ? 'bg-[#111111] text-[#ffc83d]'
                  : 'bg-[#ffffff] text-[#111111] hover:bg-[#f6f3f2]'
              }`}
            >
              Entered ({enteredEvents.length})
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[0, 1].map((n) => (
                <div
                  key={n}
                  className="border-2 border-[#111111] rounded p-5 bg-[#ffffff] animate-pulse h-56"
                />
              ))}
            </div>
          ) : activeList.length === 0 ? (
            <div className="border-[3px] border-[#111111] rounded p-10 bg-[#ffffff] arena-shadow text-center max-w-xl">
              <h2 className="font-display font-extrabold text-2xl text-[#111111] mb-3">
                {activeTab === 'organized'
                  ? 'No Organized Events Yet'
                  : 'No Entered Events Yet'}
              </h2>
              <p className="text-sm sm:text-base text-[#4f4634] mb-6">
                {activeTab === 'organized'
                  ? 'Events you create with your connected wallet will appear here for winner declaration and management.'
                  : 'Events you join with your connected wallet will appear here so you can track payouts or claim refunds.'}
              </p>
              <Link
                to={activeTab === 'organized' ? '/create' : '/events'}
                className="arena-btn-gold px-6 py-3 text-xs inline-block"
              >
                {activeTab === 'organized' ? 'Create An Event' : 'Browse Events'}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeList.map((event) => (
                <EventCard
                  key={event.id.toString()}
                  event={event}
                  nowSeconds={nowSeconds}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
