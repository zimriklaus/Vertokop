import { ExternalLink, CheckSquare, Loader2, AlertTriangle } from 'lucide-react';
import { getExplorerTxUrl } from '../lib/config';
import type { TxLifecyclePhase } from '../hooks/useVertokopContract';

interface TxStatusBannerProps {
  phase: TxLifecyclePhase;
  txHash?: `0x${string}`;
  errorMessage?: string;
  actionLabel?: string;
  onDismiss?: () => void;
}

export function TxStatusBanner({
  phase,
  txHash,
  errorMessage,
  actionLabel = 'Transaction',
  onDismiss,
}: TxStatusBannerProps) {
  if (phase === 'idle') return null;

  if (phase === 'pending') {
    return (
      <div
        role="status"
        className="border-2 border-[#111111] rounded bg-[#ffc83d] text-[#111111] p-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin shrink-0" aria-hidden="true" />
          <div>
            <p className="font-mono-tabular text-xs font-bold uppercase">
              {actionLabel} — Pending Wallet Signature
            </p>
            <p className="text-sm">
              Confirm the transaction in your connected wallet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'confirming') {
    return (
      <div
        role="status"
        className="border-2 border-[#111111] rounded bg-[#f6f3f2] text-[#111111] p-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin shrink-0" aria-hidden="true" />
          <div>
            <p className="font-mono-tabular text-xs font-bold uppercase">
              {actionLabel} — Confirming On Arc
            </p>
            <p className="text-sm text-[#4f4634]">
              Waiting for block confirmation on chain.
            </p>
          </div>
        </div>
        {txHash && (
          <a
            href={getExplorerTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold underline text-[#111111]"
          >
            View on Arcscan <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    );
  }

  if (phase === 'confirmed') {
    return (
      <div
        role="status"
        className="border-2 border-[#111111] rounded bg-[#111111] text-[#ffffff] p-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <CheckSquare size={18} className="text-[#ffc83d] shrink-0" aria-hidden="true" />
          <div>
            <p className="font-mono-tabular text-xs font-bold uppercase text-[#ffc83d]">
              {actionLabel} — Confirmed
            </p>
            <p className="text-sm text-[#ffffff]">
              On-chain state has been updated on Arc.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {txHash && (
            <a
              href={getExplorerTxUrl(txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold underline text-[#ffc83d]"
            >
              View on Arcscan <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="font-mono-tabular text-xs uppercase text-[#c9ced6] hover:text-[#ffffff] cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="border-2 border-[#111111] rounded bg-[#ffffff] text-[#111111] p-4 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[#e4002b] text-[#ffffff] rounded-[2px] font-mono-tabular text-[11px] font-bold uppercase shrink-0 mt-0.5">
          Error
        </span>
        <div>
          <p className="font-mono-tabular text-xs font-bold uppercase flex items-center gap-1.5">
            <AlertTriangle size={14} aria-hidden="true" />
            {actionLabel} Failed
          </p>
          <p className="text-sm text-[#111111] mt-0.5 break-all">
            {errorMessage || 'Transaction could not be completed.'}
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="arena-btn-ghost px-3 py-1.5 text-xs cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
