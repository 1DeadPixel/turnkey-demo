import { createHash } from 'crypto';

const TARGET = '5f920158b7e32489';

console.log('Target discriminator:', TARGET);

// Quick test with key variations
const testNames = [
  'sell', 'sell_transaction', 'sellTransaction', 'sell_tx', 'sellTx',
  'sell_svm', 'sellSvm', 'svm_sell', 'svmSell',
  'sell_quote', 'sellQuote', 'quote_sell', 'quoteSell',
  'sell_swap', 'sellSwap', 'swap_sell', 'swapSell',
  'sell_route', 'sellRoute', 'route_sell', 'routeSell',
  'sell/transaction', 'sell/tx', 'sell/svm', 'sell/swap', 'sell/route', 'sell/quote',
  'transaction_sell', 'transactionSell', 'tx_sell', 'txSell',
  'svm_sell', 'svmSell', 'swap_sell', 'swapSell',
  'route_sell', 'routeSell', 'quote_sell', 'quoteSell',
];


const schemes = [
  { name: 'global:', prefix: 'global:' },
  { name: '(no prefix)', prefix: '' },
];

for (const scheme of schemes) {
  console.log(`\nScheme: ${scheme.name}`);
  for (const name of testNames) {
    const hash = createHash('sha256').update(`${scheme.prefix}${name}`).digest();
    const disc = hash.subarray(0, 8).toString('hex');
    const match = disc === TARGET ? ' ✅ MATCH!' : '';
    if (match || name.includes('sell')) {
      console.log(`  ${name}: ${disc}${match}`);
    }
  }
}

