import { toChecksumAddress } from 'web3-utils';
import { INote } from './interfaces';
import { addPrefixAndPadHex, toJson, toObjFromJson } from '../common/utilities';
import Web3Azeroth from './web3-contract';
import CurveParam from '../common/crypto/deprecated/curveParam';
import curve from '../common/crypto/deprecated/curve';
import { MiMC7 } from '../common/crypto/mimc';

class Note implements INote {

    open: bigint;
    tokenAddress: string;
    tokenId: bigint;
    amount: bigint;
    addr: bigint;
    commitment: bigint;
    index: bigint;
    isSpent: boolean;

    constructor({
        open,
        tokenAddress,
        tokenId,
        amount,
        addr,
        commitment,
        index,
    }: {
        open: bigint;
        tokenAddress: string;
        tokenId: bigint;
        amount: bigint;
        addr: bigint;
        commitment: bigint;
        index: bigint;
    }) {
        this.open = open;
        this.tokenAddress = tokenAddress;
        this.tokenId = tokenId;
        this.amount = amount;
        this.addr = addr;
        this.commitment = commitment;
        this.index = index;
        this.isSpent = false;
    }

    toJson() {
        return toJson(this);
    }

    static fromJson(noteJson: string) {

        let dataJson = toObjFromJson(noteJson);

        const note = new Note({
            open: dataJson.open,
            tokenAddress: dataJson.tokenAddress,
            tokenId: dataJson.tokenId,
            amount: dataJson.amount,
            addr: dataJson.addr,
            commitment: dataJson.cm,
            index: dataJson.idx,
        });

        note.isSpent = dataJson.isSpent;

        return note;
    }

    static validNote(hash: any, note: Note) {
        let hashed = hash.hash(
            note.open,
            note.tokenAddress,
            note.tokenId,
            note.amount,
            note.addr,
        );

        return hashed === note.commitment;
    }

    isValid() {
        const hash = new MiMC7();

        const result =
            this.commitment ===
            hash.hash(
                this.open,
                BigInt(this.tokenAddress),
                BigInt(this.tokenId),
                this.amount,
                BigInt(this.addr),
            );

        if (result) {
            this.tokenAddress = toChecksumAddress(this.tokenAddress);
        }

        return result;
    }
}

export class NoteError extends Error {
    errorData: any;

    constructor(errorData: any, message: string) {
        super(message);
        this.name = 'NoteError';
        this.errorData = errorData;
    }

    show() {
        console.log(this.name, this.errorData);
        console.log(this.message);
    }
}

export async function isSpentNote(azerothWeb3: Web3Azeroth, walletSecretKey: bigint, cm: bigint) {
    const mimc7 = new MiMC7();
    const nf = mimc7.hash(cm, walletSecretKey);
    return await azerothWeb3.isSpentNote(nf);
}


export class NoteOwnership {

    privKey: bigint;
    curveParam: any;
    curve: any;
    mimc7: MiMC7;
    mod: (value: bigint, mod: bigint) => bigint;

    constructor(sk: bigint) {
        this.privKey = sk;
        this.curveParam = CurveParam('EC_ALT_BN128');
        this.curve = new curve.TwistedEdwardsCurve(this.curveParam);
        this.mimc7 = new MiMC7();
        this.mod = (value: bigint, mod: bigint) => {
            if (value <= BigInt('0')) {
                return ((value % mod) + mod) % mod;
            } else {
                return value % mod;
            }
        }
    }

    isOwner(ct: bigint[], commitment: bigint) {

        const pct: {
            c0: { x: bigint, y: bigint };
            c1: { x: bigint, y: bigint };
            c2: { x: bigint, y: bigint };
            msg: bigint[];
        } = {
            c0: { x: ct[0], y: ct[1] },
            c1: { x: ct[2], y: ct[3] },
            c2: { x: ct[4], y: ct[5] },
            msg: ct.slice(6),
        };

        const prime = this.curveParam.prime;
        const curve = this.curve;
        const mimc7 = this.mimc7;
        const privKey = this.privKey;
        const mod = this.mod;

        let ret: bigint[] = [];
        try {
            const curveC0 = curve.computeScalarMul(pct.c0, privKey);
            const ciphertext = pct.c1;
            const curveK = curve.subAffinePoint(ciphertext, curveC0);

            for (const [i, e] of pct.msg.entries()) {
                const hashInput = [curveK.x, BigInt(i)];
                const hashed = mimc7.hash(...hashInput);
                ret.push(mod(e - hashed, prime));
            }

        } catch (error) {
            return undefined;
        }

        const decryptedEventMsg = ret;
        const open = decryptedEventMsg[0];
        const tokenAddressBg = decryptedEventMsg[1];
        const tokenId = decryptedEventMsg[2];
        const amount = decryptedEventMsg[3];
        const addr = decryptedEventMsg[4];

        const hash = mimc7.hash(
            open,
            tokenAddressBg,
            tokenId,
            amount,
            addr
        );

        if (commitment === hash) {

            return {
                getNote: (numLeaves: bigint) => {
                    return new Note({
                        open,
                        tokenAddress: toChecksumAddress(addPrefixAndPadHex(tokenAddressBg.toString(16), 40)),
                        tokenId,
                        amount,
                        addr,
                        commitment,
                        index: numLeaves - 1n,
                    });
                }
            };

        } else {
            return undefined;
        }
    }
}

export default Note;
