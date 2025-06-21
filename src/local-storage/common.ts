import _ from 'lodash';
import Realm, { UpdateMode } from 'realm';
import { sha3 } from 'web3-utils';
//
//
import { TokenUniqueID } from '../web3';
import {
    Wallet,
    Contact,
    Network,
    WebResourceCache,
    Models,
    WalletModel,
    NetworkModel,
    ContactModel,
    WebResourceCacheModel,
    WalletList,
    NetworkList,
    ContactList,
} from './models';
import { toHex, toJson } from '../common/utilities';
import { UpdateNetworkTy } from './types';


export function toQueryString(query_data: any, includeMasked?: boolean) {

    query_data.masked = includeMasked === true ? undefined : false;

    const query_string_list =
        Object.entries(query_data).map(
            ([key, value]) => {
                if (typeof value === 'number')
                    return `${key} == ${value}`
                else if (typeof value === 'string')
                    return `${key} == '${value}'`
                else if (typeof value === 'boolean')
                    return `${key} == ${value ? 'true' : 'false'}`
                else
                    return ""
            }).filter(it => it.length > 0)

    const query_string = query_string_list.join(' && ');

    consoleDebug('toQueryString : ' + toJson(query_data) + ' --> ' + toJson(query_string_list) + '  "' + query_string + '"');

    return query_string;
}

export function toQueryStringWithOutMask(query_data: any) {

    const query_string_list =
        Object.entries(query_data).map(
            ([key, value]) => {
                if (typeof value === 'number')
                    return `${key} == ${value}`
                else if (typeof value === 'string')
                    return `${key} == '${value}'`
                else if (typeof value === 'boolean')
                    return `${key} == ${value ? 'true' : 'false'}`
            }).filter(it => (typeof it === 'string' && it.length > 0))

    const query_string = query_string_list.join(' && ');

    consoleDebug('toQueryString : ' + toJson(query_data) + ' --> ' + toJson(query_string_list) + '  "' + query_string + '"');

    return query_string;
}

export function genHash(msg: string) {
    return (sha3(msg) as string).substring(0, 16);
}

export function updateWalletName(realm: Realm, wallet: Wallet, newName: string) {

    consoleLog("\nUpdate Wallet Name: ",
        "\nAddress : ", wallet.address,
        "\nNew name :", newName
    );

    realm.write(
        () => {
            realm.create<WalletModel>(
                Models.Wallet.Name,
                {
                    address: wallet.address.toLowerCase(),
                    name: newName
                },
                UpdateMode.Modified
            );
        }
    );
}

export function updateNetwork(realm: Realm, network: Network, update: UpdateNetworkTy) {

    const data: Partial<Network> = {
        networkIconCache: update.networkIconCache,
        latestZkEventBlkNum: update.latestZkEventBlkNum,
        earliestZkEventBlkNum: update.earliestZkEventBlkNum,
        startZkEventBlkNum: update.startZkEventBlkNum,
        latestZkTransferFeeHex: update.latestZkTransferFee ? toHex(update.latestZkTransferFee) : undefined,
        masked: update.masked 
    };

    consoleLog("\nUpdate Network :", network.networkName, "Update :\n", toJson(data));

    realm.write(
        () => {
            realm.create<NetworkModel>(
                Models.Network.Name,
                {
                    ...data,
                    uid: network.uid,
                },
                UpdateMode.Modified
            );
        }
    );
}

export function addContact(realm: Realm, address: string, data: Omit<Contact, 'address' | 'masked'>): Contact | undefined {

    consoleLog("\nAdd Contact : ",
        "\nAddress : ", address,
        "\nData :", toJson(data, 2)
    );

    let record: Contact | undefined = undefined;

    realm.write(
        () => {
            record = realm.create<ContactModel>(
                Models.Contact.Name,
                {
                    ...data,
                    address: address.toLowerCase(),
                    masked: false,
                },
                UpdateMode.Modified
            );
        }
    );

    return record;
}

export function updateContactName(realm: Realm, contact: Contact, newName: string) {

    consoleLog("\nUpdate Contact Name : ",
        "\nAddress : ", contact.address,
        "\nNew name :", newName
    );

    realm.write(
        () => {
            realm.create<ContactModel>(
                Models.Contact.Name,
                {
                    address: contact.address.toLowerCase(),
                    name: newName
                },
                UpdateMode.Modified
            );
        }
    );
}

export function updateContactEna(realm: Realm, contact: Contact, ena: bigint) {

    consoleLog("\nUpdate Contact Ena : ",
        "\nAddress : ", contact.address,
        "\n Ena  :", toHex(ena)
    );

    realm.write(
        () => {
            realm.create<ContactModel>(
                Models.Contact.Name,
                {
                    address: contact.address.toLowerCase(),
                    enaHex: toHex(ena),
                },
                UpdateMode.Modified
            );
        }
    );
}

export function maskWallet(realm: Realm, address: string) {

    consoleLog("\nMask Wallet : ",
        "\nAddress : ", address
    );

    const row = realm.objects<WalletModel>(Models.Wallet.Name).filtered('address == $0', address.toLowerCase()).at(0);

    if (row) {
        realm.write(
            () => {
                realm.create<WalletModel>(
                    Models.Wallet.Name,
                    {
                        address: row.address,
                        masked: true,
                    },
                    UpdateMode.Modified
                );
            }
        );
    }
}

export function maskContact(realm: Realm, address: string) {

    consoleLog("\nMask Contact : ",
        "\nAddress : ", address
    );

    const row = realm.objects<ContactModel>(Models.Contact.Name).filtered('address == $0', address.toLowerCase()).at(0);

    if (row) {
        realm.write(
            () => {
                realm.create<ContactModel>(
                    Models.Contact.Name,
                    {
                        address: row.address,
                        masked: true,
                    },
                    UpdateMode.Modified
                );
            }
        );
    }
}


export function getWallets(realm: Realm, includeMasked?: boolean) {
    const records = realm.objects<WalletModel>(Models.Wallet.Name);
    return (includeMasked === true ? records : records.filtered('masked == $0', false)) as unknown as WalletList;
}

export function getNetworks(realm: Realm, includeMasked?: boolean) {
    const records = realm.objects<NetworkModel>(Models.Network.Name);
    return (includeMasked === true ? records : records.filtered('masked == $0', false)) as unknown as NetworkList;
}

export function getContacts(realm: Realm, includeMasked?: boolean) {
    const records = realm.objects<ContactModel>(Models.Contact.Name);
    return (includeMasked === true ? records : records.filtered('masked == $0', false)) as unknown as ContactList;
}

export function getNetwork(realm: Realm, uid: TokenUniqueID) {
    return realm.objects<NetworkModel>(Models.Network.Name).filtered('uid == $0', uid).at(0)
}

export function getWallet(realm: Realm, address: string) {
    return realm.objects<WalletModel>(Models.Wallet.Name).filtered('address == $0', address.toLowerCase()).at(0)
}

export function getContact(realm: Realm, address: string) {
    return realm.objects<ContactModel>(Models.Contact.Name).filtered('address == $0', address.toLowerCase()).at(0)
}

export function getAddressName(realm: Realm, address?: string): string | undefined {

    if (address === undefined) return undefined;

    let name: string | undefined = undefined;

    const dbWallet = getWallet(realm, address);

    if (dbWallet) {
        name = dbWallet.name;
    } else {
        const dbContact = getContact(realm, address);
        if (dbContact) name = dbContact.name;
    }

    return name;
}

export function findNetwork(realm: Realm, uid: string | number | undefined) {

    let chainId = -1;
    try {
        chainId = uid ? parseInt(uid.toString()) : chainId;
    } catch (error) { }

    consoleDebug("findNetwork  ... ,", uid, chainId);

    if (uid !== undefined) {
        try {
            const byUid = realm.objects<NetworkModel>(Models.Network.Name).filtered('uid == $0', uid.toString()).at(0);
            if (byUid) return byUid;
            const bychainId = realm.objects<NetworkModel>(Models.Network.Name).filtered('chainId == $0', chainId).at(0);
            if (bychainId) return bychainId;
        } catch (error) { }
    }

    return undefined;
}


// add/update web/remote resources
export function updateWebResourceCache(
    realm: Realm,
    { uriHash, uri }: { uriHash?: string, uri?: string },
    webData: Omit<WebResourceCache, "uriHash" | "uri">
) {

    const __uriHash = uriHash ? uriHash : genHash(uri ? uri : "");

    const { base64Data } = webData;
    const metaData = { ...webData, base64Data: undefined };

    consoleDebug("\nUpdate Web Resource Cache :  ",
        "\nURI         :", uri, "[", uriHash, ",", __uriHash, "]",
        "\nbase64Data  :", `${base64Data.substring(0, 8)}....${base64Data.substring(base64Data.length - 8)}`,
        "\nmetaData    :", toJson(metaData)
    );

    realm.write(
        () => {
            realm.create<WebResourceCacheModel>(
                Models.WebResourceCache.Name,
                {
                    ...metaData,
                    uriHash: __uriHash,
                    uri,
                    base64Data,
                },
                UpdateMode.Modified
            );
        }
    );

    const dbRecord = getWebResourceCache(realm, { uriHash, uri }) as WebResourceCache;

    consoleDebug(
        "\nUpdate Web Resource Cache :  DB Record",
        toJson({
            ...dbRecord,
            base64Data: `${dbRecord.base64Data.substring(0, 8)}....${dbRecord.base64Data.substring(base64Data.length - 8)}`
        })
    );

    return dbRecord;
}

export function getWebResourceCache(realm: Realm, { uriHash, uri }: { uriHash?: string, uri?: string }) {
    const __uriHash = uriHash ? uriHash : genHash(uri ? uri : "");
    return realm.objects<WebResourceCacheModel>(Models.WebResourceCache.Name).filtered('uriHash == $0', __uriHash).at(0);
}



function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}