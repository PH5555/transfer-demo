import Web3Base  from 'web3';
import {
    Block,
    Filter,
    Transaction,
    TransactionReceipt
} from 'web3';

export type GasEstimation = {
    possibleOverShot: boolean
    gasEstimate: bigint,
    gasPrice: bigint,
    gasFee: bigint,
    value: bigint,
    txCost: bigint,
    senderBalance: bigint,
    overShotBy: bigint,
};

export type SendContractTransactionResult = {
    transactionReceipt?: TransactionReceipt,
    transactionBlock?: Block,
    gasEstimation?: GasEstimation,
    error?: any
}

export type TokenUniqueID = string;

export const TokenType = {
    NATIVE: 'Native',
    ERC_20: 'ERC-20',
    ERC_721: 'ERC-721',
    ERC_1155: 'ERC-1155',
} as const;
export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export const TransactionType = {
    Send: 'Send',
    Recieve: 'Recieve',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export type PastEventOptions = Omit<Filter, 'address'>;

export type EventLog<ReturnValuesT = any> = {
    address: string,
    blockHash: string,
    transactionHash: string,
    blockNumber: bigint,
    transactionIndex: bigint,
    event: string,
    returnValues: ReturnValuesT,
    logIndex?: bigint
};

export type ErcTransferEventLogReturnValues = {
    from: string,
    to: string,
    transfers: { value: bigint, tokenID: bigint | undefined }[],
};

export type ErcTransferEventLog = EventLog<ErcTransferEventLogReturnValues>;

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

export type PublicTransfer = {
    from: string;
    to: string;
    transactionHash: string;
    blockNumber: number;
    blockDateTime?: number | undefined;
    transactionIndex: number;
    gasPrice?: bigint | undefined;
    gasFee?: bigint | undefined;
    gasUsed?: bigint | undefined;
};

export type NativePublicTransfer = {
    value: bigint;
} & PublicTransfer ;

export type ERCTokenPublicTransfer = PublicTransfer & {
    contractAddress: string;
    values: bigint[];
    tokenIDs: bigint[];
    tokenName?: string;
    tokenSymbol?: string;
    tokenDecimal?: number;
};

export type TransactionMeta = {
    transaction: Transaction;
    transactionReceipt: TransactionReceipt;
};

export type TransactionFilter = {
  transactionHash?: string;
  blockNumber?: number;
  transactionIndex?: number;
}

export type PublicTransferList = PublicTransfer[];
export type NativePublicTransferList = NativePublicTransfer[];
export type ERCTokenPublicTransferList = ERCTokenPublicTransfer[];
export type TransactionMetaList = TransactionMeta[];
export type TransactionFilterList = TransactionFilter[];

export type RpcUrlSelectionPolicy = 'RoundRobin' | 'Normal';

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

export const EndPointStatus = {
    UP: 1,
    TIMED_OUT: 2,
    DOWN: 3,
} as const;
export type EndPointStatus = (typeof EndPointStatus)[keyof typeof EndPointStatus];

export type EndPointStateMeta = {
    status: EndPointStatus;
    skipCount: number;
};

export type EndPointMeta = {
    url: string;
    supportedProtocols: EndPointProtocol[];
    metric: EndPointMetric;
}

export type EndPoint = EndPointMeta & {
    status: EndPointStatus;
    skipCount: number; 
}

export interface IWeb3Extended extends Web3Base {
    
    getAddress: () => string;

    sendNativeTokenTransfer: ({
        senderEthAddr,
        receiverEthAddr,
        senderEthPrivateKey,
        value,
        fetchBlock
    }: {
        senderEthAddr: string,
        receiverEthAddr: string,
        senderEthPrivateKey: string | null,
        value: bigint,
        fetchBlock?: boolean,
    }) => Promise<SendContractTransactionResult>;
    
    sendContractTransaction: ({
        methodName,
        methodArgs,
        senderEthAddr,
        senderEthPrivateKey,
        value,
        estimateGasFeeOnly,
        fetchBlock,
    }: {
        methodName: string,
        methodArgs: any[],
        senderEthAddr: string,
        senderEthPrivateKey: string | null,
        value?: bigint,
        estimateGasFeeOnly: boolean,
        fetchBlock?: boolean,
    }) => Promise<SendContractTransactionResult>;
    
    sendContractCall: ({
        methodName,
        methodArgs
    }: {
        methodName: string,
        methodArgs: any[]
    }) => Promise<any>;
    
    getPastEventLogs: <ReturnValuesT = any>(
        eventName: string,
        filterParams: Filter
    ) => Promise<{
        eventLogs: EventLog<ReturnValuesT>[] | undefined;
        error: any
    }>;

    getBlockNumber: () => Promise<number>;

    getBalance: (address: string) => Promise<bigint>;

    getBlock: (blockNumberOrHash: string | number, useCache: boolean) => Promise<Block>;

    isEoaAddress: (address: string, useCache: boolean) => Promise<boolean>;

    getTransactionList: (txFilterList: TransactionFilterList) => Promise<TransactionMetaList>;

    getIndexerNativeTransferList: (
        addressList: string[],
        blockRange: { from: number; to: number }
    ) => Promise<NativePublicTransferList>;

    getIndexerERCTokenTransferList: (
        addressList: string[],
        blockRange: { from: number; to: number }
    ) => Promise<ERCTokenPublicTransferList>;

    endPointRetryBlock: <ResultT>(
        requestFtn: RequestFtn<ResultT>,
        requestFtnName: string,
        startWithLastUsedRpc: boolean,
        protocol: EndPointProtocol[] | EndPointProtocol,
        data: any,
    ) => Promise<ResultT>;
}

export type ZkWalletEnabledNetworkMeta = {
    NetworkUid: TokenUniqueID;
    Name: string,
    ImageURI: string,
    ChainID: number,
    zkWalletContractAddress: string,
    zkWalletContractDeployBlockNum: number,
    NativeUnit: string,
    EndPoints: string[],
    PrimaryRpcUrlIndex: number,
    IndexerEndPoints?: EndPointMeta[] | undefined,
    AverageBlockTime: number,
    TestNet: boolean,
    Masked?: boolean | undefined,
}

export type ZkWalletEnabledNetworkConfig = {
    configHash: string;
    zkWalletEnabledNetworks: ZkWalletEnabledNetworkMeta[];
    zkWalletEnabledNetworksCipher: string;
    zkWalletEnabledNetworksCipherIV: string;
}

export type ZkWalletEnabledNetworkConfigEncKey = {
    secretKey: string;
};

export type RequestFtn<ResultT, UserDataT = any> = (
    web3: IWeb3Extended,
    endPoint: EndPoint,
    data: UserDataT
) => Promise<ResultT>;