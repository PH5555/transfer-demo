import Realm from 'realm'; 
import {
    NetworkModel,
    NetworkEndPointModel,
} from './models';
import {
    EndPointMetric,
    EndPointProtocol,
    RpcUrlSelectionPolicy,
    TokenUniqueID
} from '../web3/types';

export function dbMigration(oldRealm: Realm, newRealm: Realm) {
    consoleLog(`migration version : ${oldRealm.schemaVersion} --> 2`);
    if (oldRealm.schemaVersion === 1) {
        fromVersion1(oldRealm, newRealm);
    }
    consoleLog(`migration completed`);
}

class Version1NetworkModel {
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
    rpcUrlList!: string[];
    primaryRpcUrlIndex!: number;
    rpcUrlSelectionPolicy!: RpcUrlSelectionPolicy;
    rpcUrlLastUsedIndex!: number;
    masked!: boolean;
}

function fromVersion1(oldRealm: Realm, newRealm: Realm) {
    
    consoleLog(`fromVersion1 ...`);
    
    //
    //  Migrate NetworkModel
    //
    const oldNetworks = oldRealm.objects(NetworkModel);
    const newNetworks: Realm.Results<NetworkModel> = newRealm.objects(NetworkModel);
    
    for (const objectIndex in oldNetworks) {
        
        const oldNetwork = oldNetworks[objectIndex] as unknown as Version1NetworkModel;
        let newNetwork = newNetworks[objectIndex];
        
        consoleDebug(``);
        consoleDebug(`${objectIndex} , ${oldNetwork.uid} , ${newNetwork.uid}`);
        
        if (oldNetwork.uid !== newNetwork.uid) {
            newNetwork = newNetworks.find(n => n.uid === oldNetwork.uid) as NetworkModel;
        }
        
        consoleDebug(`oldNetwork.primaryRpcUrlIndex : ${oldNetwork.primaryRpcUrlIndex}`);
        consoleDebug(`oldNetwork.rpcUrlList : {${oldNetwork.rpcUrlList.length}} ${oldNetwork.rpcUrlList.map(n => ("\n - " + n))}`);
        
        const rpcUrlList = oldNetwork.rpcUrlList;
        const primaryRpcUrlIndex = oldNetwork.primaryRpcUrlIndex;
        
        consoleDebug(`newNetwork.endPointList : {${newNetwork.endPointList.length}} ${newNetwork.endPointList.map(n => (`\n - ${n.url}, [${n.supportedProtocols.join()}], ${n.metric}`))}`);

        const endPointList = rpcUrlList.map((url, index) => ({
            url: url,
            supportedProtocols: [EndPointProtocol.ETH],
            metric: index === primaryRpcUrlIndex ? EndPointMetric.SELF_HOSTED : EndPointMetric.PUBLIC_RATE_LIMITED,
        })) as NetworkEndPointModel[];
        
        newNetwork.endPointList.push(...endPointList);
    
        consoleDebug(`newNetwork.endPointList : {${newNetwork.endPointList.length}} ${newNetwork.endPointList.map(n => (`\n - ${n.url}, [${n.supportedProtocols.join()}], ${n.metric}`))}`);
    }
}


function consoleLog(message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    console.debug(message, ...optionalParams);
}