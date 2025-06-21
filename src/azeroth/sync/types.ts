import _ from 'lodash';
import {
    Network,
    Wallet,
    LocalStore,
} from '../../local-storage';
import { NoteOwnership } from '../note';
import { AppProfileWalletNetworkModels } from '../../common/types';

export type ForwardRunState = {
    network: Network;
    wallet: Wallet;
    noteOwnership: NoteOwnership;
    scanRange: { fromBlock: number, toBlock: number },
}

export type ForwardBGNoteSyncState = {
    localStore: LocalStore;
    secretsDecryptionKey: string;
    reRunCountDown: number;
    cleanUpCountDown: number;
    fastForwardRegistered: boolean;
    runState: ForwardRunState | undefined;
    appProfile: AppProfileWalletNetworkModels | undefined;
};

export type BackwardNoteSyncRunProfile = {
    network: Network;
    wallet: Wallet;
    noteOwnership: NoteOwnership;
    scanRange: { fromBlock: number, toBlock: number },
    stopControlHandle: boolean,
    scannedBlocks: number,
    totalScanBlocks: number,
    processCachedZkEventsControlHandle?: ProcessCachedZkEventsControlHandle
}

export type BackwardNoteSyncState = {
    isRunning: boolean;
    localStore: LocalStore;
    secretsDecryptionKey: string;
    runProfile: BackwardNoteSyncRunProfile | undefined;
};

export type BackwardBGNoteSyncProgress = {
    scanned: number;
    total: number;
};

export const FORWARD_SYNC_LISTENER_KEY = 'FORWARD';

export const BACKWARD_SYNC_LISTENER_KEY = 'BACKWARD';

export type NoteProgressNotification = {
    isRunning: boolean,
    totalBlocks: number,
    totalScanned: number,
    scanRange: { fromBlock: number, toBlock: number },
}

export type NoteProgressNotificationUpdateList = { key: string, data: NoteProgressNotification }[];

export type ProcessCachedZkEventsControlHandle = {
    stop: () => void,
    progress: () => { index: number, total: number }
};