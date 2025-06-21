import _ from 'lodash';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs'; 
import { fromWei, toWei, EtherUnits } from 'web3-utils';

//
// Common Types
//

export class ProcessingState {

    processing: boolean = false;
    done: boolean = false;
    progress: number = -1;
    success: boolean = false;
    fail_reason: any;
    payload: any;

    __reset__() {
        this.processing = false;
        this.done = false;
        this.progress = -1;
        this.success = false;
        this.fail_reason = undefined;
        this.payload = undefined;
    }

    constructor() { this.__reset__(); }

    reset(): ProcessingState {
        this.__reset__();
        return _.clone(this);
    }

    setProcessing(payload?: any): ProcessingState {
        this.processing = true;
        this.progress = 0;
        this.payload = payload;
        return _.clone(this);
    }

    advanceProgress(payload?: any): ProcessingState {
        this.progress = this.progress + 1;
        this.payload = payload;
        return _.clone(this);
    }

    setProgress(progress: number, payload?: any): ProcessingState {
        this.progress = progress;
        this.payload = payload;
        return _.clone(this);
    }

    setDone(success: boolean = true): ProcessingState {
        this.done = true;
        this.success = success;
        this.progress = 100;
        return _.clone(this);
    }

    setFailed(failReason: any = undefined): ProcessingState {
        this.done = true;
        this.success = false;
        this.progress = 100;
        this.fail_reason = failReason;
        return _.clone(this);
    }

    getProgress() { return this.progress; }
    isIdle() { return !this.processing }
    isProcessing() { return this.processing && !this.done; }
    isComplete() { return this.processing && this.done; }
    isSuccess() { return this.processing && this.done && this.success; }
    isFailed() { return this.processing && this.done && !this.success; }
    failReason() { return this.isFailed() ? this.fail_reason : undefined }
    getPayload() { return this.payload; }

    toString() {
        const str = this.isIdle() ? "Idle" :
            this.isProcessing() ? "Processing" + (this.progress ? " ~~ " + this.progress.toString() : "") :
                this.isSuccess() ? "Success" :
                    this.isFailed() ? "Failed" + (this.fail_reason ? " [" + this.fail_reason + "]" : "") :
                        "";
        return str;
    }
};

const checkPinValidity = (pin: number[]): boolean => {
    const consecutiveRegex = /(\d)\1{2,}/; // Regex to find 3 or more consecutive digits of the same value
    const repeatPatternRegex = /(\d{2,})\1+/; // Regex to find repeated patterns like "1212" or "123123"

    const pinAsString = pin.join(''); // Convert the array to a string

    // Function to check for strictly increasing or decreasing sequences
    const isConsecutiveSequence = (pin: string): boolean => {
        const increasingSeq = '0123456789';
        const decreasingSeq = '9876543210';

        // Check for the PIN as a substring in both increasing and decreasing sequences
        return (
            increasingSeq.includes(pin) ||
            decreasingSeq.includes(pin)
        );
    };

    // If any condition matches, return false (i.e., PIN is weak)
    return !(
        consecutiveRegex.test(pinAsString) ||
        repeatPatternRegex.test(pinAsString) ||
        isConsecutiveSequence(pinAsString)
    );
};



function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};


async function readJsonFile(filePath: string): Promise<any | undefined> {

    let fileData;
    let jsonObj;

    try {
        if (Platform.OS === 'android') {
            fileData = await RNFS.readFileAssets(
                filePath,
                'utf8'
            );
        } else {
            fileData = await RNFS.readFile(
                RNFS.MainBundlePath + '/' + filePath,
                'utf8',
            );
        }
    } catch (error) {
        console.error('Error reading file:', error);
        return undefined;
    }

    try {
        jsonObj = JSON.parse(fileData);
    } catch (error) {
        console.error('Error parsing json file:', error);
    }

    return jsonObj;
}

function EmptyFtn() { return; }

function splitTextIntoEqualLines(text: string, lineWidth: number) {
    const lines = [];
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (currentLine.length + 1 + char.length > lineWidth) {
            lines.push(currentLine);
            currentLine = '';
        }
        currentLine += char;
    }
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    return lines;
}


export const DefaultNativeDecimals: number = 18

function decimalToCryptoUnit(tokenDecimals: number | undefined): EtherUnits | number {
    if (tokenDecimals === undefined || tokenDecimals <= 0) return 'wei';
    return tokenDecimals;
}

function unitToWei(amount: string, tokenDecimals: number | undefined): bigint {
    const use_crypto_unit = decimalToCryptoUnit(tokenDecimals);
    return BigInt(toWei(amount, use_crypto_unit));
}

function unitFromWei(weiAmount: bigint, tokenDecimals: number): string {
    const use_crypto_unit = decimalToCryptoUnit(tokenDecimals);
    return fromWei(weiAmount, use_crypto_unit);
}

export function getAmountDisplay(
    amount: bigint,
    unit: EtherUnits | number,
    maxStringLength: number | undefined
) {

    let amount_str = fromWei(amount, unit)

    const amount_parts = amount_str
        .replace('-', '')
        .replace(',', '')
        .replace(' ', '')
        .split('.');

    let [int_part, float_part] =
        amount_parts.length === 1 ? [amount_parts[0], "0"] :
            amount_parts.length === 2 ? [amount_parts[0], amount_parts[1]] :
                ["0", "0"];

    if (unit === 'wei' || unit === 0) {
        amount_str = addComma(int_part);
    } else {
        float_part = float_part.trim().length ? float_part : "0";
        float_part = float_part.substring(0, 6);
        amount_str = addComma(int_part) + "." + float_part;
    }

    if (maxStringLength && amount_str.length > maxStringLength) {
        amount_str = amount_str.substring(0, maxStringLength - 2) + '...';
    }

    return amount_str
}

function getBalanceDisplayString(
    {
        publicAmount,
        secretAmount,
        tokenDecimals,
        maxStringLength,
    }: {
        publicAmount?: bigint,
        secretAmount?: bigint,
        tokenDecimals: number | undefined,
        maxStringLength?: number | undefined
    }
) {

    const use_crypto_unit = decimalToCryptoUnit(tokenDecimals);

    const publicAmountStr = publicAmount ? getAmountDisplay(publicAmount, use_crypto_unit, maxStringLength) : "0";
    const secretAmountStr: string = secretAmount ? getAmountDisplay(secretAmount, use_crypto_unit, maxStringLength) : "0";

    return {
        publicAmountStr,
        secretAmountStr,
    }
}

export function getAmountDisplayString(
    amount: bigint,
    tokenDecimals: number | undefined,
    maxStringLength?: number | undefined
) {
    const use_crypto_unit = decimalToCryptoUnit(tokenDecimals);
    return getAmountDisplay(amount, use_crypto_unit, maxStringLength);
}

function addComma(amount: string): string {
    if (amount === '0') { return '0'; }
    return amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function removePrefix(hexString: string) {
    if (hexString.substring(0, 2) === '0x') {
        return hexString.replace('0x', '');
    }
    return hexString;
}

export function hexToBytes(hexString: string) {
    if (hexString.toString().substring(0, 2) === '0x') {
        hexString = hexString.substring(2);
    }
    for (var bytes = [], c = 0; c < hexString.length; c += 2) {
        bytes.push(parseInt(hexString.substr(c, 2), 16));
    }
    return bytes;
}

export function hexToInt(hexString: string) {
    if (hexString.toString().substring(0, 2) !== '0x') {
        hexString = '0x' + hexString;
    }
    return BigInt(hexString);
}

export function hexListToIntList(hexList: any) {
    const intList = [];
    for (let i = 0; i < hexList.length; i++) {
        intList[i] = hexToInt(hexList[i]);
    }
    return intList;
}

export function decStrToHex(decString: string) {
    return BigInt(decString).toString(16);
}

export function decArrayToHexArray(decArray: string[]) {
    const hexArray = [];
    for (let i = 0; i < decArray.length; i++) {
        hexArray[i] = decStrToHex(decArray[i]);
    }
    return hexArray;
}

export function asciiToHex(str: string) {
    let arr = [];

    for (let n = 0, l = str.length; n < l; n++) {
        let hex = Number(str.charCodeAt(n)).toString(16);
        arr.push(hex);
    }

    return arr.join('');
}


export function addHexPrefix(hexString: string) {
    return "0x" + hexString.toLowerCase().replace("0x", "");
}


export function addPrefixHex(hexString: string) {
    if (hexString.length < 2 || hexString.substring(0, 2) !== '0x') {
        return '0x' + hexString;
    } else {
        return hexString;
    }
}

export function padZeroHexString(hexString: string, length: number = 64) {
    if (hexString.substring(0, 2) === '0x') {
        return hexString.substring(2, hexString.length).padStart(length, '0');
    } else {
        return hexString.substring(0, hexString.length).padStart(length, '0');
    }
}

export function addPrefixAndPadHex(hexString: string, length: number = 64) {
    hexString = padZeroHexString(hexString, length);
    return '0x' + hexString;
}

export function addPrefixAndPadHexFromArray(hexArray: any, length: number = 64) {
    const flat: any[] = [];
    hexArray.forEach((element: string) => {
        if (Array.isArray(element)) {
            flat.push(...addPrefixAndPadHexFromArray(element, length));
        } else {
            flat.push(addPrefixAndPadHex(element, length));
        }
    });

    return flat;
}


export function toHex(bn: bigint | number) {
    return "0x" + bn.toString(16).toLowerCase().replace("0x", "");
};

export function fromHex(hex: string) {
    return BigInt("0x" + hex.toLowerCase().replace("0x", ""));
};

export type ToJsonConsoleLogBigIntFormat = 'hex' | undefined;

export function toJson(object: any, space?: number | string, format?: ToJsonConsoleLogBigIntFormat) {
    return JSON.stringify(
        object,
        (_, v) => typeof v === 'bigint' ? (format === 'hex' ? addHexPrefix(v.toString(16)) : v.toString(10) + "n") : v
        , space
    );
}

export function toObjFromJson(json: string) {
    return JSON.parse(
        json,
        (_, v) => {
            if (typeof v === 'string' && v.substring(v.length - 1) === "n") {
                try {
                    // console.debug("possibly bigint");
                    return BigInt(v.substring(0, v.length - 1));
                } catch (error) {
                    // console.debug("not bigint");
                    return v
                }
            } else {
                return v;
            }
        }
    );
}

export { web3NumbersToNumber, web3NumbersToBigInt } from '../../web3/utils';


/**
 * Generates a random integer within a specified range.
 */
export function getRandomInteger(max: number) {
    if (!Number.isInteger(max) || max <= 0) {
        throw new Error('Max must be a positive integer.');
    }
    const randomDecimal = Math.random();
    const randomNumber = randomDecimal * max;
    return Math.floor(randomNumber);
}


export async function readFile(filePath: string) {
    let fileData;
    try {
        if (Platform.OS === 'android') {
            fileData = await RNFS.readFileAssets(filePath, 'base64');
        } else {
            fileData = await RNFS.readFile(
                RNFS.MainBundlePath + '/' + filePath,
                'base64',
            );
        }
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
    return fileData;
}


/**
 * A function to read file as binary and return byte(uint8) array
 * @param {string} filePath
 * @returns {Promise<number[]|null>}
 */
export async function readFileAsUint8Array(filePath: string) {
    const fileData = await readFile(filePath);
    const byteArray = new Uint8Array(Buffer.from(fileData as string, 'base64'));
    return [].slice.call(byteArray);
}

export function toShortHex(hex?: string | undefined, useZeroHash?: boolean | undefined) {
    return hex !== undefined ?
        "0x" + hex.replace("0x", "").substring(0, 4) + '...' + hex.slice(-4) :
        useZeroHash ? '0x0' : '';
}

export function toShortString(str: string, len : number = 4) {
    return str.substring(0, len) + '...' + str.slice(-len);
}

export function toSecretString(str: string | undefined) {
    return str !== undefined ? ("*").repeat(12) : 'undefined';
}

const utilities = {
    checkPinValidity,
    shuffleArray,
    readJsonFile,
    EmptyFtn,
    splitTextIntoEqualLines,
    toWei: unitToWei,
    fromWei: unitFromWei,
    getBalanceDisplayString,
    getAmountDisplayString,
    addComma,
    asciiToHex,
    decArrayToHexArray,
    decStrToHex,
    addPrefixHex,
    readFileAsUint8Array
};

export default utilities;