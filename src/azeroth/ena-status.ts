import _ from 'lodash';
import Web3Azeroth from './web3-contract';
import { Constants, SetStatus } from '../common/types';
import { getPrivateKey, getUserKey } from './wallet';
import { SendContractTransactionResult } from '../web3';
import { consoleLogGasEstimation } from '../web3/web3-extended-log';
import { AuditKey } from './keys';
import { addHexPrefix, toHex, toJson } from '../common/utilities';
import Encryption from '../common/crypto/deprecated/encryption';
import { EnaStatus, GetAllEnaStatusResult } from './types';
import {
    LocalStore,
    Network,
    Wallet
} from '../local-storage';
import { findToken } from '../common/network';

export async function getAPK(network: Network): Promise<any> {
    const azerothWeb3 = new Web3Azeroth(network);
    return new AuditKey(await azerothWeb3.getAPK(), 0n);
}

export async function checkEnaExist(
    {
        wallet,
        network,
    }: {
        wallet: Wallet,
        network: Network,
    }
): Promise<SetStatus> {

    const azerothWeb3 = new Web3Azeroth(network);

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
        wallet,
        network,
        secretsDecryptionKey,
    }: {
        wallet: Wallet,
        network: Network,
        secretsDecryptionKey: string,
    }
): Promise<bigint> {

    try {

        const azerothWeb3 = new Web3Azeroth(network);

        const userKeys = await getUserKey(wallet, secretsDecryptionKey);

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
        wallet,
        network,
        secretsDecryptionKey,
    }: {
        wallet: Wallet,
        network: Network,
        secretsDecryptionKey: string,
    }
): Promise<SendContractTransactionResult | undefined> {

    try {

        const azerothWeb3 = new Web3Azeroth(network);

        // wallet private key를 secretsDecryptionKey로 복호화
        const userEthPrivateKey = await getPrivateKey(wallet, secretsDecryptionKey);

        const userKeys = await getUserKey(wallet, secretsDecryptionKey);

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
    wallet: Wallet | undefined,
    network: Network | undefined,
    enaParam: { ena?: bigint, secretsDecryptionKey?: string }
): Promise<number | undefined> {

    if (!wallet || !network) return;

    consoleLog("getAllEnaLength ... :", wallet.enaHex, network.networkName);

    let ena: bigint;
    if (enaParam.ena) {
        ena = enaParam.ena;
    } else if (enaParam.secretsDecryptionKey) {
        const userKey = await getUserKey(wallet, enaParam.secretsDecryptionKey);
        ena = userKey.pk.ena
    } else {
        console.error(" Error @ getAllEnaLength  :  enaParam.ena =", enaParam.ena, " enaParam.secretsDecryptionKey =", enaParam.secretsDecryptionKey);
        return
    }

    const azerothWeb3 = new Web3Azeroth(network);

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
    wallet: Wallet | undefined,
    network: Network | undefined,
    secretsDecryptionKey: string,
    localStore: LocalStore,
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
            wallet,
            network,
            secretsDecryptionKey,
            localStore,
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
    wallet: Wallet | undefined,
    network: Network | undefined,
    secretsDecryptionKey: string,
    localStore: LocalStore
): Promise<GetAllEnaStatusResult> {

    let result: GetAllEnaStatusResult = {
        enaState: 'Unknown',
        enaList: [],
    };

    if (!wallet || !network) return result;

    consoleLog("getAllEnaStatus ... :", wallet.enaHex, network.networkName);

    const userKey = await getUserKey(wallet, secretsDecryptionKey);

    const azerothWeb3 = new Web3Azeroth(network);

    try {
        result.enaState = await checkEnaExist({
            wallet,
            network,
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

    localStore.getModifier().updateWNMeta(wallet, network, { enaLength: enaLen });

    for (let enaIndex = 0; enaIndex < enaLen; enaIndex++) {

        let enaStatus;
        try {
            enaStatus = await getEnaIndexStatus(azerothWeb3, userKey.pk.ena, enaIndex, userKey.sk);
        } catch (error) {
            continue;
        }

        if (enaStatus) {

            let token;
            try {
                token = await findToken({
                    network,
                    localStore,
                    contractAddress: enaStatus.contractAddress,
                    tokenID: enaStatus.tokenID,
                    addToLocalStoreIfNotExist: true,
                });
            } catch (error) {
                continue;
            }

            if (token !== undefined) {

                consoleLog("getAllEnaStatus ... : update enaIndex to localStore : ", token.tokenName, token.tokenUid, enaIndex);

                localStore.getModifier().WNToken.update(wallet, token, { enaIndex: enaIndex });

                result.enaList.push({
                    token: token,
                    balance: enaStatus.balance,
                    enaIndex,
                    enaStatus,
                });
            }
        }
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