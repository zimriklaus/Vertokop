import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { isAddress } from 'viem';
import { useAccount, useSwitchChain } from 'wagmi';
import {
  ARC_CHAIN_ID,
  CONTRACT_ADDRESS,
  getExplorerAddressUrl,
} from '../lib/config';
import { ERC20_ABI } from '../lib/abiLoader';
import {
  calculatePrizeShares,
  deriveEventDisplayStatus,
  formatBpsAsPercent,
  formatTokenAmount,
  shortAddress,
} from '../lib/poolMath';
import {
  useContractAction,
  useEventDetail,
  useTokenMeta,
  useVertokopAbi,
} from '../hooks/useVertokopContract';
import { StatusBadge } from '../components/StatusBadge';
import { ConnectPrompt } from '../components/ConnectPrompt';
import { TxStatusBanner } from '../components/TxStatusBanner';

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { abi, abiMap } = useVertokopAbi();
  const {
    event,
    entrants,
    hasJoined,
    hasClaimedRefund,
    isLoading,
    error,
    refetch,
  } = useEventDetail(id);

  const tokenMeta = useTokenMeta(event?.token);
  const approveTx = useContractAction();
  const actionTx = useContractAction();

  const [winnerInputs, setWinnerInputs] = useState<string[]>([]);
  const [winnerValidationError, setWinnerValidationError] = useState<string | null>(
    null
  );
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    if (event && event.prizeSplitBps.length > 0 && winnerInputs.length === 0) {
      setWinnerInputs(event.prizeSplitBps.map((_, idx) => entrants[idx] ?? ''));
    }
  }, [event, entrants, winnerInputs.length]);

  useEffect(() => {
    if (approveTx.phase === 'confirmed' || actionTx.phase === 'confirmed') {
      refetch();
    }
  }, [approveTx.phase, actionTx.phase, refetch]);

  const nowSeconds = Math.floor(Date.now() / 1000);

  const displayStatus = useMemo(
    () => (event ? deriveEventDisplayStatus(event, nowSeconds) : 'OPEN'),
    [event, nowSeconds]
  );

  const prizeShares = useMemo(
    () =>
      event
        ? calculatePrizeShares(event.totalPool, event.prizeSplitBps)
        : [],
    [event]
  );

  const isOrganizer = Boolean(
    isConnected &&
      connectedAddress &&
      event &&
      connectedAddress.toLowerCase() === event.organizer.toLowerCase()
  );

  const needsApproval = Boolean(
    event && tokenMeta.allowance < event.entryFee
  );

  const handleApprove = async () => {
    if (!event || !CONTRACT_ADDRESS) return;
    approveTx.clearStatus();
    try {
      await approveTx.execute({
        address: event.token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, event.entryFee],
      });
    } catch {
      // Displayed via TxStatusBanner
    }
  };

  const handleJoin = async () => {
    if (!event || !CONTRACT_ADDRESS || !abiMap.joinEvent) return;
    actionTx.clearStatus();
    try {
      await actionTx.execute({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.joinEvent.name,
        args: [event.id],
      });
    } catch {
      // Displayed via TxStatusBanner
    }
  };

  const handleClaimRefund = async () => {
    if (!event || !CONTRACT_ADDRESS || !abiMap.claimRefund) return;
    actionTx.clearStatus();
    try {
      await actionTx.execute({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.claimRefund.name,
        args: [event.id],
      });
    } catch {
      // Displayed via TxStatusBanner
    }
  };

  const handleDeclareWinners = async () => {
    if (!event || !CONTRACT_ADDRESS || !abiMap.declareWinners) return;
    setWinnerValidationError(null);

    if (winnerInputs.length !== event.prizeSplitBps.length) {
      setWinnerValidationError('Winner count must match the prize split count.');
      return;
    }

    const cleaned = winnerInputs.map((w) => w.trim());
    for (let i = 0; i < cleaned.length; i++) {
      if (!isAddress(cleaned[i])) {
        setWinnerValidationError(`Placement #${i + 1} is not a valid address.`);
        return;
      }
    }

    const unique = new Set(cleaned.map((w) => w.toLowerCase()));
    if (unique.size !== cleaned.length) {
      setWinnerValidationError('Winner addresses must be distinct.');
      return;
    }

    actionTx.clearStatus();
    try {
      await actionTx.execute({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.declareWinners.name,
        args: [event.id, cleaned as `0x${string}`[]],
      });
    } catch {
      // Displayed via TxStatusBanner
    }
  };

  const handleCancelEvent = async () => {
    if (!event || !CONTRACT_ADDRESS || !abiMap.cancelEvent) return;
    actionTx.clearStatus();
    try {
      await actionTx.execute({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.cancelEvent.name,
        args: [event.id],
      });
      setConfirmingCancel(false);
    } catch {
      // Displayed via TxStatusBanner
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-6 w-40 bg-[#e5e2e1] rounded animate-pulse" />
        <div className="h-12 w-2/3 bg-[#e5e2e1] rounded animate-pulse" />
        <div className="h-44 w-full bg-[#f6f3f2] border-2 border-[#111111] rounded animate-pulse" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 font-mono-tabular text-xs font-bold uppercase text-[#111111] hover:underline mb-6"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back To Browse Events
        </Link>
        <div className="border-[3px] border-[#111111] rounded p-8 bg-[#ffffff] arena-shadow text-center">
          <h1 className="font-display font-extrabold text-3xl text-[#111111] mb-3">
            Event Not Found
          </h1>
          <p className="text-sm sm:text-base text-[#4f4634] mb-6">
            {error || 'No deployed event record exists for this ID on the contract.'}
          </p>
          <Link to="/events" className="arena-btn-gold px-6 py-3 text-xs inline-block">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const formattedPool = formatTokenAmount(event.totalPool, tokenMeta.decimals);
  const formattedFee = formatTokenAmount(event.entryFee, tokenMeta.decimals);
  const deadlineStr =
    Number(event.deadline) > 0
      ? new Date(Number(event.deadline) * 1000).toLocaleString()
      : 'No deadline';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <Link
        to="/events"
        className="inline-flex items-center gap-2 font-mono-tabular text-xs font-bold uppercase text-[#111111] hover:underline"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Back To Browse Events
      </Link>

      {/* Event Header */}
      <div className="bg-[#111111] text-[#ffffff] border-2 border-[#111111] rounded p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <span className="font-mono-tabular text-xs font-bold uppercase text-[#ffc83d]">
            Event #{event.id.toString()} · {tokenMeta.symbol}
          </span>
          <StatusBadge status={displayStatus} />
        </div>

        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#ffffff] mb-3">
          {event.name}
        </h1>
        <p className="text-base text-[#c9ced6] max-w-3xl mb-6 leading-relaxed">
          {event.description || 'No description provided.'}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 border-t border-[#c9ced6]/25 pt-5 font-mono-tabular">
          <div>
            <p className="text-[11px] uppercase text-[#c9ced6]">Prize Pool</p>
            <p className="text-xl font-bold text-[#ffc83d]">
              {formattedPool} {tokenMeta.symbol}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#c9ced6]">Entry Fee</p>
            <p className="text-xl font-bold text-[#ffffff]">
              {formattedFee} {tokenMeta.symbol}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#c9ced6]">Entrants</p>
            <p className="text-xl font-bold text-[#ffffff]">
              {event.entrantCount} / {event.entrantCap}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#c9ced6]">Deadline</p>
            <p className="text-sm font-bold text-[#ffffff] mt-1">{deadlineStr}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-[#c9ced6]">Organizer</p>
            <a
              href={getExplorerAddressUrl(event.organizer)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#ffc83d] hover:underline mt-1"
            >
              {shortAddress(event.organizer)} <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Prize Split & Entrants */}
        <div className="lg:col-span-7 space-y-8">
          {/* Prize Split Breakdown */}
          <section className="bg-[#ffffff] border-2 border-[#111111] rounded overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-[#111111] bg-[#f6f3f2] flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#111111]">
                Prize Split
              </h2>
              <span className="font-mono-tabular text-xs font-bold uppercase text-[#4f4634]">
                Converted From Basis Points
              </span>
            </div>

            <div className="divide-y-2 divide-[#111111]">
              {event.prizeSplitBps.map((bps, idx) => {
                const winnerAddr = event.winners[idx];
                const shareFormatted = formatTokenAmount(
                  prizeShares[idx] ?? 0n,
                  tokenMeta.decimals
                );
                return (
                  <div
                    key={idx}
                    className={`px-5 py-4 flex flex-wrap items-center justify-between gap-4 ${
                      idx === 0
                        ? 'bg-[#ffc83d]/15'
                        : idx === 1
                          ? 'bg-[#c9ced6]/20'
                          : 'bg-[#ffffff]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-10 h-10 flex items-center justify-center border-2 border-[#111111] rounded font-mono-tabular text-xs font-bold ${
                          idx === 0
                            ? 'bg-[#ffc83d] text-[#111111]'
                            : idx === 1
                              ? 'bg-[#c9ced6] text-[#111111]'
                              : 'bg-[#111111] text-[#ffffff]'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="font-mono-tabular text-sm font-bold text-[#111111]">
                          {formatBpsAsPercent(bps)} Share
                        </p>
                        <p className="font-mono-tabular text-xs text-[#4f4634]">
                          {bps} BPS
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono-tabular text-base font-bold text-[#111111]">
                        {shareFormatted} {tokenMeta.symbol}
                      </p>
                      {event.status === 1 && winnerAddr && (
                        <p className="font-mono-tabular text-xs text-[#111111]">
                          Winner: {shortAddress(winnerAddr)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Entrants Roster */}
          <section className="bg-[#ffffff] border-2 border-[#111111] rounded overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-[#111111] bg-[#f6f3f2] flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#111111]">
                Entrants Roster
              </h2>
              <span className="font-mono-tabular text-xs font-bold text-[#111111]">
                {entrants.length} Joined
              </span>
            </div>

            {entrants.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#4f4634]">
                No entrants have joined this event pool yet.
              </div>
            ) : (
              <div className="divide-y divide-[#e5e2e1]">
                {entrants.map((addr, idx) => {
                  const isYou =
                    isConnected &&
                    connectedAddress &&
                    addr.toLowerCase() === connectedAddress.toLowerCase();
                  return (
                    <div
                      key={`${addr}-${idx}`}
                      className="px-5 py-3 flex items-center justify-between gap-3 font-mono-tabular text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[#4f4634] font-bold w-7 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <a
                          href={getExplorerAddressUrl(addr)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-[#111111] font-bold hover:underline"
                        >
                          {addr}
                        </a>
                      </div>
                      {isYou && (
                        <span className="px-2 py-0.5 bg-[#ffc83d] text-[#111111] border border-[#111111] rounded-[2px] text-[11px] font-bold uppercase shrink-0">
                          You
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Wallet-Gated Actions */}
        <div className="lg:col-span-5 space-y-6">
          {!isConnected ? (
            <ConnectPrompt
              title="Connect Wallet To Participate"
              description="Connect your wallet on Arc to approve and join this pool, claim a refund if cancelled, or manage an event you organized."
            />
          ) : (
            <>
              {chainId !== ARC_CHAIN_ID && (
                <div className="border-2 border-[#111111] rounded bg-[#ffc83d] p-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono-tabular text-xs font-bold uppercase text-[#111111]">
                    Switch to Arc to submit transactions
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

              {/* Join Pool Card */}
              {event.status === 0 && (
                <section className="bg-[#ffffff] border-2 border-[#111111] rounded p-6 arena-shadow space-y-4">
                  <h2 className="font-display font-bold text-2xl text-[#111111]">
                    Enter Prize Pool
                  </h2>

                  {hasJoined ? (
                    <div className="border-2 border-[#111111] rounded bg-[#ffc83d]/20 p-4 font-mono-tabular text-xs font-bold text-[#111111]">
                      Your connected wallet is entered in this pool. Funds remain locked until winners are declared or the event is cancelled.
                    </div>
                  ) : displayStatus !== 'OPEN' ? (
                    <div className="border-2 border-[#111111] rounded bg-[#f6f3f2] p-4 font-mono-tabular text-xs font-bold text-[#4f4634]">
                      Registration is closed because the entrant cap or deadline has been reached.
                    </div>
                  ) : (
                    <>
                      <div className="border-2 border-[#111111] rounded bg-[#f6f3f2] p-4 space-y-1.5 font-mono-tabular text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#4f4634]">Your {tokenMeta.symbol} Balance</span>
                          <span className="font-bold text-[#111111]">
                            {formatTokenAmount(tokenMeta.balance, tokenMeta.decimals)} {tokenMeta.symbol}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#4f4634]">Approved Allowance</span>
                          <span className="font-bold text-[#111111]">
                            {formatTokenAmount(tokenMeta.allowance, tokenMeta.decimals)} {tokenMeta.symbol}
                          </span>
                        </div>
                      </div>

                      {tokenMeta.balance < event.entryFee && (
                        <p className="text-xs font-mono-tabular font-bold text-[#e4002b]">
                          Insufficient {tokenMeta.symbol} balance for the {formattedFee} {tokenMeta.symbol} entry fee.
                        </p>
                      )}

                      <TxStatusBanner
                        phase={approveTx.phase}
                        txHash={approveTx.txHash}
                        errorMessage={approveTx.errorMessage}
                        actionLabel={`Approve ${tokenMeta.symbol}`}
                        onDismiss={approveTx.clearStatus}
                      />

                      <TxStatusBanner
                        phase={actionTx.phase}
                        txHash={actionTx.txHash}
                        errorMessage={actionTx.errorMessage}
                        actionLabel="Join Event"
                        onDismiss={actionTx.clearStatus}
                      />

                      {needsApproval ? (
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={
                            chainId !== ARC_CHAIN_ID ||
                            approveTx.phase === 'pending' ||
                            approveTx.phase === 'confirming'
                          }
                          className="arena-btn-gold w-full py-3.5 text-xs cursor-pointer"
                        >
                          {approveTx.phase === 'pending'
                            ? 'Confirm Approval In Wallet'
                            : approveTx.phase === 'confirming'
                              ? 'Confirming Approval'
                              : `Approve ${formattedFee} ${tokenMeta.symbol}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleJoin}
                          disabled={
                            chainId !== ARC_CHAIN_ID ||
                            tokenMeta.balance < event.entryFee ||
                            actionTx.phase === 'pending' ||
                            actionTx.phase === 'confirming'
                          }
                          className="arena-btn-gold w-full py-3.5 text-xs cursor-pointer"
                        >
                          {actionTx.phase === 'pending'
                            ? 'Confirm Join In Wallet'
                            : actionTx.phase === 'confirming'
                              ? 'Confirming Entry'
                              : `Join Event (${formattedFee} ${tokenMeta.symbol})`}
                        </button>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Cancelled Event Refund Panel */}
              {event.status === 2 && hasJoined && (
                <section className="bg-[#ffffff] border-2 border-[#111111] rounded p-6 arena-shadow space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-bold text-2xl text-[#111111]">
                      Claim Refund
                    </h2>
                    <StatusBadge status="CANCELLED" />
                  </div>
                  <p className="text-sm text-[#4f4634]">
                    This event was cancelled by the organizer. You can withdraw your full {formattedFee} {tokenMeta.symbol} entry fee.
                  </p>

                  <TxStatusBanner
                    phase={actionTx.phase}
                    txHash={actionTx.txHash}
                    errorMessage={actionTx.errorMessage}
                    actionLabel="Claim Refund"
                    onDismiss={actionTx.clearStatus}
                  />

                  {hasClaimedRefund ? (
                    <div className="border-2 border-[#111111] rounded bg-[#f6f3f2] p-4 font-mono-tabular text-xs font-bold text-[#111111]">
                      Refund already claimed for your connected wallet.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimRefund}
                      disabled={
                        chainId !== ARC_CHAIN_ID ||
                        actionTx.phase === 'pending' ||
                        actionTx.phase === 'confirming'
                      }
                      className="arena-btn-gold w-full py-3.5 text-xs cursor-pointer"
                    >
                      {`Claim ${formattedFee} ${tokenMeta.symbol} Refund`}
                    </button>
                  )}
                </section>
              )}

              {/* Organizer Controls */}
              {isOrganizer && event.status === 0 && (
                <section className="bg-[#111111] text-[#ffffff] border-2 border-[#111111] rounded p-6 space-y-6">
                  <div>
                    <p className="font-mono-tabular text-xs font-bold uppercase text-[#ffc83d] mb-1">
                      Organizer Controls
                    </p>
                    <h2 className="font-display font-bold text-2xl text-[#ffffff]">
                      Settle Or Cancel Event
                    </h2>
                  </div>

                  {/* Declare Winners */}
                  <div className="space-y-3 border-t border-[#c9ced6]/25 pt-4">
                    <p className="font-mono-tabular text-xs font-bold uppercase text-[#ffffff]">
                      Declare Winners
                    </p>
                    {entrants.length < event.prizeSplitBps.length ? (
                      <p className="text-xs text-[#c9ced6]">
                        At least {event.prizeSplitBps.length} entrants are required to fill all prize placements.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {event.prizeSplitBps.map((bps, idx) => (
                          <div key={idx} className="space-y-1">
                            <label
                              htmlFor={`winner-slot-${idx}`}
                              className="block font-mono-tabular text-[11px] uppercase text-[#c9ced6]"
                            >
                              #{idx + 1} Winner ({formatBpsAsPercent(bps)})
                            </label>
                            <select
                              id={`winner-slot-${idx}`}
                              value={winnerInputs[idx] ?? ''}
                              onChange={(e) => {
                                const next = [...winnerInputs];
                                next[idx] = e.target.value;
                                setWinnerInputs(next);
                              }}
                              className="w-full px-3 py-2.5 bg-[#ffffff] text-[#111111] border-2 border-[#ffc83d] rounded font-mono-tabular text-xs"
                            >
                              <option value="">Select entrant address</option>
                              {entrants.map((addr) => (
                                <option key={addr} value={addr}>
                                  {addr}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}

                        {winnerValidationError && (
                          <p className="font-mono-tabular text-xs text-[#ffc83d]">
                            {winnerValidationError}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleDeclareWinners}
                          disabled={
                            chainId !== ARC_CHAIN_ID ||
                            actionTx.phase === 'pending' ||
                            actionTx.phase === 'confirming'
                          }
                          className="arena-btn-gold w-full py-3 text-xs cursor-pointer"
                        >
                          Declare Winners And Pay Pool
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cancel Event */}
                  <div className="space-y-3 border-t border-[#c9ced6]/25 pt-4">
                    <p className="font-mono-tabular text-xs font-bold uppercase text-[#ffffff]">
                      Cancel Event
                    </p>
                    <p className="text-xs text-[#c9ced6]">
                      Cancelling unlocks 100% entry fee refunds for all entrants.
                    </p>
                    {!confirmingCancel ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        className="w-full py-2.5 border-2 border-[#e4002b] text-[#ffffff] bg-[#e4002b] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer hover:opacity-90"
                      >
                        Cancel Event
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEvent}
                          disabled={
                            chainId !== ARC_CHAIN_ID ||
                            actionTx.phase === 'pending' ||
                            actionTx.phase === 'confirming'
                          }
                          className="flex-1 py-2.5 border-2 border-[#e4002b] bg-[#e4002b] text-[#ffffff] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer"
                        >
                          Confirm Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingCancel(false)}
                          className="px-4 py-2.5 border-2 border-[#ffffff] text-[#ffffff] rounded font-mono-tabular text-xs font-bold uppercase cursor-pointer"
                        >
                          Keep Open
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
