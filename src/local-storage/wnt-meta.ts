import _ from 'lodash';
import Realm, { BSON, UpdateMode } from 'realm';
//
//
import {
    Models,
    Network,
    NetworkModel,
    Wallet,
    WalletModel,
    WNMeta,
    WNMetaModel,
    WNTokenList,
    WNTokenListItem,
    WNTokenListModel,
} from './models';
import { toHex, toJson } from '../common/utilities';
import { Token, TokenUniqueID } from '../web3';
import { getNetwork, getWallet } from './common';
import { findToken } from './token';
import { AddNetworkTy, AddWalletTy } from './types';


export function addWallet(
    realm: Realm,
    address: string,
    data: AddWalletTy,
): Wallet | undefined {

    consoleLog("\nAdd Wallet : ",
        "\nAddress : ", address,
        "\nData :", toJson(data, 2)
    );

    const isNewRecord = getWallet(realm, address) === undefined;
    const allNetworks = realm.objects<NetworkModel>(Models.Network.Name);

    let wallet: Wallet | undefined = undefined;
    let WNMetaRecords: WNMeta[] = [];
    let nativeTokenListItems: WNTokenListItem[] = [];

    try {
        realm.write(
            () => {

                const record = realm.create<WalletModel>(
                    Models.Wallet.Name,
                    {
                        ...data,
                        address: address.toLowerCase(),
                        enaHex: toHex(data.ena),
                        masked: false,
                    },
                    UpdateMode.Modified
                );

                wallet = record;

                if (record !== undefined && isNewRecord) {
                    allNetworks.forEach(
                        network => {

                            // add wallet/network meta reocord for all networks
                            const wnMettaRecord = realm.create<WNMetaModel>(Models.WNMeta.Name, {
                                dbKey: new BSON.ObjectId(),
                                walletAddress: record.address,
                                networkUid: network.uid,
                            });

                            WNMetaRecords.push(wnMettaRecord);

                            // add default native token list item to token list for all networks
                            const nativeTokenListItem = realm.create<WNTokenListModel>(
                                Models.WNTokenList.Name,
                                {
                                    dbKey: new BSON.ObjectId(),
                                    walletAddress: record.address,
                                    networkUid: network.uid,
                                    tokenUid: network.uid,
                                },
                                UpdateMode.Modified
                            );

                            nativeTokenListItems.push(nativeTokenListItem);

                        }
                    );
                }
            }
        );

    } catch (error) {
        wallet = undefined;
        WNMetaRecords = [];
        nativeTokenListItems = [];
        console.warn("Error @ addWallet , ", error);
    }

    consoleLog("\nAdd Wallet Result: \n", toJson({ wallet, WNMetaRecords, nativeTokenListItems }, 2));

    return wallet;
}

export function addNetwork(
    realm: Realm,
    uid: TokenUniqueID,
    data: AddNetworkTy
): Network | undefined {

    consoleLog("\nAdd Network : ",
        "\nUid : ", uid,
        "\nData :", toJson(data, 2)
    );

    const isNewRecord = getNetwork(realm, uid) === undefined;
    const allWallets = realm.objects<WalletModel>(Models.Wallet.Name);

    let network: Network | undefined = undefined;
    let WNMetaRecords: WNMeta[] = [];
    let nativeTokenListItems: WNTokenListItem[] = [];

    try {
        realm.write(
            () => {

                const record = realm.create<NetworkModel>(
                    Models.Network.Name,
                    {
                        ...data,
                        azerothContractAddress: data.azerothContractAddress.toLowerCase(),
                        uid,
                    },
                    UpdateMode.Modified
                );

                network = record;

                if (record !== undefined && isNewRecord) {
                    allWallets.forEach(
                        wallet => {

                            // add wallet/network meta reocord for all wallets
                            const wnMettaRecord = realm.create<WNMetaModel>(Models.WNMeta.Name, {
                                dbKey: new BSON.ObjectId(),
                                walletAddress: wallet.address,
                                networkUid: record.uid,
                            });

                            WNMetaRecords.push(wnMettaRecord);

                            // add default native token list item to token list for all wallets
                            const nativeTokenListItem = realm.create<WNTokenListModel>(
                                Models.WNTokenList.Name,
                                {
                                    dbKey: new BSON.ObjectId(),
                                    walletAddress: wallet.address,
                                    networkUid: uid,
                                    tokenUid: uid,
                                },
                                UpdateMode.Modified
                            );

                            nativeTokenListItems.push(nativeTokenListItem);

                        }
                    );
                }
            }
        );
    } catch (error) {
        network = undefined;
        WNMetaRecords = [];
        nativeTokenListItems = [];
        console.warn("Error @ addNetwork , ", error);
    }

    consoleLog("\nAdd Network Result: \n", toJson({ network, WNMetaRecords, nativeTokenListItems }, 2));

    return network;
}


function queryString(wallet: Wallet, network: Network) {
    const walletAddress = wallet.address.toLowerCase();
    const networkUid = network.uid;
    const qString = `walletAddress == '${walletAddress}' && networkUid == '${networkUid}'`
    return { queryString: qString, walletAddress, networkUid };
}


export function getWNMeta(
    realm: Realm,
    wallet: Wallet,
    network: Network
): WNMeta {

    const qString = queryString(wallet, network);
    consoleDebug("getWNMeta ... : qString =", qString.queryString);
    let record = realm.objects<WNMetaModel>(Models.WNMeta.Name).filtered(qString.queryString).at(0);
    if (!record) console.warn("getWNMeta Error : ", toJson(record));

    consoleLog("Get Wallet/Network Meta :\n", toJson(record));

    return record as WNMetaModel;
}


export function updateWNMeta(
    realm: Realm,
    wallet: Wallet,
    network: Network,
    data: WNMeta
): WNMeta {

    const qString = queryString(wallet, network);
    consoleDebug("updateWNMeta ... : qString =", qString.queryString);
    let record = realm.objects<WNMetaModel>(Models.WNMeta.Name).filtered(qString.queryString).at(0);
    if (!record) console.warn("updateWNMeta Error : ", toJson(record));

    let updatedRecord;
    if (record) {

        const update = {
            enaExist: data.enaExist,
            enaLength: data.enaLength,
            registerEnaPagePresented: data.registerEnaPagePresented,
            latestZkEventBlkNum: data.latestZkEventBlkNum,
            earliestZkEventBlkNum: data.earliestZkEventBlkNum,
            startZkEventBlkNum: data.startZkEventBlkNum,
        };

        try {
            realm.write(
                () => {
                    updatedRecord = realm.create<WNMetaModel>(
                        Models.WNMeta.Name,
                        {
                            ...update,
                            dbKey: record.dbKey,
                        },
                        UpdateMode.Modified
                    );
                }
            );
        } catch (error) {
            console.warn("updateWNMeta write error : ", error);
        }
    }

    consoleLog("Update Wallet/Network Meta :\n", toJson(updatedRecord));

    return updatedRecord as unknown as WNMeta;
}


export function addWNToken(realm: Realm, wallet: Wallet, network: Network, tokenUniqueID: TokenUniqueID): Token | undefined {

    consoleLogAddToken("addTokenView ... \n", wallet.address, tokenUniqueID);

    const dbWallet = getWallet(realm, wallet.address);
    const dbNetwork = getNetwork(realm, network.uid);
    const dbToken = findToken(realm, tokenUniqueID, true);
    if (dbWallet === undefined || dbNetwork === undefined || dbToken === undefined) {
        console.error("addTokenView : Error , !dbWallet || !dbNetwork || !dbToken")
        return undefined;
    }

    let dbRecord = realm.objects<WNTokenListModel>(Models.WNTokenList.Name)
        .filtered('walletAddress  == $0 && tokenUid == $1', wallet.address, dbToken.tokenUid).at(0);

    if (dbRecord === undefined) {
        realm.write(
            () => {
                dbRecord = realm.create<WNTokenListModel>(
                    Models.WNTokenList.Name,
                    {
                        dbKey: new BSON.ObjectId(),
                        walletAddress: dbWallet.address,
                        networkUid: dbNetwork.uid,
                        tokenUid: dbToken.tokenUid,
                        pinDate: 0,
                    },
                    UpdateMode.Modified);
            }
        );
    }

    consoleLogAddToken("addTokenView added token list item to DB , Record = \n", toJson(dbRecord));

    return dbToken;
}

export function removeWNToken(realm: Realm, wallet: Wallet, tokens: Token[]) {

    consoleDebug("removeWNToken", wallet.address, tokens.map(t => t.tokenUid).join(' '));

    const list = tokens.filter(t => {
        if (t.tokenType === 'Native') {
            console.warn(" removeWNToken not removing native token");
            return false;
        } else {
            return true;
        };
    });

    const records = list.map(
        t => realm.objects<WNTokenListModel>(Models.WNTokenList.Name)
            .filtered('walletAddress  == $0 && tokenUid == $1', wallet.address, t.tokenUid)
    );

    if (records.length) {
        try {
            realm.write(
                () => {
                    records.forEach(record => {
                        if (record !== undefined && record !== null) {
                            realm.delete(record);
                        }
                    });
                }
            );
        } catch (error) {
            console.warn("removeWNToken : delete error : ", error);
        }
    }
}

export function updateWNToken(realm: Realm, wallet: Wallet, token: Token, data: Partial<Omit<WNTokenListItem, 'dbKey'>>) {

    consoleDebug("updateWNTokenListItem", wallet.address, token.tokenUid, token.tokenName, toJson(data));

    const record = realm.objects<WNTokenListModel>(Models.WNTokenList.Name)
        .filtered('walletAddress  == $0 && tokenUid == $1', wallet.address, token.tokenUid)
        .at(0);

    if (record) {
        try {

            realm.write(
                () => {
                    if (data.enaIndex !== undefined) record.enaIndex = data.enaIndex;
                    if (data.pinDate !== undefined) record.pinDate = data.pinDate;
                }
            );

            const updatedRecord = realm.objects<WNTokenListModel>(Models.WNTokenList.Name)
                .filtered('walletAddress  == $0 && tokenUid == $1', wallet.address, token.tokenUid)
                .at(0);
            consoleDebug("updateWNTokenListItem : updated  : ", toJson(updatedRecord, 2));

        } catch (error) {
            console.warn("updateWNTokenListItem : update error : ", error);
        }
    } else {
        // console.warn("updateWNTokenListItem : update error : record not found");
    }
}

export function getWNTokenList(realm: Realm, wallet: Wallet, network: Network): WNTokenList {

    const qString = queryString(wallet, network);
    consoleDebug("getTokenViewList ...: qString =", qString.queryString);
    const records = realm.objects<WNTokenListModel>(Models.WNTokenList.Name).filtered(qString.queryString);

    return records as unknown as WNTokenList;
}

export function getWNToken(realm: Realm, wallet: Wallet, token: Token): WNTokenListItem | undefined {

    consoleDebug("getWNToken", wallet.address, token.tokenUid);

    const record = realm.objects<WNTokenListModel>(Models.WNTokenList.Name)
        .filtered('walletAddress  == $0 && tokenUid == $1', wallet.address, token.tokenUid)
        .at(0);

    consoleDebug("getWNToken : record", toJson(record, 2));

    return record;
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleLogAddToken(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}