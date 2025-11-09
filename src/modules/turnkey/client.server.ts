import 'server-only';


import {Turnkey, TurnkeyApiClient} from '@turnkey/sdk-server';
import {turnkeyConfig} from "@/modules/turnkey/configs/config";

const { apiBaseUrl, defaultOrganizationId } = turnkeyConfig;

// Initialize the Turnkey Server Client on the server-side
export function createTurnkeyClient(): TurnkeyApiClient {return new Turnkey({
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
  apiBaseUrl,
  defaultOrganizationId,
}).apiClient();}