import { Numbers } from 'web3';
import { numberToHex } from 'web3-utils';

export function stringify(object: any, space?: number | string) {
    return JSON.stringify(
        object,
        (_, v) => typeof v === 'bigint' ? numberToHex(v) : v
        , space
    );
}

export function web3NumbersToNumber(num: Numbers): number {
    return typeof num === 'number' ? num :
        typeof num === 'bigint' ? Number(num.toString(10)) :
            Number(num);
}

export function web3NumbersToBigInt(num: Numbers): bigint {
    return typeof num === 'bigint' ? num : BigInt(num);
}
