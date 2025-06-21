import _ from 'lodash';
import Realm from 'realm';
//
//
import { TokenType, TokenUniqueID, Token } from '../web3/types';
import { INote, IZkEventData } from '../azeroth/interfaces';
import {
    Wallet,
    Contact,
    Network,
    TokenContract,
    NFTToken,
    ZKTransfer,
    ZkEventCache,
    ZKTransferAmountTy,
    NFT,
    WebResourceCache,
    WNMeta,
    WNTokenList,
    WalletList,
    NetworkList,
    ContactList,
    TokenContractList,
    WNTokenListItem,
    ZkEventCacheList,
    NetworkEndPoint,
} from './models';
import { Numbers } from 'web3';

export const KVStoreKeys = {
    LOCALE: '@LOCALE',
    ZK_SERVICE_INITIALIZED: '@ZK_SERVICE_INITIALIZED',
    ZK_WALLET_NETWORKS_INITIALIZED: '@ZK_WALLET_NETWORKS_INITIALIZED',
    ZK_WALLET_NETWORKS_CONFIG_HASH: '@ZK_WALLET_NETWORKS_CONFIG_HASH',
    DEFAULT_NETWORK_UID: '@DEFAULT_NETWORK_UID',
    DEFAULT_WALLET_ADDRESS: '@DEFAULT_WALLET_ADDRESS',
    USED_BIO_AUTH: '@USED_BIO_AUTH',
    ERC20_ICON_URI_PREFIX: '@ERC20_IconUri_',
    APP_SECRET_KEY_SAVED: '@APP_SECRET_KEY_SAVED',
    APP_SECRET_KEY_CT_JSON: '@APP_SECRET_KEY_CT_JSON', // cipher-text of app decryption key , encrypted with user pin
} as const;


export type KVStoreKeys = (typeof KVStoreKeys)[keyof typeof KVStoreKeys];

export type AddWalletTy = Omit<Wallet, 'masked' | 'enaHex'> & { ena: bigint };

export type AddNetworkTy = Omit<Network, 'uid' | 'endPointList' > & { endPointList : NetworkEndPoint[]}

export type UpdateNetworkTy = Partial<Pick<Network,
    'networkIconCache' |
    'latestZkEventBlkNum' |
    'earliestZkEventBlkNum' |
    'startZkEventBlkNum'|
    'masked' 
> & { latestZkTransferFee: bigint }>;

export type AddTokenContractTy = Omit<TokenContract, 'networkUid' | 'masked'>;

export type AddNFTDataTy = Omit<NFT, 'parentTokenContractUid' | 'networkUid' | 'tokenIDHex' | 'masked'>;

export type ZkCachingUpdateData = {
    latestZkEventBlkNum?: number,
    earliestZkEventBlkNum?: number,
    eventCacheList: (
        Pick<ZkEventCache,
            'blockNumber' |
            'networkUid' |
            'transactionHash' |
            'transactionIndex'
        > & {
            eventData: IZkEventData
        }
    )[]
}

export type AddZkTransferParamMap = {
    cachedEventToRemove: ZkEventCache | undefined,
    token: Token,
    transfer: Pick<ZKTransfer,
        'blockNumber' |
        'blockDateTime' |
        'transactionIndex' |
        'transactionHash' |
        'ercApproveTxHash' |
        'from' |
        'to'
    > & {
        amounts: ZKTransferAmountTy
    }
};

export type AddZkTransferParam = {
    network: Network,
    mapList: AddZkTransferParamMap[]
};

type GetZkTransferFilterParams = Pick<ZKTransfer,
    'networkUid' |
    'blockNumber' |
    'transactionIndex' |
    'transactionHash' |
    'tokenUid' |
    'hasToPrivateNote' |
    'hasFromPrivateNote' |
    'toPrivateNoteIsSpent' |
    'from' |
    'to' |
    'tokenName'
> & {
    toOrFrom: string,
    matchTokenTypes: TokenType[],
}

export type GetZkTransferFilter = Partial<GetZkTransferFilterParams>;

export type GetZkEventsFilter = {
    blockNum?: number,
    blockNumOrBefore?: number,
    blockNumOrAfter?: number,
    blocksBefore?: number,
    blocksAfter?: number,
}

export type WebResourceCacheMetaDataTy = Omit<WebResourceCache, 'uri' | 'base64Data'>;

export type FlattenedNFTListItem = { uid: string, tokenType: TokenType, isContract: boolean, contractAddress: string };
export type FlattenedNFTList = FlattenedNFTListItem[];

interface LocalStoreModifier {

    set: (key: KVStoreKeys, value: string | undefined) => void,

    wallet: {
        add: (address: string, data: AddWalletTy) => Wallet | undefined
        updateName: (wallet: Wallet, newName: string) => void,
        mask: (address: string) => void,
    },

    network: {
        add: (uid: TokenUniqueID, data: AddNetworkTy) => Network | undefined,
        update: (network: Network, update: UpdateNetworkTy) => void,
    },

    contact: {
        add: (address: string, data: Omit<Contact, 'address' | 'masked'>) => Contact | undefined,
        updateName: (contact: Contact, newName: string) => void,
        updateEna: (contact: Contact, ena: bigint) => void,
        mask: (address: string) => void,
    },

    token: {
        addContract: (uid: TokenUniqueID, data: AddTokenContractTy) => TokenContract | undefined,
        addNFT: (parentContractUid: TokenUniqueID, tokenId: bigint, data: AddNFTDataTy) => NFTToken | undefined,
        addToken: (network: Network, token: Token) => TokenContract | NFTToken | undefined,
    },

    updateWNMeta: (wallet: Wallet, network: Network, data: WNMeta) => WNMeta,

    WNToken: {
        add: (wallet: Wallet, network: Network, tokenUniqueID: TokenUniqueID) => Token | undefined,
        remove: (wallet: Wallet, tokens: Token[]) => void,
        update: (wallet: Wallet, token: Token, data: Partial<Omit<WNTokenListItem, 'dbKey'>>) => void,
    },

    azeroth: {
        cleanZkEventCache: (cleanList: ZkEventCache[] | ZkEventCacheList) => void,
        addZkEventCache: (
            network: Network,
            updateData: ZkCachingUpdateData,
        ) => ZkEventCache[],
        addZkTransfer(params: AddZkTransferParam): ZKTransfer[],
        setToPrivateNoteIsSpent: (dbKey: string) => number,
        addToPrivateNote: (dbKey: string, note: INote) => number,
    }
}


export interface LocalStore {

    get: (key: KVStoreKeys) => string | undefined,
    set: (key: KVStoreKeys, value: string | undefined) => void,

    getResourceCache: (keyParam: { uriHash?: string, uri?: string }) => WebResourceCache | undefined,
    setResourceCache: (keyParam: { uriHash?: string, uri?: string }, webData: Omit<WebResourceCache, "uriHash" | "uri">) => WebResourceCache,

    getWallet: (address: string) => Wallet | undefined,
    getWallets: (includeMasked?: boolean) => WalletList,

    getNetwork: (uid: TokenUniqueID) => Network | undefined,
    getNetworks: (includeMasked?: boolean) => NetworkList,

    getContact: (address: string) => Contact | undefined,
    getContacts: (includeMasked?: boolean) => ContactList,

    getAddressName: (address?: string) => string | undefined,

    getTokenContract: (uid: TokenUniqueID) => TokenContract | undefined,
    getTokenContracts: (networkUid: TokenUniqueID, tokenType?: TokenType) => TokenContractList,
    getAllTokenContracts: (networkUid?: TokenUniqueID) => TokenContractList,

    getNFTToken: (uid: TokenUniqueID) => NFTToken | undefined,
    getNFTTokens: (networkUid?: TokenUniqueID) => NFTToken[],
    getAllNFTTokens: (networkUid?: TokenUniqueID) => NFTToken[],

    getWNMeta: (wallet: Wallet, network: Network) => WNMeta,
    getWNToken: (wallet: Wallet, token: Token) => WNTokenListItem | undefined,
    getWNTokenList: (wallet: Wallet, network: Network) => WNTokenList,

    getFlattenedNFTs: (networkUid: TokenUniqueID, includeMasked?: boolean) => FlattenedNFTList,

    findToken: (uid: TokenUniqueID | undefined, includeMasked?: boolean) => Token | undefined,
    findTokenByContractAddressTokenId: (contractAddress: string | undefined, tokenID: Numbers | undefined) => Token | undefined,
    findNetwork: (uid: TokenUniqueID | number | undefined) => Network | undefined,

    getZkEvents: (network: Network, filter: GetZkEventsFilter) => ZkEventCacheList,

    getZkTransfer: (transferDBKey: string) => ZKTransfer | undefined,
    getZkTransfers: (filter: GetZkTransferFilter) => Realm.Results<ZKTransfer>,
    getZkTransferByTransactionHash: (network: Network, transactionHash: string) => ZKTransfer | undefined,

    getModifier: () => LocalStoreModifier,
}