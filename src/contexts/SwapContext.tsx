import {
    IConfirmationTxDescription,
    OnTransaction,
    RouteInfo,
    SwapMode,
    SwapResult,
    useJupiter,
} from "@jup-ag/react-hook";
import {TokenInfo} from "@solana/spl-token-registry";
import {SignerWalletAdapter} from "@solana/wallet-adapter-base";
// Some more imports you will need
import {
    ComputeBudgetProgram,
    VersionedTransaction,
    TransactionMessage,
    VersionedMessage,
    TransactionInstruction,
    sendAndConfirmRawTransaction,
    SystemProgram,
    AddressLookupTableAccount, TransactionResponse, ComputeBudgetInstruction
} from '@solana/web3.js';
import {ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID} from '@solana/spl-token';

// public key to use for this example
const bonkMintPublicKey = new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")
import {PublicKey} from "@solana/web3.js";
import JSBI from "jsbi";
import React, {
    createContext,
    Dispatch,
    FC,
    ReactNode,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {WRAPPED_SOL_MINT} from "src/constants";
import {fromLamports, toLamports} from "src/misc/utils";
import {IInit} from "src/types";
import {useAccounts} from "./accounts";
import {useSlippageConfig} from "./SlippageConfigProvider";
import {useTokenContext} from "./TokenContextProvider";
import {useWalletPassThrough} from "./WalletPassthroughProvider";
import {useConnection, useWallet} from '@solana/wallet-adapter-react';
import core from "@jup-ag/core";

// import {serializeRouteInfo} from "@jup-ag/react-hook/dist/utils/parseRouteInfos";

const serializeRouteInfo = (routeInfo: RouteInfo<PublicKey, JSBI>) => {
    if(!routeInfo || !routeInfo.marketInfos) return null;
    return {
        ...routeInfo,
        marketInfos: routeInfo.marketInfos.map(marketInfo => ({
            ...marketInfo,
            inputMint: marketInfo.inputMint.toBase58(),
            outputMint: marketInfo.outputMint.toBase58(),
            lpFee: {
                ...marketInfo.lpFee,
                amount: marketInfo.lpFee.amount.toString()
            },
            platformFee: {
                ...marketInfo.platformFee,
                amount: marketInfo.platformFee.amount.toString()
            },
            inAmount: marketInfo.inAmount.toString(),
            outAmount: marketInfo.outAmount.toString(),
            minInAmount: marketInfo.minInAmount ? marketInfo.minInAmount.toString() : undefined,
            minOutAmount: marketInfo.minOutAmount ? marketInfo.minOutAmount.toString() : undefined
        })),
        inAmount: routeInfo.inAmount.toString(),
        outAmount: routeInfo.outAmount.toString(),
        amount: routeInfo.amount.toString(),
        otherAmountThreshold: routeInfo.otherAmountThreshold.toString()
    };
};
import {findAssociatedTokenAddress} from "@jup-ag/core/dist/utils/token";
import {TransactionError} from "@mercurial-finance/optimist";
import {getAssociatedTokenAddress} from "@project-serum/associated-token";

export interface IForm {
    fromMint: string;
    toMint: string;
    fromValue: string;
    toValue: string;
}

export interface ISwapContext {
    form: IForm;
    setForm: Dispatch<SetStateAction<IForm>>;
    priority: number;
    setPriority: Dispatch<SetStateAction<number>>;
    lastBurnAmount: number;
    setLastBurnAmount: Dispatch<SetStateAction<number>>;
    computeEstimate: number;
    errors: Record<string, { title: string; message: string }>;
    setErrors: Dispatch<SetStateAction<Record<string,
        {
            title: string;
            message: string;
        }>>>;
    fromTokenInfo?: TokenInfo | null;
    toTokenInfo?: TokenInfo | null;
    selectedSwapRoute: RouteInfo | null;
    setSelectedSwapRoute: Dispatch<SetStateAction<RouteInfo | null>>;
    onSubmit: () => Promise<SwapResult | null>;
    lastSwapResult: SwapResult | null;
    mode: IInit["mode"];
    displayMode: IInit["displayMode"];
    mint: IInit["mint"];
    scriptDomain: IInit["scriptDomain"];
    swapping: {
        totalTxs: number;
        txStatus: Array<{
            txid: string;
            txDescription: IConfirmationTxDescription;
            status: "loading" | "fail" | "success";
        }>;
    };
    reset: (props?: { resetValues: boolean }) => void;
    jupiter: Omit<ReturnType<typeof useJupiter>, "exchange"> & {
        exchange: ReturnType<typeof useJupiter>["exchange"] | undefined;
    };
}

export const initialSwapContext: ISwapContext = {
    form: {
        fromMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        toMint: WRAPPED_SOL_MINT.toString(),
        fromValue: "",
        toValue: "",
    },
    setForm() {
    },
    priority: 1,
    setPriority() {

    },
    lastBurnAmount: 0,
    setLastBurnAmount() {

    },
    computeEstimate: 1_400_000,
    errors: {},
    setErrors() {
    },
    fromTokenInfo: undefined,
    toTokenInfo: undefined,
    selectedSwapRoute: null,
    setSelectedSwapRoute() {
    },
    onSubmit: async () => null,
    lastSwapResult: null,
    mode: "default",
    displayMode: "modal",
    mint: undefined,
    scriptDomain: '',
    swapping: {
        totalTxs: 0,
        txStatus: [],
    },
    reset() {
    },
    jupiter: {
        routes: [],
        allTokenMints: [],
        routeMap: new Map(),
        exchange: undefined,
        loading: false,
        refresh() {
        },
        lastRefreshTimestamp: 0,
        error: undefined,
    },
};

export const SwapContext = createContext<ISwapContext>(initialSwapContext);

export function useSwapContext(): ISwapContext {
    return useContext(SwapContext);
}


export const SwapContextProvider: FC<{
    displayMode: IInit["displayMode"];
    mode: IInit["mode"];
    mint: IInit["mint"];
    scriptDomain?: string;
    children: ReactNode;
}> = ({displayMode, mode, mint, scriptDomain, children}) => {
    const {tokenMap} = useTokenContext();
    const {wallet} = useWalletPassThrough();
    const {refresh: refreshAccount} = useAccounts();
    const walletPublicKey = useMemo(
        () => wallet?.adapter.publicKey?.toString(),
        [wallet?.adapter.publicKey]
    );
    const {connection} = useConnection()
    const {signTransaction, sendTransaction} = useWallet()

    const [form, setForm] = useState<IForm>({
        fromMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        toMint: WRAPPED_SOL_MINT.toString(),
        fromValue: "",
        toValue: "",
    });
    const [errors, setErrors] = useState<Record<string, { title: string; message: string }>>({});

    const fromTokenInfo = useMemo(() => {
        const tokenInfo = form.fromMint ? tokenMap.get(form.fromMint) : null;
        return tokenInfo;
    }, [form.fromMint, tokenMap]);

    const toTokenInfo = useMemo(() => {
        const tokenInfo = form.toMint ? tokenMap.get(form.toMint) : null;
        return tokenInfo;
    }, [form.toMint, tokenMap]);

    const amountInLamports = useMemo(() => {
        if (!form.fromValue || !fromTokenInfo) return JSBI.BigInt(0);

        return toLamports(Number(form.fromValue), Number(fromTokenInfo.decimals));
    }, [form.fromValue, form.fromMint, fromTokenInfo]);

    const {slippage} = useSlippageConfig();

    const {
        routes: swapRoutes,
        allTokenMints,
        routeMap,
        exchange,
        loading: loadingQuotes,
        refresh,
        lastRefreshTimestamp,
        error,
    } = useJupiter({
        amount: JSBI.BigInt(amountInLamports),
        inputMint: useMemo(() => new PublicKey(form.fromMint), [form.fromMint]),
        outputMint: useMemo(() => new PublicKey(form.toMint), [form.toMint]),
        slippage,
        swapMode: SwapMode.ExactIn,
        // TODO: Support dynamic single tx
        enforceSingleTx: false,
    });

    // Refresh on slippage change
    useEffect(() => refresh(), [slippage]);

    const [selectedSwapRoute, setSelectedSwapRoute] = useState<RouteInfo | null>(
        null
    );
    useEffect(() => {
        const found = swapRoutes?.find((item) => JSBI.GT(item.outAmount, 0));
        if (found) {
            setSelectedSwapRoute(found);
        } else {
            setSelectedSwapRoute(null);
        }
    }, [swapRoutes]);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            toValue: selectedSwapRoute?.outAmount
                ? String(
                    fromLamports(
                        selectedSwapRoute?.outAmount,
                        toTokenInfo?.decimals || 0
                    )
                )
                : "",
        }));
    }, [selectedSwapRoute]);

    const [totalTxs, setTotalTxs] = useState(0);
    const [txStatus, setTxStatus] = useState<Array<{
        txid: string;
        txDescription: IConfirmationTxDescription;
        status: "loading" | "fail" | "success";
    }>>([]);

    const onTransaction: OnTransaction = async (
        txid,
        totalTxs,
        txDescription,
        awaiter
    ) => {
        setTotalTxs(totalTxs);

        const tx = txStatus.find((tx) => tx.txid === txid);
        if (!tx) {
            setTxStatus((prev) => [
                ...prev,
                {txid, txDescription, status: "loading"},
            ]);
        }

        const success = !((await awaiter) instanceof Error);

        setTxStatus((prev) => {
            const tx = prev.find((tx) => tx.txid === txid);
            if (tx) {
                tx.status = success ? "success" : "fail";
            }
            return [...prev];
        });
    };

    const [lastSwapResult, setLastSwapResult] = useState<SwapResult | null>(null);
    const [lastBurnAmount, setLastBurnAmount] = useState<number>(0);
    const [priority, setPriority] = useState<number>(2);
    const onSubmit = useCallback(async () => {
        if (!walletPublicKey || !wallet?.adapter || !selectedSwapRoute) {
            return null;
        }

        try {
            // const swapResult = await exchange({            });
            // get the transaction - can't do it from useJupiter sadly
            // const { swapTransaction
            //             //     wallet: wallet?.adapter as SignerWalletAdapter,
            //             //     routeInfo: selectedSwapRoute,
            //             //     onTransaction,} = await exchange({ routeInfo: selectedSwapRoute, wallet: wallet?.adapter as SignerWalletAdapter })
            let ourSwapRoute = serializeRouteInfo(selectedSwapRoute)
            console.log(ourSwapRoute)
            console.log(ourSwapRoute.amount)
            // console.log(swapRoutes)
            const transactions = await (
                await fetch('https://quote-api.jup.ag/v4/swap', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        // route from /quote api
                        route: ourSwapRoute,
                        // user public key to be used for the swap
                        userPublicKey: wallet?.adapter?.publicKey?.toString(),
                        // auto wrap and unwrap SOL. default is true
                    })
                })
            ).json()
            const {swapTransaction} = transactions
            // console.log(transactions, swapTransaction)
            // unpack versioned transaction
            // deserialize the transaction
            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64')
            var transaction = VersionedTransaction.deserialize(swapTransactionBuf)

            // get address lookup table accounts
            const addressLookupTableAccounts = await Promise.all(
                transaction.message.addressTableLookups.map(async (lookup) => {
                    return new AddressLookupTableAccount({
                        key: lookup.accountKey,
                        // @ts-ignor
                        state: AddressLookupTableAccount.deserialize(await connection.getAccountInfo(lookup.accountKey).then((res) => res.data)),
                    })
                }))
            // decompile transaction message and add transfer instruction
            var message = TransactionMessage.decompile(transaction.message, {addressLookupTableAccounts: addressLookupTableAccounts})
            console.log(transaction, 'message', message)

            // add priority fee
            const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priority //todo: add slider in UI
            });
            // put addPriorityFee instruction at the start  of the message
            console.log('adding priority fee of microlamports: ' + priority, addPriorityFee)
            message.instructions.unshift(addPriorityFee)

            // add in our compute instruction and burn command, if BONK is the input or output mint
            const bonkMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
            const inputMint = ourSwapRoute.marketInfos[0].inputMint
            const outputMint = ourSwapRoute.marketInfos[ourSwapRoute.marketInfos.length - 1].outputMint
            var burnAmount = 0
            if (inputMint === bonkMint) {
                console.log('input is bonk')
                let inputAmount = ourSwapRoute.marketInfos[0].inAmount;
                const swapAmount = inputAmount
                 burnAmount = Number(swapAmount) * 0.001
                // Find bonk ATA
                const bonkAta = await getAssociatedTokenAddress(wallet?.adapter?.publicKey || new PublicKey('x'), new PublicKey(bonkMint))
                // create a burn instruction and add it to the start of message array
                const walletAddress = wallet?.adapter?.publicKey || new PublicKey('x')
                const burnInstruction = Token.createBurnInstruction(
                    TOKEN_PROGRAM_ID,
                    new PublicKey(bonkMint), // mint
                    bonkAta, // token account
                    walletAddress, // owner of token account
                    [],
                    burnAmount,
                )
                console.log('adding burn instruction', burnInstruction)
                message.instructions.unshift(burnInstruction)
            } else if (outputMint === bonkMint) {
                console.log('output is bonk')
                let outAmount = ourSwapRoute.marketInfos[0].outAmount;
                const swapAmount = outAmount
                 burnAmount = Number(swapAmount) * 0.001
                // Find bonk ATA
                const bonkAta = await getAssociatedTokenAddress(wallet?.adapter?.publicKey || new PublicKey('x'), new PublicKey(bonkMint))
                // create a burn instruction and add it to the start of message array
                const walletAddress = wallet?.adapter?.publicKey || new PublicKey('x')
                const burnInstruction = Token.createBurnInstruction(
                    TOKEN_PROGRAM_ID,
                    new PublicKey(bonkMint), // mint
                    bonkAta, // token account
                    walletAddress, // owner of token account
                    [],
                    burnAmount,
                )
                console.log('adding burn instruction', burnInstruction)
                // add instruction to end of message
                message.instructions.push(burnInstruction)
            }
            let instructions = message.instructions
            console.log('final message', message)
            let blockhash = await connection
                .getLatestBlockhash()
                .then((res) => res.blockhash);

            message.recentBlockhash = blockhash

            // message.instructions.push(transferInstruction)
            // compile the message and update the transaction
            transaction.message = message.compileToV0Message(addressLookupTableAccounts)

            // lets try building the tx outselves:
            // create v0 compatible message
            // const messageV0 = new TransactionMessage({
            //     payerKey: wallet?.adapter?.publicKey || new PublicKey('x'),
            //     recentBlockhash: blockhash,
            //     instructions,
            // }).compileToV0Message(addressLookupTableAccounts);
            // const ourTx = new VersionedTransaction(messageV0);
            console.log('final transaction', transaction)
            console.log('connection', connection)
// console.log(addressLookupTableAccounts)
// sign the transaction

// Execute the transaction
//             const rawTransaction = transaction.serialize()
            // i hate ts, i know this is horrible
            let signedTransaction = null
            // let txid= null
            // if (signTransaction) {
            // try catch breaks jupiter's error checking /retry + return to form flow, so lets throw it
            try {
            if (signTransaction) {
                transaction = await signTransaction(transaction)
            }
            setLastBurnAmount(burnAmount || 0)
            // const txid = await sendTransaction(transaction, connection, {
            //     maxRetries:3,
            //     skipPreflight: true,
            // })

            // } else {
            //     signedTransaction = transaction
            // }
            console.log('transactino signed')

            const txid = await connection.sendRawTransaction(transaction.serialize() || swapTransaction, {
                skipPreflight: true,
                maxRetries: 2
            })
            const desc: IConfirmationTxDescription = 'SWAP'
            let confirmation = await connection.confirmTransaction(txid)
            let txResponse = connection.getTransaction(txid, { maxSupportedTransactionVersion :0 })
            // @ts-ignore
            await onTransaction(txid, 1, desc, txResponse)
            // connection.confirmTransaction(txid)
            // console.log(`https://solscan.io/tx/${txid}`)

            // deserialize the transaction
            var swapResult: SwapResult = {
                txid: txid,
                inputAddress: new PublicKey(ourSwapRoute.marketInfos[0].inputMint),
                outputAddress: new PublicKey(ourSwapRoute.marketInfos[ourSwapRoute.marketInfos.length - 1].outputMint),
                inputAmount: Number(ourSwapRoute.inAmount),
                outputAmount: Number(ourSwapRoute.outAmount),
            }
            } catch (e) {
                console.log('caught error', e)
                var swapResult: SwapResult = {
                    error: new TransactionError(String(e))
                }
                // that doesn't work, how about this
                let txdesc : IConfirmationTxDescription = 'SWAP'
                setTxStatus([
                        {
                            txid: 'error',

                            // @ts-ignore
                            desc: txdesc,
                            status: 'fail',
                        }
                    ]
                )

                return null
            }
            // set fees
            let updatedSwapResult = selectedSwapRoute
            // @ts-ignore
            updatedSwapResult.fees.signatureFee = ((computeEstimate || 1400000) * 0.000001 * priority) + 5000
            setSelectedSwapRoute(updatedSwapResult)


            console.log(swapResult)
            setLastSwapResult(swapResult);
            return swapResult;
        } catch (error) {
            console.log("Swap error", error);
            return null;
        }
    }, [walletPublicKey, selectedSwapRoute]);

    const refreshAll = () => {
        refresh();
        refreshAccount();
        refreshComputeEstimate()
    };
    const [computeEstimate, setComputeEstimate] = useState<number | null>(null);

    const refreshComputeEstimate = async () => {
        console.log('getting compute estimate')
        // first we get the transaction instructions
        // @ts-ignore
        let ourSwapRoute = serializeRouteInfo(selectedSwapRoute)
        if (ourSwapRoute == null) return null
        // console.log(ourSwapRoute)
        // console.log(ourSwapRoute.amount)
        // console.log(swapRoutes)
        const transactions = await (
            await fetch('https://quote-api.jup.ag/v4/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // route from /quote api
                    route: ourSwapRoute,
                    // user public key to be used for the swap
                    userPublicKey: wallet?.adapter?.publicKey?.toString(),
                    // auto wrap and unwrap SOL. default is true
                })
            })
        ).json()
        const {swapTransaction} = transactions
        // console.log(transactions, swapTransaction)
        // unpack versioned transaction
        // deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapTransaction, 'base64')
        var transaction = VersionedTransaction.deserialize(swapTransactionBuf)

        // get address lookup table accounts
        const addressLookupTableAccounts = await Promise.all(
            transaction.message.addressTableLookups.map(async (lookup) => {
                return new AddressLookupTableAccount({
                    key: lookup.accountKey,
                    // @ts-ignor
                    state: AddressLookupTableAccount.deserialize(await connection.getAccountInfo(lookup.accountKey).then((res) => res.data)),
                })
            }))
        console.log('message before decompile', transaction.message)
        // decompile transaction message and add transfer instruction
        var message = TransactionMessage.decompile(transaction.message, {addressLookupTableAccounts: addressLookupTableAccounts})

        var computeBudgetInstruction = message.instructions[0]
        // compute budget should be first
        // for(var i=0; i<message.instructions.length; i++) {
        //     let ins = message.instructions[i]
        //     console.log(ins.programId.toString(), ComputeBudgetProgram.programId.toString())
        //     if (ins.programId == ComputeBudgetProgram.programId) {
        //          computeBudgetInstruction = ins
        //     }
        // }
        //
        // console.log('compute budget instruction', computeBudgetInstruction)
        // if (computeBudgetInstruction === null) return
        // now lets try to decode
        // @ts-ignore
        const computeBudget = ComputeBudgetInstruction.decodeSetComputeUnitLimit(computeBudgetInstruction)
        console.log('compute budget', computeBudget)
        setComputeEstimate(computeBudget.units)
    }

    const reset = useCallback(({resetValues} = {resetValues: true}) => {
        if (resetValues) {
            setForm(initialSwapContext.form);
        }

        setSelectedSwapRoute(null);
        setErrors(initialSwapContext.errors);
        setLastSwapResult(initialSwapContext.lastSwapResult);
        setTxStatus(initialSwapContext.swapping.txStatus);
        setTotalTxs(initialSwapContext.swapping.totalTxs);
        refreshAccount();
    }, []);

    return (
        <SwapContext.Provider
            value={{
                form,
                setForm,
                priority,
                setPriority,
                lastBurnAmount,
                setLastBurnAmount,
                computeEstimate,
                errors,
                setErrors,
                fromTokenInfo,
                toTokenInfo,
                selectedSwapRoute,
                setSelectedSwapRoute,
                onSubmit,
                lastSwapResult,
                reset,
                mode,
                displayMode,
                mint,
                scriptDomain,
                swapping: {
                    totalTxs,
                    txStatus,
                },
                jupiter: {
                    routes: swapRoutes,
                    allTokenMints,
                    routeMap,
                    exchange,
                    loading: loadingQuotes,
                    refresh: refreshAll,
                    lastRefreshTimestamp,
                    error,
                },
            }}
        >
            {children}
        </SwapContext.Provider>
    );
};
