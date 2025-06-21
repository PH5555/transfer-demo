import Config from 'react-native-config';
import { AuditKey, UPK, UserKey } from './keys';
import { Token, TokenType, TokenUniqueID } from '../web3/types';
import { sCT } from '../common/crypto/deprecated/encryption';
import Web3Azeroth from './web3-contract';
import { ITransferMetaAmount, IZkEventData } from './interfaces';
import { SetStatus } from '../common/types';

type TokenInfo = {
    enaIndex: number | bigint;
    tokenAddress: string;
    tokenId: bigint;
    tokenType: TokenType;
};

type NetworkKeys = {
    receiverEOA: string;
    senderEOA: string;
    senderPrivateKey: string;
};

type ZkWalletKeys = {
    userKey: UserKey;
    auditKey: AuditKey;
    receiverKey: UPK;
};

export type EnaStatus = {
    contractAddress?: string,
    tokenID: bigint,
    balance: bigint,
    sCT: sCT,
};

export type GetAllEnaStatusResult = {
    enaState: SetStatus,
    enaList: {
        token: Token,
        balance: bigint,
        enaIndex: number,
        enaStatus: EnaStatus,
    }[];
}

export type TokenOwnershipType = 'PubliclyOwned' | 'PrivatelyOwned';

export type Balance = {
    tokenUid: TokenUniqueID,
    eoaBalance?: bigint;
    enaBalance?: bigint;
    tokenOwnership?: TokenOwnershipType;
};

export type BalanceUpdateList = { key: string, data: Balance }[];

export type GenerationSnarkInput = {
    zkWalletKeys: ZkWalletKeys;
    tokenInfo: TokenInfo;
    transferAmount: Required<ITransferMetaAmount>;
    sCT: sCT;
    root: bigint;
    merklePath: bigint[];
};

export type ZkTransferMeta = {
    web3Azeroth: Web3Azeroth;
    tokenInfo: TokenInfo;
    zkWalletKeys: ZkWalletKeys;
    networkKeys: NetworkKeys;
    amounts: Required<ITransferMetaAmount>;
    zkWalletFee: bigint;
    sCT: sCT;
    root: bigint;
    merklePath: bigint[];
};

export class ZkEventData implements IZkEventData {

    public readonly nullifier: bigint;
    public readonly com: bigint;
    public readonly ct: bigint[];           // experts an array of 11 values
    public readonly numLeaves: bigint;
    public readonly ena: bigint[];          // experts an array of 6 values  

    constructor(rawReturnValues: any) {
        this.nullifier = BigInt(rawReturnValues[0]);
        this.com = BigInt(rawReturnValues[1]);
        this.ct = (rawReturnValues[2] as string[]).map(v => BigInt(v));
        this.numLeaves = BigInt(rawReturnValues[3]);
        this.ena = (rawReturnValues[4] as string[]).map(v => BigInt(v));
    }
};

export type ZkTransferEvent = {
    blockNumber: number;
    transactionHash: string;
    transactionIndex: number;
    eventData: ZkEventData;
};

const SUBGROUP_ORDER = BigInt('2736030358979909402780800718157159386074658810754251464600343418943805806723');


/* For test purposes */
export const ZERO_ADDRESS =
    Config.ZERO_ADDRESS || '0x0000000000000000000000000000000000000000';

/* Gas loaded on each tx */
export const DEFAULT_REGISTER_GAS =
    Number(Config.DEFAULT_REGISTER_GAS) || 200000;
export const DEFAULT_ZK_TRANSFER_GAS =
    Number(Config.DEFAULT_ZK_TRANSFER_GAS) || 6000000;
export const DEFAULT_LEGACY_TRANSFER_GAS =
    Number(Config.DEFAULT_LEGACY_TRANSFER_GAS) || 100000;
export const DEFAULT_DEPLOY_GAS = Number(Config.DEFAULT_DEPLOY_GAS) || 10000000;
export const DEFAULT_GAS_VALUE = Number(Config.DEFAULT_GAS_VALUE) || 3000000;

/* Expected gas cost on tx */
export const EXPECTED_ZK_TRANSFER_GAS =
    Number(Config.EXPECTED_ZK_TRANSFER_GAS) || 1500000;

export const Constants = {
    SUBGROUP_ORDER,
    ZERO_ADDRESS,
    DEFAULT_REGISTER_GAS,
    DEFAULT_ZK_TRANSFER_GAS,
    DEFAULT_LEGACY_TRANSFER_GAS,
    DEFAULT_DEPLOY_GAS,
    DEFAULT_GAS_VALUE,
    EXPECTED_ZK_TRANSFER_GAS,
};