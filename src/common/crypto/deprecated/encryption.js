/* eslint-env es2020, node */
import math from './math';
import mimc from './mimc';
import types from './types';
import CurveParam from './curveParam';
import curve from './curve';
import { toJson } from '../../utilities';

export class sCT {
    /**
     * Azeroth
     * @param {string}      r       In the symmetric key encryption, used random value | hexadecimal string
     * @param {string[]}    ct      ciphertext is hexstring array
     */
    constructor(r, ct) {
        this.r = r;
        this.ct = ct;
    }

    /**
     *
     */
    toJson() {
        return toJson(this);
    }

    static fromJson(sCTJson) {
        let dataJson = JSON.parse(sCTJson);
        return new sCT(dataJson.r, dataJson.ct);
    }

    /**
     *
     * @param {string} sct.r
     * @param {string[]} sct.ct
     * @return {boolean}
     */
    isEqual(sct) {
        return (
            this.r === sct.r &&
            Object.entries(this.ct).toString() === Object.entries(sct.ct).toString()
        );
    }

    /**
     *
     * @returns {boolean}
     */
    empty() {
        return this.isEqual(new sCT('0x0', ['0x0', '0x0', '0x0']));
    }

    static getEmptySCT() {
        return new sCT('0x0', ['0x0', '0x0', '0x0'])
    }
}

class symmetricKeyEncryption {
    /**
     *
     * @param privKey The user's private key | hexadecimal string
     * @constructor
     */
    constructor(privKey) {
        let cvParam = CurveParam('EC_ALT_BN128');
        this.prime = cvParam.prime;
        this.privKey = privKey;
    }

    /**
     *
     * @param msg
     * @return
     */
    Enc(...msg) {
        const r = math.randomFieldElement(this.prime);
        const mimc7 = new mimc.MiMC7();
        const ct = (() => {
            const ret = [];
            for (const [i, e] of msg.entries()) {
                const hashInput = (r + BigInt(i.toString(10))).toString(16);
                const hashed = types.hexToInt(
                    mimc7.hash(this.privKey.toString(16), hashInput),
                );
                ret.push(
                    math
                        .mod((typeof e === 'bigint' ? e : types.hexToInt(e)) + hashed, this.prime)
                        .toString(16),
                );
            }
            return ret;
        })();
        return new sCT(r.toString(16), ct);
    }

    /**
     *
     * @param {string} sct.r
     * @param {string[]} sct.ct
     * @return {string[]}
     */
    Dec(sct) {
        const mimc7 = new mimc.MiMC7();
        const r = types.hexToInt(sct.r);
        return (() => {
            let ret = [];
            for (const [i, e] of sct.ct.entries()) {
                const hashInput = (r + BigInt(i.toString(10))).toString(16);

                const hashed = types.hexToInt(
                    mimc7.hash(this.privKey.toString(16), hashInput),
                );
                ret.push(
                    math
                        .mod((typeof e === 'bigint' ? e : types.hexToInt(e)) - hashed, this.prime)
                        .toString(16),
                );
            }
            return ret;
        })();
    }
}

class pCT {
    /**
     *
     * @param {AffinePoint}      c0      The ciphertext G^r
     * @param {AffinePoint}      c1      The ciphertext k*(pk_1)^r
     * @param {AffinePoint}      c2      The ciphertext k*(pk_2)^r
     * @param {string[]}         c3      The ciphertext SE.Enc_k(msg)
     */
    constructor(c0, c1, c2, c3) {
        this.c0 =
            typeof c0.x === 'bigint' ? c0 : new curve.AffinePoint(c0.x, c0.y);
        this.c1 =
            typeof c1.x === 'bigint' ? c1 : new curve.AffinePoint(c1.x, c1.y);
        this.c2 =
            typeof c2.x === 'bigint' ? c2 : new curve.AffinePoint(c2.x, c2.y);
        this.c3 = c3;
    }
    toJson() {
        return toJson(this);
    }

    static fromJson(pCTJson) {
        let dataJson = JSON.parse(pCTJson);

        return new pCT(dataJson.c3);
    }

    toList() {
        return [
            ...this.c0.toHexArray(),
            ...this.c1.toHexArray(),
            ...this.c2.toHexArray(),
            ...this.c3,
        ];
    }
}

class publicKeyEncryption {
    constructor() {
        this.EC_TYPE = 'EC_ALT_BN128';
        let cvParam = CurveParam(this.EC_TYPE);
        this.prime = cvParam.prime;
    }

    /**
     *
     * @param {any}     apk     Auditor's public key
     * @param {{ena: any, pkOwn: any, pkEnc: any}}      upk     User's public key
     * @param  {...any}          msg     The plaintext | hexadecimal string type
     * @returns {[pCT, string, AffinePoint]}
     */
    Enc(apk, upk, ...msg) {
        let Curve = new curve.TwistedEdwardsCurve(
            new CurveParam(),
        );
        let r = math.randomFieldElement(this.prime);
        let k = math.randomFieldElement(this.prime);

        let curveK = curve.basePointMul(k);
        let curvePk = Curve.computeScalarMul(upk.pkEnc, r);
        let curveApk = Curve.computeScalarMul(apk, r);

        let c0 = curve.basePointMul(r);
        let c1 = Curve.addAffinePoint(curveK, curvePk);
        let c2 = Curve.addAffinePoint(curveK, curveApk);

        let c3 = (() => {
            let ret = [];
            let mimc7 = new mimc.MiMC7();
            for (const [i, e] of msg.entries()) {
                let hashInput = [curveK.x.toString(16), i.toString(16)];
                let hashed = types.hexToInt(mimc7.hash(...hashInput));
                ret.push(
                    math
                        .mod((typeof e === 'bigint' ? e : types.hexToInt(e)) + hashed, this.prime)
                        .toString(16),
                );
            }
            return ret;
        })();
        r = r.toString(16);
        k = curveK;
        return [new pCT(c0, c1, c2, c3), r, k];
    }

    /**
     *
     * @param {pCT}         pct         The cihpertext of public key encryption
     * @param {string}      privKey     The user's private key or auditor's private key | hexadecimal string
     * @param {boolean}     audit       Whether or not to audit, 'true' is used by the auditor, and 'false' is used by the user.
     * @returns {bigint[]}
     */
    Dec(pct, privKey, audit) {
        let Curve = new curve.TwistedEdwardsCurve(
            new CurveParam('EC_ALT_BN128'),
        );
        let mimc7 = new mimc.MiMC7();

        let curveC0 = Curve.computeScalarMul(pct.c0, types.hexToInt(privKey));
        let ciphertext = audit === true ? pct.c2 : pct.c1;
        let curveK = Curve.subAffinePoint(ciphertext, curveC0);

        const message = (() => {
            let ret = [];
            for (const [i, e] of pct.c3.entries()) {
                let hashInput = [curveK.x.toString(16), i.toString(16)];
                let hashed = types.hexToInt(mimc7.hash(...hashInput));
                ret.push(math.mod((typeof e === 'bigint' ? e : types.hexToInt(e)) - hashed, this.prime));
            }
            return ret;
        })();
        return message;
    }
}

const Encryption = {
    sCT,
    symmetricKeyEncryption,
    pCT,
    publicKeyEncryption,
};

export default Encryption;
