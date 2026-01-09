'use client';

import { useState } from 'react';
import { createMemoSignerPolicy } from '@/modules/turnkey/policies/cosigner_policy';

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
  getPolicies: (params: { organizationId: string }) => Promise<{ policies: Array<{ policyId: string; policyName: string }> }>;
  deletePolicy: (params: { organizationId: string; policyId: string }) => Promise<unknown>;
}

interface CreateCosignerPolicyButtonProps {
  orgId: string;
  daUserId: string;
  client: TurnkeyClient;
}

type PolicyState =
  | { status: 'idle' }
  | { status: 'deleting_policies' }
  | { status: 'creating_policy' }
  | { status: 'success'; policyId: string }
  | { status: 'error'; message: string };

export function CreateCosignerPolicyButton({
  orgId,
  daUserId,
  client,
}: CreateCosignerPolicyButtonProps) {
  const [policyState, setPolicyState] = useState<PolicyState>({ status: 'idle' });
  const [signerWallet, setSignerWallet] = useState<string>(
    process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY || ''
  );

  // Delete all existing policies
  const deleteAllPolicies = async () => {
    console.log('Deleting all existing policies...');
    const { policies } = await client.getPolicies({ organizationId: orgId });

    for (const policy of policies) {
      console.log(`Deleting policy: ${policy.policyName} (${policy.policyId})`);
      await client.deletePolicy({
        organizationId: orgId,
        policyId: policy.policyId,
      });
    }
    console.log(`Deleted ${policies.length} policies`);
  };

  const handleCreatePolicy = async () => {
    if (!signerWallet.trim()) {
      setPolicyState({ status: 'error', message: 'Please enter a signer wallet address' });
      return;
    }

    try {
      // Step 1: Delete existing policies
      setPolicyState({ status: 'deleting_policies' });
      await deleteAllPolicies();

      // Step 2: Create new memo signer policy
      setPolicyState({ status: 'creating_policy' });
      console.log('Creating memo signer policy...');
      console.log('Org ID:', orgId);
      console.log('DA User ID:', daUserId);
      console.log('Signer Wallet:', signerWallet);

      const result = await createMemoSignerPolicy(
        client,
        orgId,
        daUserId,
        signerWallet.trim()
      );

      console.log('Policy created:', result.policyId);
      setPolicyState({ status: 'success', policyId: result.policyId });
    } catch (error) {
      console.error('Error creating memo signer policy:', error);
      setPolicyState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const isLoading = policyState.status === 'deleting_policies' || policyState.status === 'creating_policy';

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-3">Memo Signer Policy</h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Creates a policy that allows the DA user to sign transactions only when there is a
        memo instruction where the specified wallet is a signer.
      </p>

      <div className="mb-3">
        <label htmlFor="signerWallet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Required Signer Wallet
        </label>
        <input
          id="signerWallet"
          type="text"
          value={signerWallet}
          onChange={(e) => setSignerWallet(e.target.value)}
          placeholder="Enter signer wallet address"
          disabled={isLoading}
          className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
        />
      </div>

      <button
        onClick={handleCreatePolicy}
        disabled={isLoading}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {policyState.status === 'deleting_policies' && 'Deleting existing policies...'}
        {policyState.status === 'creating_policy' && 'Creating policy...'}
        {policyState.status === 'idle' && 'Create Memo Signer Policy'}
        {policyState.status === 'success' && 'Create Memo Signer Policy'}
        {policyState.status === 'error' && 'Retry Create Policy'}
      </button>

      {policyState.status === 'success' && (
        <div className="mt-3 p-3 bg-green-100 dark:bg-green-900 rounded">
          <p className="text-green-800 dark:text-green-200 text-sm">
            ✅ Policy created successfully!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Policy ID: <code>{policyState.policyId}</code>
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Required signer: <code>{signerWallet.slice(0, 8)}...</code>
          </p>
        </div>
      )}

      {policyState.status === 'error' && (
        <div className="mt-3 p-3 bg-red-100 dark:bg-red-900 rounded">
          <p className="text-red-800 dark:text-red-200 text-sm">
            ❌ Error: {policyState.message}
          </p>
        </div>
      )}
    </div>
  );
}

