import Web3Azeroth from '../web3-contract';
import {
    Network,
    Wallet,
    ZkEventCache,
    ZkEventCacheModel,
    ZKTransferModel,
    LocalStore,
    AddZkTransferParam,
} from '../../local-storage';
import { toJson, web3NumbersToBigInt, web3NumbersToNumber } from '../../common/utilities';
import Note, { isSpentNote, NoteOwnership } from '../note';
import { findToken } from '../../common/network';
import { ZkTransferEvent } from '../types';
import { ListenerCallback, ListenerId, UpdateSyncManager } from '../../common/data-update-sync';
import { NoteProgressNotification, NoteProgressNotificationUpdateList, ProcessCachedZkEventsControlHandle } from './types';
import { RequestFtn } from '../../web3/types';

export async function initNetworkNoteSync(localStore: LocalStore, network: Network) {

    const { startZkEventBlkNum } = network;

    if (startZkEventBlkNum === undefined || startZkEventBlkNum === null || startZkEventBlkNum === -1) {

        try {
            const web3Azeroth = new Web3Azeroth(network);
            const networkBlockNum = await web3Azeroth.getBlockNumber();
            localStore.getModifier().network.update(network, { startZkEventBlkNum: networkBlockNum });
        } catch (error) {
            consoleLog("web3Azeroth.eth.getBlockNumber() Error", error)
        }
    }

}

export function processCachedZkEvents(
    localStore: LocalStore,
    wallet: Wallet,
    network: Network,
    noteOwnership: NoteOwnership,
    cachedEvents: ZkEventCache[] | undefined,
    zkEvents: ZkTransferEvent[] | undefined,
): {
    controlHandle: ProcessCachedZkEventsControlHandle,
    completeHandle: Promise<AddZkTransferParam>
} {

    consoleLog(
        "process ZkEvents ... :",
        "cachedEvents =", cachedEvents?.length,
        "zkEvents =", zkEvents?.length,
    );

    const userAddress = wallet.address;

    const azerothWeb3 = new Web3Azeroth(network);

    const eventToTransferDataMap: AddZkTransferParam = { network, mapList: [] };

    const eventLen = cachedEvents ? cachedEvents.length : zkEvents ? zkEvents.length : 0;

    let nextIndex = 0;

    const controllerState = { stopController: false };

    const run = async (index: number) => {

        const cachedEvent = cachedEvents ? cachedEvents[index] : undefined;
        const zkEvent = zkEvents ? zkEvents[index] : undefined;
        const event = cachedEvent ? cachedEvent : zkEvent ? zkEvent : undefined;
        const eventData = cachedEvent ? ZkEventCacheModel.getEventData(cachedEvent) : zkEvent ? zkEvent.eventData : undefined;

        if (event === undefined || eventData === undefined) return;// continue;

        const note = await processCachedZkEvent(
            wallet,
            network,
            noteOwnership,
            event,
            eventData
        );

        if (note) {

            note.isSpent = await isSpentNote(azerothWeb3, noteOwnership.privKey, note.commitment);

            // find transaction in local DB
            const localTx = localStore.getZkTransferByTransactionHash(network, event.transactionHash);

            if (localTx) {
                // simply update local record toPrivate note
                consoleCacheProcessingLog("Note transaction exist in local DB : transactionHash", localTx.transactionHash);
                consoleCacheProcessingDebugExtra("Local DB transaction amounts :\n", toJson(ZKTransferModel.getAmounts(localTx), 2));
                const txDBKey = ZKTransferModel.getKey(localTx);
                localStore.getModifier().azeroth.addToPrivateNote(txDBKey, note);
                consoleCacheProcessingDebugExtra("Local DB transaction amounts : (post update)\n", toJson(ZKTransferModel.getAmounts(localTx), 2));
            } else {

                // find and/or update token information in localStore
                const token = await findToken({
                    contractAddress: note.tokenAddress,
                    tokenID: note.tokenId >= 0n ? note.tokenId : undefined,
                    network,
                    localStore
                });

                if (token) {

                    let blockDateTime = 0;
                    try {
                        const requestFtn : RequestFtn<any> = (web3) => web3.eth.getBlock(event.blockNumber);
                        const ethBlock = await azerothWeb3.endPointRetryBlock(requestFtn, 'getBlock');
                        blockDateTime = web3NumbersToNumber(ethBlock.timestamp);
                    } catch (error) {
                        console.error("Error @ processCachedZkEvents :: eth.getBlock : ", error);
                    }

                    let from = "";
                    let gasFee = 0n;
                    try {
                        const requestFtn : RequestFtn<any> = (web3) => web3.eth.getTransaction(event.transactionHash);
                        const ethTx = await azerothWeb3.endPointRetryBlock(requestFtn, 'getTransaction');
                        from = ethTx.from;

                        try {
                            const gasUsed = web3NumbersToBigInt(ethTx.gas);
                            const effectiveGasPrice = web3NumbersToBigInt(ethTx.gasPrice)
                            gasFee = gasUsed * effectiveGasPrice;
                        } catch (error) { }

                    } catch (error) {
                        console.error("Error @ processCachedZkEvents :: eth.getTransaction : ", error);
                    }

                    eventToTransferDataMap.mapList.push({

                        token,

                        cachedEventToRemove: cachedEvent,

                        transfer: {
                            blockNumber: event.blockNumber,
                            blockDateTime,
                            transactionIndex: event.transactionIndex,
                            transactionHash: event.transactionHash,
                            from: from,
                            to: userAddress,
                            amounts: {
                                toPrivate: { amount: note.amount, note },
                                gasFee,
                            },
                            ercApproveTxHash: '',
                        }
                    });

                }
            }
        }
    }

    const P = new Promise<AddZkTransferParam>((resolve, reject) => {

        const reSchedule = async () => {
            setTimeout(() => { reRun(); }, 100);
        }

        const reRun = async () => {
            try { await run(nextIndex); } catch (_) { }
            nextIndex = nextIndex + 1;
            if (controllerState.stopController === true) {
                consoleLog("process ZkEvents ... stopped ");
                resolve({ network, mapList: [] });
            } else if (nextIndex < eventLen) {
                reSchedule();
            } else {
                consoleLog("process ZkEvents ... done ");
                resolve(eventToTransferDataMap);
            }
        }

        reRun();
    })

    const controlHandle = {

        stop: () => {
            consoleLog("stop processCachedZkEvents requested , current controllerState", controllerState);
            controllerState.stopController = true;
        },

        progress: () => {
            return {
                index: nextIndex,
                total: eventLen,
            };
        }
    }

    return {
        controlHandle,
        completeHandle: P,
    };
}

export async function processCachedZkEvent(
    wallet: Wallet,
    network: Network,
    noteOwnership: NoteOwnership,
    event: ZkEventCache | ZkTransferEvent,
    eventData: any,
): Promise<Note | undefined> {

    consoleCacheProcessingDebug(
        "process event : ",
        "for eoa =", wallet.address,
        " event-block-num =", event.blockNumber,
        " event-block-index =", event.transactionIndex
    );

    consoleCacheProcessingDebug('logZkTransfer :', toJson(eventData, 2));

    const isOwner = noteOwnership.isOwner(eventData.ct, eventData.com);

    if (isOwner !== undefined) {

        const note = isOwner.getNote(eventData.numLeaves);

        consoleCacheProcessingLog(
            "process event : ",
            "for wallet =", wallet.address,
            ", on network =", network.networkName,
            ", event-block-num =", event.blockNumber,
            ", event-block-index =", event.transactionIndex,
            " : is wallet note",
            ", token = [", note.tokenAddress, note.tokenId.toString(10), "]",
            ", amount =", note.amount.toString(10),
        );

        return note;

    } else {

        consoleCacheProcessingDebugExtra(
            "process event : ",
            "for eoa =", wallet.address,
            ", event-block-num =", event.blockNumber,
            ", event-block-num =", event.transactionIndex,
            " : is not wallet note"
        );

        return undefined;
    }
}


//
//  Background Note Scan Progress Update Sync
//

let noteSyncMgr: UpdateSyncManager<NoteProgressNotification>;

function noteSyncCompare(prev: NoteProgressNotification, update: NoteProgressNotification): boolean {
    return false;
}

export function initNoteProgressSyncMgr() {
    if (!noteSyncMgr) {
        noteSyncMgr = new UpdateSyncManager<NoteProgressNotification>(noteSyncCompare)
    }
}

export function addNoteProgressListener(
    key: string,
    callback: ListenerCallback<NoteProgressNotification>
) {
    return noteSyncMgr.addListerner(key, callback)
}

export function removeNoteProgressListener(listenerId: ListenerId) {
    noteSyncMgr.removeListerner(listenerId);
}

export function updateNoteProgress(list: NoteProgressNotificationUpdateList) {
    noteSyncMgr.updateData(list);
}

let NoteSynclogCallBack: ((log: string) => void) | undefined = undefined;

export function SetNoteSyncLogCallBack(callBack: (log: string) => void) {
    NoteSynclogCallBack = callBack;
}
export function ClearNoteSyncLogCallBack() {
    NoteSynclogCallBack = undefined;
}

export function noteSynclog(syncDirection: string, logObj: any): void {
    // console.log(`NoteSyncLog:${syncDirection},${toJson(logObj, 2)}`);
    if (NoteSynclogCallBack !== undefined) {
        NoteSynclogCallBack(`NoteSyncLog::${syncDirection},\n${toJson(logObj, 2)}`);
    }
}

export function noteSynclogError(syncDirection: string, errorLogObj: any): void {
    // console.warn(`NoteSyncErrorLog:${syncDirection},${toJson(errorLogObj, 2)}`);
    if (NoteSynclogCallBack !== undefined) {
        NoteSynclogCallBack(`NoteSyncErrorLog::${syncDirection},\n${toJson(errorLogObj, 2)}`);
    }
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCacheProcessingLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCacheProcessingDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCacheProcessingDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}
