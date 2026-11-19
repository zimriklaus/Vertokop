import { Link } from 'react-router-dom';
import { VertokopLogo } from './VertokopLogo';

export function Footer() {
  return (
    <footer className="bg-[#111111] text-[#ffffff] border-t-4 border-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <VertokopLogo size={36} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-display font-bold text-base text-[#ffffff]">
              Built by Zimri
            </p>
            <p className="text-xs text-[#c9ced6]">
              Vertokop is an independent project built on Arc.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-6" aria-label="Footer navigation">
          <Link
            to="/"
            className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffffff] hover:text-[#ffc83d] transition-colors whitespace-nowrap"
          >
            Home
          </Link>
          <Link
            to="/events"
            className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffffff] hover:text-[#ffc83d] transition-colors whitespace-nowrap"
          >
            Browse Events
          </Link>
          <Link
            to="/create"
            className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffffff] hover:text-[#ffc83d] transition-colors whitespace-nowrap"
          >
            Create Event
          </Link>
          <Link
            to="/my-events"
            className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffffff] hover:text-[#ffc83d] transition-colors whitespace-nowrap"
          >
            My Events
          </Link>
        </nav>
      </div>
    </footer>
  );
}
