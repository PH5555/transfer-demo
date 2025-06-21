import { randomHex } from 'web3-utils';
import * as Keychain from 'react-native-keychain';
import AES, { AESCT } from './crypto/aes';
import MiMC from './crypto/mimc';
import utilities, { toHex, toJson } from './utilities';

async function getAesKeyFromString(msg: bigint, salt?: string) {
    const mimc7 = new MiMC.MiMC7();
    const hash = mimc7.hash(msg)
    return await AES.generationKey(
        salt ? salt : toHex(hash),
        toHex(hash),
        5000,
        256
    );
}


async function getAesKeyFromPin(password: string) {
    const pin_to_ascii = BigInt(utilities.asciiToHex(password));
    return await getAesKeyFromString(pin_to_ascii)
}


async function getAppDecKeyCTJsonFromPin(password: string, secretsDecryptionKey: string) {
    const pin_aes = await getAesKeyFromPin(password)
    const ctSecretsDecryptionKey: AESCT = await AES.encryptData(secretsDecryptionKey, pin_aes);
    return toJson(ctSecretsDecryptionKey);
}


async function getAppDecKeyFromPin(password: string, secretsDecryptionKeyCTJson: string) {
    // 핀 번호로 AES KEY 가져오기 
    const pin_aes = await getAesKeyFromPin(password)
    let secretsDecryptionKey: string | undefined = undefined;

    // secret Decrypt key ct 가져오기기
    const secretsDecryptionKeyCT: AESCT = JSON.parse(secretsDecryptionKeyCTJson);
    try {
        //  secret Decrypt key ct 복호화화
        secretsDecryptionKey = await AES.decryptData(secretsDecryptionKeyCT, pin_aes);
    } catch (e) {
        // console.error(e);
    }
    return secretsDecryptionKey;
}

// secretDecrytionkey 생성
async function genAppSecretsDecryptionKey(): Promise<string> {
    const random_msg = BigInt(randomHex(32));
    const random_salt = randomHex(32);
    return await getAesKeyFromString(random_msg, random_salt)
}

function validSupportedBiometry(biometryType: Keychain.BIOMETRY_TYPE | string | null | undefined) {
    return biometryType === Keychain.BIOMETRY_TYPE.FACE_ID ||
        biometryType === Keychain.BIOMETRY_TYPE.TOUCH_ID ||
        biometryType === Keychain.BIOMETRY_TYPE.FINGERPRINT ||
        biometryType === Keychain.BIOMETRY_TYPE.FACE;
}

export default {
    getAesKeyFromPin,
    getAppDecKeyCTJsonFromPin,
    getAppDecKeyFromPin,
    genAppSecretsDecryptionKey,
    validSupportedBiometry
};