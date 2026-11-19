import type { Abi, AbiFunction } from 'viem';
import { ARC_EXPLORER_URL } from './config';

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export type AbiSource = 'explorer' | 'unconfigured' | 'error';

export interface LoadedAbiResult {
  abi: Abi;
  source: AbiSource;
  error?: string;
}

const abiCache = new Map<string, LoadedAbiResult>();

export async function fetchDeployedContractAbi(
  contractAddress: `0x${string}` | undefined
): Promise<LoadedAbiResult> {
  if (!contractAddress) {
    return {
      abi: [],
      source: 'unconfigured',
    };
  }

  const cacheKey = contractAddress.toLowerCase();
  const cached = abiCache.get(cacheKey);
  if (cached && cached.source === 'explorer' && cached.abi.length > 0) {
    return cached;
  }

  const sessionKey = `vertokop_abi_${cacheKey}`;
  if (typeof window !== 'undefined') {
    try {
      const saved = window.sessionStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Abi;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const result: LoadedAbiResult = { abi: parsed, source: 'explorer' };
          abiCache.set(cacheKey, result);
          return result;
        }
      }
    } catch {
      // Ignore storage read failures
    }
  }

  const explorerBase = ARC_EXPLORER_URL.replace(/\/$/, '');
  const candidateUrls = [
    `https://explorer.testnet.arc.io/api/v2/smart-contracts/${contractAddress}`,
    `${explorerBase}/api/v2/smart-contracts/${contractAddress}`,
    `${explorerBase}/api?module=contract&action=getabi&address=${contractAddress}`,
  ];

  let lastError = 'Unable to fetch contract ABI from explorer';

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) {
        lastError = `Explorer returned HTTP ${res.status}`;
        continue;
      }
      const data = await res.json();
      let parsedAbi: unknown = null;

      if (Array.isArray(data?.abi)) {
        parsedAbi = data.abi;
      } else if (typeof data?.abi === 'string') {
        parsedAbi = JSON.parse(data.abi);
      } else if (data?.status === '1' && typeof data?.result === 'string') {
        parsedAbi = JSON.parse(data.result);
      } else if (Array.isArray(data?.result)) {
        parsedAbi = data.result;
      }

      if (Array.isArray(parsedAbi) && parsedAbi.length > 0) {
        const abi = parsedAbi as Abi;
        const result: LoadedAbiResult = { abi, source: 'explorer' };
        abiCache.set(cacheKey, result);
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(sessionKey, JSON.stringify(abi));
          } catch {
            // Ignore storage write failures
          }
        }
        return result;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Network error fetching ABI';
    }
  }

  return {
    abi: [],
    source: 'error',
    error: lastError,
  };
}

export function findAbiFunction(
  abi: Abi,
  candidates: string[]
): AbiFunction | undefined {
  const fns = abi.filter((item): item is AbiFunction => item.type === 'function');
  for (const candidate of candidates) {
    const exact = fns.find((fn) => fn.name === candidate);
    if (exact) return exact;
  }
  const lowerCandidates = candidates.map((c) => c.toLowerCase());
  for (const candidate of lowerCandidates) {
    const match = fns.find((fn) => fn.name.toLowerCase() === candidate);
    if (match) return match;
  }
  return undefined;
}

export interface VertokopAbiMap {
  createEvent?: AbiFunction;
  joinEvent?: AbiFunction;
  declareWinners?: AbiFunction;
  cancelEvent?: AbiFunction;
  claimRefund?: AbiFunction;
  getEvent?: AbiFunction;
  getEvents?: AbiFunction;
  getEventCount?: AbiFunction;
  getEntrants?: AbiFunction;
  getEventsByOrganizer?: AbiFunction;
  getEventsByPlayer?: AbiFunction;
  getPlatformStats?: AbiFunction;
  hasJoined?: AbiFunction;
  hasClaimedRefund?: AbiFunction;
}

export function resolveVertokopAbiMap(abi: Abi): VertokopAbiMap {
  return {
    createEvent: findAbiFunction(abi, ['createEvent', 'createPool', 'newEvent']),
    joinEvent: findAbiFunction(abi, ['joinEvent', 'enterEvent', 'join']),
    declareWinners: findAbiFunction(abi, [
      'declareWinners',
      'setWinners',
      'finalizeEvent',
      'payoutWinners',
    ]),
    cancelEvent: findAbiFunction(abi, ['cancelEvent', 'cancel']),
    claimRefund: findAbiFunction(abi, ['claimRefund', 'refund', 'withdrawRefund']),
    getEvent: findAbiFunction(abi, ['getEvent', 'events', 'eventById']),
    getEvents: findAbiFunction(abi, ['getEvents', 'getAllEvents', 'allEvents']),
    getEventCount: findAbiFunction(abi, [
      'getEventCount',
      'eventCount',
      'nextEventId',
      'totalEvents',
    ]),
    getEntrants: findAbiFunction(abi, [
      'getEntrants',
      'getEventEntrants',
      'entrants',
      'getPlayers',
    ]),
    getEventsByOrganizer: findAbiFunction(abi, [
      'getEventsByOrganizer',
      'eventsByOrganizer',
      'organizerEvents',
    ]),
    getEventsByPlayer: findAbiFunction(abi, [
      'getEventsByPlayer',
      'eventsByPlayer',
      'playerEvents',
      'getEventsByEntrant',
    ]),
    getPlatformStats: findAbiFunction(abi, [
      'getPlatformStats',
      'platformStats',
      'getStats',
    ]),
    hasJoined: findAbiFunction(abi, ['hasJoined', 'isEntrant', 'joined']),
    hasClaimedRefund: findAbiFunction(abi, [
      'hasClaimedRefund',
      'refundClaimed',
      'claimedRefund',
    ]),
  };
}
