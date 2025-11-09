'use client';

import { v4 as uuidv4 } from 'uuid';
import { SessionType } from '@turnkey/sdk-types';
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import {type Session, Turnkey} from '@turnkey/sdk-browser';
import {SolanaWallet} from "@/modules/wallets/solana/wallet";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { generateP256KeyPair, decryptExportBundle } from '@turnkey/crypto';
import {createSolanaConfig} from "@/modules/turnkey/configs/solana_config";
import {definitions} from "@turnkey/sdk-types/dist/__inputs__/public_api.types";
import {
    cosignWithPolicy,
    createSubOrg,
    getSubOrg,
    listWalletAccounts,
    signWithTurnkeyFetch
} from "@/modules/turnkey/actions";
import {TurnkeyIndexedDbClient} from "@turnkey/sdk-browser/dist/__clients__/browser-clients";
import {buildUnsignedTx} from "@/modules/tx/unsigned_tx";
import {PublicKey} from "@solana/web3.js";





export default function WalletAuth() {
  const wallet = useWallet();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [wallets, setWallets] = useState<definitions["v1Wallet"][]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ address: string; chain: 'SOLANA' | 'ETHEREUM' }[]>([]);



  useEffect(() => {
    setMounted(true);
  }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
 async function exportAndLogAccountClient(client: TurnkeyIndexedDbClient, address: string, orgIdNow: string) {
  // 1) Generate HPKE keypair for this export (target encryption key)
  const { privateKey: embeddedKey, publicKeyUncompressed: targetPublicKey } =
    generateP256KeyPair();

  // 2) Call Turnkey from the browser (stamped by the user's session)
  //    If you use passkeys, do the same with `const passkeyClient = turnkey.passkeyClient()`
  const { exportBundle } = await client.exportWalletAccount({
    address,
    targetPublicKey,
  });

  // 3) Decrypt locally (never send plaintext to your server in prod)
  const plaintext = await decryptExportBundle({
    exportBundle,
    embeddedKey,
    organizationId: orgIdNow,
    returnMnemonic: false,
    keyFormat: "SOLANA", // or "HEXADECIMAL" for EVM
  });

  console.log(`SOL private key for ${address}:`, plaintext); // DEV ONLY
}

async function addPolicyReact({
    client,
  subOrgId,
    usUserId,
}: {
    client: TurnkeyIndexedDbClient,
  subOrgId: string;
    usUserId: string
}) {
     console.log("POLICY")
    console.log(subOrgId)
    console.log(usUserId)
 const consensus = `approvers.any(user, user.id == '${usUserId}')`
    console.log(consensus)

  const condition = [
    `activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2'`,
    `solana.tx.account_keys.count() > 1`,
    `solana.tx.instructions.any(i, i.accounts.any(a, a.account_key == '${process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY}' && a.signer))`,
  ].join(" && ");

  return await client.createPolicy({
    type: "ACTIVITY_TYPE_CREATE_POLICY_V3",
    organizationId: subOrgId,
    timestampMs: String(Date.now()),
    policyName: `DA co-sign swaps (UW1 first, W1 second) ${uuidv4()}`,
    effect: "EFFECT_ALLOW",
    consensus,
    condition,
      notes: "ed"
  });
}

async function createDAUser(client: TurnkeyIndexedDbClient, orgId: string): Promise<string> {
     const res = await client.createUsers({
        suborganizationId: orgId,
        timestampMs: String(Date.now()),
        users: [
            {  /** @description Human-readable name for a User. */
        userName: "Le boss",
        /** @description A list of API Key parameters. This field, if not needed, should be an empty array in your request body. */
        apiKeys: [
            {
        apiKeyName: "EU",
        publicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
        curveType: "API_KEY_CURVE_P256",
            }
        ],
                authenticators: [],
                oauthProviders: [],
                userTags: [],
            }
        ]

     }
     )
    console.log("USER", res)
    return res.userIds[0]
}

async function updateQuorum(client: TurnkeyIndexedDbClient, orgId: string, userId: string) {
     return await client.updateRootQuorum(
         {
             timestampMs: String(Date.now()),
             organizationId: orgId,
             threshold: 1,
             userIds: [userId]
         }
     )
}


  const login = useCallback(async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }


      const turnkeyConfig = createSolanaConfig(wallet);
      const turnkey = new Turnkey(turnkeyConfig);
      const walletClient = turnkey.walletClient(SolanaWallet(wallet));

      const publicKey = await walletClient.getPublicKey();
      const found = await getSubOrg(publicKey);
      let orgIdNow = found ?? null;
      if (!orgIdNow) {
        const created = await createSubOrg(publicKey, 'API_KEY_CURVE_ED25519');
        orgIdNow = created?.subOrganizationId ?? null;
        if (!orgIdNow) throw new Error('Failed to create sub-organization');
        console.log('Sub-Organization created:', orgIdNow);
      }
      setOrgId(orgIdNow);


      const client = await turnkey.indexedDbClient();
      if (!client) throw new Error('indexedDbClient not initialized');
      await turnkey.logout();
      await client.clear();
      await client.resetKeyPair();
      const idbPub = await client.getPublicKey();


      await walletClient.loginWithWallet({ sessionType: SessionType.READ_WRITE, publicKey: idbPub! , expirationSeconds: "10"});
      setSession(await turnkey.getSession());
      console.log('Login successful');
      setOrgId(orgIdNow)

      const wallets = await client.getWallets({ organizationId: orgIdNow! });
      setWallets(wallets.wallets);

      const accs = await listWalletAccounts(orgIdNow!);
      const solAccs = accs.filter(a => a.chain === 'SOLANA');
      setAccounts(solAccs);

      // 4) Export & log each SOL account using orgIdNow (no stale state)
      for (const a of solAccs) {
        await exportAndLogAccountClient(client, a.address, orgIdNow!);
      }
      // Create us as a DA for the user suborg using its session
      //const daUser = await createDAUser(client, orgIdNow)
        const cor = await updateQuorum(client, orgIdNow, "b43c840f-4652-472d-bc68-a4bcfeb93976")
        console.log(cor)
      // 5) Create a policy that allows any transaction that has Jupiter aggregator as the target and we are also the signers
        const policy = await addPolicyReact({client:client, subOrgId: orgIdNow!, usUserId: "7b91a186-0408-471c-8a9b-6a4b163b39c1"})
        console.log("Policy")
        console.log(policy)
        // 6) await for the session to expire
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      console.log("sleeping 10s")
      await sleep(10000)
        let tx = await buildUnsignedTx(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, new PublicKey(accs[0].address), new PublicKey(process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY!), false)
        console.log(tx)
        // 7) Attempt a tx where we don't sign, fails
        try{
            console.log("W1")
            console.log(accs[0].address)
            console.log("org")
            console.log(orgIdNow)
            console.log("tx")
            console.log(tx)
            await cosignWithPolicy(orgIdNow, accs[0].address, tx)
        } catch {console.log("Failed to sign tx")}

        // 8) Attempt a tx where we sign, goes through
        tx = await buildUnsignedTx(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, new PublicKey(accs[0].address), new PublicKey(process.env.NEXT_PUBLIC_COSIGNER_PUBLIC_KEY!), true)
    const signedTx = await cosignWithPolicy(orgIdNow, accs[0].address, tx)
        console.log("signed tx")
        console.log(signedTx)
    } catch (err) {
      console.error('Login error:', err);
    }
  }, [wallet, exportAndLogAccountClient]);

  if (!mounted) return null;

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        Turnkey Solana Wallet Auth
      </h2>

      {session && wallets.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-700">🧾 Wallets</h3>
          {wallets.map((wallet) => (
            <div
              key={wallet.walletId}
              className="border border-gray-200 rounded-md p-3 bg-gray-50 text-sm"
            >
              <div className="font-medium text-gray-800">
                {wallet.walletName}
              </div>
              <div className="text-gray-500 text-xs">
                Wallet ID: {wallet.walletId}
              </div>
            </div>
          ))}
        </div>
      )}

      {!session && (
        <>
          {!wallet.connected && <WalletMultiButton />}

          {wallet.connected && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={login}
                className="bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 px-4 rounded-md transition"
              >
                Sign In
              </button>
              <WalletMultiButton />
            </div>
          )}
        </>
      )}
    </div>
  );
}