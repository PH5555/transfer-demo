import _ from 'lodash';
import Web3Azeroth from '../web3-contract';
import {
    ZKTransferModel,
    LocalStore,
} from '../../local-storage';
import utilities, { } from '../../common/utilities';
import { NoteOwnership } from '../note';
import { getUserKey } from '../wallet';
import { AppProfileWalletNetworkModels } from '../../common/types';
import {
    BACKWARD_SYNC_LISTENER_KEY,
    NoteProgressNotification,
    BackwardNoteSyncRunProfile as RunProfile,
    BackwardNoteSyncState as NoteSyncState,
    BackwardBGNoteSyncProgress,
} from './types';
import {
    initNetworkNoteSync,
    initNoteProgressSyncMgr,
    noteSynclog,
    processCachedZkEvents, 
    updateNoteProgress
} from './note-sync';
import { ZkTransferEvent } from '../types';


const ReRunCallBackInterval = 1000 * 0.5;
const BlocksPerFetch = 1000;

let runningNoteSync: BackwardBGNoteSync | undefined = undefined;

export class BackwardBGNoteSync {

    private state!: NoteSyncState;

    private constructor(
        localStore: LocalStore,
        secretsDecryptionKey: string
    ) {
        this.state = {
            isRunning: false,
            localStore: localStore,
            secretsDecryptionKey: secretsDecryptionKey,
            runProfile: undefined,
        };
    }

    static Init(localStore: LocalStore, secretsDecryptionKey: string) {
        if (runningNoteSync === undefined) {
            runningNoteSync = new BackwardBGNoteSync(localStore, secretsDecryptionKey);
        }

        initNoteProgressSyncMgr();

        return runningNoteSync;
    }

    static Get() {
        return runningNoteSync;
    }

    async start(profile: AppProfileWalletNetworkModels, nDays: number) {

        const { wallet, network } = profile;
        const { runProfile, secretsDecryptionKey } = this.state;

        const sameRunProfile = runProfile !== undefined &&
            runProfile.network.uid === network.uid &&
            runProfile.wallet.address === wallet.address;

        // ignore request if existing scan process is for the same profile
        if (this.state.isRunning && sameRunProfile) return;

        // if requested scan for new profile
        // stop existing scan process
        if (this.state.isRunning && !sameRunProfile) {
            await this.stop();
        }

        initNetworkNoteSync(this.state.localStore, network);

        let toBlock = this.state.localStore.getWNMeta(wallet, network)?.earliestZkEventBlkNum;
        if (toBlock === undefined || toBlock === null || toBlock === -1) {
            toBlock = network.startZkEventBlkNum as number;
            this.state.localStore.getModifier().updateWNMeta(wallet, network, { earliestZkEventBlkNum: toBlock });
        }


        const blocksPerScan = network.averageBlockTime >= 1 ?
            (60 * 60 * 24 * (nDays >= 1 ? nDays : 1)) / (network.averageBlockTime >= 1 ? network.averageBlockTime : 1) :
            /* kind of dev node, scanning 100 blocks */ 50;
        const fromBlock = toBlock - blocksPerScan;
        const totalScanBlocks = blocksPerScan;

        if (!sameRunProfile || runProfile === undefined) {
            try {
                const userKey = await getUserKey(wallet, secretsDecryptionKey);
                this.state.runProfile = {
                    network,
                    wallet,
                    noteOwnership: new NoteOwnership(userKey.sk),
                    scanRange: { fromBlock, toBlock },
                    stopControlHandle: false,
                    scannedBlocks: 0,
                    totalScanBlocks: 0,
                };
            } catch (e) {
                return;
            }
        } else {
            runProfile.scanRange = { fromBlock, toBlock };
        }

        if (this.state.runProfile === undefined) return;

        noteSynclog("Backward", `Begin note scan : profile = [${network.networkName}, ${wallet.address.substring(0, 10)}] , number of days = ${nDays} , total blocks = ${totalScanBlocks} [${fromBlock} ~~~ ${toBlock}]`);

        this.state.isRunning = true;
        this.state.runProfile.stopControlHandle = false;
        this.state.runProfile.scannedBlocks = 0;
        this.state.runProfile.totalScanBlocks = totalScanBlocks;
        this.state.runProfile.processCachedZkEventsControlHandle = undefined;
        setTimeout(() => eventsScan(this.state), ReRunCallBackInterval);

        const data: NoteProgressNotification = {
            isRunning: true,
            totalBlocks: this.state.runProfile?.totalScanBlocks || 0,
            totalScanned: this.state.runProfile?.scannedBlocks || 0,
            scanRange: this.state.runProfile ? { ...this.state.runProfile.scanRange } : { fromBlock: 0, toBlock: 0 },
        };
        updateNoteProgress([{ key: BACKWARD_SYNC_LISTENER_KEY, data }]);

    }

    isRunning() { return this.state.isRunning; }

    async stop() {
        consoleLog("Stop requested");
        if (this.state.runProfile !== undefined) {
            this.state.runProfile.stopControlHandle = true;
            if (this.state.runProfile.processCachedZkEventsControlHandle) {
                consoleLog("send stop requested to processCachedZkEvents");
                this.state.runProfile.processCachedZkEventsControlHandle.stop();
            }
        }
        sendStopSync(this.state);
    }

    progress(): BackwardBGNoteSyncProgress {
        if (this.state.isRunning === true) {
            return {
                scanned: this.state.runProfile?.scannedBlocks || 0,
                total: this.state.runProfile?.totalScanBlocks || 0
            }
        } else {
            return {
                scanned: 0, total: 0
            }
        }
    }

    profile(): AppProfileWalletNetworkModels | undefined {
        return this.state.runProfile ?
            { wallet: this.state.runProfile.wallet, network: this.state.runProfile.network } :
            undefined;
    }
};


async function eventsScan(state: NoteSyncState) {

    const { localStore } = state;
    const { network, wallet, scanRange } = state.runProfile as RunProfile;

    const { enaExist } = localStore.getWNMeta(wallet, network);
    consoleDebug("enaExist =", enaExist);
    if (enaExist !== true) {
        sendStopSync(state);
        return;
    }

    if (state.runProfile?.stopControlHandle === true) {
        sendStopSync(state);
        return;
    }

    fetchEvents(
        state
    ).then(({ cacheOption, events }) => {

        consoleLog("fetchEvents Success , cacheOption =", cacheOption, " events =", events.length);

        if (state.runProfile?.stopControlHandle === true) {
            consoleLog("sync stopped ");
            sendStopSync(state);
            return;
        }

        eventsProcessing(
            state, events
        ).then(() => {

            if (state.runProfile?.stopControlHandle === true) {
                consoleLog("sync stopped ");
                sendStopSync(state);
                return;
            }

            try {
                localStore.getModifier().updateWNMeta(wallet, network, { earliestZkEventBlkNum: cacheOption.fromBlock });
            } catch (error) { }

            if (state.runProfile) {
                state.runProfile.scannedBlocks = state.runProfile.scannedBlocks + (cacheOption.toBlock - cacheOption.fromBlock) + 1;
            }

            consoleLog(`eventsProcessing ... Success : ${state.runProfile?.scannedBlocks} of ${state.runProfile?.totalScanBlocks} blocks scanned`);

            {
                const data: NoteProgressNotification = {
                    isRunning: true,
                    totalBlocks: state.runProfile?.totalScanBlocks || 0,
                    totalScanned: state.runProfile?.scannedBlocks || 0,
                    scanRange: state.runProfile ? { ...state.runProfile.scanRange } : { fromBlock: 0, toBlock: 0 },
                };
                updateNoteProgress([{ key: BACKWARD_SYNC_LISTENER_KEY, data }]);
            }

            if (cacheOption.fromBlock > scanRange.fromBlock) {
                reSchedule(state);
            } else {
                consoleLog("Completed note scan : profile = [", network.networkName, wallet.address, "] , last block = ", scanRange.fromBlock, "\n");
                sendStopSync(state);
            }

        }).catch((e) => {
            consoleDebug("eventsProcessing ... Error:", e);
            sendStopSync(state);
        });

    }).catch((e) => {
        consoleDebug("eventsCaching ... Error:", e);
        sendStopSync(state);
    });
}


function reSchedule(state: NoteSyncState) {
    setTimeout(() => eventsScan(state), ReRunCallBackInterval);
}

function sendStopSync(state: NoteSyncState) {
    state.isRunning = false;
    const data: NoteProgressNotification = {
        isRunning: false,
        totalBlocks: 0,
        totalScanned: 0,
        scanRange: { fromBlock: 0, toBlock: 0 },
    };
    updateNoteProgress([{ key: BACKWARD_SYNC_LISTENER_KEY, data }]);
}

async function fetchEvents(state: NoteSyncState) {

    const { localStore } = state;
    const { wallet, network } = state.runProfile as RunProfile;
    const web3Azeroth = new Web3Azeroth(network);
    const contractDeployBlkNum = 1;

    let currentToBlock = localStore.getWNMeta(wallet, network).earliestZkEventBlkNum as number;

    const cacheOption = {
        fromBlock: Math.max(currentToBlock - (Math.min(BlocksPerFetch, (state.runProfile?.totalScanBlocks || BlocksPerFetch))), contractDeployBlkNum),
        toBlock: Math.max(currentToBlock - 1, contractDeployBlkNum),
    }

    let events: ZkTransferEvent[] = [];
    try {
        events = await web3Azeroth.getZkTransferEvents(cacheOption);
    } catch (error) {
        consoleLogError("Error @ backgroundZkEventCaching::eventsCaching , fetch events error ", error);
        return { cacheOption, events };
    }

    consoleDebug(
        "Background ZkEvent Caching ... :",
        "Events =", events.length,
        ", fromBlock = " + cacheOption.fromBlock.toString(),
        ", toBlock = " + cacheOption.toBlock.toString(),
        ", blks = " + (((cacheOption.toBlock) - (cacheOption.fromBlock)) + 1).toString()
    );

    return { cacheOption, events };
}


async function eventsProcessing(state: NoteSyncState, events: ZkTransferEvent[]) {

    const { localStore } = state;
    const { network, wallet, noteOwnership } = state.runProfile as RunProfile;
    const modifier = localStore.getModifier();

    if (events.length) {

        let eventToTransferDataMap;
        try {
            const handle = processCachedZkEvents(
                localStore,
                wallet,
                network,
                noteOwnership,
                undefined,
                events,
            );
            if (state.runProfile) state.runProfile.processCachedZkEventsControlHandle = handle.controlHandle;
            eventToTransferDataMap = await handle.completeHandle;
            if (state.runProfile) state.runProfile.processCachedZkEventsControlHandle = undefined;
        } catch (error) {
            console.error("Error @ backgroundZkEventCaching::eventsProcessing , process cache events error ", error);
            throw error;
        } finally {
            if (state.runProfile) state.runProfile.processCachedZkEventsControlHandle = undefined;
        }

        if (eventToTransferDataMap && eventToTransferDataMap.mapList.length) {
            try {
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
            } catch (error) {
                console.error("Error @ backgroundZkEventCaching::eventsProcessing , move cache events --> zktransfer error ", error);
                throw error;
            }
        }
    }
}


function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleLogError(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}