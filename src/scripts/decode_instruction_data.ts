/**
 * Script to decode unknown instruction data from Solana programs
 *
 * Usage:
 *   npx tsx src/scripts/decode_instruction_data.ts <hex_instruction_data>
 *
 * Features:
 * - Brute-forces Anchor discriminator matching against thousands of instruction names
 * - Scans for u8, u16, u32, u64 values at all offsets
 * - Highlights known values when provided
 */

import { createHash } from 'crypto';

// Known values to search for
const KNOWN_U64_VALUE = BigInt(99048614);
const KNOWN_U64_VALUE_2 = BigInt(795012);
// Fee BPS will be tested later - common values are 0-10000 (0-100%)

/**
 * Compute Anchor discriminator for an instruction name
 * Anchor uses: sha256("global:<instruction_name>")[0..8]
 */
function computeAnchorDiscriminator(instructionName: string): Buffer {
  const preimage = `global:${instructionName}`;
  const hash = createHash('sha256').update(preimage).digest();
  return hash.subarray(0, 8);
}

/**
 * Compute alternative discriminator schemes
 */
function computeAlternativeDiscriminators(instructionName: string): Array<{ scheme: string; discriminator: Buffer }> {
  const results: Array<{ scheme: string; discriminator: Buffer }> = [];

  // Scheme 1: Just the instruction name (no prefix)
  const hash1 = createHash('sha256').update(instructionName).digest();
  results.push({ scheme: `sha256("${instructionName}")`, discriminator: hash1.subarray(0, 8) });

  // Scheme 2: With "instruction:" prefix
  const hash2 = createHash('sha256').update(`instruction:${instructionName}`).digest();
  results.push({ scheme: `sha256("instruction:${instructionName}")`, discriminator: hash2.subarray(0, 8) });

  // Scheme 3: Snake_case to camelCase
  const camelName = instructionName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (camelName !== instructionName) {
    const hash3 = createHash('sha256').update(`global:${camelName}`).digest();
    results.push({ scheme: `sha256("global:${camelName}")`, discriminator: hash3.subarray(0, 8) });
  }

  // Scheme 4: With namespace (common in some programs)
  const hash4 = createHash('sha256').update(`${instructionName}:ix`).digest();
  results.push({ scheme: `sha256("${instructionName}:ix")`, discriminator: hash4.subarray(0, 8) });

  // Scheme 5: Sighash style (first 8 bytes of name hash)
  const hash5 = createHash('sha256').update(instructionName.toLowerCase()).digest();
  results.push({ scheme: `sha256("${instructionName.toLowerCase()}")`, discriminator: hash5.subarray(0, 8) });

  return results;
}

/**
 * Try all discriminator schemes for a name
 */
function tryAllSchemes(instructionName: string, targetDiscriminator: Buffer): string | null {
  // Try Anchor scheme first
  const anchorDisc = computeAnchorDiscriminator(instructionName);
  if (anchorDisc.equals(targetDiscriminator)) {
    return `Anchor: global:${instructionName}`;
  }

  // Try alternative schemes
  const alternatives = computeAlternativeDiscriminators(instructionName);
  for (const { scheme, discriminator } of alternatives) {
    if (discriminator.equals(targetDiscriminator)) {
      return scheme;
    }
  }

  return null;
}

/**
 * Generate massive list of instruction name variations
 */
function generateInstructionNames(): string[] {
  const names: string[] = [];

  // Base names - common DeFi operations
  const bases = [
    'route', 'swap', 'exchange', 'trade', 'fill', 'execute', 'process', 'transfer',
    'deposit', 'withdraw', 'stake', 'unstake', 'claim', 'redeem', 'mint', 'burn',
    'add_liquidity', 'remove_liquidity', 'provide_liquidity', 'take_liquidity',
    'place_order', 'cancel_order', 'fill_order', 'match_order', 'settle_order',
    'open_position', 'close_position', 'increase_position', 'decrease_position',
    'borrow', 'repay', 'liquidate', 'flash_loan', 'flash_swap',
    'initialize', 'init', 'create', 'update', 'close', 'delete',
    'buy', 'sell', 'bid', 'ask', 'offer', 'take', 'make',
    'send', 'receive', 'wrap', 'unwrap', 'convert',
    'swap_exact_in', 'swap_exact_out', 'swap_base_in', 'swap_base_out',
    'exact_input', 'exact_output', 'exact_in', 'exact_out',
    'two_hop_swap', 'multi_hop_swap', 'split_route', 'single_route',
    'perp_trade', 'spot_trade', 'margin_trade', 'leverage_trade',
    'limit_order', 'market_order', 'stop_order', 'trigger_order',
    'dca', 'dca_swap', 'auto_swap', 'scheduled_swap',
    'jit', 'jit_swap', 'jit_route', 'jit_trade',
    'arb', 'arbitrage', 'arb_swap', 'arb_route',
    'whirlpool_swap', 'raydium_swap', 'orca_swap', 'serum_swap', 'phoenix_swap',
    'pump', 'pump_swap', 'pump_buy', 'pump_sell', 'pump_trade',
    'bonding_curve', 'curve_swap', 'curve_trade',
    'amm_swap', 'clmm_swap', 'dlmm_swap', 'cpmm_swap',
    'proxy_swap', 'proxy_route', 'proxy_trade',
    'aggregator_swap', 'aggregator_route',
    'jupiter_swap', 'jupiter_route',
    'meteora_swap', 'lifinity_swap', 'aldrin_swap',
    'saber_swap', 'mercurial_swap', 'sencha_swap',
    'step_swap', 'cropper_swap', 'crema_swap',
    'invariant_swap', 'goosefx_swap', 'balansol_swap',
    'marinade_deposit', 'marinade_unstake',
    'lido_deposit', 'lido_withdraw',
    'sanctum_swap', 'sanctum_stake',
    'tensor_buy', 'tensor_sell', 'tensor_list',
    'magic_eden_buy', 'magic_eden_sell',
    'raffle_buy', 'raffle_claim',
    'auction_bid', 'auction_settle',
  ];

  // Prefixes
  const prefixes = ['', 'do_', 'run_', 'exec_', 'perform_', 'handle_', 'process_', 'execute_', 'call_', 'invoke_', 'trigger_', 'start_', 'begin_', 'finish_', 'complete_', 'proxy_', 'cpi_', 'inner_'];

  // Suffixes
  const suffixes = ['', '_v2', '_v3', '_v4', '_v5', '_exact', '_base', '_tokens', '_sol', '_wsol', '_spl', '_new', '_legacy', '_2', '_3', '_ix', '_instruction', '_handler'];

  // Generate snake_case combinations
  for (const base of bases) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        names.push(`${prefix}${base}${suffix}`);
      }
    }
  }

  // Also try camelCase versions
  const camelCaseNames = names.map(name => {
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  });
  names.push(...camelCaseNames);

  // Also try PascalCase
  const pascalCaseNames = names.map(name => {
    const camel = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  });
  names.push(...pascalCaseNames);

  // Common single-word instructions
  const singleWords = [
    'swap', 'route', 'trade', 'buy', 'sell', 'transfer', 'send', 'execute',
    'fill', 'claim', 'redeem', 'deposit', 'withdraw', 'stake', 'unstake',
    'mint', 'burn', 'wrap', 'unwrap', 'convert', 'bridge', 'cross',
    'Swap', 'Route', 'Trade', 'Buy', 'Sell', 'Transfer', 'Execute',
    'pump', 'Pump', 'PUMP',
  ];
  names.push(...singleWords);

  // Specific program instruction names (from various Solana DEXs)
  const specificNames = [
    // Buy variations
    'buy', 'buy_token', 'buy_tokens', 'buy_exact', 'buy_exact_in', 'buy_exact_out',
    'buy_v2', 'buy_v3', 'buy_now', 'buy_order', 'buy_limit', 'buy_market',
    'buy_swap', 'buy_and_swap', 'buy_with_sol', 'buy_with_token',
    'doBuy', 'do_buy', 'exec_buy', 'execute_buy', 'process_buy', 'handle_buy',
    'Buy', 'BuyToken', 'BuyTokens', 'BuyExact', 'BuyOrder',
    'instant_buy', 'quick_buy', 'fast_buy', 'simple_buy', 'direct_buy',
    'token_buy', 'sol_buy', 'spl_buy', 'nft_buy',
    'buy_single', 'buy_multi', 'buy_batch',
    'buy_base', 'buy_quote', 'buy_base_token', 'buy_quote_token',
    'market_buy', 'limit_buy', 'stop_buy',
    'buyV2', 'buyV3', 'buyExact', 'buyOrder', 'buyToken', 'buyTokens',
    'buy_in', 'buy_out', 'buyIn', 'buyOut',
    'purchase', 'purchase_token', 'purchase_tokens', 'do_purchase',

    // Transaction variations
    'transaction', 'tx', 'transact', 'trans',
    'execute_transaction', 'process_transaction', 'handle_transaction',
    'execute_tx', 'process_tx', 'handle_tx', 'run_tx',
    'do_transaction', 'do_tx', 'make_transaction', 'make_tx',
    'send_transaction', 'send_tx', 'submit_transaction', 'submit_tx',
    'create_transaction', 'create_tx', 'build_transaction', 'build_tx',
    'swap_transaction', 'swap_tx', 'trade_transaction', 'trade_tx',
    'buy_transaction', 'buy_tx', 'sell_transaction', 'sell_tx',
    'Transaction', 'Tx', 'ExecuteTransaction', 'ProcessTransaction',
    'transactionV2', 'transaction_v2', 'tx_v2', 'txV2',
    'inner_tx', 'cpi_tx', 'proxy_tx',
    'atomic_tx', 'batch_tx', 'multi_tx',

    // Combined buy + transaction (extensive variations)
    'buy_tx', 'buyTx', 'buy_transaction', 'buyTransaction',
    'tx_buy', 'txBuy', 'transaction_buy', 'transactionBuy',
    'BuyTransaction', 'BuyTx', 'TransactionBuy', 'TxBuy',
    'buy/transaction', 'transaction/buy', 'buy-transaction', 'transaction-buy',
    'buyTransaction', 'transactionBuy', 'buy_Transaction', 'Transaction_buy',
    'exec_buy_transaction', 'execute_buy_transaction', 'process_buy_transaction',
    'do_buy_transaction', 'handle_buy_transaction', 'run_buy_transaction',
    'buy_transaction_v2', 'buy_transaction_v3', 'buyTransactionV2', 'buyTransactionV3',
    'submit_buy_transaction', 'send_buy_transaction', 'create_buy_transaction',
    'buy_tx_v2', 'buy_tx_v3', 'buyTxV2', 'buyTxV3',
    'execute_buy_tx', 'process_buy_tx', 'handle_buy_tx',
    'token_buy_transaction', 'sol_buy_transaction', 'spl_buy_transaction',
    'tokenBuyTransaction', 'solBuyTransaction', 'splBuyTransaction',
    'buy_token_transaction', 'buyTokenTransaction', 'buy_token_tx', 'buyTokenTx',
    'instant_buy_transaction', 'quick_buy_transaction', 'fast_buy_transaction',
    'market_buy_transaction', 'limit_buy_transaction',
    'swap_buy_transaction', 'trade_buy_transaction',

    // More buy/tx combos with different separators and cases
    'buytransaction', 'BUYTRANSACTION', 'BUY_TRANSACTION', 'BUY_TX',
    'buytx', 'BUYTX', 'buy_TX', 'BUY_tx',
    'Buy_Transaction', 'Buy_Tx', 'buy_Trans', 'buyTrans',
    'transact_buy', 'transactBuy', 'TransactBuy',
    'purchase_transaction', 'purchaseTransaction', 'PurchaseTransaction',
    'purchase_tx', 'purchaseTx', 'PurchaseTx',

    // Jupiter variations
    'shared_accounts_route', 'shared_accounts_route_v2', 'route_with_token_ledger',
    'exact_out_route', 'exact_out_route_v2', 'sharedAccountsRoute', 'sharedAccountsRouteV2',

    // Raydium
    'swap_base_input', 'swap_base_output', 'swapBaseInput', 'swapBaseOutput',
    'swap_v2', 'initialize2', 'deposit_v2', 'withdraw_v2',
    'rSwap', 'ray_swap', 'raySwap',

    // Orca/Whirlpool
    'two_hop_swap', 'two_hop_swap_v2', 'twoHopSwap', 'twoHopSwapV2',
    'swap_v2', 'open_position', 'close_position', 'increase_liquidity', 'decrease_liquidity',
    'whirlpool', 'whirlpoolSwap',

    // Phoenix
    'new_order', 'cancel_all_orders', 'cancel_multiple_orders',
    'place_limit_order', 'reduce_order',

    // Pump.fun style
    'buy_token', 'sell_token', 'create_token', 'buy', 'sell',
    'pump_buy', 'pump_sell', 'bonding_curve_buy', 'bonding_curve_sell',
    'pumpBuy', 'pumpSell', 'bondingCurveBuy', 'bondingCurveSell',
    'launch', 'graduate', 'migrate',

    // Meteora
    'swap', 'add_liquidity', 'remove_liquidity', 'claim_fee',
    'dlmm_swap', 'dlmmSwap',

    // Limit order style
    'place_limit_order', 'take_limit_order', 'cancel_limit_order',
    'create_order', 'fill_order', 'cancel_order',

    // More variations
    'process_swap', 'complete_swap', 'finalize_swap',
    'process_route', 'complete_route', 'finalize_route',
    'do_swap', 'make_swap', 'perform_swap',
    'swap_tokens', 'swap_sol', 'swap_wsol',
    'token_swap', 'sol_swap', 'spl_swap',

    // Numbers in names
    'swap2', 'swap3', 'route2', 'route3', 'trade2',
    'swap_2', 'swap_3', 'route_2', 'route_3',
  ];
  names.push(...specificNames);

  // Remove duplicates
  return [...new Set(names)];
}

/**
 * Parse hex string to Buffer
 */
function parseHex(hex: string): Buffer {
  const cleanHex = hex.replace(/^0x/, '').replace(/\s/g, '');
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Read u8 at offset
 */
function readU8(buf: Buffer, offset: number): number | null {
  if (offset + 1 > buf.length) return null;
  return buf.readUInt8(offset);
}

/**
 * Read u16 LE at offset
 */
function readU16LE(buf: Buffer, offset: number): number | null {
  if (offset + 2 > buf.length) return null;
  return buf.readUInt16LE(offset);
}

/**
 * Read u32 LE at offset
 */
function readU32LE(buf: Buffer, offset: number): number | null {
  if (offset + 4 > buf.length) return null;
  return buf.readUInt32LE(offset);
}

/**
 * Read u64 LE at offset
 */
function readU64LE(buf: Buffer, offset: number): bigint | null {
  if (offset + 8 > buf.length) return null;
  return buf.readBigUInt64LE(offset);
}

/**
 * Format bytes as hex with spacing
 */
function formatHexBytes(buf: Buffer, startOffset: number = 0): string {
  const lines: string[] = [];
  for (let i = 0; i < buf.length; i += 16) {
    const slice = buf.subarray(i, Math.min(i + 16, buf.length));
    const hexPart = Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const offsetStr = (startOffset + i).toString().padStart(4, '0');
    lines.push(`  ${offsetStr}: ${hexPart}`);
  }
  return lines.join('\n');
}

/**
 * Try to find the instruction name from discriminator using brute force
 */
function bruteForceDiscriminator(discriminator: Buffer): string | null {
  const instructionNames = generateInstructionNames();
  console.log(`\n  🔎 Trying ${instructionNames.length} instruction name variations with multiple schemes...`);

  for (const name of instructionNames) {
    // Try all schemes
    const match = tryAllSchemes(name, discriminator);
    if (match) {
      return match;
    }
  }
  return null;
}

/**
 * Scan for all u64 values at all offsets
 */
function scanU64Values(buf: Buffer): Array<{ offset: number; value: bigint; isKnown: boolean }> {
  const results: Array<{ offset: number; value: bigint; isKnown: boolean }> = [];
  for (let i = 0; i <= buf.length - 8; i++) {
    const value = readU64LE(buf, i);
    if (value !== null) {
      results.push({
        offset: i,
        value,
        isKnown: value === KNOWN_U64_VALUE || value === KNOWN_U64_VALUE_2
      });
    }
  }
  return results;
}

/**
 * Main decode function
 */
function decodeInstructionData(hexData: string): void {
  const buf = parseHex(hexData);

  console.log('\n' + '═'.repeat(80));
  console.log('INSTRUCTION DATA DECODER');
  console.log('═'.repeat(80));

  console.log(`\n📏 Total bytes: ${buf.length}`);
  console.log(`📄 Raw hex: ${hexData}`);

  // Hex dump
  console.log('\n📋 Byte dump:');
  console.log(formatHexBytes(buf));

  // Discriminator analysis (first 8 bytes)
  if (buf.length >= 8) {
    const discriminator = buf.subarray(0, 8);
    const discHex = discriminator.toString('hex');
    const discBytes = Array.from(discriminator).join(', ');

    console.log('\n' + '─'.repeat(80));
    console.log('🔍 DISCRIMINATOR ANALYSIS (first 8 bytes)');
    console.log('─'.repeat(80));
    console.log(`  Hex: ${discHex}`);
    console.log(`  Bytes: [${discBytes}]`);

    // Brute force match
    const matchedName = bruteForceDiscriminator(discriminator);
    if (matchedName) {
      console.log(`\n  ✅ MATCHED INSTRUCTION NAME: "${matchedName}"`);
      console.log(`     Verified: sha256("global:${matchedName}")[0..8] = ${discHex}`);
    } else {
      console.log(`\n  ❌ No match found in tried names`);
      console.log(`  💡 The discriminator may be from:`);
      console.log(`     - A non-Anchor program (different hashing scheme)`);
      console.log(`     - An Anchor program with an unusual instruction name`);
      console.log(`     - A custom discriminator scheme`);
    }
  }

  // Data after discriminator
  if (buf.length > 8) {
    const dataAfterDisc = buf.subarray(8);

    console.log('\n' + '─'.repeat(80));
    console.log('📊 DATA AFTER DISCRIMINATOR');
    console.log('─'.repeat(80));
    console.log(`  Bytes remaining: ${dataAfterDisc.length}`);
    console.log(formatHexBytes(dataAfterDisc, 8));

    // Scan for u64 values at 8-byte aligned offsets
    console.log('\n' + '─'.repeat(80));
    console.log('🔢 U64 VALUES (8-byte aligned after discriminator)');
    console.log('─'.repeat(80));

    for (let offset = 8; offset <= buf.length - 8; offset += 8) {
      const value = readU64LE(buf, offset);
      if (value !== null) {
        let marker = '';
        if (value === KNOWN_U64_VALUE) marker = ' ⭐ KNOWN VALUE (99048614)!';
        if (value === KNOWN_U64_VALUE_2) marker = ' ⭐ KNOWN VALUE (795012 - expected output)!';
        console.log(`  Offset ${offset.toString().padStart(2)}: ${value}${marker}`);
      }
    }

    // Scan all offsets for u64
    console.log('\n' + '─'.repeat(80));
    console.log('🔢 U64 VALUES (all offsets, interesting values only)');
    console.log('─'.repeat(80));

    const u64Values = scanU64Values(buf);
    const interestingU64 = u64Values.filter(v =>
      v.offset >= 8 && v.value > BigInt(0) && v.value < BigInt(10000000000)
    );
    for (const { offset, value, isKnown } of interestingU64) {
      const marker = isKnown ? ' ⭐' : '';
      console.log(`  Offset ${offset.toString().padStart(2)}: ${value}${marker}`);
    }

    // U32 scan
    console.log('\n' + '─'.repeat(80));
    console.log('🔢 U32 VALUES (interesting values)');
    console.log('─'.repeat(80));

    for (let i = 8; i <= buf.length - 4; i++) {
      const value = readU32LE(buf, i);
      if (value !== null && value > 0 && value < 10000000) {
        console.log(`  Offset ${i.toString().padStart(2)}: ${value}`);
      }
    }

    // U16 scan
    console.log('\n' + '─'.repeat(80));
    console.log('🔢 U16 VALUES (interesting values)');
    console.log('─'.repeat(80));

    for (let i = 8; i <= buf.length - 2; i++) {
      const value = readU16LE(buf, i);
      if (value !== null && value > 0 && value < 65535) {
        console.log(`  Offset ${i.toString().padStart(2)}: ${value}`);
      }
    }

    // U8 scan
    console.log('\n' + '─'.repeat(80));
    console.log('🔢 U8 VALUES (non-zero bytes after discriminator)');
    console.log('─'.repeat(80));

    for (let i = 8; i < buf.length; i++) {
      const value = buf[i];
      if (value > 0) {
        console.log(`  Offset ${i.toString().padStart(2)}: ${value} (0x${value.toString(16).padStart(2, '0')})`);
      }
    }
  }

  // Struct interpretation
  console.log('\n' + '─'.repeat(80));
  console.log('🧩 STRUCT INTERPRETATION');
  console.log('─'.repeat(80));

  interpretStruct(buf);

  console.log('\n' + '═'.repeat(80));
}

/**
 * Try to interpret the structure
 */
function interpretStruct(buf: Buffer): void {
  if (buf.length < 8) return;

  const discriminator = buf.subarray(0, 8);
  const data = buf.subarray(8);

  console.log('\n  Based on known values and byte patterns:\n');

  // Layout interpretation
  const fields: string[] = [];

  // First field - u64 (input amount)
  if (data.length >= 8) {
    const val = readU64LE(data, 0);
    fields.push(`  [8-15]  u64 in_amount = ${val}${val === KNOWN_U64_VALUE ? ' ⭐' : ''}`);
  }

  // Second field - u64 (output amount)
  if (data.length >= 16) {
    const val = readU64LE(data, 8);
    fields.push(`  [16-23] u64 out_amount/min_out = ${val}${val === KNOWN_U64_VALUE_2 ? ' ⭐' : ''}`);
  }

  // Analyze remaining bytes more carefully
  if (data.length > 16) {
    const remaining = data.subarray(16);
    fields.push(`\n  [24+]   Remaining ${remaining.length} bytes analysis:`);
    fields.push(`          Raw: ${remaining.toString('hex')}`);

    // Try interpretation 1: u32 + variable data
    if (remaining.length >= 4) {
      const firstU32 = readU32LE(remaining, 0);
      fields.push(`\n          Interpretation A (u32 followed by data):`);
      fields.push(`            [24-27] u32 = ${firstU32}`);

      if (remaining.length > 4) {
        const afterU32 = remaining.subarray(4);
        fields.push(`            [28+]   ${afterU32.length} bytes: ${afterU32.toString('hex')}`);

        // Check if it could be a vec with length prefix
        if (afterU32.length >= 4) {
          const possibleVecLen = readU32LE(afterU32, 0);
          if (possibleVecLen !== null && possibleVecLen > 0 && possibleVecLen < 50) {
            fields.push(`            [28-31] Possible vec length: ${possibleVecLen}`);
          }
        }
      }
    }

    // Try interpretation 2: bool + u8 padding + data
    fields.push(`\n          Interpretation B (bool + padding + data):`);
    fields.push(`            [24]    bool = ${remaining[0] === 1 ? 'true' : 'false'}`);
    if (remaining.length > 4) {
      fields.push(`            [25-27] padding (zeros): ${remaining.subarray(1, 4).toString('hex')}`);
      fields.push(`            [28+]   data: ${remaining.subarray(4).toString('hex')}`);
    }

    // Try interpretation 3: Multiple small fields
    fields.push(`\n          Interpretation C (multiple small fields):`);
    let offset = 0;
    const smallFields: string[] = [];

    // [24]: u8 = 1 (or bool)
    if (offset < remaining.length) {
      smallFields.push(`            [${24 + offset}] u8/bool = ${remaining[offset]}`);
      offset++;
    }

    // Skip zeros
    while (offset < remaining.length && remaining[offset] === 0) offset++;

    // [28]: u8 = 6
    if (offset < remaining.length && remaining[offset] !== 0) {
      smallFields.push(`            [${24 + offset}] u8 = ${remaining[offset]}`);
      offset++;
    }

    // [29]: u8 = 2
    if (offset < remaining.length && remaining[offset] !== 0) {
      smallFields.push(`            [${24 + offset}] u8 = ${remaining[offset]}`);
      offset++;
    }

    // Skip zeros
    while (offset < remaining.length && remaining[offset] === 0) offset++;

    // [31]: u8 = 18 (0x12)
    if (offset < remaining.length && remaining[offset] !== 0) {
      smallFields.push(`            [${24 + offset}] u8 = ${remaining[offset]} (0x${remaining[offset].toString(16)})`);
      offset++;
    }

    // Remaining bytes - could be truncated pubkey or other data
    if (offset < remaining.length) {
      const finalBytes = remaining.subarray(offset);
      smallFields.push(`            [${24 + offset}+] ${finalBytes.length} bytes: ${finalBytes.toString('hex')}`);

      // Check if it could be a truncated pubkey (first N bytes of a 32-byte key)
      if (finalBytes.length >= 10 && finalBytes.length < 32) {
        smallFields.push(`            ⚠️  Could be truncated data (${finalBytes.length} bytes, pubkey is 32)`);
      }
    }

    fields.push(...smallFields);

    // Try interpretation 4: Vec<RoutePlanStep> style (common in DEX)
    fields.push(`\n          Interpretation D (vec structure analysis):`);
    // In Borsh, vec is serialized as: u32 length + elements
    // Looking at bytes: 01 00 00 00 06 02 00 12 ...
    // If 01000000 is vec length = 1, then each element is remaining bytes
    const vecLen = readU32LE(remaining, 0);
    if (vecLen !== null && vecLen >= 1 && vecLen <= 10) {
      fields.push(`            Possible vec with ${vecLen} element(s)`);
      const elementData = remaining.subarray(4);
      fields.push(`            Element data (${elementData.length} bytes): ${elementData.toString('hex')}`);

      // If vec has 1 element, analyze that element
      if (vecLen === 1 && elementData.length > 0) {
        fields.push(`            Analyzing single element:`);
        // First byte might be enum discriminant
        fields.push(`              [0] Possible enum discriminant: ${elementData[0]}`);
        if (elementData.length > 1) {
          fields.push(`              [1+] Element payload: ${elementData.subarray(1).toString('hex')}`);
        }
      }
    }
  }

  console.log(fields.join('\n'));

  // Suggest possible struct
  console.log('\n  💡 Known instruction: cw_swap (ChainWorks swap)');
  console.log('     Discriminator: sha256("global:cw_swap")[0..8] = 5f920158b7e32489\n');
  console.log('  Suggested Anchor struct:\n');
  console.log('  ```rust');
  console.log('  #[derive(AnchorSerialize, AnchorDeserialize)]');
  console.log('  pub struct CwSwapArgs {');
  console.log('      pub in_amount: u64,       // 99048614');
  console.log('      pub min_out_amount: u64,  // 796036');
  console.log('      pub flag: bool,           // true (0x01)');
  console.log('      // padding: [u8; 3]');
  console.log('      pub param1: u8,           // 6');
  console.log('      pub param2: u8,           // 2');
  console.log('      // padding: u8');
  console.log('      pub fee_bps: u8,          // 18 (0x12) - possibly fee in basis points');
  console.log('      pub extra_data: [u8; 14], // 4137d4fd6a19fe6b1669a82fe80000');
  console.log('  }');
  console.log('  ```');

  // Alternative interpretation as vec
  console.log('\n  🔄 Alternative (with vec):');
  console.log('  ```rust');
  console.log('  pub struct SwapArgs {');
  console.log('      pub in_amount: u64,');
  console.log('      pub min_out_amount: u64,');
  console.log('      pub route_plan: Vec<RoutePlanStep>, // length=1');
  console.log('  }');
  console.log('  ');
  console.log('  pub struct RoutePlanStep {');
  console.log('      pub swap_type: u8,   // 6');
  console.log('      pub dex_id: u8,      // 2');
  console.log('      pub percent: u8,     // 0 (or part of other field)');
  console.log('      pub data: [u8; ...], // remaining bytes');
  console.log('  }');
  console.log('  ```');
}

// Default test data
const DEFAULT_DATA = "5f920158b7e32489a65ce7050000000084250c000000000001000000060200124137d4fd6a19fe6b1669a82fe80000";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const hexInput = args[0] || DEFAULT_DATA;

  console.log('🔍 Decoding instruction data...');

  try {
    decodeInstructionData(hexInput);
  } catch (error) {
    console.error('\n❌ Error decoding instruction data:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

