import _ from 'lodash';
import Realm, { BSON } from 'realm';
//
//
import {
    Models,
    Network,
    ZKTransfer,
    ZKTransferModel,
    ZkEventCache,
    ZkEventCacheList,
    ZkEventCacheModel
} from './models';
import {
    AddZkTransferParam,
    GetZkEventsFilter,
    GetZkTransferFilter,
    ZkCachingUpdateData,
} from './types';
import { toJson } from '../common/utilities';
import { toQueryStringWithOutMask, updateNetwork } from './common';
import { INote } from '../azeroth/interfaces';


export function addZkEventCache(
    realm: Realm,
    network: Network,
    updateData: ZkCachingUpdateData,
): ZkEventCache[] {

    const {
        latestZkEventBlkNum,
        earliestZkEventBlkNum,
        eventCacheList,
    } = updateData;

    consoleDebug("\nAdd/Update Network ZkEvent Caching  ... : ",
        "\nnetworkName : ", network.networkName,
        "\nlatestZkEventBlkNum :", latestZkEventBlkNum,
        "\nearliestZkEventBlkNum :", earliestZkEventBlkNum,
        "\neventCacheList :", eventCacheList.length,
    );

    const dataList: Omit<ZkEventCache, keyof Realm.Object>[] =
        eventCacheList.map(
            data => ({
                ...data,
                dbKey: new BSON.ObjectId(),
                eventDataJson: ZkEventCacheModel.getEventDataJson(data.eventData),
                eventData: undefined,
            })
        );

    let records: ZkEventCache[] = [];

    try {

        realm.write(
            () => {
                dataList.forEach(
                    (data) => {
                        const record = realm.create<ZkEventCacheModel>(Models.ZkEventCache.Name, data);
                        records.push(record);
                    }
                );
            }
        );

        updateNetwork(realm, network, { latestZkEventBlkNum, earliestZkEventBlkNum });

        consoleDebug("Update Network ZkCaching  ... success ");

    } catch (error) {
        console.error("Update Network ZkCaching  ... failed : ", error);
        records = [];
    }

    return records;
}


export function getZkEvents(
    realm: Realm,
    network: Network,
    blkNum: GetZkEventsFilter,
): Realm.Results<ZkEventCache> {

    consoleDebug("getZkEvents  ... : ",
        "networkName : ", network.networkName,
        "criteria :", toJson(blkNum)
    );

    const {
        blockNum,
        blockNumOrBefore,
        blockNumOrAfter,
        blocksBefore,
        blocksAfter,
    } = blkNum;

    let queryString = `networkUid == '${network.uid}'`;

    if (blockNum !== undefined) {

        queryString = queryString + ` && blockNumber == ${blockNum}`;

    } else if (blocksBefore !== undefined) {

        queryString = queryString + ` && blockNumber < ${blocksBefore}`;

    } else if (blocksAfter !== undefined) {

        queryString = queryString + ` && blockNumber > ${blocksAfter}`;

    } else if (blockNumOrBefore !== undefined || blockNumOrAfter !== undefined) {

        const [qString, sortOrder] = (
            (blockNumOrBefore && blockNumOrBefore > 0) ? [` && blockNumber <= ${blockNumOrBefore}`, true] :
                (blockNumOrAfter && blockNumOrAfter > 0) ? [` && blockNumber >= ${blockNumOrAfter}`, false] :
                    [``, true]
        );

        let events;
        try {
            events = realm.objects<ZkEventCacheModel>(Models.ZkEventCache.Name)
                .filtered(queryString + qString)
                .sorted([["blockNumber", sortOrder]]);
        } catch (error) {
            console.error(error);
        }

        if (events && events.length >= 1) {
            const blockNumber = events.at(0)?.blockNumber as number;
            // records.forEach(i => console_logs_2(i.blockNumber, i.transactionIndex));
            queryString = queryString + ` && blockNumber == ${blockNumber}`;
        } else {
            queryString = queryString + ` && blockNumber == ${-1}`;
        }

    } else {
        queryString = queryString + ` && blockNumber == ${-1}`;
    }

    const records = realm.objects<ZkEventCacheModel>(Models.ZkEventCache.Name)
        .filtered(queryString)
        .sorted(['transactionIndex']);

    consoleDebug(
        "getZkEvents  ... : ",
        "queryString =", queryString,
        " , Records =", records.length, "\n",
        records.map(i => `${i.blockNumber} , ${i.transactionIndex}`).join("\n")
    );

    return records as unknown as Realm.Results<ZkEventCache>;
}


export function cleanZkEventCache(realm: Realm, cleanList: ZkEventCache[] | ZkEventCacheList) {
    cleanList.forEach(row => {
        realm.write(() => {
            realm.delete(row);
        });
    });
}


export function addZkTransfer(
    realm: Realm,
    { network, mapList }: AddZkTransferParam,
): ZKTransfer[] {

    consoleLog("\nMove ZKEventCache --> ZKTransfer  ...");

    let resultList: ZKTransfer[] = [];

    const list = mapList.map(

        ({ transfer, token, cachedEventToRemove }) => {

            const amounts = transfer.amounts;
            const fromNote = amounts.fromNote?.note;
            const toNote = amounts.toPrivate?.note;

            const zkTransfer: Omit<ZKTransfer, keyof Realm.Object> = {
                ...transfer,
                from: transfer.from.toLowerCase(),
                to: transfer.to.toLowerCase(),
                transactionHash: transfer.transactionHash.toLowerCase(),
                dbKey: new BSON.ObjectId(),
                amountsJson: ZKTransferModel.getAmountsJson(amounts),
                networkUid: network.uid,
                tokenUid: token.tokenUid,
                tokenName: token.tokenName,
                tokenType: token.tokenType,
                hasFromPrivateNote: fromNote !== undefined,
                hasToPrivateNote: toNote !== undefined,
                toPrivateNoteIsSpent: (toNote) ? toNote.isSpent : false,
            };

            consoleDebugExtra(
                "\ntransfer : \n", toJson(transfer, 2),
                "\n <---> ",
                "\nzktransfer : \n", toJson(zkTransfer, 2)
            );

            let cachedEvent: ZkEventCache | undefined = undefined;

            if (cachedEventToRemove) {

                const dbKey = (cachedEventToRemove as Omit<ZkEventCache, keyof Realm.Object>).dbKey;

                if (dbKey) {
                    try {

                        cachedEvent = realm.objects<ZkEventCacheModel>(Models.ZkEventCache.Name)
                            .filtered('dbKey == $0', dbKey)
                            .at(0);

                        if (cachedEvent) {
                            consoleDebugExtra("delete cachedEventToRemove dbKey =", dbKey.toString());
                        } else {
                            console.warn(" cache not found : cachedEventToRemove dbKey = ", dbKey.toString());
                        }

                    } catch (error) {
                        console.error("Move ZKEventCache --> ZKTransfer : fetch ZkEventCache Error : ", error);
                    }

                } else {
                    console.warn(" dbKey not available if cachedEventToRemove object");
                }

            }

            return {
                zkTransfer,
                cachedEvent,
            }
        }
    );

    try {

        realm.write(
            () => {

                list.forEach(
                    (item) => {
                        if (item.cachedEvent) realm.delete(item.cachedEvent);
                        const result = realm.create<ZKTransferModel>(Models.ZKTransfer.Name, item.zkTransfer);
                        resultList.push(result);
                    }
                );
            }
        );

    } catch (error) {
        console.error("Move ZKEventCache --> ZKTransfer Error : ", error);
        resultList = [];
    }

    consoleLog("\nMove ZKEventCache --> ZKTransfer  ... Done : resultList ", resultList.length);

    return resultList;
}


export function getZkTransfers(
    realm: Realm,
    filter: GetZkTransferFilter
): Realm.Results<ZKTransfer> {

    let queryString = '';

    consoleLog(toJson(filter, 2));

    const filter_param = {
        ...filter,
        toOrFrom: undefined,
        matchTokenTypes: undefined,
    };

    if (filter.toOrFrom && filter.toOrFrom.length) {
        const addr = filter.toOrFrom.toLowerCase();
        filter_param.to = undefined;
        filter_param.from = undefined;
        queryString = toQueryStringWithOutMask(filter_param);
        queryString += ` && (to == '${addr}' || from == '${addr}')`;
    } else {
        filter_param.to = filter.to ? filter.to.toLowerCase() : undefined;
        filter_param.from = filter.from ? filter.from.toLowerCase() : undefined;
        queryString = toQueryStringWithOutMask(filter_param);
    }

    if (filter.matchTokenTypes && filter.matchTokenTypes.length > 0) {
        const matchTokenTypesStr = filter.matchTokenTypes.map(f => `tokenType == '${f}'`).join(' || ');
        queryString += ` && (${matchTokenTypesStr})`
    }

    if (filter.tokenName) {
        queryString += ` && (tokenName CONTAINS[c] '${filter.tokenName.toLowerCase()}')`;
    }

    consoleLog(queryString);

    consoleDebugExtra("getZkTransfers : filter = [", queryString, "]");
    const dbList = realm.objects<ZKTransferModel>(Models.ZKTransfer.Name)
        .filtered(queryString)
        .sorted([["blockNumber", true]]);
    consoleDebugExtra("getZkTransfers : dbList.length = ", dbList.length);
    return dbList as unknown as Realm.Results<ZKTransfer>;;
}


export function getZkTransfer(realm: Realm, dbKey: string): ZKTransfer | undefined {
    return realm.objects<ZKTransferModel>(Models.ZKTransfer.Name).filtered(
        'dbKey == $0',
        new BSON.ObjectId(dbKey)
    ).at(0);
}


export function getZkTransferByTransactionHash(realm: Realm, network: Network, transactionHash: string): ZKTransfer | undefined {
    return realm.objects<ZKTransferModel>(Models.ZKTransfer.Name).filtered(
        'networkUid == $0 && transactionHash == $1',
        network.uid,
        transactionHash
    ).at(0);
}


export function setToPrivateNoteIsSpent(realm: Realm, dbKey: string): number {

    const record = getZkTransfer(realm, dbKey) as ZKTransfer;
    // TODO: 여기부터 보기

    if (record && record.hasToPrivateNote) {

        const amounts = ZKTransferModel.getAmounts(record);
        if (amounts.toPrivate && amounts.toPrivate.note) amounts.toPrivate.note.isSpent = true;
        const amountsJsonUpdate = ZKTransferModel.getAmountsJson(amounts);

        try {
            realm.write(
                () => {
                    record.amountsJson = amountsJsonUpdate;
                    record.toPrivateNoteIsSpent = true;
                }
            );
        } catch (error) {
            console.error("Error @ setToPrivateNoteIsSpent : ", error);
            return -1;
        }

    } else if (record && !record.hasToPrivateNote) {
        return -2;
    } else {
        return -3;
    }

    return 0;
}


export function addToPrivateNote(realm: Realm, dbKey: string, note: INote): number {

    const record = getZkTransfer(realm, dbKey) as ZKTransfer;

    if (record) {

        const amounts = ZKTransferModel.getAmounts(record);
        amounts.toPrivate = {
            amount: amounts.toPrivate ? amounts.toPrivate.amount : note.amount,
            note,
        }
        const amountsJsonUpdate = ZKTransferModel.getAmountsJson(amounts);

        try {
            realm.write(
                () => {
                    record.amountsJson = amountsJsonUpdate;
                    record.toPrivateNoteIsSpent = note.isSpent;
                    record.hasToPrivateNote = true;
                }
            );
        } catch (error) {
            console.error("Error @ addToPrivateNote : ", error);
            return -1;
        }

    } else {
        return -2;
    }

    return 0;
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