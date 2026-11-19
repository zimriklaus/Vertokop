export type EventStatusCode = 0 | 1 | 2; // 0 = Active/Open, 1 = Completed, 2 = Cancelled

export type EventDisplayStatus = 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';

export interface VertokopEvent {
  id: bigint;
  name: string;
  description: string;
  organizer: `0x${string}`;
  token: `0x${string}`;
  entryFee: bigint;
  entrantCap: number;
  deadline: bigint;
  prizeSplitBps: number[];
  entrantCount: number;
  totalPool: bigint;
  status: EventStatusCode;
  winners: `0x${string}`[];
}

export const TOTAL_BPS = 10000;

export function bpsToPercentage(bps: number | bigint): number {
  const num = typeof bps === 'bigint' ? Number(bps) : bps;
  return Math.round((num / 100) * 100) / 100;
}

export function formatBpsAsPercent(bps: number | bigint): string {
  const pct = bpsToPercentage(bps);
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2).replace(/\.?0+$/, '')}%`;
}

export function percentageToBps(percentage: number): number {
  if (!Number.isFinite(percentage) || percentage < 0) return 0;
  return Math.round(percentage * 100);
}

export function validatePrizeSplitsBps(splitsBps: number[]): {
  valid: boolean;
  totalBps: number;
  error?: string;
} {
  if (splitsBps.length === 0) {
    return { valid: false, totalBps: 0, error: 'Add at least one winner placement' };
  }
  for (let i = 0; i < splitsBps.length; i++) {
    const val = splitsBps[i];
    if (!Number.isInteger(val) || val <= 0) {
      return {
        valid: false,
        totalBps: splitsBps.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0),
        error: `Placement #${i + 1} must be greater than 0%`,
      };
    }
  }
  const totalBps = splitsBps.reduce((sum, bps) => sum + bps, 0);
  if (totalBps !== TOTAL_BPS) {
    return {
      valid: false,
      totalBps,
      error: `Prize split must total 100% (currently ${formatBpsAsPercent(totalBps)})`,
    };
  }
  return { valid: true, totalBps };
}

export function calculatePrizeShares(totalPool: bigint, splitsBps: number[]): bigint[] {
  if (totalPool <= 0n || splitsBps.length === 0) {
    return splitsBps.map(() => 0n);
  }
  const shares = splitsBps.map((bps) => (totalPool * BigInt(bps)) / BigInt(TOTAL_BPS));
  const allocated = shares.reduce((acc, s) => acc + s, 0n);
  const remainder = totalPool - allocated;
  if (remainder > 0n && shares.length > 0) {
    shares[0] = shares[0] + remainder;
  }
  return shares;
}

export function formatTokenAmount(
  rawAmount: bigint,
  decimals: number,
  maxFractionDigits = 2
): string {
  const safeDecimals = Math.max(0, Math.min(36, decimals));
  const negative = rawAmount < 0n;
  const abs = negative ? -rawAmount : rawAmount;
  const divisor = 10n ** BigInt(safeDecimals);
  const whole = abs / divisor;
  const fraction = abs % divisor;

  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (safeDecimals === 0 || fraction === 0n) {
    return `${negative ? '-' : ''}${wholeFormatted}`;
  }

  const paddedFraction = fraction.toString().padStart(safeDecimals, '0');
  const trimmed = paddedFraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  if (!trimmed) {
    const fullTrimmed = paddedFraction.replace(/0+$/, '');
    if (!fullTrimmed) return `${negative ? '-' : ''}${wholeFormatted}`;
    return `${negative ? '-' : ''}${wholeFormatted}.${fullTrimmed.slice(0, Math.min(6, fullTrimmed.length))}`;
  }
  return `${negative ? '-' : ''}${wholeFormatted}.${trimmed}`;
}

export function parseTokenAmount(input: string, decimals: number): bigint | null {
  const cleaned = input.trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const [wholeStr, fracStr = ''] = cleaned.split('.');
  if (fracStr.length > decimals) {
    return null;
  }
  const paddedFrac = fracStr.padEnd(decimals, '0');
  try {
    return BigInt(wholeStr) * 10n ** BigInt(decimals) + BigInt(paddedFrac || '0');
  } catch {
    return null;
  }
}

export function deriveEventDisplayStatus(
  event: Pick<VertokopEvent, 'status' | 'deadline' | 'entrantCount' | 'entrantCap'>,
  nowSeconds: number
): EventDisplayStatus {
  if (event.status === 1) return 'COMPLETED';
  if (event.status === 2) return 'CANCELLED';
  const deadlineSec = Number(event.deadline);
  if (deadlineSec > 0 && nowSeconds >= deadlineSec) return 'CLOSED';
  if (event.entrantCap > 0 && event.entrantCount >= event.entrantCap) return 'CLOSED';
  return 'OPEN';
}

export interface CreateEventDraft {
  name: string;
  description: string;
  entryFeeInput: string;
  tokenDecimals: number;
  entrantCapInput: string;
  deadlineIso: string;
  splitsBps: number[];
}

export function validateCreateEventDraft(
  draft: CreateEventDraft,
  nowMs: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft.name.trim()) {
    errors.push('Event name is required');
  }
  if (!draft.description.trim()) {
    errors.push('Event description is required');
  }
  const parsedFee = parseTokenAmount(draft.entryFeeInput, draft.tokenDecimals);
  if (parsedFee === null || parsedFee <= 0n) {
    errors.push('Entry fee must be greater than 0');
  }
  const cap = Number(draft.entrantCapInput);
  if (!Number.isInteger(cap) || cap < 2) {
    errors.push('Entrant cap must be at least 2');
  }
  const deadlineMs = Date.parse(draft.deadlineIso);
  if (!draft.deadlineIso || Number.isNaN(deadlineMs) || deadlineMs <= nowMs) {
    errors.push('Registration deadline must be in the future');
  }
  const splitCheck = validatePrizeSplitsBps(draft.splitsBps);
  if (!splitCheck.valid && splitCheck.error) {
    errors.push(splitCheck.error);
  }
  return { valid: errors.length === 0, errors };
}

export function filterEvents<
  T extends Pick<VertokopEvent, 'id' | 'name' | 'description' | 'token' | 'status' | 'deadline' | 'entrantCount' | 'entrantCap'>
>(
  events: T[],
  options: {
    search?: string;
    statusFilter?: 'ALL' | EventDisplayStatus;
    tokenFilter?: 'ALL' | string;
    nowSeconds: number;
  }
): T[] {
  const query = (options.search ?? '').trim().toLowerCase();
  const statusFilter = options.statusFilter ?? 'ALL';
  const tokenFilter = (options.tokenFilter ?? 'ALL').toLowerCase();

  return events.filter((ev) => {
    if (query) {
      const hay = `${ev.id.toString()} ${ev.name} ${ev.description}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (statusFilter !== 'ALL') {
      const derived = deriveEventDisplayStatus(ev, options.nowSeconds);
      if (derived !== statusFilter) return false;
    }
    if (tokenFilter !== 'all') {
      if (ev.token.toLowerCase() !== tokenFilter) return false;
    }
    return true;
  });
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
