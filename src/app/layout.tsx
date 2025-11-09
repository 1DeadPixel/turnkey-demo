import "./globals.css";
import * as React from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import {SolanaWalletContextProvider} from "@/app/wallet/solana/provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletContextProvider>
          {children}
        </SolanaWalletContextProvider>
      </body>
    </html>
  );
}
