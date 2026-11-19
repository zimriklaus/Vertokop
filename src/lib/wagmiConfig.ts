import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  ARC_RPC_URL,
  WALLETCONNECT_PROJECT_ID,
  arcChain,
  isWalletConnectConfigured,
} from './config';

const connectors = isWalletConnectConfigured
  ? connectorsForWallets(
      [
        {
          groupName: 'Recommended',
          wallets: [
            injectedWallet,
            metaMaskWallet,
            rabbyWallet,
            coinbaseWallet,
            rainbowWallet,
            walletConnectWallet,
          ],
        },
      ],
      {
        appName: 'Vertokop',
        projectId: WALLETCONNECT_PROJECT_ID,
      }
    )
  : [injected()];

export const wagmiConfig = createConfig({
  connectors,
  chains: [arcChain],
  transports: {
    [arcChain.id]: http(ARC_RPC_URL),
  },
  ssr: false,
});
