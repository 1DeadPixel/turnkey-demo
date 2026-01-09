/**
 * Script to compare multiple Solana VersionedTransactions and find differences
 *
 * Usage:
 *   npx tsx src/scripts/compare_txs.ts
 */

import { VersionedTransaction, PublicKey } from "@solana/web3.js";

const TX1 = "020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800201040f1efbce24f86b5577e5cf370afd11f7b1d41407e2807c05ba09d11bfb6ca6e07993ff65b9b63450b22df5cb94d8dfe6d3634a417859babc9700ec1ebc472d6b743d56db4c9d63b8a414431af546dcc2c00f17f52f4cffead42b4bcd6d853f03c5693a4dbdbca8d0bc5762abe719555604d5675cc20b0c48aa6e139e5f11284ea6d4ec525447ddd3935b8ad9d419bd7617cbaf39de624a036f3b902582f342e6a066a17f1a02398a5bdfc97aea61c17a692eced9e6177773a5634ede3d4feaa10d81f53884d2d3915328f3bfa2566f6d2e5c6fe86602a12eaa054f338fb56d579b9ca082f8b19d64f8e1df110465fcdc5c6552e95a732db548ce491426d17162460302cd6b62dec612060a8330b1d28895bb556423532545e03ae2118bd1b70dae249b482d943c785a4da0a65f8ced6a1b1a375c69bb489dadfac77ab3ae3bdc6b08b33926436a8c59656e563d7a2f5b2890cec0093e894dc2556e22ab8afb487000000000000000000000000000000000000000000000000000000000000000000306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a400000008c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f859b51721036306adfc07fe48990803e5b0cdb5f87c5e98a4fa502b58e10919170f6a90b5d1284e71734669adacc932242a4b3fc2d9c7d070d03f30cfae0b1f9e52070b0302100104040000000c01110502f04902000c0009030a1a0000000000000d060003000e0b1201010405050013120b0a01a086010000000000fb041d05000f0b04141506050307080e130012121416140412050409040404041700b882010000000000d651080d00000000000209000a000b02000a0c0200000040420f000000000001eccb891b566ba10e7b942614e7be402207a12316e8e31757bc52c71252092391013907036f04076d9697";

const TX2 = "020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800201040f1efbce24f86b5577e5cf370afd11f7b1d41407e2807c05ba09d11bfb6ca6e07993ff65b9b63450b22df5cb94d8dfe6d3634a417859babc9700ec1ebc472d6b743d56db4c9d63b8a414431af546dcc2c00f17f52f4cffead42b4bcd6d853f03c5693a4dbdbca8d0bc5762abe719555604d5675cc20b0c48aa6e139e5f11284ea6d4ec525447ddd3935b8ad9d419bd7617cbaf39de624a036f3b902582f342e6a066a17f1a02398a5bdfc97aea61c17a692eced9e6177773a5634ede3d4feaa10d81f53884d2d3915328f3bfa2566f6d2e5c6fe86602a12eaa054f338fb56d579b9ca082f8b19d64f8e1df110465fcdc5c6552e95a732db548ce491426d17162460302cd6b62dec612060a8330b1d28895bb556423532545e03ae2118bd1b70dae249b482d943c785a4da0a65f8ced6a1b1a375c69bb489dadfac77ab3ae3bdc6b666af58fe05c39eb5c61e3b786c03836a74b68c8f47511e15171da0edebdfa8000000000000000000000000000000000000000000000000000000000000000000306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a400000008c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f859b51721036306adfc07fe48990803e5b0cdb5f87c5e98a4fa502b58e10919170f6a90b5d1284e71734669adacc932242a4b3fc2d9c7d070d03f30cfae0b1f9e52070b0302100104040000000c01110502f04902000c0009030a1a0000000000000d060003000e0b1201010405050013120b0a01a086010000000000fb041d05000f0b04141506050307080e130012121416140412050409040404041700b882010000000000d651080d00000000000209000a000b02000a0c0200000040420f000000000001eccb891b566ba10e7b942614e7be402207a12316e8e31757bc52c71252092391013907036f04076d9697";

const TX3 = "020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800201040f1efbce24f86b5577e5cf370afd11f7b1d41407e2807c05ba09d11bfb6ca6e07993ff65b9b63450b22df5cb94d8dfe6d3634a417859babc9700ec1ebc472d6b743d56db4c9d63b8a414431af546dcc2c00f17f52f4cffead42b4bcd6d853f03c5693a4dbdbca8d0bc5762abe719555604d5675cc20b0c48aa6e139e5f11284ea6d4ec525447ddd3935b8ad9d419bd7617cbaf39de624a036f3b902582f342e6a066a17f1a02398a5bdfc97aea61c17a692eced9e6177773a5634ede3d4feaa10d81f53884d2d3915328f3bfa2566f6d2e5c6fe86602a12eaa054f338fb56d579b9ca082f8b19d64f8e1df110465fcdc5c6552e95a732db548ce491426d17162460302cd6b62dec612060a8330b1d28895bb556423532545e03ae2118bd1b70dae249b482d943c785a4da0a65f8ced6a1b1a375c69bb489dadfac77ab3ae3bdc6b78521cb179cebb8589b556a2d5ec94d2498682fdf9bb2af5ad64e491cc4153da00000000000000000000000000000000000000000000000000000000000000000306466fe5211732ffecadba72c39be7bc8ce5bbc5f7126b2c439b3a400000008c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f859b51721036306adfc07fe48990803e5b0cdb5f87c5e98a4fa502b58e10919170f6a90b5d1284e71734669adacc932242a4b3fc2d9c7d070d03f30cfae0b1f9e52070b0302100104040000000c01110502f04902000c0009030a1a0000000000000d060003000e0b1201010405050013120b0a01a086010000000000fb041d05000f0b04141506050307080e130012121416140412050409040404041700b882010000000000d651080d00000000000209000a000b02000a0c0200000040420f000000000001eccb891b566ba10e7b942614e7be402207a12316e8e31757bc52c71252092391013907036f04076d9697";

function decodeTransaction(hexString: string): VersionedTransaction {
  const cleanHex = hexString.replace(/^0x/, '');
  const bytes = Buffer.from(cleanHex, 'hex');
  return VersionedTransaction.deserialize(bytes);
}

function extractTxData(tx: VersionedTransaction) {
  const message = tx.message;
  const staticKeys = message.staticAccountKeys;
  const instructions = message.compiledInstructions;

  return {
    version: message.version,
    signatures: tx.signatures.map(s => Buffer.from(s).toString('hex')),
    staticAccountKeys: staticKeys.map(k => k.toBase58()),
    recentBlockhash: message.recentBlockhash,
    header: {
      numRequiredSignatures: message.header.numRequiredSignatures,
      numReadonlySignedAccounts: message.header.numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts: message.header.numReadonlyUnsignedAccounts,
    },
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
  };
}

function compareValues(label: string, v1: any, v2: any, v3: any): void {
  const s1 = JSON.stringify(v1);
  const s2 = JSON.stringify(v2);
  const s3 = JSON.stringify(v3);

  if (s1 === s2 && s2 === s3) {
    console.log(`   ✅ ${label}: IDENTICAL in all 3 transactions`);
  } else {
    console.log(`   ❌ ${label}: DIFFERENT`);
    if (s1 !== s2) console.log(`      TX1 vs TX2: DIFFERENT`);
    if (s2 !== s3) console.log(`      TX2 vs TX3: DIFFERENT`);
    if (s1 !== s3) console.log(`      TX1 vs TX3: DIFFERENT`);
    console.log(`      TX1: ${typeof v1 === 'string' ? v1 : JSON.stringify(v1)}`);
    console.log(`      TX2: ${typeof v2 === 'string' ? v2 : JSON.stringify(v2)}`);
    console.log(`      TX3: ${typeof v3 === 'string' ? v3 : JSON.stringify(v3)}`);
  }
}

async function main(): Promise<void> {
  console.log('🔍 Decoding and comparing 3 transactions...\n');

  const tx1 = decodeTransaction(TX1);
  const tx2 = decodeTransaction(TX2);
  const tx3 = decodeTransaction(TX3);

  const data1 = extractTxData(tx1);
  const data2 = extractTxData(tx2);
  const data3 = extractTxData(tx3);

  console.log('═'.repeat(80));
  console.log('TRANSACTION COMPARISON RESULTS');
  console.log('═'.repeat(80));

  console.log('\n📋 Basic Properties:');
  compareValues('Version', data1.version, data2.version, data3.version);
  compareValues('Header', data1.header, data2.header, data3.header);
  compareValues('Signatures', data1.signatures, data2.signatures, data3.signatures);

  console.log('\n🔗 Blockhash:');
  compareValues('Recent Blockhash', data1.recentBlockhash, data2.recentBlockhash, data3.recentBlockhash);

  console.log('\n🔑 Account Keys:');
  const keys1 = data1.staticAccountKeys;
  const keys2 = data2.staticAccountKeys;
  const keys3 = data3.staticAccountKeys;

  compareValues('Number of keys', keys1.length, keys2.length, keys3.length);

  // Compare each key
  const maxKeys = Math.max(keys1.length, keys2.length, keys3.length);
  for (let i = 0; i < maxKeys; i++) {
    const k1 = keys1[i] || '(missing)';
    const k2 = keys2[i] || '(missing)';
    const k3 = keys3[i] || '(missing)';
    if (k1 !== k2 || k2 !== k3) {
      console.log(`   ❌ Key [${i}]: DIFFERENT`);
      console.log(`      TX1: ${k1}`);
      console.log(`      TX2: ${k2}`);
      console.log(`      TX3: ${k3}`);
    }
  }

  console.log('\n📜 Instructions:');
  compareValues('Number of instructions',
    data1.compiledInstructions.length,
    data2.compiledInstructions.length,
    data3.compiledInstructions.length
  );

  // Compare each instruction
  const maxIx = Math.max(
    data1.compiledInstructions.length,
    data2.compiledInstructions.length,
    data3.compiledInstructions.length
  );
  for (let i = 0; i < maxIx; i++) {
    const ix1 = data1.compiledInstructions[i];
    const ix2 = data2.compiledInstructions[i];
    const ix3 = data3.compiledInstructions[i];
    const s1 = JSON.stringify(ix1);
    const s2 = JSON.stringify(ix2);
    const s3 = JSON.stringify(ix3);
    if (s1 !== s2 || s2 !== s3) {
      console.log(`   ❌ Instruction [${i}]: DIFFERENT`);
      console.log(`      TX1: ${s1}`);
      console.log(`      TX2: ${s2}`);
      console.log(`      TX3: ${s3}`);
    }
  }

  console.log('\n📖 Address Table Lookups:');
  compareValues('Address Table Lookups',
    data1.addressTableLookups,
    data2.addressTableLookups,
    data3.addressTableLookups
  );

  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY OF DIFFERENCES');
  console.log('═'.repeat(80));

  // Find hex differences
  console.log('\n🔬 Raw Hex Comparison:');
  console.log(`   TX1 length: ${TX1.length} chars`);
  console.log(`   TX2 length: ${TX2.length} chars`);
  console.log(`   TX3 length: ${TX3.length} chars`);

  // Find exact position of differences
  let diffPositions: number[] = [];
  for (let i = 0; i < Math.max(TX1.length, TX2.length, TX3.length); i++) {
    if (TX1[i] !== TX2[i] || TX2[i] !== TX3[i] || TX1[i] !== TX3[i]) {
      diffPositions.push(i);
    }
  }

  if (diffPositions.length > 0) {
    console.log(`\n   Differences found at ${diffPositions.length} hex positions`);

    // Group consecutive positions
    const groups: { start: number; end: number }[] = [];
    let currentGroup = { start: diffPositions[0], end: diffPositions[0] };

    for (let i = 1; i < diffPositions.length; i++) {
      if (diffPositions[i] === currentGroup.end + 1) {
        currentGroup.end = diffPositions[i];
      } else {
        groups.push(currentGroup);
        currentGroup = { start: diffPositions[i], end: diffPositions[i] };
      }
    }
    groups.push(currentGroup);

    console.log(`\n   Difference regions (${groups.length} group(s)):`);
    groups.forEach((g, i) => {
      const byteStart = Math.floor(g.start / 2);
      const byteEnd = Math.floor(g.end / 2);
      console.log(`\n   Group ${i + 1}: Hex chars ${g.start}-${g.end} (bytes ${byteStart}-${byteEnd})`);
      console.log(`      TX1: ${TX1.slice(g.start, g.end + 1)}`);
      console.log(`      TX2: ${TX2.slice(g.start, g.end + 1)}`);
      console.log(`      TX3: ${TX3.slice(g.start, g.end + 1)}`);
    });
  } else {
    console.log('   All transactions are IDENTICAL');
  }

  console.log('\n' + '═'.repeat(80));
}

main();

