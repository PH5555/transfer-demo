import CryptoJS from "crypto-js";

/**
 *
 * @param password
 * @param salt
 * @param cost
 * @param length
 * @return {Promise<string>}
 */
const generationKey = async (
  password,
  salt,
  iterations,
  keySizeBytes
) => {
  const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(salt), {
    keySize: keySizeBytes / 4, // because keySize is in 32-bit words
    iterations: iterations,
  });
  return CryptoJS.enc.Base64.stringify(key);
};

/**
 *
 * @param text
 * @param key
 * @return {Promise<{cipher: *, iv: *}>}
 */
const encryptData = async (
  text,
  base64Key
) => {
  // Random 16-byte IV
  const ivWordArray = CryptoJS.lib.WordArray.random(16);

  const keyWordArray = CryptoJS.enc.Base64.parse(base64Key);

  const encrypted = CryptoJS.AES.encrypt(text, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    cipher: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
    iv: CryptoJS.enc.Base64.stringify(ivWordArray),
  };
};

/**
 *
 * @param encryptedData
 * @param key
 * @return {Promise<string>}
 */
const decryptData = async (
  encryptedData,
  base64Key
) => {
  const keyWordArray = CryptoJS.enc.Base64.parse(base64Key);
  const ivWordArray = CryptoJS.enc.Base64.parse(encryptedData.iv);
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(encryptedData.cipher),
  });

  const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};

export default {
    generationKey,
    encryptData,
    decryptData,
};
