import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import type { Abi, AbiFunction } from 'viem';
import {
  ARC_CHAIN_ID,
  CONTRACT_ADDRESS,
  isContractConfigured,
} from '../lib/config';
import {
  ERC20_ABI,
  fetchDeployedContractAbi,
  resolveVertokopAbiMap,
} from '../lib/abiLoader';
import type { EventStatusCode, VertokopEvent } from '../lib/poolMath';

export interface PlatformStats {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalEntrants: number;
}

export interface TokenMeta {
  address: `0x${string}`;
  decimals: number;
  symbol: string;
  balance: bigint;
  allowance: bigint;
  isLoading: boolean;
}

function normalizeAddress(val: unknown): `0x${string}` {
  if (typeof val === 'string' && val.startsWith('0x')) {
    return val as `0x${string}`;
  }
  return '0x0000000000000000000000000000000000000000';
}

function normalizeStatus(val: unknown): EventStatusCode {
  const num = Number(val);
  if (num === 1) return 1;
  if (num === 2) return 2;
  return 0;
}

function decodeEventRecord(raw: unknown, fallbackId: bigint): VertokopEvent | null {
  if (!raw) return null;

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const prizeSplitRaw = (obj.prizeSplitBps ?? obj.prizeSplits ?? obj.splits ?? []) as unknown[];
    const winnersRaw = (obj.winners ?? []) as unknown[];
    const entrantCount = Number(obj.entrantCount ?? obj.playerCount ?? 0);
    const entryFee = BigInt((obj.entryFee as bigint | number | string) ?? 0);
    const totalPool =
      obj.totalPool !== undefined
        ? BigInt(obj.totalPool as bigint | number | string)
        : obj.poolBalance !== undefined
          ? BigInt(obj.poolBalance as bigint | number | string)
          : entryFee * BigInt(entrantCount);

    return {
      id: BigInt((obj.id as bigint | number | string) ?? fallbackId),
      name: String(obj.name ?? obj.title ?? `Event #${fallbackId.toString()}`),
      description: String(obj.description ?? ''),
      organizer: normalizeAddress(obj.organizer ?? obj.creator),
      token: normalizeAddress(obj.token ?? obj.entryToken),
      entryFee,
      entrantCap: Number(obj.entrantCap ?? obj.maxEntrants ?? 0),
      deadline: BigInt((obj.deadline as bigint | number | string) ?? 0),
      prizeSplitBps: Array.isArray(prizeSplitRaw)
        ? prizeSplitRaw.map((n) => Number(n))
        : [],
      entrantCount,
      totalPool,
      status: normalizeStatus(obj.status),
      winners: Array.isArray(winnersRaw) ? winnersRaw.map(normalizeAddress) : [],
    };
  }

  if (Array.isArray(raw)) {
    // Support tuple return shapes cleanly
    const arr = raw as unknown[];
    const firstIsId = typeof arr[0] === 'bigint' || typeof arr[0] === 'number';
    const offset = firstIsId ? 1 : 0;
    const id = firstIsId ? BigInt(arr[0] as bigint | number) : fallbackId;
    const name = String(arr[offset] ?? `Event #${id.toString()}`);
    const description = String(arr[offset + 1] ?? '');
    const organizer = normalizeAddress(arr[offset + 2]);
    const token = normalizeAddress(arr[offset + 3]);
    const entryFee = BigInt((arr[offset + 4] as bigint | number | string) ?? 0);
    const entrantCap = Number(arr[offset + 5] ?? 0);
    const deadline = BigInt((arr[offset + 6] as bigint | number | string) ?? 0);
    const maybeSplit = arr[offset + 7];
    const prizeSplitBps = Array.isArray(maybeSplit)
      ? maybeSplit.map((n) => Number(n))
      : [];
    const entrantCount = Number(arr[offset + 8] ?? 0);
    const totalPool =
      arr[offset + 9] !== undefined
        ? BigInt(arr[offset + 9] as bigint | number | string)
        : entryFee * BigInt(entrantCount);
    const status = normalizeStatus(arr[offset + 10] ?? 0);
    const maybeWinners = arr[offset + 11];
    const winners = Array.isArray(maybeWinners)
      ? maybeWinners.map(normalizeAddress)
      : [];

    return {
      id,
      name,
      description,
      organizer,
      token,
      entryFee,
      entrantCap,
      deadline,
      prizeSplitBps,
      entrantCount,
      totalPool,
      status,
      winners,
    };
  }

  return null;
}

export function useVertokopAbi() {
  const query = useQuery({
    queryKey: ['vertokop-abi', CONTRACT_ADDRESS ?? 'unconfigured'],
    queryFn: () => fetchDeployedContractAbi(CONTRACT_ADDRESS),
    staleTime: 5 * 60 * 1000,
  });

  const abiMap = useMemo(
    () => resolveVertokopAbiMap(query.data?.abi ?? []),
    [query.data?.abi]
  );

  return {
    abi: query.data?.abi ?? ([] as Abi),
    source: query.data?.source ?? (isContractConfigured ? 'error' : 'unconfigured'),
    error: query.data?.error,
    isLoading: query.isLoading,
    abiMap,
    isReady: isContractConfigured && (query.data?.abi.length ?? 0) > 0,
  };
}

export function useAllEvents() {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, abiMap, isReady, isLoading: abiLoading, source, error: abiError } =
    useVertokopAbi();

  const eventsQuery = useQuery({
    queryKey: ['vertokop-events', CONTRACT_ADDRESS ?? 'none', abi.length],
    enabled: Boolean(publicClient && CONTRACT_ADDRESS && isReady),
    queryFn: async (): Promise<VertokopEvent[]> => {
      const contractAddress = CONTRACT_ADDRESS;
      if (!publicClient || !contractAddress) return [];

      // 1. Prefer batch getter if present in deployed ABI
      if (abiMap.getEvents && abiMap.getEvents.inputs.length === 0) {
        const rawList = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: abiMap.getEvents.name,
        });
        if (Array.isArray(rawList)) {
          return rawList
            .map((item, idx) => decodeEventRecord(item, BigInt(idx + 1)))
            .filter((e): e is VertokopEvent => e !== null);
        }
      }

      // 2. Otherwise read eventCount / getEventCount and fetch per ID
      if (abiMap.getEventCount && abiMap.getEvent) {
        const countRaw = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: abiMap.getEventCount.name,
        });
        const total = Number(countRaw ?? 0);
        if (total <= 0) return [];

        const ids = Array.from({ length: total }, (_, idx) => BigInt(idx));
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const raw = await publicClient.readContract({
                address: contractAddress,
                abi,
                functionName: abiMap.getEvent!.name,
                args: [id],
              });
              const decoded = decodeEventRecord(raw, id);
              // Some contracts are 1-indexed, skip empty zero-address records
              if (
                decoded &&
                decoded.organizer !== '0x0000000000000000000000000000000000000000'
              ) {
                return decoded;
              }
              return null;
            } catch {
              return null;
            }
          })
        );

        // If 1-indexed contract had total items starting at 1, also check id = total
        const valid = results.filter((e): e is VertokopEvent => e !== null);
        if (valid.length < total) {
          try {
            const lastRaw = await publicClient.readContract({
              address: contractAddress,
              abi,
              functionName: abiMap.getEvent.name,
              args: [BigInt(total)],
            });
            const decodedLast = decodeEventRecord(lastRaw, BigInt(total));
            if (
              decodedLast &&
              decodedLast.organizer !== '0x0000000000000000000000000000000000000000' &&
              !valid.some((v) => v.id === decodedLast.id)
            ) {
              valid.push(decodedLast);
            }
          } catch {
            // Ignore
          }
        }
        return valid;
      }

      return [];
    },
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: abiLoading || eventsQuery.isLoading,
    error: abiError || (eventsQuery.error instanceof Error ? eventsQuery.error.message : undefined),
    abiSource: source,
    refetch: eventsQuery.refetch,
  };
}

export function usePlatformStats() {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, abiMap, isReady } = useVertokopAbi();
  const { events, isLoading: eventsLoading } = useAllEvents();

  const statsQuery = useQuery({
    queryKey: ['vertokop-stats', CONTRACT_ADDRESS ?? 'none', abi.length],
    enabled: Boolean(publicClient && CONTRACT_ADDRESS && isReady && abiMap.getPlatformStats),
    queryFn: async (): Promise<PlatformStats | null> => {
      if (!publicClient || !CONTRACT_ADDRESS || !abiMap.getPlatformStats) {
        return null;
      }
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.getPlatformStats.name,
      });
      if (Array.isArray(raw)) {
        return {
          totalEvents: Number(raw[0] ?? 0),
          activeEvents: Number(raw[1] ?? 0),
          completedEvents: Number(raw[2] ?? 0),
          cancelledEvents: Number(raw[3] ?? 0),
          totalEntrants: Number(raw[4] ?? 0),
        };
      }
      if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        return {
          totalEvents: Number(obj.totalEvents ?? 0),
          activeEvents: Number(obj.activeEvents ?? 0),
          completedEvents: Number(obj.completedEvents ?? 0),
          cancelledEvents: Number(obj.cancelledEvents ?? 0),
          totalEntrants: Number(obj.totalEntrants ?? 0),
        };
      }
      return null;
    },
  });

  const derivedStats: PlatformStats = useMemo(() => {
    if (statsQuery.data) return statsQuery.data;
    return {
      totalEvents: events.length,
      activeEvents: events.filter((e) => e.status === 0).length,
      completedEvents: events.filter((e) => e.status === 1).length,
      cancelledEvents: events.filter((e) => e.status === 2).length,
      totalEntrants: events.reduce((acc, e) => acc + e.entrantCount, 0),
    };
  }, [statsQuery.data, events]);

  return {
    stats: derivedStats,
    isLoading: eventsLoading || statsQuery.isLoading,
  };
}

export function useTokenMeta(tokenAddress: `0x${string}` | undefined): TokenMeta {
  const { address: userAddress } = useAccount();

  const { data: decimalsData, isLoading: decimalsLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(tokenAddress) },
  });

  const { data: symbolData, isLoading: symbolLoading } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(tokenAddress) },
  });

  const { data: balanceData } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(tokenAddress && userAddress) },
  });

  const { data: allowanceData } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args:
      userAddress && CONTRACT_ADDRESS ? [userAddress, CONTRACT_ADDRESS] : undefined,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(tokenAddress && userAddress && CONTRACT_ADDRESS) },
  });

  return {
    address: tokenAddress ?? '0x0000000000000000000000000000000000000000',
    decimals: decimalsData !== undefined ? Number(decimalsData) : 6,
    symbol: symbolData ?? 'TOKEN',
    balance: balanceData ?? 0n,
    allowance: allowanceData ?? 0n,
    isLoading: decimalsLoading || symbolLoading,
  };
}

export function useEventDetail(eventId: string | undefined) {
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { address: userAddress } = useAccount();
  const { abi, abiMap, isReady, isLoading: abiLoading } = useVertokopAbi();

  const parsedId = useMemo(() => {
    if (!eventId || !/^\d+$/.test(eventId)) return undefined;
    return BigInt(eventId);
  }, [eventId]);

  const query = useQuery({
    queryKey: [
      'vertokop-event-detail',
      CONTRACT_ADDRESS ?? 'none',
      parsedId?.toString() ?? 'invalid',
      userAddress ?? 'anon',
      abi.length,
    ],
    enabled: Boolean(
      publicClient && CONTRACT_ADDRESS && isReady && parsedId !== undefined && abiMap.getEvent
    ),
    queryFn: async () => {
      if (!publicClient || !CONTRACT_ADDRESS || parsedId === undefined || !abiMap.getEvent) {
        return null;
      }

      const rawEvent = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: abiMap.getEvent.name,
        args: [parsedId],
      });

      const event = decodeEventRecord(rawEvent, parsedId);
      if (!event || event.organizer === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      let entrants: `0x${string}`[] = [];
      if (abiMap.getEntrants) {
        try {
          const rawEntrants = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: abiMap.getEntrants.name,
            args: [parsedId],
          });
          if (Array.isArray(rawEntrants)) {
            entrants = rawEntrants.map(normalizeAddress);
          }
        } catch {
          entrants = [];
        }
      }

      let hasJoined = false;
      if (userAddress) {
        if (abiMap.hasJoined) {
          try {
            hasJoined = Boolean(
              await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi,
                functionName: abiMap.hasJoined.name,
                args: [parsedId, userAddress],
              })
            );
          } catch {
            hasJoined = entrants.some(
              (a) => a.toLowerCase() === userAddress.toLowerCase()
            );
          }
        } else {
          hasJoined = entrants.some(
            (a) => a.toLowerCase() === userAddress.toLowerCase()
          );
        }
      }

      let hasClaimedRefund = false;
      if (userAddress && abiMap.hasClaimedRefund) {
        try {
          hasClaimedRefund = Boolean(
            await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi,
              functionName: abiMap.hasClaimedRefund.name,
              args: [parsedId, userAddress],
            })
          );
        } catch {
          hasClaimedRefund = false;
        }
      }

      return {
        event,
        entrants,
        hasJoined,
        hasClaimedRefund,
      };
    },
  });

  return {
    event: query.data?.event ?? null,
    entrants: query.data?.entrants ?? [],
    hasJoined: query.data?.hasJoined ?? false,
    hasClaimedRefund: query.data?.hasClaimedRefund ?? false,
    isLoading: abiLoading || query.isLoading,
    error: query.error instanceof Error ? query.error.message : undefined,
    refetch: query.refetch,
  };
}

export function useMyEvents() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: ARC_CHAIN_ID });
  const { abi, abiMap, isReady } = useVertokopAbi();
  const { events, isLoading: allEventsLoading, refetch } = useAllEvents();

  const myEventsQuery = useQuery({
    queryKey: [
      'vertokop-my-events',
      CONTRACT_ADDRESS ?? 'none',
      address ?? 'disconnected',
      abi.length,
    ],
    enabled: Boolean(
      isConnected &&
        address &&
        publicClient &&
        CONTRACT_ADDRESS &&
        isReady &&
        (abiMap.getEventsByOrganizer || abiMap.getEventsByPlayer)
    ),
    queryFn: async () => {
      if (!address || !publicClient || !CONTRACT_ADDRESS) {
        return { organizedIds: null as bigint[] | null, enteredIds: null as bigint[] | null };
      }

      let organizedIds: bigint[] | null = null;
      let enteredIds: bigint[] | null = null;

      if (abiMap.getEventsByOrganizer) {
        try {
          const raw = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: abiMap.getEventsByOrganizer.name,
            args: [address],
          });
          if (Array.isArray(raw)) {
            if (raw.length > 0 && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
              organizedIds = raw
                .map((item, idx) => decodeEventRecord(item, BigInt(idx))?.id)
                .filter((id): id is bigint => id !== undefined);
            } else {
              organizedIds = raw.map((id) => BigInt(id as bigint | number | string));
            }
          }
        } catch {
          organizedIds = null;
        }
      }

      if (abiMap.getEventsByPlayer) {
        try {
          const raw = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: abiMap.getEventsByPlayer.name,
            args: [address],
          });
          if (Array.isArray(raw)) {
            if (raw.length > 0 && typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
              enteredIds = raw
                .map((item, idx) => decodeEventRecord(item, BigInt(idx))?.id)
                .filter((id): id is bigint => id !== undefined);
            } else {
              enteredIds = raw.map((id) => BigInt(id as bigint | number | string));
            }
          }
        } catch {
          enteredIds = null;
        }
      }

      return { organizedIds, enteredIds };
    },
  });

  const organizedEvents = useMemo(() => {
    if (!isConnected || !address) return [];
    const ids = myEventsQuery.data?.organizedIds;
    if (ids) {
      const idSet = new Set(ids.map((id) => id.toString()));
      return events.filter((e) => idSet.has(e.id.toString()));
    }
    return events.filter(
      (e) => e.organizer.toLowerCase() === address.toLowerCase()
    );
  }, [isConnected, address, myEventsQuery.data?.organizedIds, events]);

  const enteredEvents = useMemo(() => {
    if (!isConnected || !address) return [];
    const ids = myEventsQuery.data?.enteredIds;
    if (ids) {
      const idSet = new Set(ids.map((id) => id.toString()));
      return events.filter((e) => idSet.has(e.id.toString()));
    }
    return [];
  }, [isConnected, address, myEventsQuery.data?.enteredIds, events]);

  return {
    organizedEvents,
    enteredEvents,
    isLoading: allEventsLoading || myEventsQuery.isLoading,
    refetch,
  };
}

export type TxLifecyclePhase = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'error';

export function useContractAction() {
  const queryClient = useQueryClient();
  const { writeContractAsync, reset } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [phase, setPhase] = useState<TxLifecyclePhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: ARC_CHAIN_ID,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    if (receipt.isSuccess) {
      setPhase('confirmed');
      queryClient.invalidateQueries();
    } else if (receipt.isError) {
      setPhase('error');
      setErrorMessage(receipt.error?.message || 'Transaction failed on chain');
    }
  }, [receipt.isSuccess, receipt.isError, receipt.error, queryClient]);

  const clearStatus = useCallback(() => {
    setTxHash(undefined);
    setPhase('idle');
    setErrorMessage(undefined);
    reset();
  }, [reset]);

  const execute = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: Abi | readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }) => {
      setErrorMessage(undefined);
      setTxHash(undefined);
      setPhase('pending');
      try {
        const hash = await writeContractAsync({
          address: params.address,
          abi: params.abi as Abi,
          functionName: params.functionName,
          args: (params.args ?? []) as readonly unknown[],
          chainId: ARC_CHAIN_ID,
        });
        setTxHash(hash);
        setPhase('confirming');
        return hash;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.split('\n')[0]
            : 'Transaction was rejected or failed';
        setErrorMessage(msg);
        setPhase('error');
        throw err;
      }
    },
    [writeContractAsync]
  );

  return {
    execute,
    phase,
    txHash,
    errorMessage,
    receipt: receipt.data,
    clearStatus,
  };
}

export function buildCreateEventArgs(
  fn: AbiFunction,
  values: {
    name: string;
    description: string;
    token: `0x${string}`;
    entryFee: bigint;
    entrantCap: bigint;
    deadline: bigint;
    prizeSplitBps: bigint[];
  }
): unknown[] {
  // Align arguments to the exact ABI parameter names/order from the deployed contract
  return fn.inputs.map((input, idx) => {
    const paramName = (input.name || '').toLowerCase();
    if (paramName.includes('name') || paramName.includes('title')) return values.name;
    if (paramName.includes('desc')) return values.description;
    if (paramName.includes('token')) return values.token;
    if (paramName.includes('fee') || paramName.includes('amount')) return values.entryFee;
    if (paramName.includes('cap') || paramName.includes('max')) return values.entrantCap;
    if (paramName.includes('deadline') || paramName.includes('time')) return values.deadline;
    if (paramName.includes('split') || paramName.includes('bps')) return values.prizeSplitBps;

    const positional = [
      values.name,
      values.description,
      values.token,
      values.entryFee,
      values.entrantCap,
      values.deadline,
      values.prizeSplitBps,
    ];
    return positional[idx];
  });
}
