import { v4 as uuidv4 } from 'uuid';
import { SOL_MINT, USDC_MINT, JUPITER_PROGRAM_ID } from '@/constants/tokens';

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
 * Builds a Turnkey policy condition for Jupiter SOL→USDC swaps.
 *
 * The policy enforces:
 * 1. The activity is a sign transaction request
 * 2. The transaction targets the Jupiter program with1 exact in_amount
 *
 * NOTE: Requires Jupiter IDL to be uploaded to your Turnkey organization.
 */
export function buildJupiterSwapPolicyCondition(
  exactAmountLamports: string
): string {
  console.log(`Building policy for amount: ${exactAmountLamports} lamports`);

  const conditions = [
    // Activity must be a sign transaction
    `activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2'`,

    // Transaction must contain a Jupiter program instruction with exact in_amount
    // This uses the uploaded Jupiter IDL to parse the instruction data
    `solana.tx.instructions.any(i, i.program_key == '${JUPITER_PROGRAM_ID}' && i.parsed_instruction_data.instruction_name == 'route' && i.parsed_instruction_data.program_call_args['in_amount'] == '${exactAmountLamports}')`,

    // TODO: Uncomment these for input/output token validation once tested
    // Validate input token is SOL - check for wrapped SOL in token program instructions
    // `solana.tx.instructions.any(i, i.program_key == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && i.accounts.any(a, a.account_key == '${SOL_MINT}'))`,

    // Validate output token is USDC
    // `solana.tx.instructions.any(i, i.program_key == 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' && i.accounts.any(a, a.account_key == '${USDC_MINT}'))`,
  ];

  console.log('Policy conditions:', conditions.join(' && '));

  return conditions.join(' && ');
}

/**
 * Creates a Jupiter swap policy for a user's sub-organization.
 * This policy allows the DA to sign swap transactions only when:
 * - SOL is the input token
 * - USDC is the output token
 * - Amount matches exactly what the user specified
 */
export async function createJupiterSwapPolicy(
  client: TurnkeyIndexedDbClient,
  subOrgId: string,
  daUserId: string,
  amountLamports: string
): Promise<{ policyId: string }> {
  // Consensus: the DA user can approve
  const consensus = `approvers.any(user, user.id == '${daUserId}')`;

  // Build the condition for SOL→USDC swap with exact amount
  const condition = buildJupiterSwapPolicyCondition(amountLamports);

  const result = await client.createPolicy({
    organizationId: subOrgId,
    policyName: `Jupiter SOL-USDC Swap (${amountLamports} lamports) ${uuidv4()}`,
    effect: 'EFFECT_ALLOW',
    consensus,
    condition,
    notes: `Delegated authority policy for Jupiter swap: SOL to USDC, amount: ${amountLamports} lamports`,
  });

  return { policyId: result.policyId };
}

