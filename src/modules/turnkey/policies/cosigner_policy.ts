import { v4 as uuidv4 } from 'uuid';

// Memo program ID on Solana
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

// Use type-only import to avoid bundling issues
type TurnkeyIndexedDbClient = {
  createPolicy: (params: {
    organizationId?: string;
    policyName: string;
    effect: 'EFFECT_ALLOW' | 'EFFECT_DENY';
    consensus?: string;
    condition?: string;
    notes?: string;
  }) => Promise<{ policyId: string }>;
};

/**
 * Builds a Turnkey policy condition that requires a memo instruction
 * where a specific wallet is a signer.
 *
 * The policy enforces:
 * 1. The activity is a sign transaction request
 * 2. There MUST be a memo instruction where the specified wallet is a signer
 */
export function buildMemoSignerRequiredCondition(signerPubKey: string): string {
  console.log(`Building memo-signer-required policy for signer: ${signerPubKey}`);

  const conditions = [
    // Activity must be a sign transaction
    `activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2'`,

    // There must be a memo instruction where the specified wallet is a signer
    `solana.tx.instructions.any(i, i.program_key == '${MEMO_PROGRAM_ID}' && i.accounts.any(a, a.account_key == '${signerPubKey}' && a.signer))`,
  ];

  console.log('Memo signer policy conditions:', conditions.join(' && '));

  return conditions.join(' && ');
}

/**
 * Creates a policy that allows the DA user to sign transactions only when
 * there is a memo instruction where the specified wallet is a signer.
 */
export async function createMemoSignerPolicy(
  client: TurnkeyIndexedDbClient,
  subOrgId: string,
  daUserId: string,
  signerPubKey: string
): Promise<{ policyId: string }> {
  // Consensus: the DA user can approve
  const consensus = `approvers.any(user, user.id == '${daUserId}')`;

  // Build the condition requiring memo instruction with specific signer
  const condition = buildMemoSignerRequiredCondition(signerPubKey);

  const result = await client.createPolicy({
    organizationId: subOrgId,
    policyName: `Memo Signer Required (${signerPubKey.slice(0, 8)}...) ${uuidv4()}`,
    effect: 'EFFECT_ALLOW',
    consensus,
    condition,
    notes: `Delegated authority policy requiring memo instruction signed by ${signerPubKey}`,
  });

  return { policyId: result.policyId };
}

