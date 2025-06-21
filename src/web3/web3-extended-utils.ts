import _ from 'lodash';
import Web3, { Numbers } from 'web3';
import { checkAddressCheckSum, isAddress } from 'web3-validator';
import { numberToHex } from 'web3-utils';
import { TokenUniqueID } from './types';
import { stringify } from './utils';

export function genTokenUniqueID({
    networkId,
    chainId,
    contractAddress,
    tokenId
}: {
    networkId?: Numbers,
    chainId: Numbers,
    contractAddress?: string,
    tokenId?: Numbers
}): { hash: TokenUniqueID, tokenPath: string } {

    const tokenPath: bigint[] = [];
    tokenPath.push(BigInt(networkId ? networkId : chainId));
    tokenPath.push(BigInt(chainId));

    if (contractAddress) {
        tokenPath.push(BigInt(contractAddress));
        if (tokenId !== undefined) {
            tokenPath.push(BigInt(tokenId));
        }
    }

    const path_str = tokenPath.map(b => numberToHex(b)).join("/");

    const hash = {
        hash: (Web3.utils.sha3(path_str) as TokenUniqueID).substring(0, 16),
        tokenPath: path_str
    };

    consoleDebug("createTokenUniqueId :", stringify(hash));

    return hash;
}

export function isValidAddress(address: string) {
    if (!isAddress(address)) { return false; }
    const checkSumAddr = Web3.utils.toChecksumAddress(address);
    return checkAddressCheckSum(checkSumAddr);
}

/**
 * Helper class to calculate adjusted gas value that is higher than estimate
 */
export class GasHelper {
    static gasMulptiplier = 1.2 // Increase by 20%

    static gasPay(gasLimit: bigint) {
        return BigInt(Math.ceil(Number(gasLimit.toString(10)) * GasHelper.gasMulptiplier))
    }
}

function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.debug(message, ...optionalParams);
}