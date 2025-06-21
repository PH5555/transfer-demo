import { fromWei } from 'web3-utils';
import { LocalStore, Network, Wallet, ZKTransferModel } from '../local-storage';
import AES, { AESCT } from '../common/crypto/aes';
import MiMC from '../common/crypto/mimc'
import { Token, Web3Erc1155, Web3Erc20, Web3Erc721 } from '../web3';
import { UserKey } from './keys';
import utilities, { getRandomInteger, toHex, toJson, toObjFromJson } from '../common/utilities';
import { AffinePoint } from '../common/crypto/curve';
import { getAllEnaStatus } from './ena-status';
import { Balance, BalanceUpdateList, GetAllEnaStatusResult, TokenOwnershipType } from './types';
import AppAssets from '../assets/registry';
import { AddWalletTy } from '../local-storage/types';
import Web3Azeroth from './web3-contract';
import { UnSpentWalletNoteItem, UnSpentWalletNoteList } from '../common/types';


export async function setupWalletAccount(
    {
        address,
        privateKey,
        mnemonic = "NOT SET",
        secretsDecryptionKey
    }: {
        address: string,
        privateKey: string,
        mnemonic?: string,
        secretsDecryptionKey: string,
    }
): Promise<AddWalletTy> {

    consoleLog("Setup Wallet .... : ", toJson({
        address,
        privateKey,
        mnemonic
    }, 2));

    const priKey = BigInt("0x" + privateKey.toLowerCase().replace("0x", ""));

    const usk = deriveUskFromPrivateKey(priKey);
    consoleDebug("secret key: ", toHex(usk));

    const userKey = UserKey.recoverFromUserSk(usk);

    const ctPrivateKey: AESCT = await AES.encryptData(toHex(priKey), secretsDecryptionKey);
    const ctMnemonic: AESCT = await AES.encryptData(mnemonic, secretsDecryptionKey);
    const ctSecretKey: AESCT = await AES.encryptData(toHex(usk), secretsDecryptionKey);
    const placeholderIconIndex = getRandomInteger(AppAssets.AccountIcons.length);
    const wallet: AddWalletTy = {
        address,
        name: '',
        ena: userKey.pk.ena,
        pkOwn: toHex(userKey.pk.pkOwn),
        pkEncJson: toJson(userKey.pk.pkEnc),
        ctPrivateKey,
        ctMnemonic,
        ctSecretKey,
        placeholderIconIndex,
    };

    consoleDebug("Wallet : ", toJson(wallet, 2));

    return wallet;
}

function deriveUskFromPrivateKey(privateKey: bigint) {
    const mimc7 = new MiMC.MiMC7();
    return mimc7.hash(privateKey);
}

export async function getPrivateKey(wallet: Wallet, aesKey: string): Promise<string> {
    const privateKey = await AES.decryptData(wallet.ctPrivateKey, aesKey);
    consoleDebug("getPrivateKey : ", privateKey);
    return privateKey;
}

export async function getMnemonic(wallet: Wallet, aesKey: string): Promise<string> {
    const mnemonic = await AES.decryptData(wallet.ctMnemonic, aesKey);
    consoleDebug("getMnemonic : ", mnemonic);
    return mnemonic;
}
 
export async function getUserKey(wallet: Wallet, aesKey: string): Promise<UserKey> {
    const userSecretKey = await AES.decryptData(wallet.ctSecretKey, aesKey);
    const pkEnc: AffinePoint = toObjFromJson(wallet.pkEncJson);
    const userKey = new UserKey({
        ena: BigInt(wallet.enaHex),
        pkOwn: BigInt(wallet.pkOwn),
        pkEnc: new AffinePoint(pkEnc.x, pkEnc.y),
        sk: BigInt(userSecretKey)
    });
    consoleDebug("getUserKey : ", toJson(userKey, 2, 'hex'));
    return userKey;
}

export type BalanceToFetch = 'Public' | 'Private' | 'Both';

export const fetchWalletBalance = async (
    {
        token,
        tokens,
        balanceToFetch = 'Both',
        wallet,
        network,
        secretsDecryptionKey,
        localStore,
        allEnaStatus,
        azerothWeb3,
    }: {
        token?: Token;
        tokens?: Token[];
        balanceToFetch: BalanceToFetch;
        wallet?: Wallet;
        network?: Network;
        secretsDecryptionKey: string;
        localStore: LocalStore;
        allEnaStatus?: GetAllEnaStatusResult;
        azerothWeb3?: Web3Azeroth;
    }
): Promise<BalanceUpdateList> => {

    if (!network || !wallet) {
        console.error(" !network || !wallet , ", network, ',', wallet)
        return ([]);
    }

    const endPointList = network.endPointList.map(e => e);
    const token_list = tokens ? tokens : token ? [token] : [];
    const balance_list: BalanceUpdateList = [];

    const fetch_eoa = balanceToFetch === 'Public' || balanceToFetch === 'Both';
    const fetch_ena = balanceToFetch === 'Private' || balanceToFetch === 'Both';

    const web3 = azerothWeb3 ? azerothWeb3 : new Web3Azeroth(network);

    let localAllEnaStatus = allEnaStatus;
    if (fetch_ena && localAllEnaStatus === undefined) {
        try {
            localAllEnaStatus = await getAllEnaStatus(wallet, network, secretsDecryptionKey, localStore);
        } catch (error) { }
    }

    for (let i = 0; i < token_list.length; i = i + 1) {

        const token = token_list[i];
        const {
            tokenUid,
            tokenType,
            contractAddress,
            tokenID,
            isNFT,
        } = token;

        let eoaBalance: bigint | undefined = undefined;
        let enaBalance: bigint | undefined = undefined;
        let tokenOwnership: TokenOwnershipType | undefined = undefined;

        if ((isNFT && tokenID === undefined)) {
            continue;
        }

        if (fetch_eoa) {

            balConsolelogs(`EOA Fetch : network=${network.networkName} , wallet=${wallet.address} , tokenType=${tokenType}`)

            if (tokenType === 'Native') {

                try {
                    const balance = await web3.getBalance(wallet.address);
                    if (balance) eoaBalance = BigInt(balance);
                } catch (error) {
                    console.warn(error);
                }

            } else if (tokenType === 'ERC-20') {

                try {
                    const web3 = new Web3Erc20(network.uid, network.averageBlockTime, endPointList, contractAddress);
                    const balance = await web3.balanceOf(wallet.address);
                    if (balance) eoaBalance = BigInt(balance);
                } catch (error) {
                    console.warn(error);
                }

            } else if (tokenType === 'ERC-721' && tokenID !== undefined) {

                try {

                    const web3 = new Web3Erc721(network.uid, network.averageBlockTime, endPointList, contractAddress);
                    if (await web3.isOwner(wallet.address, tokenID) === true) {
                        tokenOwnership = 'PubliclyOwned';
                    }

                } catch (error) {
                    console.warn(error);
                }

            } else if (tokenType === 'ERC-1155' && tokenID !== undefined) {

                try {
                    const web3 = new Web3Erc1155(network.uid, network.averageBlockTime, endPointList, contractAddress);
                    const balance = await web3.balanceOf(wallet.address, tokenID);
                    if (balance) eoaBalance = BigInt(balance);
                } catch (error) {
                    console.warn(error);
                }

            } else {
                console.warn("Error : tokenType =", tokenType);
            }

        }

        if (fetch_ena && localAllEnaStatus) {

            const fetchedEna = localAllEnaStatus.enaList.find((e) => e.token.tokenUid === tokenUid);

            if (fetchedEna) {
                const enaContractAddress = fetchedEna.enaStatus.contractAddress;
                const balance = fetchedEna.enaStatus.balance;

                if (tokenType === 'Native' && enaContractAddress === undefined) {
                    enaBalance = balance;
                } else if (enaContractAddress === contractAddress && (tokenType === 'ERC-20' || tokenType === 'ERC-1155')) {
                    enaBalance = balance;
                } else if (enaContractAddress === contractAddress && tokenType === 'ERC-721' && balance >= 1n) {
                    tokenOwnership = 'PrivatelyOwned';
                }

                balConsolelogs(`ENA Fetch : network=${network.networkName} , wallet=${wallet.address} , tokenType=${tokenType} , enaIndex=${fetchedEna.enaIndex}`)
            }
        }

        const bal: Balance = { tokenUid, eoaBalance, enaBalance, tokenOwnership };

        try {
            balConsolelogs(
                'Fetch Balances :',
                wallet.address.substring(0, 4) + '...' + wallet.address.substring(wallet.address.length - 4),
                ',', tokenType,
                toJson(bal, 2),
            );
        } catch (error) { }

        balance_list.push({ key: bal.tokenUid, data: bal });

    }

    return balance_list;
}

export const fetchNativePublicBalance = async (
    {
        address,
        network,
        azerothWeb3,
    }: {
        address: string;
        network: Network;
        azerothWeb3?: Web3Azeroth;
    }
): Promise<bigint> => {

    let eoaBalance = 0n;

    try {
        const web3 = azerothWeb3 ? azerothWeb3 : new Web3Azeroth(network);
        eoaBalance = await web3.getBalance(address);
    } catch (error) {
        console.warn(error);
    }

    balConsolelogs(
        'Public Native Balance :',
        address.substring(0, 4) + '...' + address.substring(address.length - 4),
        fromWei(eoaBalance, 'ether'), ' , (', eoaBalance, ')'
    );

    return BigInt(eoaBalance);
}

export function getUnSpentWalletNoteList(
    localStore: LocalStore,
    wallet: Wallet | undefined,
    token: Token | undefined
): UnSpentWalletNoteList {

    let list: UnSpentWalletNoteList = [];

    if (token && wallet) {

        localStore.getZkTransfers({
            tokenUid: token.tokenUid,
            to: wallet.address,
            hasToPrivateNote: true,
            toPrivateNoteIsSpent: false
        }).forEach(dbTransfer => {

            const amounts = ZKTransferModel.getAmounts(dbTransfer);
            const note = amounts.toPrivate?.note;

            if (note && note.amount > 0n) {

                const noteAmt = note.amount;
                const uiNoteAmt = utilities.getAmountDisplayString(noteAmt, token.decimal);
                const noteAddress = (amounts.toPrivate && amounts.toPrivate.note) ? toHex(amounts.toPrivate.note.commitment) : '0x0';
                const uiNoteAddress = noteAddress.substring(0, 8);

                const item: UnSpentWalletNoteItem = {
                    dbKey: ZKTransferModel.getKey(dbTransfer),
                    dbTransfer,
                    amounts,
                    note,
                    noteAmt,
                    noteAddress,
                    uiNoteAmt,
                    uiNoteAddress,
                };

                list.push(item);
            }
        })
    }

    return list;
}

function balConsolelogs(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleLog(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}