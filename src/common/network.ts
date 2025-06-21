import _ from 'lodash';
const aesjs = require('aes-js');
import Web3Extended from '../web3/web3-extended';
import { getTokenMeta, Token } from '../web3';
import { cacheWebImageToLocalStore } from './caching';
import { KVStoreKeys, LocalStore, Network } from '../local-storage';
import { getAmountDisplayString, toJson, toSecretString, toShortString } from './utilities';
import { getZkTransferFee } from '../azeroth/transfer';
import { NetworkEndPoint } from '../local-storage/models';
import {
    EndPointMetric,
    EndPointProtocol,
    ZkWalletEnabledNetworkConfig,
    ZkWalletEnabledNetworkConfigEncKey,
} from '../web3/types';
import { NetworkConfigRemoteURLs } from './types';

export async function zkWalletNetworkSetupAndUpdate(localStore: LocalStore, useRemoteList: boolean = true) {

    let networkConfig: ZkWalletEnabledNetworkConfig | undefined = undefined;
    const dbNetworks = localStore.getNetworks();
    const dbNetworkListConfigHash = localStore.get(KVStoreKeys.ZK_WALLET_NETWORKS_CONFIG_HASH) || "-";

    if (useRemoteList) {
        consoleLog("Load remote config");
        networkConfig = await fetchZkWalletNetworkList(dbNetworks.length, dbNetworkListConfigHash);
    } else {
        consoleLog("Load embedded config");
        networkConfig = require('../assets/zk-wallet-networks.json');
        consoleDebugExtra('Embedded Network Config :', toJson(networkConfig, 2));
    }

    if (networkConfig === undefined || networkConfig === null) return;

    if (dbNetworks.length > 0 && networkConfig.configHash === dbNetworkListConfigHash) {
        consoleLog("config matches localstore config, no update required");
        return;
    }

    if (dbNetworks.length > 0) {
        zkWalletNetworkUpdate(localStore, networkConfig);
    } else {
        zkWalletNetworkSetup(localStore, networkConfig);
    }

    localStore.set(KVStoreKeys.ZK_WALLET_NETWORKS_CONFIG_HASH, networkConfig.configHash);
}

function zkWalletNetworkSetup(localStore: LocalStore, networkConfig: ZkWalletEnabledNetworkConfig) {

    const currentNetworkListConfigHash = localStore.get(KVStoreKeys.ZK_WALLET_NETWORKS_CONFIG_HASH) || "-";
    const currentNetworks = localStore.getNetworks();
    consoleLog(`zkWalletNetworkSetup : Current Config ${currentNetworkListConfigHash}`);
    consoleDebug(
        toJson(currentNetworks.map(net => ({
            networkUid : net.uid,
            networkName: net.networkName,
            endPointList: net.endPointList,
            masked: net.masked,
        })), 2));
    
    consoleLog(`zkWalletNetworkSetup : New Config ${networkConfig.configHash}`);
    consoleDebug(
        toJson(networkConfig.zkWalletEnabledNetworks.map(net => ({
            networkUid: net.NetworkUid,
            networkName: net.Name,
            endPointList: [...net.EndPoints, ...(net.IndexerEndPoints || [])],
            masked: net.Masked,
        })), 2));
    
    // add / update all network info
    for (let index = 0; index < networkConfig.zkWalletEnabledNetworks.length; index++) {

        const network_meta = networkConfig.zkWalletEnabledNetworks[index];
        
        const networdUid = network_meta.NetworkUid;
        const name = network_meta.Name;
        const rpcUrlList: string[] = network_meta.EndPoints;
        const indexerEndPoints = network_meta.IndexerEndPoints || [];
        const primaryRpcUrlIndex = network_meta.PrimaryRpcUrlIndex !== undefined ? network_meta.PrimaryRpcUrlIndex : -1;
        const chainId = network_meta.ChainID;
        const azerothContractAddress = network_meta.zkWalletContractAddress;
        const azerothContractBlk = network_meta.zkWalletContractDeployBlockNum;
        const unit: any = network_meta.NativeUnit.toString();
        const imageUri = network_meta.ImageURI;
        const averageBlockTime = network_meta.AverageBlockTime !== undefined ? network_meta.AverageBlockTime : 12 ;
        const isTestNet = network_meta.TestNet;
        const masked = network_meta.Masked !== undefined && network_meta.Masked === true;

        try {

            const endPointList: NetworkEndPoint[] = [
                ...rpcUrlList.map((url, index) => ({
                    url: url,
                    supportedProtocols: [EndPointProtocol.ETH],
                    metric: index === primaryRpcUrlIndex ? EndPointMetric.SELF_HOSTED : EndPointMetric.PUBLIC_RATE_LIMITED,
                })),
                ...indexerEndPoints.map((indexer) => ({
                    url: indexer.url,
                    supportedProtocols: indexer.supportedProtocols,
                    metric: validMetric(indexer.metric),
                }))
            ];

            const db_network = localStore.getModifier().network.add(networdUid, {
                networkName: name,
                endPointList,
                networkId: chainId,
                chainId: chainId,
                azerothContractAddress,
                azerothContractBlk: azerothContractBlk,
                networkIconUri: imageUri,
                networkIconCache: undefined,
                nativeSymbol: unit,
                decimal: 18,
                averageBlockTime: averageBlockTime,
                isTestNet: isTestNet === true,
                masked,
            });

            consoleDebugExtra('DB Network : ', toJson(db_network, 2));

        } catch (error) {
            console.error(error);
        }

    }

    // cache icons
    setTimeout(() => getExtraNetworkData(localStore), 500);
}

function zkWalletNetworkUpdate(localStore: LocalStore , networkConfig : ZkWalletEnabledNetworkConfig) {
    zkWalletNetworkSetup(localStore, networkConfig);
}

const validMetric = (indexerMetric: any): EndPointMetric => {
        const metricValue = EndPointMetric[indexerMetric as keyof typeof EndPointMetric];
        return metricValue !== undefined ? metricValue : EndPointMetric.PUBLIC_RATE_LIMITED;
};

async function fetchZkWalletNetworkList(dbNetworkListLength : number , dbNetworkListConfigHash: string) {
     
    let remoteConfig : ZkWalletEnabledNetworkConfig ;
    
    try {
    
        const response = await fetch(NetworkConfigRemoteURLs[0]);
        const data = await response.json() as ZkWalletEnabledNetworkConfig;
        const configHash = data.configHash || "-";
        const zkWalletEnabledNetworks = data.zkWalletEnabledNetworks || [];
        const zkWalletEnabledNetworksCipher = data.zkWalletEnabledNetworksCipher;
        const zkWalletEnabledNetworksCipherIV = data.zkWalletEnabledNetworksCipherIV;
        
        if (zkWalletEnabledNetworksCipher === undefined ||
            zkWalletEnabledNetworksCipher === null ||
            zkWalletEnabledNetworksCipherIV === undefined ||
            zkWalletEnabledNetworksCipherIV === null
        ) {
            throw (`invalid remote config ct/iv`);
        }
        
        remoteConfig = { configHash, zkWalletEnabledNetworks, zkWalletEnabledNetworksCipher, zkWalletEnabledNetworksCipherIV };

        consoleDebugExtra('remoteConfig.zkWalletEnabledNetworksCipher :', toShortString(remoteConfig.zkWalletEnabledNetworksCipher, 8));
        consoleDebugExtra('remoteConfig.zkWalletEnabledNetworksCipherIV :',  toSecretString(remoteConfig.zkWalletEnabledNetworksCipherIV));
    
    } catch (error) {
        consoleLog("fetch remote config error : ", error);
        return;
    }

    if (dbNetworkListLength && remoteConfig.configHash === dbNetworkListConfigHash) {
        consoleLog("remote config matches local config, no update required");
        return;
    }
     
    consoleLog("decrypt remote config");

    consoleLog("load embedded key config");
    const secrets = require('../assets/zk-wallet-networks-enc-key.json') as ZkWalletEnabledNetworkConfigEncKey;
    consoleDebugExtra(`secrets : ${toSecretString(secrets.secretKey)}`);
    
    let decryptedText;
    try {
        const secretKeyBytes = aesjs.utils.utf8.toBytes(secrets.secretKey);
        const ivBytes = aesjs.utils.utf8.toBytes(remoteConfig.zkWalletEnabledNetworksCipherIV);
        const ctBytes = Buffer.from(remoteConfig.zkWalletEnabledNetworksCipher, 'base64');
        const aesCbc = new aesjs.ModeOfOperation.cbc(secretKeyBytes, ivBytes);
        const decryptedBytes = aesCbc.decrypt(ctBytes);
        decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
        consoleDebugExtra('decryptedText :', toShortString(decryptedText, 8));
    } catch (error) {
        consoleLog("decrypt remote config error : ", error);
        return;
    }

    try {
        remoteConfig.zkWalletEnabledNetworks = JSON.parse(decryptedText);
    } catch (error) {
        consoleLog("parse decrypted remote config error : ", error);
        return;
    }

    return remoteConfig;
}

async function getExtraNetworkData(localStore: LocalStore) {
    const networks = localStore.getNetworks();
    networks.forEach(
        async (network) => {

            let iconCache;
            let zkFee;

            const imageUri = network.networkIconUri;
            try {
                iconCache = await cacheWebImageToLocalStore(imageUri, localStore);
                consoleDebug(`Icon cache for network [${network.networkName}] , ${iconCache?.uriHash}`);
                consoleDebugExtra(`${toJson(iconCache, 2)}`);
            } catch (e) {
                console.error(` *** Could not fetch network [${network.networkName}] icon [${imageUri}] , Error:[${e}] ***`);
            }

            try {
                zkFee = await getZkTransferFee(network);
                consoleDebug(`zkTransfer Fee for network [${network.networkName}] : ${getAmountDisplayString(zkFee, network.decimal)} ${network.nativeSymbol}`);
            } catch (e) {
                console.error(` *** Could not get network [${network.networkName}] zkTransfer Fee , Error:[${e}] ***`);
            }

            localStore.getModifier().network.update(network, {
                networkIconCache: iconCache ? iconCache.uriHash : undefined,
                latestZkTransferFee: zkFee ? zkFee : undefined,
            });

        });
}

export async function findToken(
    {
        contractAddress,
        tokenID,
        network,
        localStore,
        addToLocalStoreIfNotExist = true
    }: {
        contractAddress?: string,
        tokenID?: bigint,
        network: Network,
        localStore: LocalStore,
        addToLocalStoreIfNotExist?: boolean
    }
) {

    const endPointList = network.endPointList.map(e => e);

    let token: Token | undefined;

    consoleLog("networks::findToken ... : Params : \n", toJson({ contractAddress, tokenID, addToLocalStoreIfNotExist }, 2));

    let is_native = false;
    if (contractAddress === undefined) {
        is_native = true;
    } else {
        try {
            // native token address should resolve to zero
            const contractAddressNum = BigInt(contractAddress.toLowerCase() + "0");
            is_native = contractAddressNum === 0n;
        } catch (error) { }
    }

    if (is_native) {

        token = localStore.findToken(network.uid);

    } else if (contractAddress === undefined) {

        token = undefined;

    } else {

        if (!Web3Extended.utils.isValidAddress(contractAddress)) {

            token = undefined;

        } else {

            token = localStore.findTokenByContractAddressTokenId(contractAddress, tokenID);

            if (token === undefined) {

                consoleDebug("networks::findToken ... : find token meta from network ...");

                token = await getTokenMeta(network.uid, network.averageBlockTime, endPointList, contractAddress, tokenID);
                consoleDebug("networks::findToken ... : find token meta from network ... , net_meta =\n", toJson(token, 2));

                if (token && addToLocalStoreIfNotExist) {

                    if (token.isNFT && token.tokenID !== undefined) {
                        // add parent token first
                        let parentToken = localStore.findTokenByContractAddressTokenId(contractAddress, undefined);

                        if (parentToken === undefined) {
                            parentToken = await getTokenMeta(network.uid, network.averageBlockTime, endPointList, contractAddress, undefined);
                        }

                        if (parentToken) {
                            const parentTokenDB = localStore.getModifier().token.addToken(network, parentToken);
                            if (parentTokenDB) parentToken = localStore.findToken(parentTokenDB.uid);
                        }

                        consoleDebug("networks::findToken ... : nft parent token =\n", toJson(parentToken, 2));

                        if (parentToken) {
                            const db = localStore.getModifier().token.addToken(network, token);
                            if (db) token = localStore.findToken(db.uid);
                            consoleDebug("networks::findToken ... : find token meta from network ... , after db insert token =\n", toJson(token, 2));
                        } else {
                            console.warn("networks::findToken ... : add nft parent failed ");
                        }

                    } else {
                        const db = localStore.getModifier().token.addToken(network, token);
                        if (db) token = localStore.findToken(db.uid);
                        consoleDebug("networks::findToken ... : find token meta from network ... , after db insert token =\n", toJson(token, 2));
                    }
                }
            }
        }
    }

    consoleLog("networks::findToken ... complete : \n", toJson(token, 2));
    return token;
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