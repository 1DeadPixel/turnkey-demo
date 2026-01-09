/**
 * Script to decode and print a Solana VersionedTransaction from hex
 *
 * Usage:
 *   npx tsx src/scripts/decode_tx.ts <hex_string>
 *   npx tsx src/scripts/decode_tx.ts  # (uses default example if no arg provided)
 */

import { VersionedTransaction, PublicKey } from "@solana/web3.js";

/**
 * Decode a hex string to a VersionedTransaction
 */
function decodeTransaction(hexString: string): VersionedTransaction {
  // Remove 0x prefix if present
  const cleanHex = hexString.replace(/^0x/, '');
  const bytes = Buffer.from(cleanHex, 'hex');
  return VersionedTransaction.deserialize(bytes);
}

/**
 * Format a PublicKey for display
 */
function formatPubkey(pubkey: PublicKey): string {
  const str = pubkey.toBase58();
  return str;
}

/**
 * Print transaction details in a readable format
 */
function printTransaction(tx: VersionedTransaction): void {
  const message = tx.message;

  console.log('\n' + '═'.repeat(80));
  console.log('VERSIONED TRANSACTION DETAILS');
  console.log('═'.repeat(80));

  // Version
  console.log(`\n📋 Version: ${message.version}`);

  // Signatures
  console.log(`\n✍️  Signatures (${tx.signatures.length}):`);
  tx.signatures.forEach((sig, i) => {
    const sigHex = Buffer.from(sig).toString('hex');
    const isEmpty = sig.every(b => b === 0);
    console.log(`   [${i}] ${isEmpty ? '(empty - unsigned)' : sigHex.slice(0, 32) + '...'}`);
  });

  // Static Account Keys
  const staticKeys = message.staticAccountKeys;
  console.log(`\n🔑 Static Account Keys (${staticKeys.length}):`);
  staticKeys.forEach((key, i) => {
    console.log(`   [${i}] ${formatPubkey(key)}`);
  });

  // Recent Blockhash
  console.log(`\n🔗 Recent Blockhash: ${message.recentBlockhash}`);

  // Address Table Lookups (for v0 transactions)
  if ('addressTableLookups' in message && message.addressTableLookups.length > 0) {
    console.log(`\n📖 Address Table Lookups (${message.addressTableLookups.length}):`);
    message.addressTableLookups.forEach((lookup, i) => {
      console.log(`   [${i}] Table: ${formatPubkey(lookup.accountKey)}`);
      console.log(`       Writable indexes: [${lookup.writableIndexes.join(', ')}]`);
      console.log(`       Readonly indexes: [${lookup.readonlyIndexes.join(', ')}]`);
    });
  }

  // Compiled Instructions
  const instructions = message.compiledInstructions;
  console.log(`\n📜 Instructions (${instructions.length}):`);
  instructions.forEach((ix, i) => {
    const programKey = staticKeys[ix.programIdIndex];
    console.log(`\n   ────────────────────────────────────────`);
    console.log(`   Instruction #${i}`);
    console.log(`   Program: ${formatPubkey(programKey)} (index: ${ix.programIdIndex})`);
    console.log(`   Account indexes: [${ix.accountKeyIndexes.join(', ')}]`);
    console.log(`   Data (hex): ${Buffer.from(ix.data).toString('hex')}`);
    console.log(`   Data (base64): ${Buffer.from(ix.data).toString('base64')}`);

    // Try to identify known programs
    const programId = programKey.toBase58();
    if (programId === '11111111111111111111111111111111') {
      console.log(`   📌 Known program: System Program`);
    } else if (programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
      console.log(`   📌 Known program: Token Program`);
    } else if (programId === 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL') {
      console.log(`   📌 Known program: Associated Token Program`);
    } else if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4') {
      console.log(`   📌 Known program: Jupiter Aggregator v6`);
    } else if (programId === 'ComputeBudget111111111111111111111111111111') {
      console.log(`   📌 Known program: Compute Budget Program`);
    }
  });

  // Header info
  const header = message.header;
  console.log(`\n📊 Message Header:`);
  console.log(`   Required signatures: ${header.numRequiredSignatures}`);
  console.log(`   Readonly signed accounts: ${header.numReadonlySignedAccounts}`);
  console.log(`   Readonly unsigned accounts: ${header.numReadonlyUnsignedAccounts}`);

  console.log('\n' + '═'.repeat(80));

  // Raw JSON dump
  console.log('\n📄 Raw Transaction Object (JSON):');
  console.log(JSON.stringify({
    version: message.version,
    signatures: tx.signatures.map(s => Buffer.from(s).toString('hex')),
    header: {
      numRequiredSignatures: header.numRequiredSignatures,
      numReadonlySignedAccounts: header.numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts: header.numReadonlyUnsignedAccounts,
    },
    staticAccountKeys: staticKeys.map(k => k.toBase58()),
    recentBlockhash: message.recentBlockhash,
    compiledInstructions: instructions.map(ix => ({
      programIdIndex: ix.programIdIndex,
      accountKeyIndexes: Array.from(ix.accountKeyIndexes),
      data: Buffer.from(ix.data).toString('hex'),
    })),
    addressTableLookups: 'addressTableLookups' in message
      ? message.addressTableLookups.map(l => ({
          accountKey: l.accountKey.toBase58(),
          writableIndexes: Array.from(l.writableIndexes),
          readonlyIndexes: Array.from(l.readonlyIndexes),
        }))
      : [],
  }, null, 2));
}

// Default example transaction (from user's request)
const DEFAULT_TX_HEX = "020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800201040f1efbce24f86b5577e5cf370afd11f7b1d41407e2807c05ba09d11bfb6ca6e07993ff65b9b63450b22df5cb94d8dfe6d3634a417859babc9700ec1ebc472d6b74191fd88549bd6a2a06a7106d1e74b11091c29f4b63cb6008878dcc6f9fb19e9f693a4dbdbca8d0bc5762abe719555604d5675cc20b0c48aa6e139e5f11284ea6d4ec525447ddd3935b8ad9d419bd7617cbaf39de624a036f3b902582f342e6a066a17f1a02398a5bdfc97aea61c17a692eced9e6177773a5634ede3d4feaa10d81f53884d2d3915328f3bfa2566f6d2e5c6fe86602a12eaa054f338fb56d579b9ca082f8b19d64f8e1df110465fcdc5c6552e95a732db548ce491426d17162460302cd6b62dec612060a8330b1d28895bb556423532545e03ae2118bd1b70dae491bd1e2539829577df5f7c0add46728fbc1ebf2de8bbea950cef7d3d37bc54a89077d55a5bb1330763eb767f55ec077b41a0d075f7de1d73fbaca3c63d5547100000000000000000000000000000000000000000000000000000000000000000306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a400000008c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f859b51721036306adfc07fe48990803e5b0cdb5f87c5e98a4fa502b58e10919170ff19b748136ca0ac37eb57f14e3d199529db87ada9eed05cdc273f607793805f9070b0302100104040000000c01110502f04902000c0009030a1a0000000000000d060003000e0b1201010405050013120b0a01a086010000000000fb041d05000f0b04141506050307080e130012121416140412050409040404041700b88201000000000049def70d00000000000209000a000b02000a0c02000000a08601000000000001eccb891b566ba10e7b942614e7be402207a12316e8e31757bc52c71252092391012f07036f04076d9697";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const hexInput = args[0] || DEFAULT_TX_HEX;

  console.log('🔍 Decoding Solana VersionedTransaction...');
  console.log(`📏 Input length: ${hexInput.length} hex characters (${hexInput.length / 2} bytes)`);

  try {
    const tx = decodeTransaction(hexInput);
    printTransaction(tx);
  } catch (error) {
    console.error('\n❌ Error decoding transaction:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

