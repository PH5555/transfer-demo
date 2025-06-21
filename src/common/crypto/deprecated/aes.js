import { NativeModules, Platform } from 'react-native';
import Aes from 'react-native-aes-crypto';

/**
 *
 * @param password
 * @param salt
 * @param cost
 * @param length
 * @return {Promise<string>}
 */
const generationKey = async (password, salt, cost, length) => {
    return Aes.pbkdf2(password, salt, cost, length);
};

/**
 *
 * @param text
 * @param key
 * @return {Promise<{cipher: *, iv: *}>}
 */
const encryptData = async (text, key) => {
    return Aes.randomKey(16).then(iv => {
        return Aes.encrypt(text, key, iv, 'aes-256-cbc')
            .then(cipher => ({
                cipher,
                iv,
            }));
    });
};

/**
 *
 * @param encryptedData
 * @param key
 * @return {Promise<string>}
 */
const decryptData = async (encryptedData, key) => {
    return Aes.decrypt(
        encryptedData.cipher,
        key,
        encryptedData.iv,
        'aes-256-cbc',
    );
};

export default {
    generationKey,
    encryptData,
    decryptData,
};
