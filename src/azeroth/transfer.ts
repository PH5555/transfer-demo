import Web3Azeroth from './web3-contract';
import { Token, TokenType } from '../web3/types';
import { EnaStatus, ZkTransferMeta } from './types';
import { generateZkTransferInput } from './snark-input/generateZkTransferInput';
import { ITransferMetaAmount } from './interfaces';
import { getAllEnaStatus, getEnaIndexStatus } from './ena-status';
import { AuditKey, UPK, UserKey } from './keys';
import { SendContractTransactionResult } from '../web3';
import { toJson, web3NumbersToBigInt, web3NumbersToNumber } from '../common/utilities';
import { sCT } from '../common/crypto/deprecated/encryption';
import { TransferAmounts } from '../common/types'; 
import { sendErcApproval, sendTransfer } from '../web3/erc-utils';
import { Network, Wallet } from '../type/types';

export async function getZkTransferFee(network: Network): Promise<bigint> {
    return await (new Web3Azeroth(network)).getZkTransferFee();
}

async function zkTransfer(transfer: ZkTransferMeta, advanceProgress: Function,) {

    const contractInput = await generateZkTransferInput(transfer);

    advanceProgress();

    switch (transfer.tokenInfo.tokenType) {
        case TokenType.NATIVE:
            const value =
                transfer.zkWalletFee + transfer.amounts.fromPublicAmount;

            return await transfer.web3Azeroth.zkTransfer20(
                contractInput,
                transfer.networkKeys.senderEOA,
                value,
                transfer.networkKeys.senderPrivateKey,
                false,
            );
        case TokenType.ERC_20:
            return await transfer.web3Azeroth.zkTransfer20(
                contractInput,
                transfer.networkKeys.senderEOA,
                transfer.zkWalletFee,
                transfer.networkKeys.senderPrivateKey,
                false,
            );
        case TokenType.ERC_721:
            return await transfer.web3Azeroth.zkTransfer721(
                contractInput,
                transfer.networkKeys.senderEOA,
                transfer.zkWalletFee,
                transfer.networkKeys.senderPrivateKey,
                false,
            );
        case TokenType.ERC_1155:
            return await transfer.web3Azeroth.zkTransfer1155(
                contractInput,
                transfer.networkKeys.senderEOA,
                transfer.zkWalletFee,
                transfer.networkKeys.senderPrivateKey,
                false,
            );
    }
}

export async function tranfer(
    {
        ethPrivateKey,
        userKey,
        network,
        wallet,
        token,
        amounts,
        receiverAddr,
        zkTxFee,
        advanceProgress,
        onFail
    }: {
        ethPrivateKey: string,
        userKey: UserKey,
        network: Network,
        wallet: Wallet,
        token: Token,
        amounts: TransferAmounts,
        receiverAddr: string,
        zkTxFee: bigint,
        advanceProgress: Function,
        onFail: (
            failType:
                'ReceiverEnaUnregistered' |
                'InsufficientBalance' |
                'Internal',
            failReason?: any
        ) => void,
    }
) {

    consoleLog("zkTransfer Pre-process ... : ",
        ("\n" + ("-").repeat(40)),
        "\nInput Params :",
        ("\n" + ("-").repeat(40)),
        "\n\n", wallet.address, " --> ", receiverAddr, (wallet.address.toLowerCase() === receiverAddr.toLowerCase() ? " : self" : ""),
        "\n\namounts : \n", toJson(amounts, 2),
        "\n\ntoken : \n", toJson(token, 2),
        ("\n" + ("-").repeat(40)),
        ("\n" + ("-").repeat(40)),
    );

    // check transfer info 
    const endPointList = network.endPointList.map(e => e);
    const zkAmounts = toTransferMetaAmount(amounts);
    const web3Azeroth = new Web3Azeroth(network);
    let ercApproveTxHash = '';
    let transferMeta: ZkTransferMeta | undefined = undefined;
    let txResultData = {
        blockNumber: 0,
        blockDateTime: (() => { try { return Math.floor(Date.now() / 1000); } catch (e) { return 0; } })(),
        transactionIndex: 0,
        transactionHash: '',
        transactionGasUsed: 0n,
        transactionGasPrice: 0n,
    }

    const {
        requireZkTransfer,
        requireOnlyPublicTransfer,
        requireErcApprove
    } = requiredTransfer(amounts, token);

    if (requireOnlyPublicTransfer) {

        consoleLog("requireOnlyPublicTransfer ...");

        if (token.tokenType === TokenType.NATIVE) {

            try {

                let txResult: SendContractTransactionResult | undefined = undefined;

                try {
                    txResult = await web3Azeroth.sendNativeTokenTransfer({
                        senderEthAddr: wallet.address,
                        receiverEthAddr: receiverAddr,
                        value: zkAmounts.toPublicAmount,
                        senderEthPrivateKey: ethPrivateKey,
                        fetchBlock: true,
                    });
                } catch (error) {
                    console.error("Error @ sendNativeTokenTransaction : ", error);
                    onFail('Internal');
                    return;
                }

                if (txResult?.transactionReceipt === undefined) {
                    console.error("Error @ sendNativeTokenTransaction txResult = ", toJson(txResult, 2));
                    if (txResult?.gasEstimation?.possibleOverShot === true) {
                        onFail('InsufficientBalance')
                    } else {
                        onFail('Internal');
                    }
                    return;
                }

                consoleLog("sendNativeTokenTransaction Success : ",
                    ("\n" + ("-").repeat(40)),
                    "\ntxResult :",
                    ("\n" + ("-").repeat(40)),
                    "\n", toJson(txResult, 2),
                    ("\n" + ("-").repeat(40)),
                    ("\n" + ("-").repeat(40)),
                );

                advanceProgress();

                txResultData.blockNumber = web3NumbersToNumber(txResult.transactionReceipt.blockNumber);
                txResultData.transactionIndex = web3NumbersToNumber(txResult.transactionReceipt.transactionIndex);
                txResultData.transactionHash = txResult.transactionReceipt.transactionHash.toString();
                try { txResultData.transactionGasUsed = web3NumbersToBigInt(txResult.transactionReceipt.gasUsed); } catch (e) { }
                
                try {
                    txResultData.transactionGasPrice =
                        txResult.transactionReceipt.effectiveGasPrice !== undefined
                            ? web3NumbersToBigInt(txResult.transactionReceipt.effectiveGasPrice)
                            : txResult.gasEstimation !== undefined ? txResult.gasEstimation.gasPrice
                                : 0n;
                } catch (e) { }

                if (txResult.transactionBlock !== undefined) {
                    txResultData.blockDateTime = web3NumbersToNumber(txResult.transactionBlock.timestamp);
                }

            } catch (error) {
                console.error("Error @ public only transfer : ", error);
                onFail('Internal');
                return;
            }

        } else if (token.isERC) {

            try {

                let txResult: SendContractTransactionResult | undefined = undefined;

                try {
                    txResult = await sendTransfer(
                        network.uid,
                        network.averageBlockTime,
                        endPointList,
                        token,
                        ethPrivateKey,
                        wallet.address,
                        receiverAddr,
                        amounts.fromPublicAmount);
                } catch (error) {
                    console.error("Error @ sendERCTokenTransaction : ", error);
                    onFail('Internal');
                    return;
                }

                if (txResult?.transactionReceipt === undefined) {
                    console.error("Error @ sendERCTokenTransaction txResult = ", toJson(txResult, 2));

                    if (txResult?.gasEstimation?.possibleOverShot === true) {
                        onFail('InsufficientBalance')
                    } else {
                        onFail('Internal');
                    }

                    return;
                }

                consoleLog("sendERCTokenTransaction Success : ",
                    ("\n" + ("-").repeat(40)),
                    "\ntxResult :",
                    ("\n" + ("-").repeat(40)),
                    "\n", toJson(txResult, 2),
                    ("\n" + ("-").repeat(40)),
                    ("\n" + ("-").repeat(40)),
                );

                advanceProgress();

                txResultData.blockNumber = web3NumbersToNumber(txResult.transactionReceipt.blockNumber);
                txResultData.transactionIndex = web3NumbersToNumber(txResult.transactionReceipt.transactionIndex);
                txResultData.transactionHash = txResult.transactionReceipt.transactionHash.toString();
                try { txResultData.transactionGasUsed = web3NumbersToBigInt(txResult.transactionReceipt.gasUsed); } catch (e) { }
                
                try {
                    txResultData.transactionGasPrice =
                        txResult.transactionReceipt.effectiveGasPrice !== undefined
                            ? web3NumbersToBigInt(txResult.transactionReceipt.effectiveGasPrice)
                            : txResult.gasEstimation !== undefined ? txResult.gasEstimation.gasPrice
                                : 0n;
                } catch (e) { }

                if (txResult.transactionBlock !== undefined) {
                    txResultData.blockDateTime = web3NumbersToNumber(txResult.transactionBlock.timestamp);
                }

            } catch (error) {
                console.error("Error @ public only transfer : ", error);
                onFail('Internal');
                return;
            }
        }

    }

    if (requireZkTransfer) {

        consoleLog("requireZkTransfer ...");

        // send erc approve if needed
        if (requireErcApprove) {

            consoleLog("requireErcApprove ...");

            try {

                const tx = await sendErcApproval(
                    network.uid,
                    network.averageBlockTime,
                    endPointList,
                    token,
                    ethPrivateKey,
                    wallet.address,
                    network.azerothContractAddress,
                    amounts.fromPublicAmount 
                );

                if (tx.transactionReceipt) {
                    ercApproveTxHash = tx.transactionReceipt.transactionHash.toString();
                } else {
                    if (tx?.gasEstimation?.possibleOverShot === true) {
                        console.error("Error @ send ERC approval : InsufficientBalance ", toJson(tx.gasEstimation, 2));
                        onFail('InsufficientBalance');
                        return;
                    } else {
                        console.warn("Error @ send ERC approval ", tx.error);
                        // onFail('Internal');
                        // return;
                    }
                }

                consoleLog("requireErcApprove Success : ",
                    ("\n" + ("-").repeat(40)),
                    "\ntxResult :",
                    ("\n" + ("-").repeat(40)),
                    "\n", toJson(tx, 2),
                    ("\n" + ("-").repeat(40)),
                    ("\n" + ("-").repeat(40)),
                );

            } catch (error) {
                console.error("Error @ send ERC approval ", error);
                onFail('Internal');
                return;
            }
        }

        try {

            let enaIndex = 0;
            consoleDebugExtra(token.tokenName, " Ena Index =", enaIndex);
            const validEnaIndex = (idx: any) => ((idx !== undefined && idx !== null && idx >= 0));

            let enaSCT: sCT;

            const auditorKey_P = web3Azeroth.getAPK();
            const receiverUPK_P = web3Azeroth.getUserPublicKeys(receiverAddr);
            const root_P = web3Azeroth.getRootTop();
            const merklePathIndex = zkAmounts.fromNote ? zkAmounts.fromNote.index : 0n;
            const merklePath_P = web3Azeroth.getMerklePath(merklePathIndex);

            let enaStatusOrEnaLen_P;
            if (validEnaIndex(enaIndex)) {
                consoleDebugExtra(" Get Ena index status ,", enaIndex);
                enaStatusOrEnaLen_P = getEnaIndexStatus(web3Azeroth, userKey.pk.ena, enaIndex as number, userKey.sk);
            } else {
                consoleDebugExtra(" Get Ena length");
                enaStatusOrEnaLen_P = web3Azeroth.getEnaLength(userKey.pk.ena);
            }

            const auditorKeyAP = await auditorKey_P;
            const receiverKey = await receiverUPK_P;
            const root = await root_P;
            const merklePath = await merklePath_P;
            const enaStatusOrEnaLen = await enaStatusOrEnaLen_P;

            if (auditorKeyAP === undefined) {
                console.error("auditorKey === undefined");
                onFail('Internal');
                return;
            }

            if (receiverKey === undefined || (receiverKey && receiverKey.isEmpty())) {
                onFail('ReceiverEnaUnregistered', `Receiver [${receiverAddr.substring(0, 4)}...${receiverAddr.substring(receiverAddr.length - 4)}] Ena Invalid`);
                return;
            }

            if (root === undefined) {
                console.error("root === undefined");
                onFail('Internal');
                return;
            }

            if (merklePath === undefined) {
                console.error("merklePath === undefined , merklePathIndex =", merklePathIndex);
                onFail('Internal');
                return;
            }

            if (validEnaIndex(enaIndex)) {

                const enaStatus = enaStatusOrEnaLen as EnaStatus | undefined;

                consoleDebugExtra(" Get Ena index status =", toJson(enaStatus, 2));

                if (enaStatus === undefined) {
                    console.error("enaStatus === undefined , enaIndex =", enaIndex);
                    onFail('Internal');
                    return;
                }

                if ((token.tokenType === TokenType.NATIVE && enaStatus.contractAddress !== undefined) ||
                    (enaStatus.contractAddress && enaStatus.contractAddress.toLowerCase() !== token.contractAddress.toLowerCase())
                ) {
                    // ena status and localstore index mismatch , fetch all
                    const result = await getAllEnaStatus(
                        userKey,
                        wallet,
                        network,
                    );

                    const ena = result.enaList.find(v => v.token.tokenUid === token.tokenUid);

                    enaSCT = (ena?.enaStatus as EnaStatus).sCT;
                    enaIndex = ena?.enaIndex as number;

                } else {
                    enaSCT = enaStatus.sCT;
                }

            } else {

                const enaLen = enaStatusOrEnaLen as number | undefined;

                consoleDebugExtra(" Get Ena length =", enaLen);

                if (enaLen === undefined) {
                    console.error("enaLen === undefined , enaIndex =", enaIndex);
                    onFail('Internal');
                    return;
                }

                enaSCT = sCT.getEmptySCT();
                enaIndex = enaLen;
            }

            transferMeta = {

                web3Azeroth,

                tokenInfo: {
                    enaIndex: enaIndex as number,
                    tokenAddress: token.contractAddress,
                    tokenId: token.tokenID ? token.tokenID : 0n,
                    tokenType: token.tokenType
                },

                zkWalletKeys: {
                    userKey, //: userKey.pk.ena 
                    auditKey: new AuditKey(auditorKeyAP, 0n),
                    receiverKey: receiverKey as UPK,
                },

                networkKeys: {
                    receiverEOA: receiverAddr,
                    senderEOA: wallet.address,
                    senderPrivateKey: ethPrivateKey,
                },

                amounts: { ...zkAmounts },

                zkWalletFee: zkTxFee,

                sCT: enaSCT,
                root,
                merklePath,
            };

        } catch (error) {
            console.error("Error @ zkTransfer pre-process : ", error);
            onFail('Internal');
            return;
        }

        if (transferMeta === undefined) {
            console.error("Error @ zkTransfer pre-process : transferMeta =", transferMeta);
            onFail('Internal');
            return;
        }

        consoleLog("zkTransfer Pre-process Success : ",
            ("\n" + ("-").repeat(40)),
            "\ntransferMeta :",
            ("\n" + ("-").repeat(40)),
            "\n", toJson({ ...transferMeta, web3Azeroth: undefined }, 2, "hex"),
            ("\n" + ("-").repeat(40)),
            ("\n" + ("-").repeat(40)),
        );

        advanceProgress();

        let txResult: SendContractTransactionResult | undefined = undefined;

        try {
            txResult = await zkTransfer(transferMeta, advanceProgress);
        } catch (error) {
            console.error("Error @ zkTransfer call : ", error);
            onFail('Internal');
            return;
        }

        if (txResult?.transactionReceipt === undefined) {
            console.error("Error @ zkTransfer call txResult = ", toJson(txResult, 2));
            if (txResult?.gasEstimation?.possibleOverShot === true) {
                onFail('InsufficientBalance')
            } else {
                onFail('Internal');
            }
            return;
        }

        consoleLog("zkTransfer Call Success : ",
            ("\n" + ("-").repeat(40)),
            "\ntxResult :",
            ("\n" + ("-").repeat(40)),
            "\n", toJson(txResult, 2),
            ("\n" + ("-").repeat(40)),
            ("\n" + ("-").repeat(40)),
        );

        consoleLog("zkTransfer  : ",
            ("\n" + ("-").repeat(40)),
            "\ntransferMeta (Post zkTransfer) :",
            ("\n" + ("-").repeat(40)),
            "\n", toJson({ ...transferMeta, web3Azeroth: undefined }, 2, "hex"),
            ("\n" + ("-").repeat(40)),
            ("\n" + ("-").repeat(40)),
        );

        advanceProgress();

        txResultData.blockNumber = web3NumbersToNumber(txResult.transactionReceipt.blockNumber);
        txResultData.transactionIndex = web3NumbersToNumber(txResult.transactionReceipt.transactionIndex);
        txResultData.transactionHash = txResult.transactionReceipt.transactionHash.toString();
        try { txResultData.transactionGasUsed = web3NumbersToBigInt(txResult.transactionReceipt.gasUsed); } catch (e) { }
                
        try {
            txResultData.transactionGasPrice =
                txResult.transactionReceipt.effectiveGasPrice !== undefined 
                    ? web3NumbersToBigInt(txResult.transactionReceipt.effectiveGasPrice)
                    : txResult.gasEstimation !== undefined ? txResult.gasEstimation.gasPrice
                        : 0n;
        } catch (e) { }

        if (txResult.transactionBlock !== undefined) {
            txResultData.blockDateTime = web3NumbersToNumber(txResult.transactionBlock.timestamp);
        }

    }
    // TODO: 백엔드 DB 작업 블록 추가
    // TODO: 백엔드 DB 작업 노트 소비
    // update input note isSpent param
}

function toTransferMetaAmount(amounts: TransferAmounts): ITransferMetaAmount {
    return {
        fromPublicAmount: amounts.fromPublicAmount || 0n,
        fromPrivateAmount: amounts.fromPrivateAmount || 0n,
        fromNote: amounts.fromUnSpentNote ? amounts.fromUnSpentNote.note : undefined,
        toPublicAmount: amounts.toPublicAmount || 0n,
        toPrivateAmount: amounts.toPrivateAmount || 0n,
        remainingAmount: amounts.remainingAmount,
    }
}


export function requiredTransfer(amounts: TransferAmounts, token?: Token) {

    const hasFromNote = amounts.fromUnSpentNote !== undefined;

    const requireZkTransfer =
        hasFromNote ||
        (amounts.fromPrivateAmount ? amounts.fromPrivateAmount > 0n : false) ||
        (amounts.toPrivateAmount ? amounts.toPrivateAmount > 0n : false) ||
        (amounts.remainingAmount ? amounts.remainingAmount > 0n : false);

    const requireOnlyPublicTransfer = !requireZkTransfer && (amounts.fromPublicAmount ? amounts.fromPublicAmount > 0n : false);

    const requireErcApprove =
        token ? (
            (token.tokenType !== TokenType.NATIVE) &&
            (amounts.fromPublicAmount ? amounts.fromPublicAmount > 0n : false)
        ) : false;

    return { requireZkTransfer, requireOnlyPublicTransfer, requireErcApprove };
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}