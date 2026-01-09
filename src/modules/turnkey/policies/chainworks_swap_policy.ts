import { v4 as uuidv4 } from 'uuid';
import { CHAINWORKS_PROGRAM_ID } from '@/constants/tokens';

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
 * Builds a Turnkey policy condition for ChainWorks cw_swap instruction.
 *
 * The policy enforces:
 * 1. The activity is a sign transaction request
 * 2. The transaction targets the ChainWorks program with cw_swap instruction
 * 3. The in_amount matches exactly what was specified
 *
 * NOTE: Requires ChainWorks IDL to be uploaded to your Turnkey organization.
 */
export function buildChainworksSwapPolicyCondition(
  exactAmountLamports: string
): string {
  console.log(`Building ChainWorks policy for amount: ${exactAmountLamports}`);

  const conditions = [
    // Activity must be a sign transaction
    `activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2'`,

    // Transaction must contain a ChainWorks program instruction with cw_swap and exact in_amount
    // This uses the uploaded ChainWorks IDL to parse the instruction data
    `solana.tx.instructions.any(i, i.program_key == '${CHAINWORKS_PROGRAM_ID}' && i.parsed_instruction_data.instruction_name == 'cw_swap' && i.parsed_instruction_data.program_call_args['in_amount'] == '${exactAmountLamports}')`,
  ];

  console.log('ChainWorks policy conditions:', conditions.join(' && '));

  return conditions.join(' && ');
}

/**
 * Creates a ChainWorks swap policy for a user's sub-organization.
 * This policy allows the DA to sign cw_swap transactions only when:
 * - The instruction is cw_swap
 * - Amount matches exactly what the user specified
 */
export async function createChainworksSwapPolicy(
  client: TurnkeyIndexedDbClient,
  subOrgId: string,
  daUserId: string,
  amountLamports: string
): Promise<{ policyId: string }> {
  // Consensus: the DA user can approve
  const consensus = `approvers.any(user, user.id == '${daUserId}')`;

  // Build the condition for cw_swap with exact amount
  const condition = buildChainworksSwapPolicyCondition(amountLamports);

  const result = await client.createPolicy({
    organizationId: subOrgId,
    policyName: `ChainWorks cw_swap (${amountLamports}) ${uuidv4()}`,
    effect: 'EFFECT_ALLOW',
    consensus,
    condition,
    notes: `Delegated authority policy for ChainWorks cw_swap, amount: ${amountLamports}`,
  });

  return { policyId: result.policyId };
}

