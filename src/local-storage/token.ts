import _ from 'lodash';
import Realm, { BSON, UpdateMode } from 'realm';
//
//
import { Token, TokenType, TokenUniqueID, Web3Extended } from '../web3';
import {
    Network,
    TokenContract,
    NFTToken,
    NFT,
    Models,
    TokenContractModel,
    NetworkModel,
    NFTModel,
} from './models';
import {
    AddNFTDataTy,
    AddTokenContractTy,
    FlattenedNFTList,
} from './types';
import { toQueryString } from './common';
import { toHex, toJson, web3NumbersToBigInt } from '../common/utilities'; 
import { Numbers } from 'web3';


export function addTokenContract(realm: Realm, networkUid: TokenUniqueID, data: AddTokenContractTy) {

    const net = realm.objects<NetworkModel>(Models.Network.Name).filtered('uid == $0', networkUid).at(0);

    const contractAddress = data.contractAddress.toLowerCase();

    if (net) {

        realm.write(
            () => {
                realm.create<TokenContractModel>(
                    Models.TokenContract.Name,
                    {
                        ...data,
                        networkUid: net.uid,
                        uid: data.uid,
                        contractAddress,
                        masked: false,
                    },
                    UpdateMode.Modified
                );
            }
        );

        return realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered('uid == $0', data.uid).at(0);
    }

    return undefined
}

export function addNFT(realm: Realm, parentTokenContractUid: TokenUniqueID, tokenId: bigint, data: AddNFTDataTy): NFTToken | undefined {

    consoleDebug("addNFT", parentTokenContractUid, tokenId);

    const contract = realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered('uid == $0', parentTokenContractUid).at(0);
    const net = realm.objects<NetworkModel>(Models.Network.Name).filtered('uid == $0', contract?.networkUid).at(0);

    if (contract && net) {

        const insertData: NFT = {
            ...data,
            networkUid: net.uid,
            parentTokenContractUid: contract.uid,
            uid: data.uid,
            tokenIDHex: toHex(tokenId),
            masked: false,
        };

        realm.write(
            () => {
                realm.create<NFTModel>(Models.NFT.Name, insertData, UpdateMode.Modified);
            }
        );

        return getNFTToken(realm, data.uid);
    }

    return undefined;
}

export function addToken(realm: Realm, network: Network, token: Token): TokenContract | NFTToken | undefined {

    consoleDebug("addToken", network.uid, token);

    if (token.tokenType === 'ERC-20') {

        const db = addTokenContract(realm, network.uid, {
            uid: token.tokenUid,
            contractAddress: token.contractAddress,
            tokenType: 'ERC-20',
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenIconUri: token.tokenIconUri,
            decimal: token.decimal,
        });

        return db;

    } else if (token.isNFT && token.tokenID === undefined) {

        const db = addTokenContract(realm, network.uid, {
            uid: token.tokenUid,
            contractAddress: token.contractAddress,
            tokenType: token.tokenType,
            tokenName: token.tokenName,
            tokenSymbol: token.tokenSymbol,
            tokenIconUri: token.tokenIconUri,
        });

        return db;

    } else if (token.isNFT && token.tokenID !== undefined) {

        const parentTokenDB = findTokenByContractAddressTokenId(realm, token.contractAddress, undefined);

        if (parentTokenDB) {

            const db = addNFT(realm, parentTokenDB.tokenUid, token.tokenID, {
                uid: token.tokenUid,
                tokenName: token.tokenName,
                tokenSymbol: token.tokenSymbol,
                tokenIconUri: token.tokenIconUri,
            });

            return db;

        } else {
            console.error(" addToken NFT , parent token does not exist , nft token :\n", toJson(token));
        }
    }
}


export function getTokenContract(realm: Realm, uid: TokenUniqueID): TokenContract | undefined {
    return realm.objects<TokenContractModel>(Models.TokenContract.Name)
        .filtered('masked == $0 && uid == $1', false, uid)
        .at(0);
};

export function getTokenContracts(realm: Realm, networkUid: TokenUniqueID, tokenType?: TokenType | undefined) {

    let query_data: Partial<TokenContract>;
    query_data = {
        masked: false,
        networkUid,
        tokenType
    };

    return realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered(toQueryString(query_data)) as unknown as Realm.Results<TokenContract>;
}

export function getAllTokenContracts(realm: Realm, networkUid?: TokenUniqueID) {
    return (
        networkUid ?
            realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered('networkUid == $0', networkUid) :
            realm.objects<TokenContractModel>(Models.TokenContract.Name)
    ) as unknown as Realm.Results<TokenContract>
}

export function getNFTToken(realm: Realm, uid: TokenUniqueID): NFTToken | undefined {
    return getNFTTokens(realm, { uid }).at(0);
}

export function getNFTTokens(
    realm: Realm,
    arg: {
        networkUid?: TokenUniqueID,
        parentTokenContractUid?: TokenUniqueID,
        uid?: TokenUniqueID,
        includeMasked?: boolean,
    }
): NFTToken[] {

    const {
        networkUid,
        parentTokenContractUid,
        uid,
        includeMasked
    } = arg;

    let list: NFTToken[] = [];

    let query_data: Partial<NFT | TokenContract> = {
        uid,
        networkUid,
        parentTokenContractUid
    };

    const nftTokens = realm.objects<NFTModel>(Models.NFT.Name).filtered(toQueryString(query_data, includeMasked));

    if (nftTokens) {

        nftTokens.map((token) => {

            query_data = {
                uid: token.parentTokenContractUid,
            };

            const contract = realm.objects<TokenContractModel>(Models.TokenContract.Name)
                .filtered(toQueryString(query_data, includeMasked)).at(0)

            if (contract) { list.push({ uid: token.uid, contract, token }) }

        });
    }

    return list;
}

export function getFlattenedNFTs(realm: Realm, networkUid: TokenUniqueID, includeMasked: boolean): FlattenedNFTList {

    let list: FlattenedNFTList = [];

    let query_data: Partial<NFT | TokenContract>;
    query_data = {
        networkUid,
    };

    consoleDebug("\n\nAll TokenContract : ------ \n", toJson(realm.objects<TokenContractModel>(Models.TokenContract.Name).map(t => t), 2));

    const contracts = realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered(toQueryString(query_data, includeMasked))

    contracts.forEach(
        (contract) => {

            list.push({
                uid: contract.uid,
                tokenType: contract.tokenType,
                isContract: true,
                contractAddress: contract.contractAddress,
            });

            query_data = {
                parentTokenContractUid: contract.uid,
                masked: !includeMasked ? true : undefined,
            };
            const nftTokens = realm.objects<NFTModel>(Models.NFT.Name).filtered(toQueryString(query_data, includeMasked))

            nftTokens.forEach((token) => {
                list.push({
                    uid: token.uid,
                    tokenType: contract.tokenType,
                    isContract: false,
                    contractAddress: contract.contractAddress,
                });
            });

        }
    )
    return list;
}

export function findToken(realm: Realm, uid: TokenUniqueID, includeMasked?: boolean): Token | undefined {

    consoleDebug(`Find Token : "${uid}"  ...`);

    let token: Token | undefined = undefined;

    try {

        const query_data: Partial<Network | NFTToken | TokenContract> = { uid };
        const queryString = toQueryString(query_data, includeMasked);

        const network = realm.objects<NetworkModel>(Models.Network.Name).filtered(queryString).at(0);
        let tokenContract = realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered(queryString).at(0);
        const nft = realm.objects<NFTModel>(Models.NFT.Name).filtered(queryString).at(0);

        consoleDebug(`Find Token : network :"${network}"  ...`);
        consoleDebug(`Find Token : tokenContract : "${tokenContract}"  ...`);
        consoleDebug(`Find Token : nft : "${nft}"  ...`);

        if (network && !tokenContract && !nft) {

            token = {
                networkUid: network.uid,
                tokenUid: network.uid,

                isNative: true,
                isERC: false,
                isNFT: false,
                tokenType: 'Native',
                contractAddress: '0x0',

                tokenName: network.networkName,
                tokenSymbol: network.nativeSymbol,
                tokenIconUri: network.networkIconUri,
                decimal: network.decimal,
            };

        } else if (tokenContract && tokenContract.tokenType === 'ERC-20') {

            token = {
                networkUid: tokenContract.networkUid,

                isNative: false,
                isERC: true,
                isNFT: false,
                tokenType: tokenContract.tokenType,
                contractAddress: tokenContract.contractAddress,

                tokenUid: tokenContract.uid,
                tokenName: tokenContract.tokenName,
                tokenSymbol: tokenContract.tokenSymbol,
                tokenIconUri: tokenContract.tokenIconUri,
                decimal: tokenContract.decimal
            };

        } else if (tokenContract && (tokenContract.tokenType === 'ERC-1155' || tokenContract.tokenType === 'ERC-721') && !nft) {

            token = {
                networkUid: tokenContract.networkUid,

                isNative: false,
                isERC: true,
                isNFT: true,
                tokenType: tokenContract.tokenType,
                contractAddress: tokenContract.contractAddress,

                tokenUid: tokenContract.uid,
                tokenName: tokenContract.tokenName,
                tokenSymbol: tokenContract.tokenSymbol,
                tokenIconUri: tokenContract.tokenIconUri,
            };

        } else if (nft) {

            const nftTokenContract = realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered('uid == $0', nft.parentTokenContractUid).at(0);
            consoleDebugExtra(`Find Token : tokenContract : "${nftTokenContract}"  ...`);

            if (nftTokenContract) {

                token = {
                    networkUid: nftTokenContract.networkUid,

                    isNative: false,
                    isERC: true,
                    isNFT: true,
                    tokenType: nftTokenContract.tokenType,
                    contractAddress: nftTokenContract.contractAddress,

                    tokenUid: nft.uid,
                    tokenName: nft.tokenName,
                    tokenSymbol: nft.tokenSymbol,
                    tokenIconUri: nft.tokenIconUri,

                    tokenID: BigInt(nft.tokenIDHex),
                }
            }
        }
    } catch (error) {
        console.error(error);
    }

    consoleDebug(`Find Token : "${uid}"  --> ${token?.tokenType}, ${token?.contractAddress}, ${token?.tokenID} `);
    consoleDebugExtra(`Find Token : "${uid}"  --> \n ${toJson(token, 2)}`);

    return token;
}


export function findTokenByContractAddressTokenId(realm: Realm, contractAddress: string | undefined, tokenID: Numbers | undefined): Token | undefined {

    if (contractAddress === undefined) {
        return;
    }

    const contractAddr = contractAddress.toLowerCase();

    if (!Web3Extended.utils.isValidAddress(contractAddr)) {
        console.warn("Invalid contract address", contractAddr);
        return;
    }

    const contractQueryData: Partial<TokenContract> = { contractAddress: contractAddr };
    const contractQueryDataStr = toQueryString(contractQueryData, true);
    let tokenContract = realm.objects<TokenContractModel>(Models.TokenContract.Name).filtered(contractQueryDataStr).at(0);

    if (tokenContract === undefined) { return; }

    if (tokenContract.tokenType === 'ERC-20' || tokenID === undefined) {

        return findToken(realm, tokenContract.uid, true);

    } else {

        const tokenQueryData: Partial<NFT> = {
            parentTokenContractUid: tokenContract.uid,
            tokenIDHex: toHex(web3NumbersToBigInt(tokenID)),
        };

        const tokenQueryDataStr = toQueryString(tokenQueryData, true);
        const nft = realm.objects<NFTModel>(Models.NFT.Name).filtered(tokenQueryDataStr).at(0);

        if (nft) {
            return findToken(realm, nft.uid, true);
        }
    }

}


function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}