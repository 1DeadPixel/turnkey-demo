'use client';

import { useState } from 'react';
import { createChainworksSwapPolicy } from '@/modules/turnkey/policies/chainworks_swap_policy';
import { setupChainworksInterface } from '@/modules/turnkey/smart_contract_interfaces';
import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';

// Define interface for the client
interface TurnkeyClient {
  createPolicy: (params: {
    organizationId?: string;
    policyName: string;
    effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
    consensus?: string;
    condition?: string;
    notes?: string;
  }) => Promise<{ policyId: string }>;
  getPolicies: (params: { organizationId: string }) => Promise<{ policies: Array<{ policyId: string; policyName: string }> }>;
  deletePolicy: (params: { organizationId: string; policyId: string }) => Promise<unknown>;
  createSmartContractInterface: (params: unknown) => Promise<{ smartContractInterfaceId: string }>;
  getSmartContractInterfaces: (params: { organizationId: string }) => Promise<{ smartContractInterfaces: Array<{ smartContractInterfaceId: string; label: string }> }>;
  deleteSmartContractInterface: (params: { organizationId: string; smartContractInterfaceId: string }) => Promise<unknown>;
}

interface ChainworksPolicyTestButtonProps {
  orgId: string;
  walletAddress: string;
  daUserId: string;
  client: TurnkeyClient;
  signTransaction: (orgId: string, walletAddr: string, unsignedTxBase64: string, policyId: string) => Promise<string>;
}

// The in_amount we're testing against (policy will allow only this amount)
const POLICY_IN_AMOUNT = "123456";

type TestStep =
  | { status: 'idle' }
  | { status: 'running'; step: string }
  | { status: 'complete'; results: TestResult[] }
  | { status: 'error'; message: string };

interface TestResult {
  name: string;
  expected: 'success' | 'fail';
  actual: 'success' | 'fail';
  passed: boolean;
  details?: string;
  signedTx?: string;
}

// SUCCESS TX JSON (in_amount = 123456)
const SUCCESS_TX_JSON = {
  "message": {
    "header": {
      "numRequiredSignatures": 1,
      "numReadonlySignedAccounts": 0,
      "numReadonlyUnsignedAccounts": 9
    },
    "staticAccountKeys": [
      "Dqznoyh1ruprnkchATGQv6cYpsvWuiBQyk6EQJyd21eu",
      "CHAiNWoRKedXzk51jzGfzHAfZhLGRgG37qGYzNnqgSLf",
      "CcpNbEdXNAr3maiVq2FWEANFHu1KDEw7AeJx7irtdmf5",
      "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      "AvjSD7CntEGc73BaUkxyf1o453Ar6mcFWZraazxZe5PA",
      "EUuUbDcafPrmVTD5M6qoJAoyyNbihBhugADAxRMn5he9",
      "2WLWEuKDgkDUccTpbwYp1GToYktiSB1cXvreHUwiSUVP",
      "8Yoy9SqpLRV1UkLiTkMkNqnuE1bcSAFiYC8jMjS7Niqp",
      "FoKYKtRpD25TKzBMndysKpgPqbj8AdLXjfpYHXn9PGTX",
      "ComputeBudget111111111111111111111111111111",
      "ChainWorksznk6gZyzGHUAxVUNuc79wznbf3DGnVxgyh",
      "11111111111111111111111111111111",
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "So11111111111111111111111111111111111111112",
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ],
    "recentBlockhash": "Db5dDTU8SrsgCec1JrpougBHc6fqkmJ74ySjLLCB66mw",
    "compiledInstructions": [
      {
        "programIdIndex": 9,
        "accountKeyIndexes": [] as number[],
        "data": { "type": "Buffer", "data": [3, 7, 167, 9, 0, 0, 0, 0, 0] }
      },
      {
        "programIdIndex": 9,
        "accountKeyIndexes": [] as number[],
        "data": { "type": "Buffer", "data": [2, 130, 105, 2, 0] }
      },
      {
        "programIdIndex": 10,
        "accountKeyIndexes": [0, 10, 11, 1, 0, 12, 13, 2, 14, 15, 16, 3, 4, 17, 5, 6, 7, 7, 7, 8],
        "data": {
          "type": "Buffer",
          "data": [95, 146, 1, 88, 183, 227, 36, 137, 64, 226, 1, 0, 0, 0, 0, 0, 152, 64, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 8, 0, 34, 16, 97, 55, 212, 253, 106, 25, 254, 107, 22, 105, 168, 47, 232, 75, 0]
        }
      }
    ],
    "addressTableLookups": [] as unknown[]
  }
};

// FAIL TX JSON (in_amount = 1000000)
const FAIL_TX_JSON = {
  "message": {
    "header": {
      "numRequiredSignatures": 1,
      "numReadonlySignedAccounts": 0,
      "numReadonlyUnsignedAccounts": 9
    },
    "staticAccountKeys": [
      "Dqznoyh1ruprnkchATGQv6cYpsvWuiBQyk6EQJyd21eu",
      "CHAiNWoRKedXzk51jzGfzHAfZhLGRgG37qGYzNnqgSLf",
      "CcpNbEdXNAr3maiVq2FWEANFHu1KDEw7AeJx7irtdmf5",
      "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
      "AvjSD7CntEGc73BaUkxyf1o453Ar6mcFWZraazxZe5PA",
      "EUuUbDcafPrmVTD5M6qoJAoyyNbihBhugADAxRMn5he9",
      "2WLWEuKDgkDUccTpbwYp1GToYktiSB1cXvreHUwiSUVP",
      "8Yoy9SqpLRV1UkLiTkMkNqnuE1bcSAFiYC8jMjS7Niqp",
      "FoKYKtRpD25TKzBMndysKpgPqbj8AdLXjfpYHXn9PGTX",
      "ComputeBudget111111111111111111111111111111",
      "ChainWorksznk6gZyzGHUAxVUNuc79wznbf3DGnVxgyh",
      "11111111111111111111111111111111",
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "So11111111111111111111111111111111111111112",
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    ],
    "recentBlockhash": "6eRWqgBD6GmqzbJxnMWA5gQnMuikoxWx3xZncYZTCHtc",
    "compiledInstructions": [
      {
        "programIdIndex": 9,
        "accountKeyIndexes": [] as number[],
        "data": { "type": "Buffer", "data": [3, 24, 157, 9, 0, 0, 0, 0, 0] }
      },
      {
        "programIdIndex": 9,
        "accountKeyIndexes": [] as number[],
        "data": { "type": "Buffer", "data": [2, 0, 108, 2, 0] }
      },
      {
        "programIdIndex": 10,
        "accountKeyIndexes": [0, 10, 11, 1, 0, 12, 13, 2, 14, 15, 16, 3, 4, 17, 5, 6, 7, 7, 7, 8],
        "data": {
          "type": "Buffer",
          "data": [95, 146, 1, 88, 183, 227, 36, 137, 64, 66, 15, 0, 0, 0, 0, 0, 64, 11, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 8, 0, 34, 16, 97, 55, 212, 253, 106, 25, 254, 107, 22, 105, 168, 47, 232, 75, 0]
        }
      }
    ],
    "addressTableLookups": [] as unknown[]
  }
};

type TxJson = typeof SUCCESS_TX_JSON;

export function ChainworksPolicyTestButton({
  orgId,
  walletAddress,
  daUserId,
  client,
  signTransaction,
}: ChainworksPolicyTestButtonProps) {
  const [testState, setTestState] = useState<TestStep>({ status: 'idle' });

  /**
   * Fetch latest blockhash from Solana
   */
  const getLatestBlockhash = async (): Promise<string> => {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    return blockhash;
  };

  /**
   * Serialize transaction message to base64 for Turnkey signing
   * @param txJson - Transaction JSON object
   * @param blockhash - Fresh blockhash to use (replaces the stale one in txJson)
   */
  const serializeMessageToBase64 = (txJson: TxJson, blockhash: string): string => {
    const msg = txJson.message;
    const parts: number[] = [];

    // Version prefix (0x80 = version 0)
    parts.push(0x80);

    // Header (3 bytes)
    parts.push(msg.header.numRequiredSignatures);
    parts.push(msg.header.numReadonlySignedAccounts);
    parts.push(msg.header.numReadonlyUnsignedAccounts);

    // Number of account keys (compact-u16)
    const numKeys = msg.staticAccountKeys.length;
    if (numKeys < 128) {
      parts.push(numKeys);
    } else {
      parts.push((numKeys & 0x7f) | 0x80);
      parts.push(numKeys >> 7);
    }

    // Account keys (32 bytes each)
    for (const key of msg.staticAccountKeys) {
      const decoded = bs58.decode(key);
      parts.push(...decoded);
    }

    // Recent blockhash (32 bytes) - USE THE FRESH ONE!
    const blockhashBytes = bs58.decode(blockhash);
    parts.push(...blockhashBytes);

    // Number of instructions (compact-u16)
    const numIx = msg.compiledInstructions.length;
    if (numIx < 128) {
      parts.push(numIx);
    } else {
      parts.push((numIx & 0x7f) | 0x80);
      parts.push(numIx >> 7);
    }

    // Instructions
    for (const ix of msg.compiledInstructions) {
      // Program ID index
      parts.push(ix.programIdIndex);

      // Number of account indexes (compact-u16)
      const numAccounts = ix.accountKeyIndexes.length;
      if (numAccounts < 128) {
        parts.push(numAccounts);
      } else {
        parts.push((numAccounts & 0x7f) | 0x80);
        parts.push(numAccounts >> 7);
      }

      // Account indexes
      parts.push(...ix.accountKeyIndexes);

      // Data length (compact-u16)
      const dataLen = ix.data.data.length;
      if (dataLen < 128) {
        parts.push(dataLen);
      } else {
        parts.push((dataLen & 0x7f) | 0x80);
        parts.push(dataLen >> 7);
      }

      // Data
      parts.push(...ix.data.data);
    }

    // Number of address table lookups (compact-u16)
    parts.push(0); // No lookups

    return Buffer.from(parts).toString('base64');
  };

  const deleteAllPolicies = async () => {
    console.log("Fetching existing policies...");
    const policies = await client.getPolicies({ organizationId: orgId });
    console.log("Found policies:", policies.policies.length);

    for (const policy of policies.policies) {
      console.log("Deleting policy:", policy.policyId, policy.policyName);
      await client.deletePolicy({
        organizationId: orgId,
        policyId: policy.policyId
      });
    }
    console.log("All policies deleted");
  };

  const runTests = async () => {
    const results: TestResult[] = [];

    try {
      setTestState({ status: 'running', step: 'Setting up ChainWorks interface...' });

      // Step 1: Setup ChainWorks IDL (removes old interfaces, adds ChainWorks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setupChainworksInterface(client as any, orgId);
      console.log("ChainWorks interface setup complete");

      // Step 2: Delete all existing policies
      setTestState({ status: 'running', step: 'Deleting all existing policies...' });
      await deleteAllPolicies();

      // Step 3: Fetch latest blockhash
      setTestState({ status: 'running', step: 'Fetching latest blockhash...' });
      const latestBlockhash = await getLatestBlockhash();
      console.log("Latest blockhash:", latestBlockhash);

      // Step 4: Try to sign SUCCESS TX without policy (should FAIL)
      setTestState({ status: 'running', step: 'Test 1: Signing without policy (should fail)...' });
      const successTxBase64 = serializeMessageToBase64(SUCCESS_TX_JSON, latestBlockhash);
      console.log("SUCCESS TX base64:", successTxBase64);

      try {
        await signTransaction(orgId, walletAddress, successTxBase64, "");
        results.push({
          name: 'Sign without policy',
          expected: 'fail',
          actual: 'success',
          passed: false,
          details: 'Transaction was signed but should have been rejected (no policy)',
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          name: 'Sign without policy',
          expected: 'fail',
          actual: 'fail',
          passed: true,
          details: `Correctly rejected: ${errorMsg.substring(0, 100)}`,
        });
      }

      // Step 5: Create policy for in_amount = 123456
      setTestState({ status: 'running', step: 'Creating ChainWorks policy for amount 123456...' });
      const { policyId } = await createChainworksSwapPolicy(
        client,
        orgId,
        daUserId,
        POLICY_IN_AMOUNT
      );
      console.log("Policy created:", policyId);

      // Step 6: Fetch fresh blockhash for the next test
      setTestState({ status: 'running', step: 'Fetching fresh blockhash...' });
      const freshBlockhash = await getLatestBlockhash();
      console.log("Fresh blockhash:", freshBlockhash);

      // Step 7: Try to sign SUCCESS TX with policy (should SUCCEED)
      setTestState({ status: 'running', step: 'Test 2: Signing with correct amount (should succeed)...' });
      const successTxBase64Fresh = serializeMessageToBase64(SUCCESS_TX_JSON, freshBlockhash);
      try {
        const signedTx = await signTransaction(orgId, walletAddress, successTxBase64Fresh, policyId);
        results.push({
          name: 'Sign with correct amount (123456)',
          expected: 'success',
          actual: 'success',
          passed: true,
          details: 'Transaction signed successfully!',
          signedTx,
        });
        console.log("✅ SUCCESS TX signed:", signedTx);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          name: 'Sign with correct amount (123456)',
          expected: 'success',
          actual: 'fail',
          passed: false,
          details: `Failed to sign: ${errorMsg}`,
        });
      }

      // Step 8: Fetch another fresh blockhash for the fail test
      setTestState({ status: 'running', step: 'Fetching blockhash for fail test...' });
      const failBlockhash = await getLatestBlockhash();

      // Step 9: Try to sign FAIL TX with wrong amount (should FAIL)
      setTestState({ status: 'running', step: 'Test 3: Signing with wrong amount (should fail)...' });
      const failTxBase64 = serializeMessageToBase64(FAIL_TX_JSON, failBlockhash);
      console.log("FAIL TX base64:", failTxBase64);

      try {
        await signTransaction(orgId, walletAddress, failTxBase64, policyId);
        results.push({
          name: 'Sign with wrong amount (1000000)',
          expected: 'fail',
          actual: 'success',
          passed: false,
          details: 'Transaction was signed but should have been rejected (wrong amount)',
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          name: 'Sign with wrong amount (1000000)',
          expected: 'fail',
          actual: 'fail',
          passed: true,
          details: `Correctly rejected: ${errorMsg.substring(0, 100)}`,
        });
      }

      setTestState({ status: 'complete', results });

    } catch (error) {
      console.error('Test error:', error);
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const getStatusColor = (result: TestResult) => {
    return result.passed ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500';
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4 mt-4">
      <h3 className="text-lg font-semibold text-blue-800">
        🔗 ChainWorks Policy Test
      </h3>

      <p className="text-sm text-blue-700">
        Tests ChainWorks cw_swap policy enforcement:
        <br />• Delete all policies & setup ChainWorks IDL
        <br />• Try sign without policy (should fail)
        <br />• Create policy for in_amount=123456
        <br />• Try sign with correct amount (should succeed)
        <br />• Try sign with wrong amount (should fail)
      </p>

      {testState.status === 'idle' && (
        <button
          onClick={runTests}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition"
        >
          Run ChainWorks Policy Tests
        </button>
      )}

      {testState.status === 'running' && (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-blue-700">{testState.step}</span>
          </div>
        </div>
      )}

      {testState.status === 'complete' && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800">Test Results:</h4>
          {testState.results.map((result, idx) => (
            <div
              key={idx}
              className={`border-l-4 p-3 rounded ${getStatusColor(result)}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.name}</span>
                <span className={result.passed ? 'text-green-700' : 'text-red-700'}>
                  {result.passed ? '✅ PASS' : '❌ FAIL'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{result.details}</p>
              {result.signedTx && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer">View signed transaction</summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                    {result.signedTx}
                  </pre>
                </details>
              )}
            </div>
          ))}

          <button
            onClick={() => setTestState({ status: 'idle' })}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md transition mt-2"
          >
            Reset
          </button>
        </div>
      )}

      {testState.status === 'error' && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-medium">Error:</p>
          <p className="text-sm">{testState.message}</p>
          <button
            onClick={() => setTestState({ status: 'idle' })}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md transition text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
