import { AESCT } from "../common/crypto/aes";

export class Network {
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
    endPointList!: NetworkEndPointModel[];
    masked!: boolean;
}

export class Wallet {
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
}

export class NetworkEndPointModel {
    url!: string;
    supportedProtocols!: EndPointProtocol[];
    metric!: EndPointMetric;
}

export type TokenUniqueID = string;

export const EndPointProtocol = {
    ETH: 'ETH',
    WEB3: 'WEB3',
    KLAY: 'KLAY',
    BLOCKSCOUT_API: 'BLOCKSCOUT_API',
    BLOCKSCOUT_RESTFULL_API: 'BLOCKSCOUT_RESTFULL_API',
    ZKWALLET_SUPPORT_BACKEND: 'ZKWALLET_SUPPORT_BACKEND',
} as const;
export type EndPointProtocol = (typeof EndPointProtocol)[keyof typeof EndPointProtocol];

export const EndPointMetric = {
    SELF_HOSTED: 100,
    PUBLIC_RATE_UNLIMITED: 200,
    PUBLIC_RATE_LIMITED: 300,
    PUBLIC_UNSTABLE: 400,
    FALL_BACK: 500,
} as const;
export type EndPointMetric = (typeof EndPointMetric)[keyof typeof EndPointMetric];

export type Token = {
    networkUid: TokenUniqueID;
    tokenUid: TokenUniqueID;
    tokenType: TokenType;
    isNative: boolean;
    isERC: boolean;
    isNFT: boolean;
    contractAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenIconUri?: string;
    decimal?: number;
    tokenID?: bigint;
};

export const TokenType = {
    NATIVE: 'Native',
    ERC_20: 'ERC-20',
    ERC_721: 'ERC-721',
    ERC_1155: 'ERC-1155',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export type TransferAmounts = {
    fromPublicAmount?: bigint;
    fromPrivateAmount?: bigint;
    fromUnSpentNote?: UnSpentWalletNoteItem;
    totalInput: bigint,
    toPublicAmount?: bigint;
    toPrivateAmount?: bigint;
    totalOutput: bigint,
    remainingAmount: bigint;
};

export type UnSpentWalletNoteItem = {
    dbKey: string,
    dbTransfer: ZKTransfer,
    amounts: ZKTransferAmountTy,
    note: INote,
    noteAmt: bigint,
    uiNoteAmt: string,
    noteAddress: string,
    uiNoteAddress: string,
}

export class ZKTransfer {

    readonly dbKey!: String;
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

export interface INote {

    open: bigint;
    tokenAddress: string;
    tokenId: bigint;
    amount: bigint;
    addr: bigint;
    commitment: bigint;
    index: bigint;
    isSpent: boolean;

    toJson(): string;
    isValid(): boolean;
}