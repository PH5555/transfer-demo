import _ from 'lodash';
/**
 * Padded before '0's up to length [width]
 *
 * @param {number} width
 * @return {String|string}
 */
String.prototype.fillZero = function (width) {
    return this.length >= width
        ? this
        : new Array(width - this.length + 1).join('0') + this;
};

/**
 * Returns true if data satisfies the BigInt format, otherwise false.
 * ex) true: 1, 1n, 0b1, 0x1, ab, 0xab ...
 *
 * @param {any} data
 * @returns {boolean}
 */
export function isBigIntFormat(data) {
    if (_.isNil(data) || data === '') {
        return false;
    }
    if (typeof data === 'bigint') {
        return true;
    }
    return isNaN(data) ? !isNaN('0x' + data) : !isNaN(data);
}

export function isHexStringFormat(data) {
    if (data.substring(0, 2) !== '0x') {
        return false;
    }
    return isBigIntFormat(data);
}

/**
 *
 * @param {string} hexString
 * @param {64|42} length
 * @returns {false}
 */
export function isPrefixHexString(hexString, length = 64) {
    return isHexStringFormat(hexString) && hexString.length === length + 2;
}

/**
 *
 * @param {number} data
 * @returns {boolean}
 */
export function isUnsignedInteger(data) {
    return data >= 0 && !Number.isNaN(data);
}

/**
 *
 * @param {string} hexString hexadecimal string
 * @returns {bigint}
 */
export function hexToInt(hexString) {
    if (hexString.toString().substring(0, 2) !== '0x') {
        hexString = '0x' + hexString;
    }
    return BigInt(hexString);
}

/**
 *
 * @param {Array[string]} hexList hexadecimal string array
 * @returns {Array[bigint]}
 */
export function hexListToIntList(hexList) {
    const intList = [];
    for (let i = 0; i < hexList.length; i++) {
        intList[i] = hexToInt(hexList[i]);
    }
    return intList;
}

/**
 *
 * @param {string} hexString    hexadecimal string
 * @returns {Array}             bytes array
 */
export function hexToBytes(hexString) {
    if (hexString.toString().substring(0, 2) === '0x') {
        hexString = hexString.substring(2);
    }
    for (var bytes = [], c = 0; c < hexString.length; c += 2) {
        bytes.push(parseInt(hexString.substr(c, 2), 16));
    }
    return bytes;
}

export function decStrToHex(decString) {
    return BigInt(decString).toString(16);
}

export function hexStrToDec(hexString) {
    return BigInt(addPrefixHex(hexString)).toString(10);
}

export function decArrayToHexArray(decArray) {
    const hexArray = [];
    for (let i = 0; i < decArray.length; i++) {
        hexArray[i] = decStrToHex(decArray[i]);
    }
    return hexArray;
}

export function hexArrayToDecArray(hexArray) {
    const decArray = [];
    for (let i = 0; i < hexArray.length; i++) {
        decArray[i] = hexStrToDec(hexArray[i]);
    }
    return decArray;
}

export function padZeroHexString(hexString, length = 64) {
    if (hexString.substring(0, 2) === '0x') {
        return hexString.substring(2, hexString.length).padStart(length, '0');
    } else {
        return hexString.substring(0, hexString.length).padStart(length, '0');
    }
}

/**
 *
 * @param {Array}       items            Array to flatten
 * @returns
 */
export function flatten(items) {
    const flat = [];
    items.forEach(item => {
        if (Array.isArray(item)) {
            flat.push(...flatten(item));
        } else {
            flat.push(item);
        }
    });

    return flat;
}

/**
 *
 * @param {string} hexString
 * @return {any}
 */
export function addPrefixHex(hexString) {
    if (hexString.length < 2 || hexString.substring(0, 2) !== '0x') {
        return '0x' + hexString;
    } else {
        return hexString;
    }
}

export function subtractPrefixHex(hexString) {
    if (hexString.substring(0, 2) !== '0x') {
        return hexString;
    } else {
        return hexString.substring(2, hexString.length);
    }
}

/**
 * Recursively remove '0x' in object.
 *
 * Note: Change the original data of [obj].
 *      Please deep copy [obj] and use it.
 * @param {object} obj Hex string object
 */
export function removeHexRepresentation(obj) {
    for (let key in obj) {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace('0x', '');
        } else if (typeof obj[key] === 'object') {
            removeHexRepresentation(obj[key]);
        }
    }
}

export function removePrefix(hexString) {
    if (hexString.substring(0, 2) === '0x') {
        return hexString.replace('0x', '');
    }
    return hexString;
}

export function addPrefixAndPadHex(hexString, length = 64) {
    hexString = padZeroHexString(hexString, length);

    return '0x' + hexString;
}

export function addPrefixHexFromArray(hexArray) {
    const flat = [];
    hexArray.forEach(element => {
        if (Array.isArray(element)) {
            flat.push(...addPrefixHexFromArray(element));
        } else {
            flat.push(addPrefixHex(element));
        }
    });

    return flat;
}

export function addPrefixAndPadHexFromArray(hexArray, length = 64) {
    const flat = [];
    hexArray.forEach(element => {
        if (Array.isArray(element)) {
            flat.push(...addPrefixAndPadHexFromArray(element, length));
        } else {
            flat.push(addPrefixAndPadHex(element, length));
        }
    });

    return flat;
}

/**
 *  A comma is added to [number] every 3 digits.
 *  ex) Number(1000) => string(1,000)
 *
 * @param {string | Number | BigInt} number
 * @throws not Bigint Format
 * @returns {string} 3 digits comma
 */
export function addComma(number) {
    if (number === '0' || number === 0 || number === BigInt('0')) {
        return '0';
    }

    if (typeof number === 'string' && parseFloat(number)) {
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (typeof number === 'bigint') {
        return number.toString(10).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else if (typeof number === 'number') {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

export function asciiToHex(str) {
    let arr = [];
    for (let n = 0, l = str.length; n < l; n++) {
        let hex = Number(str.charCodeAt(n)).toString(16);
        arr.push(hex);
    }

    return arr.join('');
}

/**
 *
 * @param {string} amount
 * @param {string} decimal
 * @return {string}
 */
export function divDecimal(amount, decimal) {
    if (amount === '0' || Number.isNaN(Number(amount))) {
        return amount;
    }
    const numDecimal = Number(decimal);

    // remove left zero
    const rawBalance = amount.replace(/(^0+)/g, '');
    if (numDecimal === 0) {
        return rawBalance;
    }
    let balance = '0';
    let rest = '';

    // mul decimal
    if (rawBalance.length <= numDecimal) {
        const zeroRepeat = numDecimal - rawBalance.length;
        rest = ('0'.repeat(zeroRepeat) + rawBalance).replace(/0+$/, '');
    } else {
        const decimalPoint = rawBalance.length - numDecimal;
        balance = rawBalance.substring(0, decimalPoint).replace(/(^0+)/g, '');
        rest = rawBalance.substring(decimalPoint).replace(/0+$/, '');
    }
    if (rest.length) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}
export function inputAmountFormat(amount, float = true) {
    if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
        return amount;
    }

    const floatData = amount.split('.');
    const rawBalance = floatData[0];

    const balance = (rawBalance.length === 0 ? '0' : rawBalance);

    const rest = (float ? (floatData[1] || '') : '');

    if (rest.length || amount.indexOf('.') >= 0) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}

export function inputAmountBlurFormat(amount) {
    if (Number.isNaN(Number(amount)) || Number(amount) < 0) {
        return amount;
    }

    const floatData = amount.split('.');
    const rawBalance = floatData[0].replace(/(^0+)/g, '');

    const balance = (rawBalance.length === 0 ? '0' : rawBalance);

    const rest = (floatData[1] || '').replace(/0+$/, '');

    if (rest.length) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}


/**
 *
 * @param {string} amount
 * @param {string} decimal
 * @return {string}
 */
export function mulDecimal(amount, decimal) {
    if (amount === '0' || Number.isNaN(Number(amount))) {
        return amount;
    }
    const numDecimal = Number(decimal);
    const rawBalance = amount.replace(/(^0+)/g, '');

    if (numDecimal === 0) {
        return rawBalance;
    }
    const floatData = rawBalance.split('.');
    let balance = floatData[0];
    let rest = floatData[1] || '';
    const restLength = rest.length;
    if (restLength <= numDecimal) {
        const zeroRepeat = numDecimal - restLength;
        rest = rest + '0'.repeat(zeroRepeat);
    }
    const carrier = rest.substring(0, numDecimal);
    // rest = rest.substring(numDecimal).replace(/0+$/, '');
    balance = (balance + carrier).replace(/(^0+)/g, '');

    return balance;

}

/**
 *
 * @param {string} amount
 * @return {string}
 */
export function detailBalance(amount) {
    const roundDowned = roundDown(amount.replace(/(^0+)/g, ''), 6);
    const floatData = roundDowned.split('.');
    let balance = floatData[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let rest = floatData[1] || '';
    if (rest.length) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}

/**
 *
 * @param {string} amount
 * @param {TFunction<N, TKPrefix>} t
 * @param {i18n} i18n
 * @return {string}
 */
export function prefixBalance(amount, t, i18n) {
    let prefix = '';
    let roundDowned;
    let uAmount = amount;
    if (amount.substring(0, 1) === '-') {
        prefix = '-';
        uAmount = amount.substring(1);
    }
    roundDowned = roundDown(uAmount, 3);
    if (uAmount === '0' || Number.isNaN(Number(uAmount))) {
        return uAmount;
    }
    const floatData = roundDowned.split('.');
    let balance = floatData[0];
    let rest = floatData[1] || '';
    const exp = 'Exp';

    // When the format for cutting numbers is always the same(K, M, G... always cutting by 10^3 unit)
    let expUnit = Number(t('ExpUnit'));

    if (balance.length < 4 * 2 + 1) {
        balance = prefix + balance.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (rest.length) {
            return balance + '.' + rest;
        } else {
            return balance;
        }
    }

    let decimalPoint = (
        Math.floor((balance.length - 1) / expUnit) * expUnit -
        expUnit
    ).toString(10);
    if (Number(decimalPoint) > Number(t('MaxExp')) - Number(expUnit)) {
        decimalPoint = (Number(t('MaxExp')) - Number(expUnit)).toString(10);
    }
    balance = divDecimal(balance, decimalPoint).split('.')[0];
    const startIndex = balance.length - expUnit;
    rest = balance.substring(startIndex).replace(/(^0+)/g, '');
    balance =
        balance
            .substring(0, startIndex)
            .replace(/(^0+)/g, '')
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        t(`${exp}${Number(decimalPoint) + expUnit}`);
    balance = prefix + balance;
    if (rest.length) {
        return (
            balance +
            ' ' +
            rest.replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
            t(`${exp}${decimalPoint}`)
        );
    } else {
        return balance;
    }
}

export function roundDown(amount, downPoint) {
    const floatData = amount.split('.');
    let balance = floatData[0];
    let rest = floatData[1] || '';
    if (rest.length > downPoint) {
        rest = rest.substring(0, Number(downPoint));
    }
    if (rest.length) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}

export function roundDownDecimal(amount, decimal, downPoint) {
    let balance = divDecimal(amount, decimal);
    let rest;
    [balance, rest] = balance.split('.');
    rest = rest.substring(Number(downPoint), 0);
    if (rest.length) {
        return balance + '.' + rest;
    } else {
        return balance;
    }
}

/**
 *
 * @param {string} value1
 * @param {string} value2
 * @return {{firstValue: string, secondValue: string, zeroPoint: number}}
 */
function dualMulZeroPoint(value1, value2) {
    const firstValue = mulZeroPoint(value1);
    const secondValue = mulZeroPoint(value2);
    let zeroPoint;
    if (firstValue.zeroPoint < secondValue.zeroPoint) {
        zeroPoint = secondValue.zeroPoint;
        firstValue.value =
            firstValue.value +
            '0'.repeat(secondValue.zeroPoint - firstValue.zeroPoint);
    } else {
        zeroPoint = firstValue.zeroPoint;
        secondValue.value =
            secondValue.value +
            '0'.repeat(firstValue.zeroPoint - secondValue.zeroPoint);
    }
    return {
        firstValue: firstValue.value,
        secondValue: secondValue.value,
        zeroPoint: zeroPoint,
    };
}

/**
 *
 * @param {string} value
 * @return {{zeroPoint: number, value: string}}
 */
function mulZeroPoint(value) {
    const floatData = value.split('.');
    let balance = floatData[0];
    let rest = floatData[1] || '';
    const zeroPoint = rest.length;
    const bigintInput = balance + rest;
    return { value: BigInt(bigintInput).toString(10), zeroPoint: zeroPoint };
}

/**
 *
 * @param {string} value
 * @param {string} minusValue
 * @return {string}
 */
export function floatMinus(value, minusValue) {
    const balance = dualMulZeroPoint(value, minusValue);

    const result = BigInt(balance.firstValue) - BigInt(balance.secondValue);
    const neg = result < 0n;
    const resultString = neg
        ? result.toString(10).substring(1)
        : result.toString(10);
    const prefix = neg ? '-' : '';
    return prefix + divDecimal(resultString, balance.zeroPoint.toString(10));
}

/**
 *
 * @param {string} value
 * @param {string} plusValue
 * @return {string}
 */
export function floatPlus(value, plusValue) {
    const balance = dualMulZeroPoint(value, plusValue);
    const result = BigInt(balance.firstValue) + BigInt(balance.secondValue);

    return divDecimal(result.toString(10), balance.zeroPoint.toString(10));
}

export function parseJson(json) {
    if (json === undefined || json === null || json === '') {
        json = {};
    } else {
        json = JSON.parse(json);
    }
    return json;
}

/**
 *
 * @param {string} value
 * @return {boolean}
 */
export function isNegBalance(value) {
    return value.trim().substring(0, 1) === '-';
}

const types = {
    isBigIntFormat,
    inputAmountFormat,
    inputAmountBlurFormat,
    mulDecimal,
    divDecimal,
    floatMinus,
    floatPlus,
    prefixBalance,
    detailBalance,
    roundDownDecimal,
    isHexStringFormat,
    isPrefixHexString,
    isUnsignedInteger,
    hexToInt,
    hexListToIntList,
    hexToBytes,
    decStrToHex,
    hexStrToDec,
    decArrayToHexArray,
    hexArrayToDecArray,
    padZeroHexString,
    flatten,
    addPrefixHex,
    subtractPrefixHex,
    removeHexRepresentation,
    removePrefix,
    addPrefixAndPadHex,
    addPrefixHexFromArray,
    addPrefixAndPadHexFromArray,
    addComma,
    asciiToHex,
    parseJson,
    isNegBalance,
};

export default types;
