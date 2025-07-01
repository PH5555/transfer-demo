import _ from 'lodash';
import Web3Azeroth from './web3-contract';
import { Constants, SetStatus } from '../common/types';
import { SendContractTransactionResult } from '../web3';
import { consoleLogGasEstimation } from '../web3/web3-extended-log';
import { AuditKey, UserKey } from './keys';
import { addHexPrefix, toHex, toJson } from '../common/utilities';
import Encryption from '../common/crypto/deprecated/encryption';
import { EnaStatus, GetAllEnaStatusResult } from './types';
import { Network, Wallet } from '../type/types';

export async function getAPK(network: Network, privateKey: any): Promise<any> {
    const azerothWeb3 = new Web3Azeroth(network, privateKey);
    return new AuditKey(await azerothWeb3.getAPK(), 0n);
}

export async function checkEnaExist(
    {
        wallet,
        network,
        privateKey
    }: {
        wallet: Wallet,
        network: Network,
        privateKey: any
    }
): Promise<SetStatus> {

    const azerothWeb3 = new Web3Azeroth(network, privateKey);

    const userPublicKeyFromContract = await azerothWeb3.getUserPublicKeys(wallet.address);

    consoleDebug(toJson(JSON.parse(userPublicKeyFromContract?.toJson() as string), 2));

    if (userPublicKeyFromContract && (userPublicKeyFromContract.ena > 0n)) {
        return Constants.Set;
    } else {
        return Constants.NotSet;
    }
}


export async function getRegisterEnaGasFee(
    {
        userKeys,
        wallet,
        network,
        privateKey,
    }: {
        userKeys: UserKey,
        wallet: Wallet,
        network: Network,
        privateKey: string,
    }
): Promise<bigint> {

    try {

        const azerothWeb3 = new Web3Azeroth(network, privateKey);

        consoleLog('get registerUser gas fee ....');

        const result = await azerothWeb3.setUserPublicKeys({
            userPubKey: userKeys.pk,
            userEthAddress: wallet.address,
            userEthPrivateKey: null,
            estimateGasFeeOnly: true
        });

        consoleLog('get registerUser gas fee .... End : ');
        consoleDebug(consoleLogGasEstimation(result.gasEstimation));

        return result.gasEstimation ? result.gasEstimation.gasFee : 0n;

    } catch (error) {
        console.error("Error @ getRegisterEnaGasFee :", error);
        return 0n;
    }
}

// ENA 등록
export async function registerEna(
    {
        userEthPrivateKey,
        userKeys,
        wallet,
        network,
        privateKey,
    }: {
        userEthPrivateKey: string,
        userKeys: UserKey,
        wallet: Wallet,
        network: Network,
        privateKey: string,
    }
): Promise<SendContractTransactionResult | undefined> {

    try {

        const azerothWeb3 = new Web3Azeroth(network, privateKey);

        consoleLog('registerEna ....');

        const result = await azerothWeb3.setUserPublicKeys({
            userPubKey: userKeys.pk,
            userEthAddress: wallet.address,
            userEthPrivateKey,
            estimateGasFeeOnly: false,
        });

        consoleLog('registerEna .... End : ');

        if (result.error) {
            console.warn(
                'registerEna .... Error : ',
                toJson(result.error, 2),
                consoleLogGasEstimation(result.gasEstimation)
            );
        }

        return result;

    } catch (error) {
        console.error("Error @ registerEna :", error);
        return undefined;
    }
}

export async function getEnaIndexStatus(
    azerothWeb3: Web3Azeroth,
    ena: bigint,
    enaIndex: number,
    userSK: bigint
): Promise<EnaStatus | undefined> {

    consoleLog("getEnaIndexStatus : ", ena, enaIndex);

    const rawsCT = await azerothWeb3.getCiphertext(
        ena,
        enaIndex,
    );

    consoleDebug("getEnaIndexStatus : rawsCT=", toJson(rawsCT, 2));

    const r = toHex(BigInt(rawsCT[0]));
    const ct = [
        toHex(BigInt(rawsCT[1][0])),
        toHex(BigInt(rawsCT[1][1])),
        toHex(BigInt(rawsCT[1][2])),
    ];

    const sCT = new Encryption.sCT(r, ct);

    const symmetricKeyEnc = new Encryption.symmetricKeyEncryption(
        toHex(userSK),
    );

    let enaStatus: string[] = []
    try {
        enaStatus = symmetricKeyEnc.Dec(sCT);
    } catch (error) {
        console.error("getEnaIndexStatus : Error @ symmetricKeyEnc.Dec(sCT) ", error);
        return undefined;
    }

    consoleDebug("getEnaIndexStatus : enaStatus=", toJson(enaStatus, 2));

    let enaStatusParsed: EnaStatus;
    let contractAddress;
    let tokenID;
    let balance;
    try {
        contractAddress = addHexPrefix(enaStatus[0]);
        tokenID = BigInt(addHexPrefix(enaStatus[1]));
        balance = BigInt(addHexPrefix(enaStatus[2]));
    } catch (error) {
        console.error("getEnaIndexStatus : Error @ parsing decrypted data ", error);
        return undefined;
    }

    let contractAddressBigInt;
    try { contractAddressBigInt = BigInt(addHexPrefix(contractAddress)); } catch (error) { }

    if (contractAddress.toLowerCase() === "0x0000000000000000000000000000000000000000000000000000000000000000" ||
        contractAddress.toLowerCase() === "0x0" ||
        contractAddress.toLowerCase() === "0x" ||
        (contractAddressBigInt && contractAddressBigInt === 0n)
    ) {
        // native token
        enaStatusParsed = { sCT, tokenID, balance };
    } else {
        enaStatusParsed = { sCT, contractAddress, tokenID, balance };
    }

    consoleLog("getEnaIndexStatus : enaStatusParsed=", toJson(enaStatusParsed, 2, 'hex'));
    return enaStatusParsed;
}


export async function getAllEnaLength(
    userKey: UserKey,
    wallet: Wallet | undefined,
    network: Network | undefined,
    enaParam: { ena?: bigint, secretsDecryptionKey?: string },
    privateKey: string
): Promise<number | undefined> {

    if (!wallet || !network) return;

    consoleLog("getAllEnaLength ... :", wallet.enaHex, network.networkName);

    let ena: bigint;
    if (enaParam.ena) {
        ena = enaParam.ena;
    } else if (enaParam.secretsDecryptionKey) {
        ena = userKey.pk.ena
    } else {
        console.error(" Error @ getAllEnaLength  :  enaParam.ena =", enaParam.ena, " enaParam.secretsDecryptionKey =", enaParam.secretsDecryptionKey);
        return
    }

    const azerothWeb3 = new Web3Azeroth(network, privateKey);

    const enaLen = await azerothWeb3.getEnaLength(ena);

    consoleDebug("getAllEnaLength ... : ena status count =", enaLen);

    return enaLen;
}



// Ensure single execution instance
let getAllEnaStatusIsRunning: boolean;

type GetAllEnaStatusResolveFtn = {
    resolve: (value: GetAllEnaStatusResult | PromiseLike<GetAllEnaStatusResult>) => void;
    reject: (reason?: any) => void
}

let getAllEnaStatusAwaiters: GetAllEnaStatusResolveFtn[] = [];

export function getAllEnaStatus(
    userKey: UserKey,
    wallet: Wallet | undefined,
    network: Network | undefined,
    privateKey: string
): Promise<GetAllEnaStatusResult> {

    const P = new Promise<GetAllEnaStatusResult>(
        (resolve, reject) => { getAllEnaStatusAwaiters.push({ resolve, reject }); }
    );

    if (getAllEnaStatusIsRunning !== true) {

        consoleDebugExtra(
            "\n", ("=").repeat(40),
            "\n getAllEnaStatus Begin",
            "\n", ("=").repeat(40),
        );

        getAllEnaStatusIsRunning = true;

        getAllEnaStatusRun(
            userKey,
            wallet,
            network, 
            privateKey
        ).then(
            (result) => {
                try { getAllEnaStatusAwaiters.forEach(({ resolve }) => resolve(result)) } catch (error) { }
            }
        ).catch(
            (e) => {
                try { getAllEnaStatusAwaiters.forEach(({ reject }) => reject(e)) } catch (error) { }
            }
        ).finally(
            () => {
                consoleDebugExtra(
                    "\n", ("=").repeat(40),
                    "\n getAllEnaStatus Completed",
                    "\n", ("=").repeat(40),
                );
                getAllEnaStatusIsRunning = false;
                getAllEnaStatusAwaiters = [];
            }
        );
    } else {
        consoleDebugExtra(
            "\n", ("=").repeat(40),
            "\n getAllEnaStatus Already Running",
            "\n", ("=").repeat(40),
        );
    }

    return P;
}

export async function getAllEnaStatusRun(
    userKey: UserKey,
    wallet: Wallet | undefined,
    network: Network | undefined,
    privateKey: string
): Promise<GetAllEnaStatusResult> {

    let result: GetAllEnaStatusResult = {
        enaState: 'Unknown',
        enaList: [],
    };

    if (!wallet || !network) return result;

    consoleLog("getAllEnaStatus ... :", wallet.enaHex, network.networkName);

    const azerothWeb3 = new Web3Azeroth(network, privateKey);

    try {
        result.enaState = await checkEnaExist({ 
            wallet,
            network,
            privateKey
        });
    } catch (error) {
        return result;
    }

    if (result.enaState !== 'Set') {
        return result;
    }

    let enaLen;
    try {
        enaLen = await azerothWeb3.getEnaLength(userKey.pk.ena);
    } catch (error) {
        return result;
    }

    consoleDebug("getAllEnaStatus ... : ena status count =", enaLen);

    if (enaLen === undefined || enaLen <= 0) return result;

    for (let enaIndex = 0; enaIndex < enaLen; enaIndex++) {

        let enaStatus;
        try {
            enaStatus = await getEnaIndexStatus(azerothWeb3, userKey.pk.ena, enaIndex, userKey.sk);
        } catch (error) {
            continue;
        }

        // if (enaStatus) {

        //     //TODO: 토큰 추가
        //     let token;

        //     if (token !== undefined) {

        //         consoleLog("getAllEnaStatus ... : update enaIndex to localStore : ", token.tokenName, token.tokenUid, enaIndex);

        //         result.enaList.push({
        //             token: token,
        //             balance: enaStatus.balance,
        //             enaIndex,
        //             enaStatus,
        //         });
        //     }
        // }
    }

    return result;
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