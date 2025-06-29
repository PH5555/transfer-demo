import Web3Azeroth from './web3-contract';
import { getZkTransferFee } from './transfer';
import Note, { NoteError, isSpentNote } from './note';
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
}