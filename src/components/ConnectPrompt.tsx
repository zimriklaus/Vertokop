import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

interface ConnectPromptProps {
  title: string;
  description: string;
}

export function ConnectPrompt({ title, description }: ConnectPromptProps) {
  return (
    <div className="bg-[#ffffff] border-[3px] border-[#111111] rounded p-8 sm:p-10 arena-shadow max-w-xl mx-auto text-center">
      <div className="w-12 h-12 bg-[#111111] text-[#ffc83d] border-2 border-[#111111] rounded mx-auto mb-5 flex items-center justify-center">
        <Wallet size={24} aria-hidden="true" />
      </div>
      <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111111] mb-3">
        {title}
      </h2>
      <p className="text-[#4f4634] text-base mb-7 leading-relaxed">
        {description}
      </p>
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button
            type="button"
            onClick={openConnectModal}
            className="arena-btn-gold px-6 py-3 text-xs cursor-pointer"
          >
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    </div>
  );
}
