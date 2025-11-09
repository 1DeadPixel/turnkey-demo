"use client"

import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";

import "@solana/wallet-adapter-react-ui/styles.css";
import type {PropsWithChildren} from "react";

export function SolanaWalletContextProvider({ children }: PropsWithChildren) {
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}


