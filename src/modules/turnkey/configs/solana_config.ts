import {turnkeyConfig} from "@/modules/turnkey/configs/config";
import {SolanaWallet} from "@/modules/wallets/solana/wallet";


export function createSolanaConfig(wallet: Parameters<typeof SolanaWallet>[0]) {
    console.log(turnkeyConfig.defaultOrganizationId)
  return {
    ...turnkeyConfig,
    wallet: SolanaWallet(wallet),
  };
}