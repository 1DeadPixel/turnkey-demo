'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createJupiterSwapPolicy } from '@/modules/turnkey/policies/jupiter_swap_policy';
import { executeJupiterSwap, testWrongTokenSwap, testWrongAmountSwap } from '@/modules/turnkey/actions';

// Define interface for the client to avoid import issues
interface TurnkeyClient {
  createPolicy: (params: {
    organizationId?: string;
    policyName: string;
    effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
    consensus?: string;
    condition?: string;
    notes?: string;
  }) => Promise<{ policyId: string }>;
}

interface ScheduleSwapButtonProps {
  orgId: string;
  walletAddress: string;
  daUserId: string;
  client: TurnkeyClient;
}

interface PolicyTestResult {
  wrongTokenTest: { success: boolean; error?: string } | null;
  wrongAmountTest: { success: boolean; error?: string } | null;
}

type SwapState =
  | { status: 'idle' }
  | { status: 'creating_policy' }
  | { status: 'countdown'; secondsLeft: number; policyId: string }
  | { status: 'executing' }
  | { status: 'testing_policy'; currentTest: string }
  | { status: 'success'; signature: string; inputAmount: string; outputAmount: string; testResults: PolicyTestResult }
  | { status: 'error'; message: string };

const COUNTDOWN_SECONDS = 60;

export function ScheduleSwapButton({
  orgId,
  walletAddress,
  daUserId,
  client,
}: ScheduleSwapButtonProps) {
  const [solAmount, setSolAmount] = useState<string>('');
  const [swapState, setSwapState] = useState<SwapState>({ status: 'idle' });

  // Use ref to store solAmount for async execution to avoid stale closure
  const solAmountRef = useRef(solAmount);

  // Update ref when solAmount changes
  useEffect(() => {
    solAmountRef.current = solAmount;
  }, [solAmount]);

  // Convert SOL to lamports (1 SOL = 1e9 lamports)
  const solToLamports = (sol: string): string => {
    const solNum = parseFloat(sol);
    if (isNaN(solNum) || solNum <= 0) {
      throw new Error('Invalid SOL amount');
    }
    return Math.floor(solNum * 1e9).toString();
  };

  const executeSwap = useCallback(async (policyId: string) => {
    const amountLamports = solToLamports(solAmountRef.current);
    const testResults: PolicyTestResult = {
      wrongTokenTest: null,
      wrongAmountTest: null,
    };

    // Helper to delay between tests to avoid Jupiter rate limits
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // 🧪 TEST 1: Try to sign with WRONG TOKEN (should fail)
      setSwapState({ status: 'testing_policy', currentTest: 'Testing wrong token (SOL→BONK)...' });
      console.log('🧪 Running policy test: Wrong Token (SOL→BONK instead of SOL→USDC)');
      testResults.wrongTokenTest = await testWrongTokenSwap(orgId, walletAddress, amountLamports, policyId);
      console.log('Wrong token test result:', testResults.wrongTokenTest);

      // Wait 5 seconds before next test to avoid rate limits
      setSwapState({ status: 'testing_policy', currentTest: 'Waiting 5s before next test...' });
      await delay(5000);

      // 🧪 TEST 2: Try to sign with WRONG AMOUNT (should fail)
      setSwapState({ status: 'testing_policy', currentTest: 'Testing wrong amount (2x)...' });
      console.log('🧪 Running policy test: Wrong Amount (2x the approved amount)');
      testResults.wrongAmountTest = await testWrongAmountSwap(orgId, walletAddress, amountLamports, policyId);
      console.log('Wrong amount test result:', testResults.wrongAmountTest);

      // Wait 5 seconds before actual swap to avoid rate limits
      setSwapState({ status: 'testing_policy', currentTest: 'Waiting 5s before executing swap...' });
      await delay(5000);

      // ✅ ACTUAL SWAP: Now execute the valid swap
      setSwapState({ status: 'executing' });
      console.log('✅ Executing valid swap (SOL→USDC with correct amount)');
      const result = await executeJupiterSwap(orgId, walletAddress, amountLamports, policyId);

      setSwapState({
        status: 'success',
        signature: result.signature,
        inputAmount: result.inputAmount,
        outputAmount: result.outputAmount,
        testResults,
      });
    } catch (error) {
      console.error('Swap execution failed:', error);
      setSwapState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Swap execution failed',
      });
    }
  }, [orgId, walletAddress]);

  // Extract policyId from countdown state for useEffect dependency
  const policyId = swapState.status === 'countdown' ? swapState.policyId : null;

  // Countdown timer effect
  useEffect(() => {
    if (swapState.status !== 'countdown' || !policyId) return;

    if (swapState.secondsLeft <= 0) {
      // Time to execute the swap - schedule it for next tick to avoid cascading renders
      const timeoutId = setTimeout(() => {
        executeSwap(policyId);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    const timer = setTimeout(() => {
      setSwapState((prev) => {
        if (prev.status !== 'countdown') return prev;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [swapState, executeSwap, policyId]);

  const handleScheduleSwap = async () => {
    if (!solAmount || parseFloat(solAmount) <= 0) {
      setSwapState({ status: 'error', message: 'Please enter a valid SOL amount' });
      return;
    }

    try {
      setSwapState({ status: 'creating_policy' });

      const amountLamports = solToLamports(solAmount);

      // Create the DA policy for this specific swap
      const { policyId } = await createJupiterSwapPolicy(
        client,
        orgId,
        daUserId,
        amountLamports
      );

      console.log(`Policy created: ${policyId}`);

      // Start countdown
      setSwapState({
        status: 'countdown',
        secondsLeft: COUNTDOWN_SECONDS,
        policyId,
      });
    } catch (error) {
      console.error('Failed to create policy:', error);
      setSwapState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to create swap policy',
      });
    }
  };

  const handleReset = () => {
    setSwapState({ status: 'idle' });
    setSolAmount('');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        🔄 Schedule SOL → USDC Swap
      </h3>

      {swapState.status === 'idle' && (
        <>
          <div className="space-y-2">
            <label htmlFor="solAmount" className="block text-sm font-medium text-gray-700">
              SOL Amount
            </label>
            <input
              id="solAmount"
              type="number"
              step="0.001"
              min="0"
              value={solAmount}
              onChange={(e) => setSolAmount(e.target.value)}
              placeholder="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
            />
            <p className="text-xs text-gray-500">
              {solAmount && parseFloat(solAmount) > 0
                ? `${solToLamports(solAmount)} lamports`
                : 'Enter amount in SOL'}
            </p>
          </div>

          <button
            onClick={handleScheduleSwap}
            disabled={!solAmount || parseFloat(solAmount) <= 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-md transition"
          >
            Schedule Swap (1 min delay)
          </button>
        </>
      )}

      {swapState.status === 'creating_policy' && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Creating swap policy...</p>
        </div>
      )}

      {swapState.status === 'countdown' && (
        <div className="text-center py-4 space-y-3">
          <div className="text-4xl font-mono font-bold text-purple-600">
            {formatTime(swapState.secondsLeft)}
          </div>
          <p className="text-gray-600">
            Swap will execute in {swapState.secondsLeft} seconds
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-1000"
              style={{
                width: `${((COUNTDOWN_SECONDS - swapState.secondsLeft) / COUNTDOWN_SECONDS) * 100}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">
            Swapping {solAmount} SOL → USDC
          </p>
          <p className="text-xs text-gray-400">
            Policy ID: {swapState.policyId.slice(0, 8)}...
          </p>
        </div>
      )}

      {swapState.status === 'testing_policy' && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
          <p className="text-gray-600">🧪 Testing Policy Enforcement...</p>
          <p className="text-xs text-yellow-600 mt-1 font-medium">
            {swapState.currentTest}
          </p>
        </div>
      )}

      {swapState.status === 'executing' && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Executing swap...</p>
          <p className="text-xs text-gray-500 mt-1">
            Building transaction, signing with Turnkey, and submitting to Solana
          </p>
        </div>
      )}

      {swapState.status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-xl">✓</span>
            <span className="font-semibold text-green-800">Swap Successful!</span>
          </div>
          <p className="text-sm text-gray-600">
            Swapped {(parseInt(swapState.inputAmount) / 1e9).toFixed(4)} SOL →{' '}
            {(parseInt(swapState.outputAmount) / 1e6).toFixed(2)} USDC
          </p>
          <a
            href={`https://solscan.io/tx/${swapState.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 hover:underline block"
          >
            View on Solscan ↗
          </a>

          {/* Policy Test Results */}
          <div className="mt-4 pt-3 border-t border-green-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🧪 Policy Test Results:</h4>

            {/* Wrong Token Test */}
            <div className="flex items-center space-x-2 text-sm mb-1">
              {swapState.testResults.wrongTokenTest?.success ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-600">Wrong token (SOL→BONK): <span className="text-green-600 font-medium">Rejected ✓</span></span>
                </>
              ) : (
                <>
                  <span className="text-red-600">✗</span>
                  <span className="text-gray-600">Wrong token (SOL→BONK): <span className="text-red-600 font-medium">Not rejected!</span></span>
                </>
              )}
            </div>

            {/* Wrong Amount Test */}
            <div className="flex items-center space-x-2 text-sm">
              {swapState.testResults.wrongAmountTest?.success ? (
                <>
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-600">Wrong amount (2x): <span className="text-green-600 font-medium">Rejected ✓</span></span>
                </>
              ) : (
                <>
                  <span className="text-red-600">✗</span>
                  <span className="text-gray-600">Wrong amount (2x): <span className="text-red-600 font-medium">Not rejected!</span></span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md transition"
          >
            Schedule Another Swap
          </button>
        </div>
      )}

      {swapState.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-red-600 text-xl">✗</span>
            <span className="font-semibold text-red-800">Error</span>
          </div>
          <p className="text-sm text-red-600">{swapState.message}</p>
          <button
            onClick={handleReset}
            className="w-full mt-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded-md transition"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

