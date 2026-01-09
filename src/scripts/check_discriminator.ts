import { createHash } from 'crypto';

const TARGET = '5f920158b7e32489';

console.log('Target discriminator:', TARGET);

// EXPANDED KEYWORDS
const keywords = [
  // Core actions
  'sell', 'buy', 'swap', 'route', 'trade', 'exchange', 'transfer', 'send', 'receive',
  'deposit', 'withdraw', 'stake', 'unstake', 'claim', 'redeem', 'mint', 'burn',
  'fill', 'match', 'settle', 'close', 'open', 'init', 'create', 'update', 'delete',
  'place', 'cancel', 'modify', 'execute', 'process', 'handle', 'submit', 'complete',
  'take', 'make', 'bid', 'ask', 'offer', 'accept', 'reject', 'confirm',
  // Transaction related
  'transaction', 'tx', 'trans', 'transact', 'txn', 'trx',
  // Chain/VM related
  'svm', 'sol', 'solana', 'evm', 'eth', 'ethereum', 'chain', 'cross', 'bridge',
  'chainworks', 'chainwork', 'chain_works', 'chain_work',
  // Token related
  'token', 'tokens', 'spl', 'coin', 'coins', 'asset', 'assets', 'nft', 'nfts',
  // Quote/Price related
  'quote', 'price', 'amount', 'value', 'rate', 'fee', 'fees',
  // Direction
  'exact', 'base', 'in', 'out', 'input', 'output', 'from', 'to', 'source', 'dest', 'destination',
  // Modifiers
  'v1', 'v2', 'v3', 'v4', 'new', 'old', 'legacy', 'latest',
  // Order types
  'order', 'orders', 'limit', 'market', 'stop', 'trigger', 'instant', 'flash', 'atomic',
  // Protocol names
  'jup', 'jupiter', 'ray', 'raydium', 'orca', 'serum', 'openbook', 'phoenix',
  'pump', 'fun', 'pumpfun', 'meme', 'bonding', 'curve', 'amm', 'clmm', 'dlmm', 'cpmm',
  'meteora', 'lifinity', 'aldrin', 'saber', 'mercurial', 'whirlpool', 'crema',
  // Proxy/Aggregator
  'proxy', 'inner', 'cpi', 'cross', 'program', 'invoke', 'call', 'aggregate', 'aggregator',
  // Single/Multi
  'single', 'multi', 'batch', 'bulk', 'split', 'merge', 'combine',
  // Liquidity
  'liquidity', 'lp', 'pool', 'pools', 'add', 'remove', 'provide', 'withdraw',
  // Position
  'position', 'positions', 'increase', 'decrease', 'leverage',
  // DCA
  'dca', 'auto', 'scheduled', 'recurring',
  // Misc
  'get', 'set', 'fetch', 'request', 'response', 'data', 'info', 'query',
];

// EXPANDED PREFIXES
const prefixes = [
  '', 'do', 'execute', 'exec', 'process', 'handle', 'run', 'perform', 'make', 'take',
  'proxy', 'inner', 'cpi', 'invoke', 'call',
  'submit', 'send', 'create', 'init', 'initialize', 'start', 'begin', 'finish', 'complete', 'end',
  'get', 'set', 'fetch', 'request', 'trigger', 'fire', 'emit',
  'try', 'attempt', 'force', 'safe', 'unsafe',
  'on', 'pre', 'post', 'before', 'after',
];

// EXPANDED ACTIONS
const actions = [
  'sell', 'buy', 'swap', 'route', 'trade', 'exchange', 'transfer', 'send',
  'quote', 'price', 'order', 'fill', 'match', 'execute', 'settle',
  'deposit', 'withdraw', 'stake', 'unstake', 'claim', 'redeem',
  'mint', 'burn', 'wrap', 'unwrap', 'convert', 'bridge',
  'add', 'remove', 'increase', 'decrease', 'open', 'close',
];

// EXPANDED SUFFIXES
const suffixes = [
  '', 'transaction', 'tx', 'txn', 'trx',
  'svm', 'sol', 'solana', 'evm', 'eth',
  'token', 'tokens', 'spl', 'coin', 'coins',
  'v1', 'v2', 'v3', 'v4',
  'exact', 'base', 'in', 'out', 'input', 'output',
  'order', 'orders', 'limit', 'market',
  'single', 'multi', 'batch',
  'new', 'legacy',
  'handler', 'processor', 'executor',
  'ix', 'instruction',
];

// SEPARATORS
const separators = ['_', '', '/', '-', '.', ':'];

// Generate all combinations
const namesToCheck: string[] = [];

// Single words and ALL case variations
for (const w of keywords) {
  namesToCheck.push(w);                                           // lowercase
  namesToCheck.push(w.toUpperCase());                             // UPPERCASE
  namesToCheck.push(w.charAt(0).toUpperCase() + w.slice(1));      // Capitalized
  namesToCheck.push(w.charAt(0).toUpperCase() + w.slice(1).toUpperCase()); // SELL vs Sell
  // Also try mixed cases
  if (w.length > 2) {
    namesToCheck.push(w.slice(0, -1) + w.slice(-1).toUpperCase()); // selL
  }
}

// Two word combinations with all separators
for (const w1 of keywords) {
  for (const w2 of keywords) {
    if (w1 !== w2) {
      for (const sep of separators) {
        namesToCheck.push(`${w1}${sep}${w2}`);
        // camelCase
        namesToCheck.push(`${w1}${w2.charAt(0).toUpperCase()}${w2.slice(1)}`);
        // PascalCase
        namesToCheck.push(`${w1.charAt(0).toUpperCase()}${w1.slice(1)}${w2.charAt(0).toUpperCase()}${w2.slice(1)}`);
      }
    }
  }
}

// prefix_action_suffix combinations
for (const p of prefixes) {
  for (const a of actions) {
    for (const s of suffixes) {
      for (const sep of ['_', '']) {
        if (p && s) {
          namesToCheck.push(`${p}${sep}${a}${sep}${s}`);
        } else if (p) {
          namesToCheck.push(`${p}${sep}${a}`);
        } else if (s) {
          namesToCheck.push(`${a}${sep}${s}`);
        }
        // camelCase versions
        const pCamel = p ? p : '';
        const aCamel = p ? a.charAt(0).toUpperCase() + a.slice(1) : a;
        const sCamel = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
        if (p || s) {
          namesToCheck.push(`${pCamel}${aCamel}${sCamel}`);
        }
      }
    }
  }
}

// Additional specific patterns
const specificPatterns = [
  // Chainworks specific
  'chainworks_sell', 'chainworks_buy', 'chainworks_swap', 'chainworks_route', 'chainworks_trade',
  'chainworksSell', 'chainworksBuy', 'chainworksSwap', 'chainworksRoute', 'chainworksTrade',
  'ChainworksSell', 'ChainworksBuy', 'ChainworksSwap', 'ChainworksRoute', 'ChainworksTrade',
  'chainworks_tx', 'chainworksTx', 'ChainworksTx',
  'chainworks_transaction', 'chainworksTransaction', 'ChainworksTransaction',
  'sell_chainworks', 'buy_chainworks', 'swap_chainworks', 'route_chainworks', 'trade_chainworks',
  'sellChainworks', 'buyChainworks', 'swapChainworks', 'routeChainworks', 'tradeChainworks',
  'chainworks', 'Chainworks', 'CHAINWORKS', 'ChainWorks', 'chain_works', 'Chain_Works',
  'cw_sell', 'cw_buy', 'cw_swap', 'cw_route', 'cw_trade', 'cw_tx',
  'cwSell', 'cwBuy', 'cwSwap', 'cwRoute', 'cwTrade', 'cwTx',
  'CWSell', 'CWBuy', 'CWSwap', 'CWRoute', 'CWTrade', 'CWTx',

  // Common short forms
  'sell', 'buy', 'swap', 'route', 'trade', 'tx', 'txn', 'trx',
  // Variations with underscores
  'sell_tx', 'buy_tx', 'swap_tx', 'route_tx', 'trade_tx',
  'sell_svm', 'buy_svm', 'swap_svm', 'route_svm', 'trade_svm',
  'sell_sol', 'buy_sol', 'swap_sol', 'route_sol', 'trade_sol',
  'sell_token', 'buy_token', 'swap_token', 'route_token', 'trade_token',
  'sell_quote', 'buy_quote', 'swap_quote', 'route_quote', 'trade_quote',
  'sell_order', 'buy_order', 'swap_order', 'route_order', 'trade_order',
  'sell_transaction', 'buy_transaction', 'swap_transaction', 'route_transaction', 'trade_transaction',
  // camelCase
  'sellTx', 'buyTx', 'swapTx', 'routeTx', 'tradeTx',
  'sellSvm', 'buySvm', 'swapSvm', 'routeSvm', 'tradeSvm',
  'sellSol', 'buySol', 'swapSol', 'routeSol', 'tradeSol',
  'sellToken', 'buyToken', 'swapToken', 'routeToken', 'tradeToken',
  'sellQuote', 'buyQuote', 'swapQuote', 'routeQuote', 'tradeQuote',
  'sellOrder', 'buyOrder', 'swapOrder', 'routeOrder', 'tradeOrder',
  'sellTransaction', 'buyTransaction', 'swapTransaction', 'routeTransaction', 'tradeTransaction',
  // With slashes
  'sell/tx', 'buy/tx', 'swap/tx', 'route/tx', 'trade/tx',
  'sell/svm', 'buy/svm', 'swap/svm', 'route/svm', 'trade/svm',
  'sell/transaction', 'buy/transaction', 'swap/transaction', 'route/transaction', 'trade/transaction',
  // Reverse order
  'tx_sell', 'tx_buy', 'tx_swap', 'tx_route', 'tx_trade',
  'svm_sell', 'svm_buy', 'svm_swap', 'svm_route', 'svm_trade',
  'transaction_sell', 'transaction_buy', 'transaction_swap', 'transaction_route', 'transaction_trade',
  // With execute prefix
  'execute_sell', 'execute_buy', 'execute_swap', 'execute_route', 'execute_trade',
  'executeSell', 'executeBuy', 'executeSwap', 'executeRoute', 'executeTrade',
  // With process prefix
  'process_sell', 'process_buy', 'process_swap', 'process_route', 'process_trade',
  'processSell', 'processBuy', 'processSwap', 'processRoute', 'processTrade',
  // With do prefix
  'do_sell', 'do_buy', 'do_swap', 'do_route', 'do_trade',
  'doSell', 'doBuy', 'doSwap', 'doRoute', 'doTrade',
  // With proxy prefix
  'proxy_sell', 'proxy_buy', 'proxy_swap', 'proxy_route', 'proxy_trade',
  'proxySell', 'proxyBuy', 'proxySwap', 'proxyRoute', 'proxyTrade',
  // With inner prefix
  'inner_sell', 'inner_buy', 'inner_swap', 'inner_route', 'inner_trade',
  'innerSell', 'innerBuy', 'innerSwap', 'innerRoute', 'innerTrade',
  // Pump.fun style
  'pump_sell', 'pump_buy', 'pumpSell', 'pumpBuy',
  'pump_fun_sell', 'pump_fun_buy', 'pumpFunSell', 'pumpFunBuy',
  // With exact
  'sell_exact', 'buy_exact', 'swap_exact', 'exact_sell', 'exact_buy', 'exact_swap',
  'sellExact', 'buyExact', 'swapExact', 'exactSell', 'exactBuy', 'exactSwap',
  'swap_exact_in', 'swap_exact_out', 'swapExactIn', 'swapExactOut',
  'sell_exact_in', 'sell_exact_out', 'sellExactIn', 'sellExactOut',
  'buy_exact_in', 'buy_exact_out', 'buyExactIn', 'buyExactOut',
  // Versioned
  'sell_v1', 'sell_v2', 'sell_v3', 'sellV1', 'sellV2', 'sellV3',
  'swap_v1', 'swap_v2', 'swap_v3', 'swapV1', 'swapV2', 'swapV3',
  'route_v1', 'route_v2', 'route_v3', 'routeV1', 'routeV2', 'routeV3',
  'trade_v1', 'trade_v2', 'trade_v3', 'tradeV1', 'tradeV2', 'tradeV3',
  // UPPERCASE
  'SELL', 'BUY', 'SWAP', 'ROUTE', 'TRADE', 'TX', 'TRANSACTION',
  // PascalCase
  'Sell', 'Buy', 'Swap', 'Route', 'Trade', 'Tx', 'Transaction',
  'SellTx', 'BuyTx', 'SwapTx', 'RouteTx', 'TradeTx',
  'SellTransaction', 'BuyTransaction', 'SwapTransaction', 'RouteTransaction', 'TradeTransaction',
  // Numbers
  'sell2', 'sell3', 'swap2', 'swap3', 'route2', 'route3', 'trade2', 'trade3',
  // With handler/processor
  'sell_handler', 'buy_handler', 'swap_handler', 'route_handler', 'trade_handler',
  'sellHandler', 'buyHandler', 'swapHandler', 'routeHandler', 'tradeHandler',
  // instruction suffix
  'sell_ix', 'buy_ix', 'swap_ix', 'route_ix', 'trade_ix',
  'sellIx', 'buyIx', 'swapIx', 'routeIx', 'tradeIx',
  'sell_instruction', 'buy_instruction', 'swap_instruction', 'route_instruction', 'trade_instruction',
];

namesToCheck.push(...specificPatterns);

// Remove duplicates
const uniqueNames = [...new Set(namesToCheck)];

// Add three word combinations for key patterns
const threeWordCombos: string[] = [];
const key1 = ['sell', 'buy', 'swap', 'route', 'trade', 'quote', 'execute', 'process', 'do', 'proxy', 'inner', 'cpi'];
const key2 = ['transaction', 'tx', 'txn', 'svm', 'sol', 'token', 'exact', 'base', 'order', 'quote', 'swap', 'route'];
const key3 = ['v1', 'v2', 'v3', 'in', 'out', 'swap', 'route', 'quote', 'token', 'sol', 'svm', 'handler', 'ix'];

for (const k1 of key1) {
  for (const k2 of key2) {
    for (const k3 of key3) {
      // snake_case
      threeWordCombos.push(`${k1}_${k2}_${k3}`);
      // camelCase
      threeWordCombos.push(`${k1}${k2.charAt(0).toUpperCase()}${k2.slice(1)}${k3.charAt(0).toUpperCase()}${k3.slice(1)}`);
      // PascalCase
      threeWordCombos.push(`${k1.charAt(0).toUpperCase()}${k1.slice(1)}${k2.charAt(0).toUpperCase()}${k2.slice(1)}${k3.charAt(0).toUpperCase()}${k3.slice(1)}`);
      // with slashes
      threeWordCombos.push(`${k1}/${k2}/${k3}`);
      // mixed
      threeWordCombos.push(`${k1}_${k2}${k3.charAt(0).toUpperCase()}${k3.slice(1)}`);
    }
  }
}

uniqueNames.push(...threeWordCombos);

// Final dedup
const finalNames = [...new Set(uniqueNames)];

const totalTests = finalNames.length * 15; // 15 schemes now
console.log(`Testing ${finalNames.length} name variations with 15 schemes (${totalTests} total tests)...`);

let found = false;

// Different discriminator schemes to try
const schemes = [
  { name: 'Anchor (global:)', prefix: 'global:' },
  { name: 'No prefix', prefix: '' },
  { name: 'instruction:', prefix: 'instruction:' },
  { name: 'ix:', prefix: 'ix:' },
  { name: 'method:', prefix: 'method:' },
  { name: 'fn:', prefix: 'fn:' },
  { name: 'func:', prefix: 'func:' },
  { name: 'global_instruction:', prefix: 'global_instruction:' },
  { name: 'globalInstruction:', prefix: 'globalInstruction:' },
  { name: 'GlobalInstruction:', prefix: 'GlobalInstruction:' },
  { name: 'chainworks:', prefix: 'chainworks:' },
  { name: 'Chainworks:', prefix: 'Chainworks:' },
  { name: 'CHAINWORKS:', prefix: 'CHAINWORKS:' },
  { name: 'chain_works:', prefix: 'chain_works:' },
  { name: 'ChainWorks:', prefix: 'ChainWorks:' },
];

for (const scheme of schemes) {
  for (const name of finalNames) {
    const hash = createHash('sha256').update(`${scheme.prefix}${name}`).digest();
    const disc = hash.subarray(0, 8).toString('hex');
    if (disc === TARGET) {
      console.log(`✅ MATCH FOUND!`);
      console.log(`   Scheme: ${scheme.name}`);
      console.log(`   Name: "${name}"`);
      console.log(`   Full preimage: "${scheme.prefix}${name}"`);
      console.log(`   Discriminator: ${disc}`);
      found = true;
    }
  }
}

if (!found) {
  console.log(`❌ No match found in ${finalNames.length} variations across ${schemes.length} schemes`);
  console.log('');
  console.log('Sample hashes (Anchor scheme):');
  const samples = ['sell', 'sell_transaction', 'sellTransaction', 'swap', 'swap_tx', 'svm_swap', 'route'];
  for (const name of samples) {
    const hash = createHash('sha256').update(`global:${name}`).digest();
    console.log(`  ${name}: ${hash.subarray(0, 8).toString('hex')}`);
  }
}

