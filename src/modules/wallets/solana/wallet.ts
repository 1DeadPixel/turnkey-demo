import {Buffer} from "buffer"
import {type SolanaWalletInterface, WalletType} from "@turnkey/wallet-stamper";

export function SolanaWallet(wallet: {
  publicKey: { toBytes(): Uint8Array } | null;
  signMessage?: (msg: Uint8Array) => Promise<Uint8Array>;
}): SolanaWalletInterface {
  return {
    type: WalletType.Solana,

    async getPublicKey() {
      if (!wallet.publicKey) throw new Error("No public key");
      return Buffer.from(wallet.publicKey.toBytes()).toString("hex");
    },

    async signMessage(message: string) {
      if (!wallet.signMessage) {
        throw new Error("Wallet does not support signMessage");
      }
      const encoded = new TextEncoder().encode(message);
      const signature = await wallet.signMessage(encoded);
      return Buffer.from(signature).toString("hex");
    },
  };
}
