import Realm from 'realm';
import { AESCT } from '../common/crypto/aes';
import { INote, IZkEventData } from '../azeroth/interfaces';
import { toJson, toObjFromJson } from '../common/utilities';
import { EndPointMetric, EndPointProtocol,  Token, TokenType, TokenUniqueID } from '../web3/types';

export class WalletModel extends Realm.Object<WalletModel> {

    readonly address!: string;
    name!: string;
    enaHex!: string;
    pkOwn!: string;
    pkEncJson!: string;
    ctPrivateKey!: AESCT;
    ctMnemonic!: AESCT;
    ctSecretKey!: AESCT;
    masked: boolean = false;
    placeholderIconIndex!: number;

    static schema: Realm.ObjectSchema = {
        name: 'WalletModel',
        primaryKey: 'address',
        properties: {
            address: 'string',
            name: 'string',
            enaHex: 'string',
            pkOwn: 'string',
            pkEncJson: 'string',
            ctPrivateKey: 'mixed{}',
            ctMnemonic: 'mixed{}',
            ctSecretKey: 'mixed{}',
            placeholderIconIndex: 'int',
            masked: {
                type: 'bool',
                default: false
            }
        },
    };
}


export class ContactModel extends Realm.Object<ContactModel> {

    readonly address!: string;
    enaHex?: string;
    name!: string;
    masked!: boolean;
    placeholderIconIndex!: number;

    static schema: Realm.ObjectSchema = {
        name: 'ContactModel',
        primaryKey: 'address',
        properties: {
            address: 'string',
            enaHex: 'string?',
            name: 'string',
            masked: 'bool',
            placeholderIconIndex: 'int',
        },
    };
}


export class NetworkModel extends Realm.Object<NetworkModel> {

    readonly uid!: TokenUniqueID;
    networkId!: number
    chainId!: number;
    networkName!: string;
    nativeSymbol!: string;
    decimal!: number;
    networkIconUri!: string;
    networkIconCache?: string;
    azerothContractAddress!: string;
    azerothContractBlk!: number;
    averageBlockTime!: number;
    isTestNet!: boolean;
    latestZkEventBlkNum?: number;
    earliestZkEventBlkNum?: number;
    startZkEventBlkNum?: number;
    latestZkTransferFeeHex?: string;
    endPointList!: Realm.List<NetworkEndPointModel>;
    
    masked!: boolean;

    static schema = {
        name: 'NetworkModel',
        primaryKey: 'uid',
        properties: {
            uid: 'string',
            networkId: 'int',
            chainId: 'int',
            networkName: 'string',
            nativeSymbol: 'string',
            decimal: 'int',
            networkIconUri: 'string',
            networkIconCache: 'string?',
            azerothContractAddress: 'string',
            azerothContractBlk: 'int',
            averageBlockTime: 'int',
            isTestNet: 'bool',
            latestZkEventBlkNum: 'int?',
            earliestZkEventBlkNum: 'int?',
            startZkEventBlkNum: 'int?',
            latestZkTransferFeeHex: 'string?',
            endPointList: 'NetworkEndPointModel[]',
            
            masked: 'bool'
        },
    };
}

export class NetworkEndPointModel extends Realm.Object {
    url!: string;
    supportedProtocols!: EndPointProtocol[];
    metric!: EndPointMetric;

    static schema = {
        name: 'NetworkEndPointModel',
        embedded: true,
        properties: {
            url: 'string',
            supportedProtocols: 'string[]',
            metric: 'int',
        },
    };
}

export class TokenContractModel extends Realm.Object<TokenContractModel> {

    readonly uid!: TokenUniqueID;
    networkUid!: TokenUniqueID;
    contractAddress!: string;
    tokenType!: TokenType;
    tokenName!: string;
    tokenSymbol!: string;
    tokenIconUri?: string;
    decimal?: number;
    masked!: boolean;

    static schema = {
        name: 'TokenContractModel',
        primaryKey: 'uid',
        properties: {
            uid: 'string',
            networkUid: 'string',
            contractAddress: 'string',
            tokenType: 'string',
            tokenName: 'string',
            tokenSymbol: 'string',
            tokenIconUri: 'string?',
            decimal: 'int?',
            masked: 'bool'
        },
    };
}


export class NFTModel extends Realm.Object<NFTModel> {

    readonly uid!: TokenUniqueID;
    networkUid!: TokenUniqueID;
    parentTokenContractUid!: TokenUniqueID;
    tokenIDHex!: string;
    tokenName!: string;
    tokenSymbol!: string;
    tokenIconUri?: string;
    masked!: boolean;

    static schema = {
        name: 'NFTModel',
        primaryKey: 'uid',
        properties: {
            uid: 'string',
            parentTokenContractUid: 'string',
            networkUid: 'string',
            tokenIDHex: 'string',
            tokenName: 'string',
            tokenSymbol: 'string',
            tokenIconUri: 'string?',
            masked: 'bool'
        },
    };
}

export class NFTToken {
    public readonly uid !: TokenUniqueID
    public readonly contract!: Omit<TokenContractModel, keyof Realm.Object>
    public readonly token!: Omit<NFTModel, keyof Realm.Object>;
}

export type ZKTransferAmountTy = {
    fromPublicAmount?: bigint;
    fromPrivateAmount?: bigint;
    fromNote?: { amount: bigint, note?: INote };
    toPublicAmount?: bigint;
    toPrivate?: { amount: bigint, note?: INote };
    remainingAmount?: bigint;
    zkFee?: bigint;
    gasFee?: bigint;
    gasUsed?: bigint;
    gasPrice?: bigint;
}

export class ZKTransferModel extends Realm.Object<ZKTransferModel> {

    readonly dbKey!: Realm.BSON.ObjectId;
    networkUid!: TokenUniqueID;
    blockNumber!: number;
    blockDateTime!: number;
    transactionIndex!: number;
    transactionHash!: string;
    tokenUid!: TokenUniqueID;
    from!: string;
    to!: string;
    amountsJson!: string;
    ercApproveTxHash!: string;

    // extra filter/sort params
    tokenName!: string;
    tokenType!: TokenType;
    hasToPrivateNote!: boolean;
    hasFromPrivateNote!: boolean;
    toPrivateNoteIsSpent!: boolean;

    static schema: Realm.ObjectSchema = {
        name: 'ZKTransferModel',
        primaryKey: 'dbKey',
        properties: {
            dbKey: 'objectId',
            networkUid: 'string',
            blockNumber: 'int',
            blockDateTime: 'int',
            transactionIndex: 'int',
            transactionHash: 'string',
            tokenUid: 'string',
            from: 'string',
            to: 'string',
            amountsJson: 'string',
            ercApproveTxHash: 'string',
            tokenName: 'string',
            tokenType: 'string',
            hasToPrivateNote: 'bool',
            hasFromPrivateNote: 'bool',
            toPrivateNoteIsSpent: 'bool',
        },
    };

    //
    // None DB members :
    //

    private amounts?: ZKTransferAmountTy;
    private transferToSelf?: boolean;
    timestamp?: Date;
    token?: Token;

    static getKey(transfer: ZKTransfer): string {
        return transfer.dbKey.toString();
    }

    static getAmounts(transfer: ZKTransfer): ZKTransferAmountTy {
        const zktransfer = transfer as ZKTransferModel;
        const amounts = toObjFromJson(zktransfer.amountsJson);
        amounts.gasFee = amounts.gasFee !== undefined ? amounts.gasFee : 0n;
        zktransfer.amounts = amounts;
        return zktransfer.amounts as ZKTransferAmountTy;
    }

    static getAmountsJson(amounts: ZKTransferAmountTy): string {
        return toJson(amounts);
    }

    static getTransferAmount(transfer: ZKTransfer, walletAddr?: string): bigint {

        const zktransfer = transfer as ZKTransferModel;

        if (zktransfer.transferToSelf === true) {
            return 0n;
        } else if (zktransfer.from === zktransfer.to) {
            zktransfer.transferToSelf = true;
            return 0n;
        } else {
            const amounts = ZKTransferModel.getAmounts(zktransfer);

            if (walletAddr && walletAddr === transfer.to) {
                return (amounts.toPrivate ? amounts.toPrivate.amount : 0n) +
                    (amounts.toPublicAmount ? amounts.toPublicAmount : 0n)
            } else if (walletAddr && walletAddr === transfer.from) {
                return (amounts.fromPublicAmount ? amounts.fromPublicAmount : 0n) +
                    (amounts.fromPrivateAmount ? amounts.fromPrivateAmount : 0n) +
                    (amounts.fromNote && amounts.fromNote.amount ? amounts.fromNote.amount : 0n);
            } else {
                return (amounts.fromPublicAmount ? amounts.fromPublicAmount : 0n) +
                    (amounts.fromPrivateAmount ? amounts.fromPrivateAmount : 0n) +
                    (amounts.fromNote && amounts.fromNote.amount ? amounts.fromNote.amount : 0n);
            }
        }
    };

    static checkTransferAmount(amounts: ZKTransferAmountTy): boolean {
        return (
            (
                (amounts.fromPublicAmount ? amounts.fromPublicAmount : 0n) +
                (amounts.fromPrivateAmount ? amounts.fromPrivateAmount : 0n) +
                (amounts.fromNote && amounts.fromNote.amount ? amounts.fromNote.amount : 0n)
            ) === (
                (amounts.toPublicAmount ? amounts.toPublicAmount : 0n) +
                (amounts.toPrivate ? amounts.toPrivate.amount : 0n) +
                (amounts.remainingAmount ? amounts.remainingAmount : 0n)
            ));
    };
}


export class ZkEventCacheModel extends Realm.Object<ZkEventCacheModel> {

    readonly dbKey!: Realm.BSON.ObjectId;
    networkUid!: TokenUniqueID;
    blockNumber!: number;
    transactionIndex!: number;
    transactionHash!: string;
    eventDataJson!: string;

    static schema: Realm.ObjectSchema = {
        name: 'ZkEventCacheModel',
        primaryKey: 'dbKey',
        properties: {
            dbKey: 'objectId',
            networkUid: 'string',
            blockNumber: 'int',
            transactionIndex: 'int',
            transactionHash: 'string',
            eventDataJson: 'string',
        },
    };

    //
    // None DB members :
    //

    private eventData?: IZkEventData;

    static getKey(event: any): string {
        return event._id.toString();
    }

    static getEventData(event: ZkEventCache): IZkEventData {
        const zkEvent = event as ZkEventCacheModel;
        if (!zkEvent.eventData) zkEvent.eventData = toObjFromJson(zkEvent.eventDataJson);
        return zkEvent.eventData as IZkEventData;
    }

    static getEventDataJson(eventData: IZkEventData): string {
        return toJson(eventData);
    }
}


// Metadata relating to Wallet and Network 
export class WNMetaModel extends Realm.Object<WNMetaModel> {

    readonly dbKey!: Realm.BSON.ObjectId;

    // meta keys
    walletAddress!: string;
    networkUid!: string;

    // meta properties
    enaExist?: boolean;
    enaLength?: number;
    registerEnaPagePresented?: boolean;
    latestZkEventBlkNum?: number;
    earliestZkEventBlkNum?: number;
    startZkEventBlkNum?: number;

    static schema: Realm.ObjectSchema = {
        name: 'WNMetaModel',
        primaryKey: 'dbKey',
        properties: {
            dbKey: 'objectId',
            walletAddress: 'string',
            networkUid: 'string',
            enaExist: 'bool?',
            enaLength: 'int?',
            registerEnaPagePresented: 'bool?',
            latestZkEventBlkNum: 'int?',
            earliestZkEventBlkNum: 'int?',
            startZkEventBlkNum: 'int?',
        },
    };
}

// Wallet,Network Tokens List 
export class WNTokenListModel extends Realm.Object<WNTokenListModel> {

    readonly dbKey!: Realm.BSON.ObjectId;

    // keys
    walletAddress!: string;
    networkUid!: string;

    // list item properties
    tokenUid!: string;
    enaIndex?: number;
    pinDate!: number;

    static schema: Realm.ObjectSchema = {
        name: 'WNTokenListModel',
        primaryKey: 'dbKey',
        properties: {
            dbKey: 'objectId',
            walletAddress: 'string',
            networkUid: 'string',
            tokenUid: 'string',
            enaIndex: 'int?',
            pinDate: 'int?',
        },
    };
}


// local store for arbitrary web/remote resources . Eg. icons etc. 
export class WebResourceCacheModel extends Realm.Object<WebResourceCacheModel> {

    readonly uriHash!: string;
    uri!: string;
    base64Data!: string;
    mime?: string;
    updateTimestamp?: number;
    timeToLeave?: number;

    static schema: Realm.ObjectSchema = {
        name: 'WebResourceCacheModel',
        primaryKey: 'uriHash',
        properties: {
            uriHash: 'string',
            uri: 'string',
            base64Data: 'string',
            mime: 'string?',
            updateTimestamp: 'int?',
            timeToLeave: 'int?'
        },
    };
}


// Arbitrary key/value local store 
export type KVStoreValueType = 'string' | 'int' | 'BN' | 'JSON';

export class KeyValueStoreModel extends Realm.Object<KeyValueStoreModel> {

    _key !: string;
    _value!: string;
    _valueType?: KVStoreValueType;

    static schema: Realm.ObjectSchema = {
        name: 'KeyValueStoreModel',
        primaryKey: '_key',
        properties: {
            _key: 'string',
            _value: 'string',
            _valueType: 'string?',
        },
    };
}


export const Models = {
    Wallet: { Name: 'WalletModel', Model: WalletModel },
    Contact: { Name: 'ContactModel', Model: ContactModel },
    Network: { Name: 'NetworkModel', Model: NetworkModel },
    TokenContract: { Name: 'TokenContractModel', Model: TokenContractModel },
    NFT: { Name: 'NFTModel', Model: NFTModel },
    ZKTransfer: { Name: 'ZKTransferModel', Model: ZKTransferModel },
    ZkEventCache: { Name: 'ZkEventCacheModel', Model: ZkEventCacheModel },
    WNMeta: { Name: 'WNMetaModel', Model: WNMetaModel },
    WNTokenList: { Name: 'WNTokenListModel', Model: WNTokenListModel },
    KeyValueStore: { Name: 'KeyValueStoreModel', Model: KeyValueStoreModel },
    WebResourceCache: { Name: 'WebResourceCacheModel', Model: WebResourceCacheModel },
}


export type Wallet = Omit<WalletModel, keyof Realm.Object>
export type Network = Omit<NetworkModel, keyof Realm.Object>
export type NetworkEndPoint = Omit<NetworkEndPointModel, keyof Realm.Object>
export type Contact = Omit<ContactModel, keyof Realm.Object>
export type TokenContract = Omit<TokenContractModel, keyof Realm.Object>
export type NFT = Omit<NFTModel, keyof Realm.Object>
export type ZkEventCache = Omit<ZkEventCacheModel, keyof Realm.Object>
export type ZKTransfer = Omit<ZKTransferModel, keyof Realm.Object>
export type KeyValueStore = Omit<KeyValueStoreModel, keyof Realm.Object>
export type WebResourceCache = Omit<WebResourceCacheModel, keyof Realm.Object>

export type WalletList = Realm.Results<WalletModel>;
export type NetworkList = Realm.Results<NetworkModel>;
export type ContactList = Realm.Results<ContactModel>;
export type TokenContractList = Realm.Results<TokenContract>;
export type ZKTransferList = Realm.Results<ZKTransfer>;
export type ZkEventCacheList = Realm.Results<ZkEventCache>;

export type WNMeta = Omit<WNMetaModel, keyof Realm.Object | 'dbKey' | 'walletAddress' | 'networkUid'>
export type WNTokenListItem = Omit<WNTokenListModel, keyof Realm.Object | 'walletAddress' | 'networkUid'>
export type WNTokenList = Realm.Results<WNTokenListItem>;