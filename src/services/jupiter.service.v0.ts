import { ASSOCIATED_TOKEN_PROGRAM_ID, Account, NATIVE_MINT, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, TokenAccountNotFoundError, TokenInvalidAccountOwnerError, closeAccount, createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferCheckedInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import { ComputeBudgetProgram, Keypair, PublicKey, SystemProgram, TransactionInstruction, VersionedTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { QuoteGetRequest, SwapRequest, createJupiterApiClient } from '@jup-ag/api';
import bs58 from "bs58";
import { COMMITMENT_LEVEL, RESERVE_WALLET, connection } from "../config";
import { transactionSenderAndConfirmationWaiter } from "../utils/jupiter.transaction.sender";
import { getSignature } from "../utils/get.signature";
import { sendTransactionV0 } from "../utils/v0.transaction";

export const JupiterService = {
  swapToken: async (
    pk: string,
    inputMint: string,
    outputMint: string,
    decimal: number,
    _amount: number,
    _slippage: number,
    gasFee: number,
    isFeeBurn: boolean
  ) => {
    try {
      let total_fee_in_sol = 0;
      let total_fee_in_token = 0;
      const is_buy = inputMint === NATIVE_MINT.toString();

      let total_fee_percent = 0.0025; // 0.25%
      let total_fee_percent_in_sol = 0.0025; // 0.25%
      let total_fee_percent_in_token = 0;

      if (isFeeBurn) {
        total_fee_percent_in_sol = 0.001875;
        total_fee_percent_in_token = total_fee_percent - total_fee_percent_in_sol;
      }
      // 0.5% => 50
      const slippageBps = _slippage * 100;
      const fee = _amount * (is_buy ? total_fee_percent_in_sol : total_fee_percent_in_token);
      // in_amount
      const amount = Number(((_amount - fee) * 10 ** decimal).toFixed(0));
      const wallet = Keypair.fromSecretKey(bs58.decode(pk));

      // const config = {
      //   basePath: "https://growtradebot.fly.dev"
      // }
      // const jupiterQuoteApi = createJupiterApiClient(config);
      const jupiterQuoteApi = createJupiterApiClient();
      const quotegetOpts: QuoteGetRequest = {
        inputMint,
        outputMint,
        amount,
        slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false,
      }
      const quote = await jupiterQuoteApi.quoteGet(quotegetOpts);
      console.log("🚀 Quote ~", Date.now())
      if (!quote) {
        console.error("unable to quote");
        return;
      }
      if (is_buy) {
        total_fee_in_sol = Number((fee * 10 ** decimal).toFixed(0));
        total_fee_in_token = Number((Number(quote.outAmount) * total_fee_percent_in_token).toFixed(0));
      } else {
        total_fee_in_token = Number((fee * 10 ** decimal).toFixed(0));
        total_fee_in_sol = Number((Number(quote.outAmount) * total_fee_percent_in_sol).toFixed(0));
      }

      // Gas in SOL
      const GasFeeMulitplier = 10 ** 9;
      const gasfeeValue = gasFee * GasFeeMulitplier;
      // Get serialized transaction
      const swapReqOpts: SwapRequest = {
        quoteResponse: quote,
        userPublicKey: wallet.publicKey.toString(),
        dynamicComputeUnitLimit: true,
        // prioritizationFeeLamports: Number(gasfeeValue.toFixed(0)),
        // prioritizationFeeLamports: {
        //   autoMultiplier: 10,
        // }
        prioritizationFeeLamports: {
          jitoTipLamports: 1500000,
        }
      }

      const swapResult = await jupiterQuoteApi.swapPost({ swapRequest: swapReqOpts });
      console.log("🚀 Got Swap Result ~", Date.now())
      // Serialize the transaction
      const swapTransactionBuf = Uint8Array.from(Buffer.from(swapResult.swapTransaction, "base64"));
      var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign the transaction
      transaction.sign([wallet]);
      const signature = getSignature(transaction);
      // We first simulate whether the transaction would be successful
      const { value: simulatedTransactionResponse } =
        await connection.simulateTransaction(transaction, {
          replaceRecentBlockhash: true,
          commitment: "processed",
        });
      const { err, logs } = simulatedTransactionResponse;

      console.log("🚀 Simulate ~", Date.now())
      // if (!err) return;

      if (err) {
        // Simulation error, we can check the logs for more details
        // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
        console.error("Simulation Error:");
        console.error({ err, logs });
        return;
      }

      const serializedTransaction = Buffer.from(transaction.serialize());
      const blockhash = transaction.message.recentBlockhash;
      // if (blockhash) return;
      const transactionResponse = await transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction,
        blockhashWithExpiryBlockHeight: {
          blockhash,
          lastValidBlockHeight: swapResult.lastValidBlockHeight,
        },
      });

      // If we are not getting a response back, the transaction has not confirmed.
      if (!transactionResponse) {
        console.error("Transaction not confirmed");
        return;
      }

      if (transactionResponse.meta?.err) {
        console.error(transactionResponse.meta?.err);
        return null;
      }

      // console.log(`https://solscan.io/tx/${signature}`);
      return {
        quote,
        signature,
        total_fee_in_sol,
        total_fee_in_token
      };
    } catch (e) {
      console.log("SwapToken Failed", e);
      return null;
    }
  },
  // createReferralAccount: async () => {
  //   const referralAccountKeypair = Keypair.generate();
  //   const tx = await provider.initializeReferralAccount({
  //     payerPubKey: RESERVE_WALLET,
  //     partnerPubKey: RESERVE_WALLET,
  //     projectPubKey: JUPITER_PROJECT,
  //     referralAccountPubKey: referralAccountKeypair.publicKey,
  //   });

  //   const referralAccount = await connection.getAccountInfo(
  //     referralAccountKeypair.publicKey,
  //   );

  //   if (!referralAccount) {
  //     const txId = await sendAndConfirmTransaction(connection, tx, [
  //       reserveWallet,
  //       referralAccountKeypair,
  //     ]);
  //     console.log({
  //       txId,
  //       referralAccountPubKey: referralAccountKeypair.publicKey.toString(),
  //     });
  //   } else {
  //     console.log(
  //       `referralAccount ${referralAccountKeypair.publicKey.toString()} already exists`,
  //     );
  //   }
  // },
  // createReferralTokenAccount: async (mintstr: string) => {
  //   const mint = new PublicKey(mintstr);
  //   const key = `referral_${mintstr}`;
  //   const data = await redisClient.get(key);
  //   if (data) {
  //     return data;
  //   }
  //   const { tx, referralTokenAccountPubKey } =
  //     await provider.initializeReferralTokenAccount({
  //       payerPubKey: RESERVE_WALLET,
  //       referralAccountPubKey: new PublicKey(
  //         REFERRAL_ACCOUNT,
  //       ), // Referral Key. You can create this with createReferralAccount.ts.
  //       mint,
  //     });

  //   const referralTokenAccount = await connection.getAccountInfo(
  //     referralTokenAccountPubKey,
  //   );

  //   if (!referralTokenAccount) {
  //     const txId = await sendAndConfirmTransaction(connection, tx, [reserveWallet]);
  //     console.log({
  //       txId,
  //       referralTokenAccountPubKey: referralTokenAccountPubKey.toString(),
  //     });
  //     await redisClient.set(key, referralTokenAccountPubKey.toString());
  //   } else {
  //     console.log(
  //       `referralTokenAccount ${referralTokenAccountPubKey.toString()} for mint ${mint.toString()} already exists`,
  //     );
  //     await redisClient.set(key, referralTokenAccountPubKey.toString());
  //   }
  // },
  // claimAll: async () => {
  //   try {
  //     // This method will returns a list of transactions for all claims batched by 5 claims for each transaction.
  //     const tx = await provider.claim({
  //       payerPubKey: RESERVE_WALLET,
  //       referralAccountPubKey: new PublicKey(
  //         REFERRAL_ACCOUNT,
  //       ), // Referral Key. You can create this with createReferralAccount.ts.
  //       mint: NATIVE_MINT
  //     });

  //     // Send each claim transaction one by one.
  //     let retires = 0;
  //     do {
  //       try {
  //         // tx.sign([reserveWallet]);
  //         const { blockhash, lastValidBlockHeight } =
  //           await connection.getLatestBlockhash();
  //         const txid = await connection.sendTransaction(tx, [reserveWallet]);
  //         const { value } = await connection.confirmTransaction({
  //           signature: txid,
  //           blockhash,
  //           lastValidBlockHeight,
  //         });

  //         if (value.err) {
  //           retires++;
  //         } else {
  //           console.log(`ClaimAll: https://solscan.io/tx/${txid}`);
  //           retires = 10;
  //         }
  //       } catch (e) {
  //         retires++;
  //       }
  //     } while (retires < 5);
  //   } catch (e) {
  //     console.log("ClaimAll Failed", e);
  //   }
  // },

  transferFeeSOL: async (fee: number, wallet: Keypair) => {
    if (fee <= 0) return;
    let retires = 0;
    do {
      try {
        const amount = Number((fee * 10 ** 9).toFixed(0));
        const txid = await sendTransactionV0(
          connection,
          [
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 5000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
              units: 20_000,
            }),
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: RESERVE_WALLET,
              lamports: amount,
            })
          ],
          [wallet]
        )
        if (!txid) {
          retires++;
        } else {
          console.log("BuyFee:", `https://solscan.io/tx/${txid}`);
          retires = 100;
        }
      } catch (e) {
        retires++;
        console.log(`Take BuyFee Failed ${retires}/5`);
      }
    } while (retires < 5);
  },
  transferSOL: async (fundAmount: number, decimals: number, toPubkey: string, pk: string, lamports: number = 5000, units: number = 20000) => {
    if (fundAmount <= 0) return;
    let retires = 0;
    const wallet = Keypair.fromSecretKey(bs58.decode(pk));
    do {
      try {
        const amount = Number((fundAmount * 10 ** decimals).toFixed(0));
        const txid = await sendTransactionV0(
          connection,
          [
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: lamports,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
              units: units,
            }),
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: new PublicKey(toPubkey),
              lamports: amount,
            })
          ],
          [wallet]
        )
        if (!txid) {
          retires++;
        } else {
          console.log("TransferSOL:", `https://solscan.io/tx/${txid}`);
          retires = 100;
          return txid;
        }
      } catch (e) {
        retires++;
        console.log(`Take Withdraw Failed ${retires}/5`);
      }
    } while (retires < 5);
    return null;
  },
  transferSPL: async (mint: string, fundAmount: number, decimals: number, toPubkey: string, pk: string, isToken2022: boolean) => {
    if (fundAmount <= 0) return null;
    const wallet = Keypair.fromSecretKey(bs58.decode(pk));

    const sourceAta = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      wallet.publicKey,
      true,
      isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const destAta = getAssociatedTokenAddressSync(
      new PublicKey(mint),
      new PublicKey(toPubkey),
      true,
      isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const instructions: TransactionInstruction[] = [];
    // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
    // Sadly we can't do this atomically.
    let account: Account;
    try {
      account = await getAccount(connection, destAta, COMMITMENT_LEVEL, isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID);
    } catch (error: unknown) {
      // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
      // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
      // TokenInvalidAccountOwnerError in this code path.
      if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
        // As this isn't atomic, it's possible others can create associated accounts meanwhile.
        instructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            destAta,
            new PublicKey(toPubkey),
            new PublicKey(mint),
            isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
      } else {
        return null;
      }
    }
    const amount = Number((fundAmount * 10 ** decimals).toFixed(0));

    if (isToken2022) {
      instructions.push(
        createTransferCheckedInstruction(
          sourceAta,
          new PublicKey(mint),
          destAta,
          wallet.publicKey,
          amount,
          decimals,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      )
    } else {
      instructions.push(
        createTransferInstruction(
          sourceAta,
          destAta,
          wallet.publicKey,
          amount
        )
      )
    }

    let retires = 0;
    do {
      try {
        const txid = await sendTransactionV0(
          connection,
          [
            ComputeBudgetProgram.setComputeUnitPrice({
              microLamports: 100000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
              units: 200_000,
            }),
            ...instructions
          ],
          [wallet]
        )
        if (!txid) {
          retires++;
        } else {
          console.log("Transfer SPL:", `https://solscan.io/tx/${txid}`);
          retires = 100;
          return txid;
        }
      } catch (e) {
        retires++;
        console.log(`Take Transfer SPL Failed ${retires}/5`);
      }
    } while (retires < 5);
  }
}