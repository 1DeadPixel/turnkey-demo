import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { JupiterExternalAPI } from '@/external_apis/jupiter';
import { SOL_MINT, USDC_MINT, BONK_MINT } from '@/constants/tokens';

const jupiter = new JupiterExternalAPI();

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: null | unknown;
  priceImpactPct: string;
  routePlan: unknown[];
  contextSlot: number;
  timeTaken: number;
}

export interface SwapInstructionResponse {
  tokenLedgerInstruction: unknown | null;
  computeBudgetInstructions: InstructionData[];
  setupInstructions: InstructionData[];
  swapInstruction: InstructionData;
  cleanupInstruction: InstructionData | null;
  addressLookupTableAddresses: string[];
}

interface InstructionData {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}

/**
 * Fetches a Jupiter quote for SOL→USDC swap
 */
export async function getJupiterQuote(
  amountLamports: string,
  slippageBps: number = 300  // 3% slippage for better route availability
): Promise<JupiterQuote> {
  const response = await jupiter.getQuoteInfo(
    SOL_MINT,
    USDC_MINT,
    amountLamports,
    slippageBps
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Jupiter quote: ${error}`);
  }

  return await response.json();
}

/**
 * Fetches swap instructions from Jupiter API
 */
export async function getJupiterSwapInstructions(
  quote: JupiterQuote,
  userPubkey: string
): Promise<SwapInstructionResponse> {
  const response = await jupiter.getSwapInstructions(
    quote as unknown as Record<string, unknown>,
    userPubkey
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Jupiter swap instructions: ${error}`);
  }

  return await response.json();
}

/**
 * Converts Jupiter instruction data to Solana TransactionInstruction
 */
function toTransactionInstruction(ix: InstructionData): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: Buffer.from(ix.data, 'base64'),
  });
}

/**
 * Fetches Address Lookup Table accounts from the chain
 */
async function getAddressLookupTableAccounts(
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> {
  const addressLookupTableAccountInfos = await connection.getMultipleAccountsInfo(
    keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }
    return acc;
  }, [] as AddressLookupTableAccount[]);
}

/**
 * Builds an unsigned Jupiter swap transaction for SOL→USDC using VersionedTransaction
 *
 * @param rpcUrl - Solana RPC URL
 * @param userPubkey - User's wallet public key (fee payer)
 * @param amountLamports - Amount of SOL to swap in lamports
 * @returns Base64 encoded unsigned transaction
 */
export async function buildJupiterSwapTx(
  rpcUrl: string,
  userPubkey: PublicKey,
  amountLamports: string
): Promise<{ unsignedTx: string; quote: JupiterQuote }> {
  console.log(`Building Jupiter swap tx with RPC: ${rpcUrl}`);

  // 1. Get quote from Jupiter
  console.log('Fetching Jupiter quote...');
  const quote = await getJupiterQuote(amountLamports);
  console.log('Quote received:', quote.inAmount, '->', quote.outAmount);

  // Validate the quote is for SOL→USDC
  if (quote.inputMint !== SOL_MINT) {
    throw new Error(`Invalid input mint: expected ${SOL_MINT}, got ${quote.inputMint}`);
  }
  if (quote.outputMint !== USDC_MINT) {
    throw new Error(`Invalid output mint: expected ${USDC_MINT}, got ${quote.outputMint}`);
  }

  // 2. Get swap instructions
  console.log('Fetching swap instructions...');
  const swapInstructions = await getJupiterSwapInstructions(quote, userPubkey.toBase58());
  console.log('Swap instructions received');

  // 3. Build the transaction
  console.log('Creating Solana connection to:', rpcUrl);
  const connection = new Connection(rpcUrl, 'confirmed');

  console.log('Fetching latest blockhash...');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  console.log('Blockhash received:', blockhash);

  // Collect all instructions
  const instructions: TransactionInstruction[] = [];

  // Add compute budget instructions
  for (const ix of swapInstructions.computeBudgetInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add setup instructions
  for (const ix of swapInstructions.setupInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add the main swap instruction
  instructions.push(toTransactionInstruction(swapInstructions.swapInstruction));

  // Add cleanup instruction if present
  if (swapInstructions.cleanupInstruction) {
    instructions.push(toTransactionInstruction(swapInstructions.cleanupInstruction));
  }


  // Fetch Address Lookup Tables
  console.log('Fetching address lookup tables...');
  const addressLookupTableAccounts = await getAddressLookupTableAccounts(
    connection,
    swapInstructions.addressLookupTableAddresses
  );
  console.log(`Loaded ${addressLookupTableAccounts.length} lookup tables`);

  // Build versioned transaction message
  const messageV0 = new TransactionMessage({
    payerKey: userPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  // Create versioned transaction
  const versionedTx = new VersionedTransaction(messageV0);

  // Serialize without signatures - Turnkey expects hex encoding
  const serialized = versionedTx.serialize();
  const unsignedTx = Buffer.from(serialized).toString('hex');

  console.log(`Transaction size: ${serialized.length} bytes`);

  return { unsignedTx, quote };
}

/**
 * Fetches a Jupiter quote for any token pair (used for testing)
 */
async function getJupiterQuoteForPair(
  inputMint: string,
  outputMint: string,
  amountLamports: string,
  slippageBps: number = 300  // 3% slippage for better route availability
): Promise<JupiterQuote> {
  const response = await jupiter.getQuoteInfo(
    inputMint,
    outputMint,
    amountLamports,
    slippageBps
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Jupiter quote: ${error}`);
  }

  return await response.json();
}

/**
 * Builds a swap transaction with WRONG OUTPUT TOKEN (SOL→BONK instead of SOL→USDC)
 * This should be REJECTED by the policy
 */
export async function buildWrongTokenSwapTx(
  rpcUrl: string,
  userPubkey: PublicKey,
  cosignerPubkey: PublicKey,
  amountLamports: string
): Promise<{ unsignedTx: string; quote: JupiterQuote }> {
  // Get quote for SOL→BONK (wrong output token)
  const quote = await getJupiterQuoteForPair(SOL_MINT, BONK_MINT, amountLamports);

  // Get swap instructions
  const swapInstructions = await getJupiterSwapInstructions(quote, userPubkey.toBase58());

  // Build the transaction
  const connection = new Connection(rpcUrl, 'confirmed');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  // Collect all instructions
  const instructions: TransactionInstruction[] = [];

  // Add compute budget instructions
  for (const ix of swapInstructions.computeBudgetInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add setup instructions
  for (const ix of swapInstructions.setupInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add the main swap instruction
  instructions.push(toTransactionInstruction(swapInstructions.swapInstruction));

  // Add cleanup instruction if present
  if (swapInstructions.cleanupInstruction) {
    instructions.push(toTransactionInstruction(swapInstructions.cleanupInstruction));
  }


  // Fetch Address Lookup Tables
  const addressLookupTableAccounts = await getAddressLookupTableAccounts(
    connection,
    swapInstructions.addressLookupTableAddresses
  );

  // Build versioned transaction message
  const messageV0 = new TransactionMessage({
    payerKey: userPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  // Create versioned transaction
  const versionedTx = new VersionedTransaction(messageV0);

  // Serialize - Turnkey expects hex encoding
  const serialized = versionedTx.serialize();
  const unsignedTx = Buffer.from(serialized).toString('hex');

  return { unsignedTx, quote };
}

/**
 * Builds a swap transaction with WRONG AMOUNT (different from policy-approved amount)
 * This should be REJECTED by the policy
 */
export async function buildWrongAmountSwapTx(
  rpcUrl: string,
  userPubkey: PublicKey,
  cosignerPubkey: PublicKey,
  correctAmountLamports: string
): Promise<{ unsignedTx: string; quote: JupiterQuote }> {
  // Use a different amount (2x the correct amount)
  const wrongAmount = (BigInt(correctAmountLamports) * BigInt(2)).toString();

  // Get quote for wrong amount
  const quote = await getJupiterQuote(wrongAmount);

  // Get swap instructions
  const swapInstructions = await getJupiterSwapInstructions(quote, userPubkey.toBase58());

  // Build the transaction
  const connection = new Connection(rpcUrl, 'confirmed');
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  // Collect all instructions
  const instructions: TransactionInstruction[] = [];

  // Add compute budget instructions
  for (const ix of swapInstructions.computeBudgetInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add setup instructions
  for (const ix of swapInstructions.setupInstructions) {
    instructions.push(toTransactionInstruction(ix));
  }

  // Add the main swap instruction
  instructions.push(toTransactionInstruction(swapInstructions.swapInstruction));

  // Add cleanup instruction if present
  if (swapInstructions.cleanupInstruction) {
    instructions.push(toTransactionInstruction(swapInstructions.cleanupInstruction));
  }


  // Fetch Address Lookup Tables
  const addressLookupTableAccounts = await getAddressLookupTableAccounts(
    connection,
    swapInstructions.addressLookupTableAddresses
  );

  // Build versioned transaction message
  const messageV0 = new TransactionMessage({
    payerKey: userPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  // Create versioned transaction
  const versionedTx = new VersionedTransaction(messageV0);

  // Serialize - Turnkey expects hex encoding
  const serialized = versionedTx.serialize();
  const unsignedTx = Buffer.from(serialized).toString('hex');

  return { unsignedTx, quote };
}
