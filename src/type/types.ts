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
    endPointList!: NetworkEndPointModel;
    masked!: boolean;
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