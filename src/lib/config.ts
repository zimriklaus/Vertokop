import { defineChain, isAddress } from 'viem';

export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC_URL =
  import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
export const ARC_EXPLORER_URL =
  import.meta.env.VITE_ARC_EXPLORER_URL || 'https://testnet.arcscan.app';

export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: ARC_EXPLORER_URL,
    },
  },
});

export interface SupportedToken {
  symbol: 'USDC' | 'EURC';
  name: string;
  address: `0x${string}`;
}

export const SUPPORTED_TOKENS: SupportedToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x3600000000000000000000000000000000000000',
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  },
];

export function findSupportedToken(address: string): SupportedToken | undefined {
  return SUPPORTED_TOKENS.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

const rawContractAddress = (import.meta.env.VITE_CONTRACT_ADDRESS ?? '').trim();
const rawWalletConnectId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? '').trim();
const rawAdminWallet = (import.meta.env.VITE_ADMIN_WALLET ?? '').trim();

export const isContractConfigured =
  Boolean(rawContractAddress) &&
  !rawContractAddress.includes('[') &&
  isAddress(rawContractAddress);

export const CONTRACT_ADDRESS: `0x${string}` | undefined = isContractConfigured
  ? (rawContractAddress as `0x${string}`)
  : undefined;

export const isWalletConnectConfigured =
  Boolean(rawWalletConnectId) && !rawWalletConnectId.includes('[');

export const WALLETCONNECT_PROJECT_ID = isWalletConnectConfigured
  ? rawWalletConnectId
  : '';

export const ADMIN_WALLET: `0x${string}` | undefined =
  rawAdminWallet && !rawAdminWallet.includes('[') && isAddress(rawAdminWallet)
    ? (rawAdminWallet as `0x${string}`)
    : undefined;

export function getExplorerTxUrl(txHash: string): string {
  return `${ARC_EXPLORER_URL.replace(/\/$/, '')}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${ARC_EXPLORER_URL.replace(/\/$/, '')}/address/${address}`;
}
