/**
 * Standalone script to fetch sub-org activities from Turnkey API
 * using a Solana wallet private key for authentication.
 *
 * Usage:
 *   npx tsx src/scripts/fetch_activities.ts <subOrgId> <solanaPrivateKey> [activityTypes...]
 *
 * Example:
 *   npx tsx src/scripts/fetch_activities.ts "org_123" "3R3pup..." ACTIVITY_TYPE_SIGN_TRANSACTION_V2
 *
 * The Solana private key can be:
 *   - Base58 encoded (standard Solana format, ~88 chars)
 *   - Hex encoded (128 chars for full keypair, or 64 chars for just the secret)
 *
 * If no activity types are provided, defaults to ACTIVITY_TYPE_SIGN_TRANSACTION_V2
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const TURNKEY_API_URL = "https://api.turnkey.com";

// Common activity types for filtering
const VALID_ACTIVITY_TYPES = [
  "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
  "ACTIVITY_TYPE_CREATE_POLICY",
  "ACTIVITY_TYPE_CREATE_USERS",
  "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION",
  "ACTIVITY_TYPE_CREATE_WALLET",
  "ACTIVITY_TYPE_DELETE_POLICY",
  "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "ACTIVITY_TYPE_EXPORT_WALLET_ACCOUNT",
  "ACTIVITY_TYPE_CREATE_API_KEYS",
  "ACTIVITY_TYPE_DELETE_API_KEYS",
] as const;

type ActivityType = typeof VALID_ACTIVITY_TYPES[number];

interface Activity {
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

/**
 * Parse a Solana private key from various formats
 */
function parsePrivateKey(privateKeyInput: string): Keypair {
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
      // Just the secret seed, need to derive full keypair
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
 * Convert string to base64url encoding (no padding, URL-safe chars)
 */
function stringToBase64url(str: string): string {
  const base64 = Buffer.from(str).toString('base64');
  // Convert to base64url: replace + with -, / with _, remove = padding
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a stamp for Turnkey API requests using Solana wallet signing
 */
async function createSolanaStamp(
  keypair: Keypair,
  payload: string
): Promise<{ stampHeaderName: string; stampHeaderValue: string }> {
  // Sign the payload with the Solana keypair
  const messageBytes = new TextEncoder().encode(payload);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);

  // Get public key in hex format (what Turnkey expects for ED25519)
  const publicKeyHex = Buffer.from(keypair.publicKey.toBytes()).toString('hex');
  const signatureHex = Buffer.from(signature).toString('hex');

  // Create the stamp in Turnkey's expected format
  const stamp = {
    publicKey: publicKeyHex,
    signature: signatureHex,
    scheme: "SIGNATURE_SCHEME_TK_API_ED25519",
  };

  // Return the stamp as a base64url encoded JSON string
  return {
    stampHeaderName: "X-Stamp",
    stampHeaderValue: stringToBase64url(JSON.stringify(stamp)),
  };
}

/**
 * Make an authenticated request to Turnkey API using Solana wallet
 */
async function turnkeyRequest(
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

async function fetchActivities(
  subOrgId: string,
  keypair: Keypair,
  activityTypes: string[] = ["ACTIVITY_TYPE_SIGN_TRANSACTION_V2"]
): Promise<Activity[]> {
  const publicKeyHex = Buffer.from(keypair.publicKey.toBytes()).toString('hex');
  console.log(`\n🔑 Using Solana wallet for authentication`);
  console.log(`📋 Public key: ${publicKeyHex.slice(0, 16)}...${publicKeyHex.slice(-16)}`);
  console.log(`🏢 Sub-org ID: ${subOrgId}`);
  console.log(`📋 Filtering by activity types: ${activityTypes.join(", ")}`);

  console.log(`\n📡 Fetching activities...`);

  // Fetch activities in batches (max 100 per request)
  let allActivities: Activity[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const response = await turnkeyRequest(keypair, "/public/v1/query/list_activities", {
      organizationId: subOrgId,
      paginationOptions: {
        limit: "100",
        ...(pageToken ? { pageToken } : {}),
      },
    }) as { activities: Activity[]; nextPageToken?: string };

    allActivities = [...allActivities, ...(response.activities ?? [])];
    pageToken = response.nextPageToken;

    if (pageToken) {
      console.log(`   Fetched ${allActivities.length} activities so far, getting more...`);
    }
  } while (pageToken);

  console.log(`✅ Fetched ${allActivities.length} total activities`);

  // Filter by activity types
  const filteredActivities = allActivities.filter((activity) =>
    activityTypes.includes(activity.type)
  );

  console.log(`🔍 Found ${filteredActivities.length} activities matching filter`);

  return filteredActivities;
}

function printUsage(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║     Turnkey Sub-Org Activity Fetcher (Solana Wallet Auth)         ║
╚════════════════════════════════════════════════════════════════════╝

Usage:
  npx tsx src/scripts/fetch_activities.ts <subOrgId> <solanaPrivateKey> [activityTypes...]

Arguments:
  subOrgId         - The sub-organization ID to fetch activities from
  solanaPrivateKey - Your Solana wallet private key (Base58 or hex format)
                     This is the wallet that was used to create the sub-org
  activityTypes    - (Optional) Space-separated list of activity types to filter

Private Key Formats Supported:
  - Base58 encoded (~88 characters) - standard Solana format
  - Hex encoded (64 or 128 hex characters)

Valid Activity Types:
${VALID_ACTIVITY_TYPES.map((t) => `  - ${t}`).join("\n")}

Examples:
  # Fetch only sign transaction activities (default)
  npx tsx src/scripts/fetch_activities.ts "de9c525d-1495-..." "3R3pupMF..."

  # Fetch sign transactions and policy creations
  npx tsx src/scripts/fetch_activities.ts "de9c525d-1495-..." "3R3pupMF..." ACTIVITY_TYPE_SIGN_TRANSACTION_V2 ACTIVITY_TYPE_CREATE_POLICY
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    printUsage();
    console.error("\n❌ Error: Missing required arguments");
    console.error("   Required: subOrgId, solanaPrivateKey\n");
    process.exit(1);
  }

  const [subOrgId, privateKeyInput, ...activityTypeArgs] = args;

  // Parse the Solana private key
  let keypair: Keypair;
  try {
    keypair = parsePrivateKey(privateKeyInput);
    console.log(`✅ Successfully parsed Solana private key`);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  // Validate activity types if provided
  const activityTypes: string[] =
    activityTypeArgs.length > 0
      ? activityTypeArgs
      : ["ACTIVITY_TYPE_SIGN_TRANSACTION_V2"];

  // Check for invalid activity types
  const invalidTypes = activityTypes.filter(
    (t) => !VALID_ACTIVITY_TYPES.includes(t as ActivityType)
  );
  if (invalidTypes.length > 0) {
    console.warn(`\n⚠️  Warning: Unknown activity types: ${invalidTypes.join(", ")}`);
    console.warn(`   These may not match any activities.\n`);
  }

  try {
    const activities = await fetchActivities(subOrgId, keypair, activityTypes);

    console.log(`\n${"═".repeat(70)}`);
    console.log(`FILTERED ACTIVITIES (${activities.length} results)`);
    console.log(`${"═".repeat(70)}\n`);

    if (activities.length === 0) {
      console.log("No activities found matching the specified filters.\n");
    } else {
      // Pretty print the activities
      console.log(JSON.stringify(activities, null, 2));
    }

    console.log(`\n${"═".repeat(70)}`);
    console.log(`Summary:`);
    console.log(`  - Total activities found: ${activities.length}`);
    console.log(`  - Filters applied: ${activityTypes.join(", ")}`);
    console.log(`${"═".repeat(70)}\n`);
  } catch (error) {
    console.error("\n❌ Error fetching activities:");

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);

      // Provide user-friendly error messages
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        console.error("\n💡 Tip: Authentication failed. Make sure you're using the same");
        console.error("   Solana wallet private key that was used to create the sub-org.");
      } else if (error.message.includes("404") || error.message.includes("not found")) {
        console.error("\n💡 Tip: Verify the sub-organization ID is correct.");
      } else if (error.message.includes("signature") || error.message.includes("Signature")) {
        console.error("\n💡 Tip: Signature verification failed. The private key may not");
        console.error("   match the public key registered with the sub-org.");
      }

      // Show raw error for debugging
      console.error("\n📋 Raw error details:");
      console.error(error);
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

main();

