import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, X } from 'lucide-react';
import { VertokopLogo } from './VertokopLogo';
import { shortAddress } from '../lib/poolMath';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Browse Events', end: false },
  { to: '/create', label: 'Create Event', end: false },
  { to: '/my-events', label: 'My Events', end: false },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#ffffff] border-b-[3px] border-[#111111]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-[68px] sm:h-[72px] flex items-center justify-between gap-2 sm:gap-6 md:gap-8">
        {/* Zone 1: Brand wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#111111] focus-visible:outline-offset-2 rounded"
        >
          <VertokopLogo size={30} className="sm:w-[34px] sm:h-[34px]" />
          <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-[#111111]">
            Vertokop
          </span>
        </Link>

        {/* Zone 2: Primary navigation */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `font-mono-tabular text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  isActive
                    ? 'text-[#111111] border-[#ffc83d]'
                    : 'text-[#4f4634] border-transparent hover:text-[#111111] hover:border-[#111111]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Wallet action */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              mounted,
            }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  className="flex items-center gap-2"
                  aria-hidden={!ready ? 'true' : undefined}
                >
                  {!connected ? (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="arena-btn-gold px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Connect Wallet
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      type="button"
                      onClick={openChainModal}
                      className="bg-[#e4002b] text-white border-2 border-[#111111] rounded px-3 sm:px-4 py-2 sm:py-2.5 font-mono-tabular text-[11px] sm:text-xs font-bold uppercase whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Switch To Arc
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openChainModal}
                        className="hidden sm:inline-flex items-center px-3 py-2.5 bg-[#f6f3f2] border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold text-[#111111] whitespace-nowrap shrink-0 cursor-pointer hover:bg-[#e5e2e1]"
                      >
                        {chain.name}
                      </button>
                      <button
                        type="button"
                        onClick={openAccountModal}
                        className="arena-btn-dark px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {shortAddress(account.address)}
                      </button>
                    </div>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 border-2 border-[#111111] rounded bg-white text-[#111111] cursor-pointer"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t-2 border-[#111111] bg-[#ffffff] px-4 py-4 flex flex-col gap-2"
          aria-label="Mobile navigation"
        >
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 border-2 rounded font-mono-tabular text-xs font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-[#ffc83d] border-[#111111] text-[#111111]'
                    : 'bg-white border-transparent text-[#111111] hover:border-[#111111]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
