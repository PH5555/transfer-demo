import _ from 'lodash';
import { useEffect, useState } from 'react';
import { CollectionChangeSet } from 'realm';
//
//
import { Token, TokenType, TokenUniqueID } from '../web3/types';

import {
    Models,
} from './models';

import type {
    Wallet,
    Contact,
    Network,
    ZkEventCache,
    WebResourceCache,
    WNMeta,
    WNTokenListItem,
    ZkEventCacheList,
} from './models';

import {
    AddNFTDataTy,
    KVStoreKeys,
    LocalStore,
    AddTokenContractTy,
    ZkCachingUpdateData,
    GetZkTransferFilter,
    AddZkTransferParam,
    UpdateNetworkTy,
    AddWalletTy,
    GetZkEventsFilter,
    AddNetworkTy,
} from './types';

import {
    addContact,
    getNetwork,
    updateWalletName,
    updateContactName,
    getWallet,
    findNetwork,
    maskContact,
    maskWallet,
    updateWebResourceCache,
    getWebResourceCache,
    getContact,
    getAddressName,
    getWallets,
    getNetworks,
    getContacts,
    updateNetwork,
    updateContactEna,
} from './common';

import {
    addToPrivateNote,
    addZkEventCache,
    addZkTransfer,
    cleanZkEventCache,
    getZkEvents,
    getZkTransfer,
    getZkTransferByTransactionHash,
    getZkTransfers,
    setToPrivateNoteIsSpent,
} from './azeroth';

import { getData, storeData } from './key-value';

import {
    addNFT,
    addToken,
    addTokenContract,
    findToken,
    findTokenByContractAddressTokenId,
    getAllTokenContracts,
    getFlattenedNFTs,
    getNFTToken,
    getNFTTokens,
    getTokenContract,
    getTokenContracts,
} from './token';

import {
    getWNMeta,
    addWallet,
    addNetwork,
    getWNTokenList,
    addWNToken,
    removeWNToken,
    updateWNToken,
    getWNToken,
    updateWNMeta,
} from './wnt-meta';

import {
    useRealm,
} from './init';

import { INote } from '../azeroth/interfaces';
import { Numbers } from 'web3';

export function useLocalStore(): LocalStore {

    const realm = useRealm();

    return {

        get: (key: KVStoreKeys) => getData(realm, key),
        set: (key: KVStoreKeys, value: string | undefined) => storeData(realm, key, value),

        getResourceCache: (keyParam: { uriHash?: string, uri?: string }) => getWebResourceCache(realm, keyParam),
        setResourceCache: (keyParam: { uriHash?: string, uri?: string }, webData: Omit<WebResourceCache, "uriHash" | "uri">) => updateWebResourceCache(realm, keyParam, webData),

        getWallet: (address: string) => getWallet(realm, address),
        getWallets: (includeMasked?: boolean) => getWallets(realm, includeMasked),

        getNetwork: (uid: TokenUniqueID) => getNetwork(realm, uid),
        getNetworks: (includeMasked?: boolean) => getNetworks(realm, includeMasked),

        getContact: (address: string) => getContact(realm, address),
        getContacts: (includeMasked?: boolean) => getContacts(realm, includeMasked),

        getAddressName: (address?: string) => getAddressName(realm, address),

        getTokenContract: (uid: TokenUniqueID) => getTokenContract(realm, uid),
        getTokenContracts: (networkUid: TokenUniqueID, tokenType?: TokenType) => getTokenContracts(realm, networkUid, tokenType),
        getAllTokenContracts: (networkUid?: TokenUniqueID) => getAllTokenContracts(realm, networkUid),

        getNFTToken: (uid: TokenUniqueID) => getNFTToken(realm, uid),
        getNFTTokens: () => getNFTTokens(realm, { includeMasked: false }),
        getAllNFTTokens: () => getNFTTokens(realm, { includeMasked: true }),

        getWNMeta: (wallet: Wallet, network: Network) => getWNMeta(realm, wallet, network),
        getWNToken: (wallet: Wallet, token: Token) => getWNToken(realm, wallet, token),
        getWNTokenList: (wallet: Wallet, network: Network) => getWNTokenList(realm, wallet, network),

        getFlattenedNFTs: (networkUid: TokenUniqueID, includeMasked: boolean = false) => getFlattenedNFTs(realm, networkUid, includeMasked),

        findToken: (uid: TokenUniqueID | undefined, includeMasked?: boolean) => findToken(realm, uid ? uid : '', includeMasked),
        findTokenByContractAddressTokenId: (contractAddress: string | undefined, tokenID: Numbers | undefined) => findTokenByContractAddressTokenId(realm, contractAddress, tokenID),
        findNetwork: (uid: TokenUniqueID | number | undefined) => findNetwork(realm, uid),

        getZkEvents: (network: Network, filter: GetZkEventsFilter) => getZkEvents(realm, network, filter),

        getZkTransfer: (transferDBKey: string) => getZkTransfer(realm, transferDBKey),

        getZkTransfers: (filter: GetZkTransferFilter) => getZkTransfers(realm, filter),

        getZkTransferByTransactionHash: (network: Network, transactionHash: string) => getZkTransferByTransactionHash(realm, network, transactionHash),

        getModifier: () => ({

            set: (key: KVStoreKeys, value: string | undefined) => storeData(realm, key, value),

            wallet: {
                add: (address: string, data: AddWalletTy) => addWallet(realm, address, data),
                updateName: (wallet: Wallet, newName: string) => updateWalletName(realm, wallet, newName),
                mask: (address: string) => maskWallet(realm, address),
            },

            network: {
                add: (uid: TokenUniqueID, data: AddNetworkTy ) => addNetwork(realm, uid, data),
                update: (network: Network, update: UpdateNetworkTy) => updateNetwork(realm, network, update),
            },

            contact: {
                add: (address: string, data: Omit<Contact, 'address' | 'masked'>) => addContact(realm, address, data),
                updateName: (contact: Contact, newName: string) => updateContactName(realm, contact, newName),
                updateEna: (contact: Contact, ena: bigint) => updateContactEna(realm, contact, ena),
                mask: (address: string) => maskContact(realm, address),
            },

            token: {
                addContract: (uid: TokenUniqueID, data: AddTokenContractTy) => addTokenContract(realm, uid, data),
                addNFT: (parentContractUid: TokenUniqueID, tokenId: bigint, data: AddNFTDataTy) => addNFT(realm, parentContractUid, tokenId, data),
                addToken: (network: Network, token: Token) => addToken(realm, network, token),
            },

            updateWNMeta: (wallet: Wallet, network: Network, data: WNMeta) => updateWNMeta(realm, wallet, network, data),

            WNToken: {
                add: (wallet: Wallet, network: Network, tokenUniqueID: TokenUniqueID) => addWNToken(realm, wallet, network, tokenUniqueID),
                remove: (wallet: Wallet, tokens: Token[]) => removeWNToken(realm, wallet, tokens),
                update: (wallet: Wallet, token: Token, data: Partial<Omit<WNTokenListItem, 'dbKey'>>) => updateWNToken(realm, wallet, token, data),
            },

            azeroth: {

                cleanZkEventCache: (cleanList: ZkEventCache[] | ZkEventCacheList) => cleanZkEventCache(realm, cleanList),

                addZkEventCache: (
                    network: Network,
                    updateData: ZkCachingUpdateData,
                ) => addZkEventCache(realm, network, updateData),

                addZkTransfer: (param: AddZkTransferParam) => addZkTransfer(realm, param),

                setToPrivateNoteIsSpent: (dbKey: string) => setToPrivateNoteIsSpent(realm, dbKey),

                addToPrivateNote: (dbKey: string, note: INote) => addToPrivateNote(realm, dbKey, note),
            }

        }),
    };
}

export function useDBListChangedListener(modelName: string, callCack: (collection: any, changes: CollectionChangeSet) => void) {

    const realm = useRealm();
    const [DBList] = useState(realm.objects(modelName));
    const [dbListChange, setDbListChange] = useState<{ collection: any, changes: CollectionChangeSet } | undefined>(undefined);

    useEffect(() => {
        onLoad();
        return () => onUnLoad();
    }, []);

    function dbCallCack(collection: any, changes: CollectionChangeSet) {
        setDbListChange({ collection, changes });
    }

    function onLoad() {
        DBList.addListener(dbCallCack);
    }

    function onUnLoad() {
        DBList.removeListener(dbCallCack);
    }

    useEffect(() => {
        if (dbListChange !== undefined) {
            callCack(dbListChange.collection, dbListChange.changes);
        }
    }, [dbListChange]);

}

export function useWalletListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.Wallet.Name, callCack);
}

export function useContactListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.Contact.Name, callCack);
}

export function useTokenContractListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.TokenContract.Name, callCack);
}

export function useNFTListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.NFT.Name, callCack);
}

export function useTokenViewListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.WNTokenList.Name, callCack);
}

export function useZKTransferListChangedListener(callCack: (collection: any, changes: CollectionChangeSet) => void) {
    useDBListChangedListener(Models.ZKTransfer.Name, callCack);
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}