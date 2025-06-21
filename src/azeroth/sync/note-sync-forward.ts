import _ from 'lodash';
import Web3Azeroth from '../web3-contract';
import {
    ZKTransferModel,
    LocalStore,
    ZkCachingUpdateData,
} from '../../local-storage';
import utilities, { toJson   } from '../../common/utilities';
import { NoteOwnership } from '../note';
import { getUserKey } from '../wallet';
import { AppProfileWalletNetworkModels } from '../../common/types';
import {
    FORWARD_SYNC_LISTENER_KEY,
    NoteProgressNotification,
    ForwardRunState as RunState,
    ForwardBGNoteSyncState
} from './types';
import {
    initNetworkNoteSync,
    initNoteProgressSyncMgr,
    noteSynclog,
    processCachedZkEvents,
    updateNoteProgress
} from './note-sync'; 
import { syncPublicTransfers } from './public-transfer-sync';

const ReRunCountDown = 5 * 60;
const ReRunCallBackInterval = 1 * 1000;
const CleanUpCountDown = 10;

let runningNoteSync: ForwardBGNoteSync | undefined = undefined;

export class ForwardBGNoteSync {

    private isRunning: boolean;
    private state!: ForwardBGNoteSyncState;

    private constructor(
        localStore: LocalStore,
        secretsDecryptionKey: string
    ) {
        this.isRunning = false;
        this.state = {
            localStore: localStore,
            secretsDecryptionKey: secretsDecryptionKey,
            reRunCountDown: ReRunCountDown,
            cleanUpCountDown: CleanUpCountDown,
            fastForwardRegistered: false,
            runState: undefined,
            appProfile: undefined,
        };
    }

    static Init(localStore: LocalStore, secretsDecryptionKey: string) {
        if (runningNoteSync === undefined) {
            runningNoteSync = new ForwardBGNoteSync(localStore, secretsDecryptionKey);
        }

        initNoteProgressSyncMgr();

        return runningNoteSync;
    }

    static Get() {
        return runningNoteSync;
    }

    start(profile: AppProfileWalletNetworkModels) {

        consoleLog("Begin forward note scan : profile = [", profile.network.networkName, profile.wallet.address, "]");

        initNetworkNoteSync(this.state.localStore, profile.network);

        this.state.appProfile = { ...profile };

        if (this.isRunning) return;

        this.isRunning = true;
        setTimeout(() => eventsCachingRun(this.state), ReRunCallBackInterval);
    }

    fastForward() {
        consoleFastForwardCallLog(
            "fastForward ... : ForwardState =",
            toJson(_.pick(this, ['reRunCountDown', 'cleanUpCountDown', 'fastForwardRegistered']), 2)
        );
        this.state.fastForwardRegistered = true;
    }
};

async function eventsCachingRun(forwardState: ForwardBGNoteSyncState) {

    if (forwardState.fastForwardRegistered === true) {
        consoleFastForwardCallLog("handle fastForward : ForwardState =",
            toJson(_.pick(forwardState, ['reRunCountDown', 'cleanUpCountDown', 'fastForwardRegistered']), 2)
        );
        forwardState.reRunCountDown = 0;
    }

    if (forwardState.reRunCountDown <= 0) {

        if (forwardState.appProfile === undefined) {
            reSchedule(forwardState);
            return;
        }

        const { secretsDecryptionKey, localStore } = forwardState;
        const { wallet, network } = { ...forwardState.appProfile };

        if (!(forwardState.runState &&
            forwardState.runState.network.uid === network.uid &&
            forwardState.runState.wallet.address === wallet.address
        )) {

            try {
                const userKey = await getUserKey(wallet, secretsDecryptionKey);
                forwardState.runState = {
                    network,
                    wallet,
                    noteOwnership: new NoteOwnership(userKey.sk),
                    scanRange: { fromBlock: 0, toBlock: 0 }
                };
            } catch (e) {
                reSchedule(forwardState);
                return;
            }
        }

        let networkBlockNum = 0
        try {
            const web3Azeroth = new Web3Azeroth(network);
            networkBlockNum = await web3Azeroth.getBlockNumber();
        } catch (error) {
            consoleCachingLog("web3Azeroth.eth.getBlockNumber() Error", error)
            reSchedule(forwardState);
            return;
        }

        let { latestZkEventBlkNum, startZkEventBlkNum } = network;
        let fromBlock;
        if (latestZkEventBlkNum === null || latestZkEventBlkNum === undefined) {
            fromBlock = startZkEventBlkNum as number;
        } else if (latestZkEventBlkNum > networkBlockNum) {
            noteSynclog("Forward", `No new blocks : ${network.networkName}, ${latestZkEventBlkNum} ~~ ${networkBlockNum}`);
            reSchedule(forwardState);
            return;
        } else {
            fromBlock = latestZkEventBlkNum + 1;
        }

        forwardState.runState.scanRange = { fromBlock, toBlock: networkBlockNum };

        const data: NoteProgressNotification = {
            isRunning: true,
            totalBlocks: (forwardState.runState.scanRange.toBlock - forwardState.runState.scanRange.fromBlock) + 1,
            totalScanned: 0,
            scanRange: { ...forwardState.runState.scanRange },
        };
        updateNoteProgress([{ key: FORWARD_SYNC_LISTENER_KEY, data }]);

        noteSynclog("Forward", `Forward note sync run : profile = [${network.networkName}, ${wallet.address.substring(0, 10)}] , range = [${forwardState.runState.scanRange.fromBlock} ~~ ${forwardState.runState.scanRange.toBlock}] , total blocks = ${data.totalBlocks}`);

        Run(forwardState);

    } else {
        forwardState.reRunCountDown = forwardState.reRunCountDown - 1;
        setTimeout(() => eventsCachingRun(forwardState), ReRunCallBackInterval);
    }
}

async function Run(forwardState: ForwardBGNoteSyncState) {

    const { localStore } = forwardState;
    const runState = forwardState.runState;

    if (runState === undefined) {
        reSchedule(forwardState);
        sendStopSync();
        return;
    }

    const { network, wallet } = runState;

    eventsCaching(
        forwardState
    ).then((eventsCachingResult) => {

        consoleLog("eventsCaching ... Success : ", eventsCachingResult);

        const { enaExist } = localStore.getWNMeta(wallet, network);
        consoleLog("enaExist =", enaExist);
        if (enaExist !== true) {
            reSchedule(forwardState);
            sendStopSync();
            return;
        }

        eventsProcessing(
            forwardState
        ).then(() => {

            consoleLog("eventsProcessing ... Success");

            eventsCleanup(
                forwardState
            ).then(() => {
                consoleLog("eventsCleanup ... Success");
            }).catch((e) => {
                consoleLog("eventsCleanup ... Error:", e);
            }).finally(() => {
                consoleLog("eventsCleanup ... Done");
                reSchedule(forwardState);
                sendStopSync();
            });

        }).catch((e) => {
            consoleLog("eventsProcessing ... Error:", e);
            reSchedule(forwardState);
            sendStopSync();
        }).finally(() => {
            consoleLog("eventsProcessing ... Done");
        });


    }).catch((e) => {
        consoleLog("eventsCaching ... Error:", e);
        reSchedule(forwardState);
        sendStopSync();
    }).finally(() => {
        consoleLog("eventsCaching ... Done");
    });
}

function reSchedule(forwardState: ForwardBGNoteSyncState) {
    forwardState.fastForwardRegistered = false;
    forwardState.reRunCountDown = ReRunCountDown;
    setTimeout(() => eventsCachingRun(forwardState), ReRunCallBackInterval);
}

const sendStopSync = () => {
    const data: NoteProgressNotification = {
        isRunning: false,
        totalBlocks: 0,
        totalScanned: 0,
        scanRange: { fromBlock: 0, toBlock: 0 },
    };
    updateNoteProgress([{ key: FORWARD_SYNC_LISTENER_KEY, data }]);
}

async function eventsCaching(forwardState: ForwardBGNoteSyncState): Promise<{ fromBlock: number, toBlock: number } | undefined> {

    const { localStore } = forwardState;
    const runState = forwardState.runState as RunState;
    const { network, scanRange } = runState;
    const modifier = localStore.getModifier();
    const web3Azeroth = new Web3Azeroth(network);

    async function fetch(cacheOption: { fromBlock: number, toBlock: number }) {
        const fromBlock = forwardState.runState?.scanRange.fromBlock ?? 0;
        const toBlock = forwardState.runState?.scanRange.toBlock ?? 0;
        
        //
        //  Fetch and save all Wallets public transactions
        //  from remote indexer or node  
        //
        syncPublicTransfers(
            localStore,
            network,
            fromBlock,
            toBlock,
            web3Azeroth
        );

        let events;
        try {
            events = await web3Azeroth.getZkTransferEvents(cacheOption);
        } catch (error) {
            consoleCachingLog("Error @ backgroundZkEventCaching::eventsCaching , fetch events error ", error);
            return;
        }

        consoleCachingDebug(
            "Background ZkEvent Caching ... :",
            "Events =", events.length,
            ", fromBlock = " + cacheOption.fromBlock.toString(),
            ", toBlock = " + cacheOption.toBlock.toString(),
            ", blks = " + (((cacheOption.toBlock) - (cacheOption.fromBlock)) + 1).toString()
        );

        try {

            const localStoreWriteData: ZkCachingUpdateData = {
                latestZkEventBlkNum: cacheOption.toBlock,
                eventCacheList: events.map((e) => ({
                    ...e,
                    networkUid: network.uid,
                })),
            };

            const dbList = modifier.azeroth.addZkEventCache(network, localStoreWriteData);
            consoleCachingDebugExtra("addZkEventCache : dbList.length =", dbList.length);

            return { ...cacheOption };

        } catch (error) {
            consoleCachingLog("Error @ backgroundZkEventCaching::eventsCaching , update cache DB error ", error);
            return;
        }

    }

    consoleCachingDebug(toJson({ scanRange }, 2));

    let fromBlock = scanRange.fromBlock;
    let toBlock = scanRange.fromBlock;
    const scannedRange = { fromBlock, toBlock };

    while (toBlock <= scanRange.toBlock) {

        const cacheOption = await fetch({
            fromBlock: toBlock,
            toBlock: Math.min(toBlock + 1000, scanRange.toBlock)
        });

        if (cacheOption === undefined) { break; }

        scannedRange.toBlock = cacheOption.toBlock;
        toBlock = cacheOption.toBlock + 1;
    }

    return { ...scannedRange };
}


async function eventsProcessing(forwardState: ForwardBGNoteSyncState) {

    const { localStore } = forwardState;
    const { network, wallet, noteOwnership } = forwardState.runState as RunState;
    const modifier = localStore.getModifier();
    const netStartZkEventBlkNum = network.startZkEventBlkNum;
    const netLatestZkEventBlkNum = network.latestZkEventBlkNum;
    let { latestZkEventBlkNum } = localStore.getWNMeta(wallet, network);

    consoleCacheProcessingDebug(toJson({
        netStartZkEventBlkNum,
        netLatestZkEventBlkNum,
        latestZkEventBlkNum
    }, 2));

    if (netStartZkEventBlkNum === null ||
        netStartZkEventBlkNum === undefined ||
        netLatestZkEventBlkNum === null ||
        netLatestZkEventBlkNum === undefined
    ) { return; }

    if (latestZkEventBlkNum === null || latestZkEventBlkNum === undefined) {
        consoleCacheProcessingLog(`Background ZkEvent Processing ... :  ** First Run For ${network.networkName} **`);
        consoleCacheProcessingLog(`Background ZkEvent Processing ... :  network::startZkEventBlkNum ${netStartZkEventBlkNum}`);
        latestZkEventBlkNum = netStartZkEventBlkNum;
    } else if (latestZkEventBlkNum > netLatestZkEventBlkNum) {
        // ensure block number to process does not exceed where network caching has reached
        consoleCacheProcessingDebug("Background ZkEvent Processing ... : ** No New Events ** ");
        return;
    }

    let cachedEvents;
    try {
        cachedEvents = localStore.getZkEvents(network, { blocksAfter: latestZkEventBlkNum - 1 }).map(e => e);
    } catch (error) {
        console.error("Error @ backgroundZkEventCaching::eventsProcessing , db fetch cache events error ", error);
    }

    consoleCacheProcessingDebug(
        "Background ZkEvent Processing ... :",
        "Events =", cachedEvents ? cachedEvents.length : undefined,
        ", latestZkEventBlkNum =", latestZkEventBlkNum,
    );

    if (cachedEvents && cachedEvents.length) {

        let eventToTransferDataMap;
        try {
            const handle = processCachedZkEvents(
                localStore,
                wallet,
                network,
                noteOwnership,
                cachedEvents,
                undefined
            );
            eventToTransferDataMap = await handle.completeHandle;
        } catch (error) {
            console.error("Error @ backgroundZkEventCaching::eventsProcessing , process cache events error ", error);
        }

        let latestZkEventBlkNumUpdate;
        if (eventToTransferDataMap) {
            latestZkEventBlkNumUpdate = cachedEvents[0].blockNumber + 1;
        }

        try {
            if (eventToTransferDataMap && eventToTransferDataMap.mapList.length) {
                const dbList = modifier.azeroth.addZkTransfer(eventToTransferDataMap);
                consoleLog(
                    "zkEvent -->> zkTransfer :",
                    dbList.map(
                        tx => {
                            const token = localStore.findToken(tx.tokenUid);
                            const amounts = ZKTransferModel.getAmounts(tx);
                            const amtStr = utilities.getAmountDisplayString(amounts.toPrivate?.amount || 0n, token?.decimal);
                            return `\n|    -   blk=${tx.blockNumber} , txIdx=${tx.transactionIndex} , amt=${amtStr} ${token?.tokenSymbol} , spent=${amounts.toPrivate?.note?.isSpent}`;
                        }
                    ).join()
                );
            }
        } catch (error) {
            console.error("Error @ backgroundZkEventCaching::eventsProcessing , move cache events --> zktransfer error ", error);
        }

        if (latestZkEventBlkNumUpdate !== undefined) {
            modifier.updateWNMeta(wallet, network, { latestZkEventBlkNum: latestZkEventBlkNumUpdate });
        }
    }

    modifier.updateWNMeta(wallet, network, { latestZkEventBlkNum: netLatestZkEventBlkNum + 1 });
}


async function eventsCleanup(forwardState: ForwardBGNoteSyncState) {
    const { localStore } = forwardState;
    const { network } = forwardState.runState as RunState;

    if (forwardState.cleanUpCountDown <= 0) {

        consoleCleanupLog("eventsCleanup ...");

        forwardState.cleanUpCountDown = CleanUpCountDown;

        let blockNum = network.latestZkEventBlkNum;

        if (blockNum === undefined || blockNum === null) { return }

        const allWallets = localStore.getWallets(true);

        for (const wallet of allWallets) {
            const latestZkEventBlkNum = localStore.getWNMeta(wallet, network).latestZkEventBlkNum;

            consoleCleanupLog("eventsCleanup ... ", wallet.address, latestZkEventBlkNum);

            if (latestZkEventBlkNum === undefined || latestZkEventBlkNum === null) {
                blockNum = undefined;
                break;
            } else {
                blockNum = latestZkEventBlkNum < blockNum ? latestZkEventBlkNum : blockNum;
            }
        }

        if (blockNum !== undefined) {
            consoleCleanupLog("eventsCleanup ... clean all event before block =", blockNum);
            const eventsToClean = localStore.getZkEvents(network, { blockNum: 0, blockNumOrBefore: blockNum });
            consoleCleanupLog("eventsCleanup ... clean all event count =", eventsToClean.length);
            localStore.getModifier().azeroth.cleanZkEventCache(eventsToClean);
        }

    } else {
        forwardState.cleanUpCountDown = forwardState.cleanUpCountDown - 1;
    }
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleFastForwardCallLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCachingLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCachingDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleCachingDebugExtra(message?: any, ...optionalParams: any[]): void {
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

function consoleCleanupLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}