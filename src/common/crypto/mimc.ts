
import math from '../utilities/math';
import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';
import { hexToBytes, hexToInt } from '../utilities';

const SEED = 'mimc7_seed';
const BN256_FIELD_PRIME = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

/**
 * 
 * @param {Array} data_bytes    bytes array
 * @returns {string}            hexadecimal string
 */
function _keccak256(data_bytes: any) {
    return keccak256(hexToBytes(data_bytes));
}


type mimc_round_ftn_ty = (msg: bigint, key: bigint, rc: bigint) => bigint;

export class MiMCBase {

    /**
     * 
     * @param {string} seed_str     MiMC's seed string
     * @param {BigInt} prime        modulo prime
     * @param {int} num_rounds      # of MiMC's round
     */

    seed: string;
    prime: BigInt;
    num_rounds: number;
    mimc_round: mimc_round_ftn_ty;

    constructor(
        {
            seed_str, prime, num_rounds, mimc_round
        }: {
            seed_str?: string, prime?: BigInt, num_rounds: number, mimc_round: mimc_round_ftn_ty
        }
    ) {

        // seed_str = SEED, prime = BN256_FIELD_PRIME, num_rounds

        this.seed = keccak256(toUtf8Bytes(seed_str ? seed_str : SEED));
        this.prime = prime ? prime : BN256_FIELD_PRIME;
        this.num_rounds = num_rounds;
        this.mimc_round = mimc_round;
    }

    /**
     * 
     * @param {BigInt}      msg     message 
     * @param {BigInt}      ek      key
     * @returns {BigInt}
     */
    encrypt(msg: bigint, ek: bigint) {
        var msg = BigInt(math.mod(BigInt(msg), this.prime));
        var ek = BigInt(math.mod(BigInt(ek), this.prime));
        let round_constant = this.seed;
        let result = this.mimc_round(msg, ek, BigInt(0));

        for (let i = 0; i < this.num_rounds - 1; i++) {
            round_constant = _keccak256(round_constant);
            result = this.mimc_round(BigInt(result), BigInt(ek), hexToInt(round_constant));
        }
        return BigInt(math.mod((result + ek), this.prime));
    }

    /**
     * 
     * @param {BigInt}      left        hash target message
     * @param {BigInt}      right       hash target message
     * @returns 
     */
    _hash(left: bigint, right: bigint) {
        let x = BigInt(math.mod(left, this.prime));
        let y = BigInt(math.mod(right, this.prime));
        return BigInt(math.mod((this.encrypt(x, y) + x + y), this.prime));
    }

    /**
     * 
     * @param  {...string}     args        The target messages, its type is hexadecimal string
     * @returns {string}                   Hexadecimal string
     */
    hash(...args: bigint[]): bigint {
        if (args.length == 1)
            return BigInt(this._hash(args[0], args[0]));
        else {
            let result = this._hash(args[0], args[1]);
            for (let i = 0; i < args.length - 2; i++) {
                result = this._hash(result, args[i + 2]);
            }
            return BigInt(result);
        }
    }
}

export class MiMC7 extends MiMCBase {

    constructor(seed_str?: string, prime?: BigInt, num_rounds?: number) {
        super({
            seed_str,
            prime,
            num_rounds: num_rounds ? num_rounds : 91,
            mimc_round: (msg: bigint, key: bigint, rc: bigint): bigint => {
                let xored = math.mod((msg + key + rc), this.prime);
                return math.modPow(xored, BigInt(7), this.prime);
            }
        });
    }
}

class MiMC31 extends MiMCBase {

    constructor(seed_str?: string, prime?: bigint, num_rounds?: number) {
        super({
            seed_str,
            prime,
            num_rounds: num_rounds ? num_rounds : 51,
            mimc_round: (msg: bigint, key: bigint, rc: bigint): bigint => {
                let a = math.mod((msg + key + rc), this.prime);
                let a_2 = math.mod((a * a), this.prime);
                let a_4 = math.mod((a_2 * a_2), this.prime);
                let a_8 = math.mod((a_4 * a_4), this.prime);
                let a_16 = math.mod((a_8 * a_8), this.prime);
                return BigInt(math.mod((a_16 * a_8 * a_4 * a_2 * a), this.prime));
            }
        });
    }
}

export default { MiMC7, MiMC31 };