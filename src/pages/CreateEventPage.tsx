import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  ARC_CHAIN_ID,
  CONTRACT_ADDRESS,
  SUPPORTED_TOKENS,
  isContractConfigured,
} from '../lib/config';
import {
  calculatePrizeShares,
  formatBpsAsPercent,
  formatTokenAmount,
  parseTokenAmount,
  percentageToBps,
  validateCreateEventDraft,
  validatePrizeSplitsBps,
} from '../lib/poolMath';
import {
  buildCreateEventArgs,
  useContractAction,
  useTokenMeta,
  useVertokopAbi,
} from '../hooks/useVertokopContract';
import { ConnectPrompt } from '../components/ConnectPrompt';
import { TxStatusBanner } from '../components/TxStatusBanner';

const SPLIT_PRESETS: { label: string; bps: number[] }[] = [
  { label: '100%', bps: [10000] },
  { label: '70 / 30', bps: [7000, 3000] },
  { label: '60 / 30 / 10', bps: [6000, 3000, 1000] },
  { label: '50 / 30 / 20', bps: [5000, 3000, 2000] },
];

export function CreateEventPage() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { abi, abiMap, isReady, error: abiError } = useVertokopAbi();
  const tx = useContractAction();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedToken, setSelectedToken] = useState<`0x${string}`>(
    SUPPORTED_TOKENS[0].address
  );
  const [entryFeeInput, setEntryFeeInput] = useState('');
  const [entrantCapInput, setEntrantCapInput] = useState('16');
  const [deadlineIso, setDeadlineIso] = useState('');
  const [splitsPctInput, setSplitsPctInput] = useState<string[]>(['60', '30', '10']);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const tokenMeta = useTokenMeta(selectedToken);

  const splitsBps = useMemo(
    () =>
      splitsPctInput.map((raw) => {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? percentageToBps(parsed) : 0;
      }),
    [splitsPctInput]
  );

  const splitValidation = useMemo(
    () => validatePrizeSplitsBps(splitsBps),
    [splitsBps]
  );

  const parsedEntryFee = useMemo(
    () => parseTokenAmount(entryFeeInput, tokenMeta.decimals),
    [entryFeeInput, tokenMeta.decimals]
  );

  const previewMaxPool = useMemo(() => {
    const cap = Number(entrantCapInput);
    if (!parsedEntryFee || !Number.isInteger(cap) || cap <= 0) return 0n;
    return parsedEntryFee * BigInt(cap);
  }, [parsedEntryFee, entrantCapInput]);

  const previewShares = useMemo(
    () => calculatePrizeShares(previewMaxPool, splitsBps),
    [previewMaxPool, splitsBps]
  );

  const handleAddPlacement = () => {
    setSplitsPctInput((prev) => [...prev, '0']);
  };

  const handleRemovePlacement = (index: number) => {
    setSplitsPctInput((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePreset = (bpsList: number[]) => {
    setSplitsPctInput(bpsList.map((bps) => String(bps / 100)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    tx.clearStatus();

    const check = validateCreateEventDraft(
      {
        name,
        description,
        entryFeeInput,
        tokenDecimals: tokenMeta.decimals,
        entrantCapInput,
        deadlineIso,
        splitsBps,
      },
      Date.now()
    );

    if (!check.valid) {
      setValidationErrors(check.errors);
      return;
    }
    setValidationErrors([]);

    if (!CONTRACT_ADDRESS || !isReady || !abiMap.createEvent || !parsedEntryFee) {
      setValidationErrors([
        abiError || 'Contract ABI is not available for createEvent.',
      ]);
      return;
    }

    const deadlineSec = BigInt(Math.floor(Date.parse(deadlineIso) / 1000));
    const args = buildCreateEventArgs(abiMap.createEvent, {
      name: name.trim(),
      description: description.trim(),
      token: selectedToken,
      entryFee: parsedEntryFee,
      entrantCap: BigInt(Number(entrantCapInput)),
      deadline: deadlineSec,
      prizeSplitBps: splitsBps.map((b) => BigInt(b)),
    });

    try {
      await tx.execute({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.createEvent.name,
        args,
      });
    } catch {
      // Handled inside TxStatusBanner
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="border-b-[3px] border-[#111111] pb-6 mb-8">
        <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#4f4634] mb-1">
          Organizer Studio
        </p>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#111111]">
          Create An Event
        </h1>
      </div>

      {/* Wallet Gate: hide everything needing a wallet until connected */}
      {!isConnected ? (
        <ConnectPrompt
          title="Connect Wallet To Create An Event"
          description="Connect a wallet on Arc to configure an entry fee pool, set your basis-point prize split, and publish the event on chain."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-[#ffffff] border-2 border-[#111111] rounded p-6 sm:p-8 arena-shadow space-y-6"
            noValidate
          >
            {chainId !== ARC_CHAIN_ID && (
              <div className="border-2 border-[#111111] rounded bg-[#ffc83d] p-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono-tabular text-xs font-bold uppercase text-[#111111]">
                  Wrong network selected
                </p>
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: ARC_CHAIN_ID })}
                  className="arena-btn-dark px-4 py-2 text-xs cursor-pointer"
                >
                  Switch To Arc
                </button>
              </div>
            )}

            {!isContractConfigured && (
              <div className="border-2 border-[#111111] rounded bg-[#f6f3f2] p-4 text-sm text-[#111111]">
                Contract address is not configured in environment variables yet.
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="event-name"
                className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]"
              >
                Event Name
              </label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arc Invitational Cup"
                className="arena-input w-full px-4 py-3 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="event-description"
                className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]"
              >
                Description
              </label>
              <textarea
                id="event-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Format rules, schedule, and how winners are verified."
                className="arena-input w-full px-4 py-3 text-sm"
                required
              />
            </div>

            {/* Token Selector */}
            <div className="space-y-2">
              <span className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]">
                Entry Token
              </span>
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_TOKENS.map((tok) => {
                  const active =
                    selectedToken.toLowerCase() === tok.address.toLowerCase();
                  return (
                    <button
                      key={tok.address}
                      type="button"
                      onClick={() => setSelectedToken(tok.address)}
                      className={`p-3.5 border-2 border-[#111111] rounded text-left cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#111111] text-[#ffffff]'
                          : 'bg-[#ffffff] text-[#111111] hover:bg-[#f6f3f2]'
                      }`}
                    >
                      <span
                        className={`block font-mono-tabular text-sm font-bold ${
                          active ? 'text-[#ffc83d]' : 'text-[#111111]'
                        }`}
                      >
                        {tok.symbol}
                      </span>
                      <span className="block text-xs opacity-80">{tok.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="font-mono-tabular text-[11px] text-[#4f4634]">
                On-chain decimals: {tokenMeta.decimals} · Your balance:{' '}
                {formatTokenAmount(tokenMeta.balance, tokenMeta.decimals)} {tokenMeta.symbol}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="entry-fee"
                  className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]"
                >
                  Entry Fee ({tokenMeta.symbol})
                </label>
                <input
                  id="entry-fee"
                  type="text"
                  inputMode="decimal"
                  value={entryFeeInput}
                  onChange={(e) => setEntryFeeInput(e.target.value)}
                  placeholder="10"
                  className="arena-input w-full px-4 py-3 font-mono-tabular text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="entrant-cap"
                  className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]"
                >
                  Entrant Cap
                </label>
                <input
                  id="entrant-cap"
                  type="number"
                  min={2}
                  step={1}
                  value={entrantCapInput}
                  onChange={(e) => setEntrantCapInput(e.target.value)}
                  className="arena-input w-full px-4 py-3 font-mono-tabular text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="registration-deadline"
                className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]"
              >
                Registration Deadline
              </label>
              <input
                id="registration-deadline"
                type="datetime-local"
                value={deadlineIso}
                onChange={(e) => setDeadlineIso(e.target.value)}
                className="arena-input w-full px-4 py-3 font-mono-tabular text-sm"
                required
              />
            </div>

            {/* Prize Split Builder */}
            <div className="border-t-2 border-[#111111] pt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="block font-mono-tabular text-xs font-bold uppercase text-[#111111]">
                    Prize Split (%)
                  </span>
                  <span className="text-xs text-[#4f4634]">
                    Stored on chain in basis points (100% = 10,000 BPS)
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-xs font-bold px-2.5 py-1 border-2 border-[#111111] rounded-[2px] ${
                    splitValidation.valid
                      ? 'bg-[#ffc83d] text-[#111111]'
                      : 'bg-[#e4002b] text-[#ffffff]'
                  }`}
                >
                  Total: {formatBpsAsPercent(splitValidation.totalBps)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {SPLIT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePreset(preset.bps)}
                    className="px-3 py-1.5 border-2 border-[#111111] rounded bg-[#f6f3f2] hover:bg-[#ffc83d] font-mono-tabular text-xs font-bold text-[#111111] cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5">
                {splitsPctInput.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span
                      className={`w-16 shrink-0 text-center py-2.5 border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold ${
                        idx === 0
                          ? 'bg-[#ffc83d] text-[#111111]'
                          : idx === 1
                            ? 'bg-[#c9ced6] text-[#111111]'
                            : 'bg-[#ffffff] text-[#111111]'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={0.01}
                        max={100}
                        step="0.01"
                        aria-label={`Placement ${idx + 1} percentage`}
                        value={val}
                        onChange={(e) => {
                          const next = [...splitsPctInput];
                          next[idx] = e.target.value;
                          setSplitsPctInput(next);
                        }}
                        className="arena-input w-full px-3 py-2.5 font-mono-tabular text-sm pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-tabular text-xs font-bold text-[#4f4634]">
                        %
                      </span>
                    </div>
                    <span className="w-24 text-right font-mono-tabular text-xs text-[#4f4634] shrink-0">
                      {splitsBps[idx] ?? 0} BPS
                    </span>
                    {splitsPctInput.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePlacement(idx)}
                        aria-label={`Remove placement ${idx + 1}`}
                        className="p-2.5 border-2 border-[#111111] rounded bg-[#ffffff] hover:bg-[#e4002b] hover:text-[#ffffff] cursor-pointer transition-colors"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPlacement}
                className="arena-btn-ghost px-4 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} aria-hidden="true" /> Add Placement
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div
                role="alert"
                className="border-2 border-[#111111] rounded bg-[#f6f3f2] p-4 space-y-1"
              >
                <p className="font-mono-tabular text-xs font-bold uppercase text-[#e4002b]">
                  Fix Form Errors
                </p>
                <ul className="list-disc pl-5 text-sm text-[#111111] space-y-0.5">
                  {validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <TxStatusBanner
              phase={tx.phase}
              txHash={tx.txHash}
              errorMessage={tx.errorMessage}
              actionLabel="Create Event"
              onDismiss={tx.clearStatus}
            />

            {tx.phase === 'confirmed' && (
              <div className="pt-1">
                <Link to="/events" className="arena-btn-dark px-5 py-3 text-xs inline-block">
                  View Events On Chain
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={
                tx.phase === 'pending' ||
                tx.phase === 'confirming' ||
                !isContractConfigured ||
                chainId !== ARC_CHAIN_ID
              }
              className="arena-btn-gold w-full py-3.5 text-sm cursor-pointer"
            >
              {tx.phase === 'pending'
                ? 'Confirm In Wallet'
                : tx.phase === 'confirming'
                  ? 'Confirming On Arc'
                  : 'Create Event On Chain'}
            </button>
          </form>

          {/* Live Configuration Preview */}
          <aside className="lg:col-span-5 bg-[#111111] text-[#ffffff] border-2 border-[#111111] rounded p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#c9ced6]/25 pb-4">
              <p className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[#ffc83d]">
                Pool Configuration Summary
              </p>
              <h2 className="font-display font-bold text-2xl text-[#ffffff] mt-1">
                {name.trim() || 'Untitled Event'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono-tabular">
              <div>
                <p className="text-[11px] uppercase text-[#c9ced6]">Entry Fee</p>
                <p className="text-lg font-bold text-[#ffffff]">
                  {parsedEntryFee !== null
                    ? `${formatTokenAmount(parsedEntryFee, tokenMeta.decimals)} ${tokenMeta.symbol}`
                    : `0 ${tokenMeta.symbol}`}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-[#c9ced6]">Max Pool At Cap</p>
                <p className="text-lg font-bold text-[#ffc83d]">
                  {`${formatTokenAmount(previewMaxPool, tokenMeta.decimals)} ${tokenMeta.symbol}`}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-[#c9ced6]/25 pt-4">
              <p className="font-mono-tabular text-xs uppercase text-[#c9ced6]">
                Payout Schedule At Cap
              </p>
              {splitsBps.map((bps, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3.5 py-2.5 border border-[#c9ced6]/30 rounded bg-[#1b1b1b] font-mono-tabular text-xs"
                >
                  <span className="font-bold text-[#ffffff]">
                    #{idx + 1} · {formatBpsAsPercent(bps)}
                  </span>
                  <span className="font-bold text-[#ffc83d]">
                    {formatTokenAmount(previewShares[idx] ?? 0n, tokenMeta.decimals)}{' '}
                    {tokenMeta.symbol}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
