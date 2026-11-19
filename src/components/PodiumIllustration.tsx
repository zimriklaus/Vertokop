export function PodiumIllustration() {
  return (
    <div
      className="bg-[#1b1b1b] border-2 border-[#c9ced6]/30 rounded p-6 sm:p-8"
      aria-label="Prize pool podium payout structure diagram"
    >
      <div className="flex items-center justify-between border-b border-[#c9ced6]/20 pb-4 mb-6">
        <span className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffc83d]">
          Podium Payout Layout
        </span>
        <span className="font-mono-tabular text-xs uppercase text-[#c9ced6]">
          Basis Points Escrow
        </span>
      </div>

      {/* Architectural podium blocks - layout illustration only, no invented names or amounts */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end h-[220px] pt-6">
        {/* 2nd Place */}
        <div className="flex flex-col justify-end h-full">
          <div className="mb-2 text-center">
            <span className="font-mono-tabular text-xs font-bold uppercase text-[#c9ced6]">
              Rank 02
            </span>
          </div>
          <div className="bg-[#c9ced6] text-[#111111] border-2 border-[#111111] rounded-t p-3 h-[126px] flex flex-col justify-between">
            <span className="font-display font-extrabold text-2xl sm:text-3xl leading-none">
              #2
            </span>
            <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider">
              Silver Share
            </span>
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col justify-end h-full">
          <div className="mb-2 text-center">
            <span className="font-mono-tabular text-xs font-bold uppercase text-[#ffc83d]">
              Rank 01
            </span>
          </div>
          <div className="bg-[#ffc83d] text-[#111111] border-2 border-[#111111] rounded-t p-3 h-[170px] flex flex-col justify-between shadow-[0_-4px_0_0_rgba(255,200,61,0.25)]">
            <span className="font-display font-extrabold text-3xl sm:text-4xl leading-none">
              #1
            </span>
            <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider">
              Top Share
            </span>
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col justify-end h-full">
          <div className="mb-2 text-center">
            <span className="font-mono-tabular text-xs font-bold uppercase text-[#ffffff]">
              Rank 03
            </span>
          </div>
          <div className="bg-[#ffffff] text-[#111111] border-2 border-[#111111] rounded-t p-3 h-[92px] flex flex-col justify-between">
            <span className="font-display font-extrabold text-2xl sm:text-3xl leading-none">
              #3
            </span>
            <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider">
              Third Share
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-[#c9ced6]/20 flex flex-wrap items-center justify-between gap-2 text-xs text-[#c9ced6] font-mono-tabular">
        <span>Total Splits = 10,000 BPS</span>
        <span className="text-[#ffc83d]">100% Paid From Pool</span>
      </div>
    </div>
  );
}
