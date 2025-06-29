import Web3Erc1155 from "./erc-1155";
import Web3Erc20 from "./erc-20";
import Web3Erc721 from "./erc-721";
import Web3Extended from "./web3-extended";

import {
    getErc20TokenMeta,
    getErcType,
    getNFTTokenMeta,
    getTokenMeta
} from "./erc-utils";

export type {
    Token ,
    TokenUniqueID ,
    TokenType ,
    GasEstimation ,
    SendContractTransactionResult,
    EventLog,
    TransactionMetaList
} from './types';

export {
    Web3Extended,
    Web3Erc20,
    Web3Erc721,
    Web3Erc1155,
    getErc20TokenMeta,
    getNFTTokenMeta,
    getErcType,
    getTokenMeta,
};