import Aes from 'react-native-aes-crypto';

export type AESCT = { cipher: string, iv: string }


/**
 *
 * @param password
 * @param salt
 * @param cost
 * @param length
 * @return {Promise<string>}
 */
const generationKey = async (password: string, salt: string, cost: number, length: number) => {
    return Aes.pbkdf2(password, salt, cost, length);
};

/**
 *
 * @param text
 * @param key
 * @return {Promise<{cipher: *, iv: *}>}
 */
const encryptData = async (text: string, key: string) => {
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
const decryptData = async (encryptedData: AESCT, key: string) => {
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
