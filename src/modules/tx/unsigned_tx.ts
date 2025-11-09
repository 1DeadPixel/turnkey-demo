import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction
} from '@solana/web3.js';


// Official Memo program (latest)
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);


export async function buildUnsignedTx(
  url: string,
  UW1: PublicKey,           // fee payer (user) -> first signer
  W1: PublicKey,            // your cosigner -> second signer when required
  requireW1: boolean,       // false => should fail; true => should pass
  memoText = "policy test"
): Promise<string> {
  const connection = new Connection(url);
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: UW1, recentBlockhash: blockhash });

  // "fail" variant: UW1 only (W1 NOT required as signer)
  if (!requireW1) {
    tx.add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [],                                 // no extra signers
        data: Buffer.from(memoText, "utf8"),
      })
    );
  } else {
    // "pass" variant: make W1 a REQUIRED signer
    tx.add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: W1, isSigner: true, isWritable: false }], // W1 must sign
        data: Buffer.from(memoText, "utf8"),
      })
    );
  }
  return Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('hex');


}



