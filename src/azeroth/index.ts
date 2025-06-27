import Web3Azeroth from './web3-contract';
import { getZkTransferFee } from './transfer';
import Note, { NoteError, isSpentNote } from './note';
import {
    BACKWARD_SYNC_LISTENER_KEY,
    FORWARD_SYNC_LISTENER_KEY
} from './sync/types';
import {
    ClearNoteSyncLogCallBack,
    SetNoteSyncLogCallBack,
    addNoteProgressListener,
    removeNoteProgressListener
} from './sync/note-sync';
import { ForwardBGNoteSync } from './sync/note-sync-forward';
import { BackwardBGNoteSync } from './sync/note-sync-backward';
import {
    checkEnaExist,
    getAPK,
    getRegisterEnaGasFee,
    registerEna,
    getAllEnaStatus
} from './ena-status';

export default {
    Web3Azeroth: Web3Azeroth,
    getZkTransferFee,
    getRegisterEnaGasFee,
    checkEnaExist,
    registerEna,
    getAllEnaStatus,
    getAPK,
    Note,
    NoteError,
    isSpentNote,
    ForwardBGNoteSync,
    BackwardBGNoteSync,
    ClearNoteSyncLogCallBack,
    SetNoteSyncLogCallBack,
    addNoteProgressListener,
    removeNoteProgressListener,
    BACKWARD_SYNC_LISTENER_KEY,
    FORWARD_SYNC_LISTENER_KEY,
}

export type {
    BackwardBGNoteSyncProgress,
    NoteProgressNotification
} from './sync/types';