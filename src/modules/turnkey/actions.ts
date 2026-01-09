"use server"


import {turnkeyConfig} from "@/modules/turnkey/configs/config";
import {createTurnkeyClient} from "@/modules/turnkey/client.server";
import {TURNKEY_API_URL} from "@/constants/turnkey";


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


/**
 * Compress an uncompressed P-256 public key to compressed format.
 * Uncompressed keys start with 04 and are 65 bytes (130 hex chars).
 * Compressed keys start with 02 or 03 and are 33 bytes (66 hex chars).
 */
function compressPublicKey(publicKeyHex: string): string {
  // Remove 0x prefix if present
  const hex = publicKeyHex.replace(/^0x/, '').toLowerCase();

  // If already compressed (starts with 02 or 03 and is 66 chars), return as-is
  if ((hex.startsWith('02') || hex.startsWith('03')) && hex.length === 66) {
    return hex;
  }

  // If uncompressed (starts with 04 and is 130 chars), compress it
  if (hex.startsWith('04') && hex.length === 130) {
    // Extract X and Y coordinates (each 32 bytes = 64 hex chars)
    const x = hex.slice(2, 66);  // Skip the 04 prefix
    const y = hex.slice(66, 130);

    // Determine prefix based on whether Y is even or odd
    const yLastByte = parseInt(y.slice(-2), 16);
    const prefix = (yLastByte % 2 === 0) ? '02' : '03';

    return prefix + x;
  }

  // Unknown format - return as-is and let Turnkey validate
  return hex;
}


import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import {Turnkey} from "@turnkey/sdk-server";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildJupiterSwapTx } from "@/modules/tx/jupiter_swap_tx";
import { buildWrongTokenSwapTx, buildWrongAmountSwapTx } from "@/modules/tx/jupiter_swap_tx";



export async function cosignWithPolicy(
  orgId: string,         // user's sub-org
  W1_ADDR: string,       // address of W1 (in this sub-org!)
  unsignedB64: string,   // base64 of *unsigned* message
  policyId: string
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


  console.log("Logging parameters")
  try {
    const {activity} = await client.signTransaction({
      organizationId: orgId,
      timestampMs: String(Date.now()),
      signWith: W1_ADDR,                 // <-- address or private key ID
      unsignedTransaction: unsignedB64,  // <-- base64 string
      type: "TRANSACTION_TYPE_SOLANA",
    });
    return activity.result.signTransactionResult!.signedTransaction! as string;
  }catch (error) {
    console.log("Error during cosignWithPolicy:", error);
    throw error
}

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


/**
 * Executes a Jupiter SOL→USDC swap on behalf of the user.
 * This function:
 * 1. Builds a fresh swap transaction with current blockhash
 * 2. Signs the transaction via Turnkey using the DA policy
 * 3. Submits the transaction to the Solana network
 *
 * @param orgId - User's sub-organization ID
 * @param walletAddr - User's Solana wallet address
 * @param amountLamports - Amount of SOL to swap in lamports
 * @returns Transaction signature
 */
export async function executeJupiterSwap(
  orgId: string,
  walletAddr: string,
  amountLamports: string,
  policyId: string
): Promise<{ signature: string; inputAmount: string; outputAmount: string }> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
  const userPubkey = new PublicKey(walletAddr);

  console.log(`Building Jupiter swap tx: ${amountLamports} lamports SOL→USDC`);

  // 1. Build fresh transaction with current blockhash
  const { unsignedTx, quote } = await buildJupiterSwapTx(
    rpcUrl,
    userPubkey,
    amountLamports
  );

  console.log(`Quote received: ${quote.inAmount} SOL → ${quote.outAmount} USDC`);
  console.log(`Policy expects in_amount: ${amountLamports}`);
  console.log(`Quote actual inAmount: ${quote.inAmount}`);
  if (quote.inAmount !== amountLamports) {
    console.warn(`⚠️ AMOUNT MISMATCH: Policy expects ${amountLamports}, but quote has ${quote.inAmount}`);
  }

  // 2. Sign the transaction via Turnkey (policy will validate SOL→USDC and amount)
  const signedTxHex = await cosignWithPolicy(orgId, walletAddr, unsignedTx, policyId);

  console.log("Transaction signed by Turnkey");
  console.log(`SIGNED TX (hex): ${signedTxHex}`);

  // 3. Submit to Solana network
  const connection = new Connection(rpcUrl);
  // Turnkey returns hex-encoded signed transaction
  const signedTxBuffer = Buffer.from(signedTxHex, 'hex');

  const signature = await connection.sendRawTransaction(signedTxBuffer, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  console.log(`Transaction submitted: ${signature}`);

  // 4. Confirm transaction
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log(`Transaction confirmed: ${signature}`);

  return {
    signature,
    inputAmount: quote.inAmount,
    outputAmount: quote.outAmount,
  };
}

/**
 * TEST: Attempt to sign a swap with WRONG OUTPUT TOKEN (SOL→BONK instead of SOL→USDC)
 * This should be REJECTED by the Turnkey policy
 */
export async function testWrongTokenSwap(
  orgId: string,
  walletAddr: string,
  amountLamports: string,
  daId: string
): Promise<{ success: boolean; error?: string }> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
  const cosignerPubkey = new PublicKey(process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY!);
  const userPubkey = new PublicKey(walletAddr);

  console.log(`🧪 TEST: Building WRONG TOKEN swap tx (SOL→BONK)`);

  try {
    // First try to build the transaction - if Jupiter fails, that's a different issue
    let unsignedTx: string;
    let quote: { inAmount: string; outAmount: string };

    try {
      const result = await buildWrongTokenSwapTx(
        rpcUrl,
        userPubkey,
        cosignerPubkey,
        amountLamports
      );
      unsignedTx = result.unsignedTx;
      quote = result.quote;
    } catch (buildError) {
      // Jupiter API error - not a policy test result
      console.log('⚠️ Could not build wrong token tx (Jupiter API issue):', buildError);
      return {
        success: false,
        error: `Could not build test transaction: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`
      };
    }

    console.log(`Quote: ${quote.inAmount} SOL → ${quote.outAmount} BONK (WRONG TOKEN!)`);

    // This should FAIL - policy should reject non-USDC output
    await cosignWithPolicy(orgId, walletAddr, unsignedTx, daId);

    // If we get here, the policy didn't work!
    console.error('❌ POLICY FAILED: Wrong token swap was signed!');
    return { success: false, error: 'Policy should have rejected wrong token swap but it was signed!' };
  } catch (error) {
    // This is EXPECTED - policy should reject
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Check if this is a policy rejection (what we want) vs other errors
    if (errorMsg.includes('policy') || errorMsg.includes('Policy') || errorMsg.includes('No policies evaluated')) {
      console.log('✅ POLICY ENFORCED: Wrong token swap was rejected');
      return { success: true, error: errorMsg };
    } else {
      console.log('⚠️ Test inconclusive - error was not a policy rejection:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}

/**
 * TEST: Attempt to sign a swap with WRONG AMOUNT (2x the approved amount)
 * This should be REJECTED by the Turnkey policy
 */
export async function testWrongAmountSwap(
  orgId: string,
  walletAddr: string,
  correctAmountLamports: string,
  policyId: string
): Promise<{ success: boolean; error?: string }> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL!;
  const cosignerPubkey = new PublicKey(process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY!);
  const userPubkey = new PublicKey(walletAddr);

  const wrongAmount = (BigInt(correctAmountLamports) * BigInt(2)).toString();
  console.log(`🧪 TEST: Building WRONG AMOUNT swap tx (${wrongAmount} lamports instead of ${correctAmountLamports})`);

  try {
    // First try to build the transaction - if Jupiter fails, that's a different issue
    let unsignedTx: string;
    let quote: { inAmount: string; outAmount: string };

    try {
      const result = await buildWrongAmountSwapTx(
        rpcUrl,
        userPubkey,
        cosignerPubkey,
        correctAmountLamports
      );
      unsignedTx = result.unsignedTx;
      quote = result.quote;
    } catch (buildError) {
      // Jupiter API error - not a policy test result
      console.log('⚠️ Could not build wrong amount tx (Jupiter API issue):', buildError);
      return {
        success: false,
        error: `Could not build test transaction: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`
      };
    }

    console.log(`Quote: ${quote.inAmount} SOL → ${quote.outAmount} USDC (WRONG AMOUNT!)`);

    // This should FAIL - policy should reject wrong amount
    await cosignWithPolicy(orgId, walletAddr, unsignedTx, policyId);

    // If we get here, the policy didn't work!
    console.error('❌ POLICY FAILED: Wrong amount swap was signed!');
    return { success: false, error: 'Policy should have rejected wrong amount swap but it was signed!' };
  } catch (error) {
    // This is EXPECTED - policy should reject
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Check if this is a policy rejection (what we want) vs other errors
    if (errorMsg.includes('policy') || errorMsg.includes('Policy') || errorMsg.includes('No policies evaluated')) {
      console.log('✅ POLICY ENFORCED: Wrong amount swap was rejected');
      return { success: true, error: errorMsg };
    } else {
      console.log('⚠️ Test inconclusive - error was not a policy rejection:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}

/**
 * Activity type definition for Turnkey activities
 */
export interface TurnkeyActivity {
  id: string;
  organizationId: string;
  status: string;
  type: string;
  intent: unknown;
  result: unknown;
  votes: unknown[];
  fingerprint: string;
  canApprove: boolean;
  canReject: boolean;
  createdAt: { seconds: string; nanos: string };
  updatedAt: { seconds: string; nanos: string };
}

// Import for Solana wallet auth
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

/**
 * Convert string to base64url encoding (no padding, URL-safe chars)
 */
function stringToBase64url(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Parse a Solana private key from various formats
 */
function parseSolanaPrivateKey(privateKeyInput: string): Keypair {
  // Try Base58 first (standard Solana format)
  try {
    const decoded = bs58.decode(privateKeyInput);
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(decoded);
    }
  } catch {
    // Not base58, try other formats
  }

  // Try hex format
  const hexClean = privateKeyInput.replace(/^0x/, '').toLowerCase();
  if (/^[0-9a-f]+$/.test(hexClean)) {
    const bytes = Buffer.from(hexClean, 'hex');
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes);
    }
    if (bytes.length === 32) {
      const fullKeypair = nacl.sign.keyPair.fromSeed(bytes);
      return Keypair.fromSecretKey(Buffer.from(fullKeypair.secretKey));
    }
  }

  throw new Error(
    "Invalid private key format. Expected Base58-encoded Solana private key (~88 chars) " +
    "or hex-encoded key (64 or 128 hex chars)"
  );
}

/**
 * Create a stamp for Turnkey API requests using Solana wallet signing
 */
async function createSolanaStamp(
  keypair: Keypair,
  payload: string
): Promise<{ stampHeaderName: string; stampHeaderValue: string }> {
  const messageBytes = new TextEncoder().encode(payload);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

  const publicKeyHex = Buffer.from(keypair.publicKey.toBytes()).toString('hex');
  const signatureHex = Buffer.from(signature).toString('hex');

  const stamp = {
    publicKey: publicKeyHex,
    signature: signatureHex,
    scheme: "SIGNATURE_SCHEME_TK_API_ED25519",
  };

  return {
    stampHeaderName: "X-Stamp",
    stampHeaderValue: stringToBase64url(JSON.stringify(stamp)),
  };
}

/**
 * Make an authenticated request to Turnkey API using Solana wallet
 */
async function turnkeyRequestWithSolana(
  keypair: Keypair,
  endpoint: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const url = `${TURNKEY_API_URL}${endpoint}`;
  const payload = JSON.stringify(body);

  const { stampHeaderName, stampHeaderValue } = await createSolanaStamp(keypair, payload);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [stampHeaderName]: stampHeaderValue,
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Turnkey API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Fetches activities for a sub-organization with optional filtering by activity types.
 * Uses Solana wallet private key for authentication (no storage for security).
 *
 * @param subOrgId - The sub-organization ID to fetch activities from
 * @param solanaPrivateKey - Solana wallet private key (Base58 or hex format)
 * @param activityTypes - Optional array of activity types to filter (defaults to sign transaction)
 * @returns Object with activities array or error details
 */
export async function getSubOrgActivities(
  subOrgId: string,
  solanaPrivateKey: string,
  activityTypes: string[] = ["ACTIVITY_TYPE_SIGN_TRANSACTION_V2"]
): Promise<{
  success: boolean;
  activities?: TurnkeyActivity[];
  totalCount?: number;
  filteredCount?: number;
  error?: string;
  rawError?: string;
}> {
  try {
    // Validate inputs
    if (!subOrgId || !solanaPrivateKey) {
      return {
        success: false,
        error: "Missing required credentials. Please provide subOrgId and solanaPrivateKey.",
      };
    }

    // Parse the Solana private key
    let keypair: Keypair;
    try {
      keypair = parseSolanaPrivateKey(solanaPrivateKey);
    } catch (e) {
      return {
        success: false,
        error: "Invalid Solana private key format. Please provide a Base58-encoded key (~88 chars).",
        rawError: e instanceof Error ? e.message : String(e),
      };
    }

    // Fetch activities in batches (max 100 per request)
    let allActivities: TurnkeyActivity[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const response = await turnkeyRequestWithSolana(keypair, "/public/v1/query/list_activities", {
        organizationId: subOrgId,
        paginationOptions: {
          limit: "100",
          ...(pageToken ? { pageToken } : {}),
        },
      }) as { activities: TurnkeyActivity[]; nextPageToken?: string };

      allActivities = [...allActivities, ...(response.activities ?? [])];
      pageToken = response.nextPageToken;
    } while (pageToken);

    const totalCount = allActivities.length;

    // Filter by activity types if specified
    let filteredActivities = allActivities;
    if (activityTypes.length > 0) {
      filteredActivities = allActivities.filter((activity) =>
        activityTypes.includes(activity.type)
      );
    }

    return {
      success: true,
      activities: filteredActivities,
      totalCount,
      filteredCount: filteredActivities.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    // Provide user-friendly error messages
    let friendlyError = "Failed to fetch activities.";

    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      friendlyError = "Authentication failed. Make sure you're using the same Solana wallet that was used to create the sub-org.";
    } else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      friendlyError = "Sub-organization not found. Please verify the sub-organization ID is correct.";
    } else if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
      friendlyError = "Access denied. You may not have permission to view activities for this sub-organization.";
    } else if (errorMessage.includes("signature") || errorMessage.includes("Signature")) {
      friendlyError = "Signature verification failed. The private key may not match the public key registered with the sub-org.";
    } else if (errorMessage.includes("network") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("fetch")) {
      friendlyError = "Network error. Please check your internet connection.";
    }

    return {
      success: false,
      error: friendlyError,
      rawError: errorMessage,
    };
  }
}
