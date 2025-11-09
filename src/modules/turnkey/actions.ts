"use server"


import {turnkeyConfig} from "@/modules/turnkey/configs/config";
import {createTurnkeyClient} from "@/modules/turnkey/client.server";


const turnkeyClient = createTurnkeyClient()

export const getSubOrg = async (publicKey: string) => {
  try {
    const { organizationIds } = await turnkeyClient.getSubOrgIds({
      organizationId: turnkeyConfig.defaultOrganizationId,
      filterType: "PUBLIC_KEY",
      filterValue: publicKey,
    });
    console.log(organizationIds)
    return organizationIds[0] ?? null;
  } catch  {
      console.log("NO suborg")
      return null;
  }
};


export const createSubOrg = async (
  publicKey: string,
  curveType: 'API_KEY_CURVE_ED25519' | 'API_KEY_CURVE_SECP256K1'
) => {
  const apiKeys = [
    {
      apiKeyName: `Demo - ${publicKey}`,
      publicKey,
      // We set the curve type to 'API_KEY_CURVE_ED25519' for solana wallets
      // If using an Ethereum wallet, set the curve type to 'API_KEY_CURVE_SECP256K1'
      curveType,
    },
  ];

  return await turnkeyClient.createSubOrganization({
      organizationId: turnkeyConfig.defaultOrganizationId,
      subOrganizationName: `Demo - ${publicKey}`,
      rootUsers: [
          {
              userName: publicKey,
              userEmail: 'wallet@domain.com',
              apiKeys,
              authenticators: [],
              oauthProviders: [],
          },
      ],
      rootQuorumThreshold: 1,
      // a wallet in turnkey is defined as an HD seed phrase able to generate wallets for every supported chain
      // in this example we create 2 wallets one on solana and one on ethereum
      wallet: {
          walletName: 'Primary Wallet',
          accounts: [
              { curve: 'CURVE_ED25519', pathFormat: 'PATH_FORMAT_BIP32', path: "m/44'/501'/0'/0'", addressFormat: 'ADDRESS_FORMAT_SOLANA' },
              { curve: 'CURVE_SECP256K1', pathFormat: 'PATH_FORMAT_BIP32', path: "m/44'/60'/0'/0/0", addressFormat: 'ADDRESS_FORMAT_ETHEREUM' },
          ],
          mnemonicLength: 24
      },

  });
};

export const listWalletAccounts = async (
  organizationId: string,
  walletId?: string
): Promise<{ address: string; chain: "SOLANA" | "ETHEREUM" }[]> => {
  const res = await turnkeyClient.getWalletAccounts({
    organizationId,
    ...(walletId ? { walletId } : {}),        // optional; omit to list all org accounts
    // paginationOptions: { limit: "100" },   // optional; defaults to 10 per docs
  });
  console.log(res)

  const accounts = res.accounts ?? [];        // <-- field is `accounts`
  return accounts.map((acc: {address: string, addressFormat: string }) => ({
    address: acc.address,
    chain: acc.addressFormat === "ADDRESS_FORMAT_SOLANA" ? "SOLANA" : "ETHEREUM",
  }));
};



import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import {Turnkey} from "@turnkey/sdk-server";
import {TURNKEY_API_URL} from "@/constants/turnkey";



export async function cosignWithPolicy(
  orgId: string,         // user's sub-org
  W1_ADDR: string,       // address of W1 (in this sub-org!)
  unsignedB64: string    // base64 of *unsigned* message
): Promise<string> {

  // sanity guards help catch accidental undefined
  if (!orgId) throw new Error("orgId missing");
  if (!W1_ADDR) throw new Error("W1_ADDR missing");
  if (!unsignedB64) throw new Error("unsignedB64 missing");

  const client = new Turnkey({
    apiBaseUrl: TURNKEY_API_URL,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
    apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
    defaultOrganizationId: orgId,
  }).apiClient();


  console.log("Loggin parameters")
  const { activity } = await client.signTransaction({
    organizationId: orgId,
    timestampMs: String(Date.now()),
    signWith: W1_ADDR,                 // <-- address or private key ID
      unsignedTransaction: unsignedB64,  // <-- base64 string
      type: "TRANSACTION_TYPE_SOLANA",
  });

  return activity.result.signTransactionResult!.signedTransaction!;
}

export async function signWithTurnkeyFetch(orgId: string, W1: string, unsignedB64: string) {

  // Build the exact request body for Sign Transaction v2 (Solana)
  const body = {
    type: "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    organizationId: orgId,            // target = user sub-org
    timestampMs: String(Date.now()),
    parameters: {
      signWith: W1,                 // account in that sub-org
      unsignedTransaction: unsignedB64,   // base64 of *message* bytes
      type: "TRANSACTION_TYPE_SOLANA",
    },
  };

  // Serialize ONCE — the stamp must be computed over these exact bytes
  const json = JSON.stringify(body);

  // Produce the X-Stamp header
  const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  });
  const { stampHeaderName, stampHeaderValue } = await stamper.stamp(json); // usually "X-Stamp"

  // Send the request with fetch (Node 18+ has global fetch)
  const res = await fetch("https://api.turnkey.com/public/v1/submit/sign_transaction", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      [stampHeaderName]: stampHeaderValue,
    },
    body: json,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Turnkey HTTP ${res.status}: ${text}`);
  }
  const data = await res.json();
  // The signed transaction (base64) is here:
    console.log(data)
  return data.activity.result.signTransactionResult.signedTransaction as string;
}


