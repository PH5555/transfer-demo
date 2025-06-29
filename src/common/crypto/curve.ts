import math from '../utilities/math';
import { CurveParamType, ECType, SetupCurveParam } from './curveParam';
import { toHex, toJson } from '../utilities';
import { AffinePoint as AffinePointInterface } from './interfaces';
import CryptoJS from "crypto-js";

export class AffinePoint implements AffinePointInterface {

    x: bigint;
    y: bigint;

    constructor(x: bigint, y: bigint) {
        this.x = x;
        this.y = y;
    }

    clone(): AffinePoint {
        return new AffinePoint(this.x, this.y);
    }

    toJsonObj() {
        return {
            x: toHex(this.x),
            y: toHex(this.y)
        };
    }

    static fromJsonObj(pointJsonObj: { x: string, y: string }) {
        return new AffinePoint(BigInt(pointJsonObj.x), BigInt(pointJsonObj.y));
    }

    toJsonStr() {
        return toJson(this.toJsonObj());
    }

    static fromJsonStr(pointJsonStr: string) {
        let JsonObj = JSON.parse(pointJsonStr);
        return AffinePoint.fromJsonObj(JsonObj);
    }

    toJson() { return this.toJsonStr(); }

    static fromJson(pointJsonStr: string) { return AffinePoint.fromJsonStr(pointJsonStr) }

    toString() {
        return `${toHex(this.x)},${toHex(this.y)}`;
    }

    toHexArray() {
        return [toHex(this.x), toHex(this.y)];
    }

    toArray() {
        return [this.x, this.y];
    }
}


export class TwistedEdwardsCurve {

    ecType!: ECType;
    prime: bigint;
    g: { x: bigint, y: bigint };
    coefA: bigint;
    coefD: bigint;

    constructor(curveParam: CurveParamType) {
        this.prime = curveParam.prime;
        this.g = curveParam.g;
        this.coefA = curveParam.coefA;
        this.coefD = curveParam.coefD;
    }

    preprocess(p: any, exp: bigint) {
        let preTable = [p];

        for (let i = 0; i < exp.toString(2).length; i += 1) {
            let baseP = preTable[preTable.length - 1];
            preTable.push(this.doubleAffinePoint(baseP));
        }

        return preTable;
    }

    mul(preTable: any, exp: any) {
        let expBit = exp.toString(2).split('').reverse().join('');
        let result = preTable[preTable.length - 1];

        for (const [i, value] of preTable.entries()) {
            if (expBit[i] === '1') {
                result = this.addAffinePoint(result, value);
            }
        }
        result = this.subAffinePoint(result, preTable[preTable.length - 1]);

        return result;
    }

    preprocessBasePoint(p: any) {
        let newX = math.mod(p.x, this.prime);
        let newY = math.mod(p.y, this.prime);

        return new AffinePoint(newX, newY);
    }

    doubleAffinePoint(p: any) {
        // x3 = 2x1y1 / (ax1^2 + y1^2)
        // y3 = (y1^2 - ax1^2) / (2 - ax1^2 - y1^2)
        let x1y1 = math.mod(p.x * p.y, this.prime);
        let x_square = math.modPow(p.x, BigInt('2'), this.prime);
        let y_square = math.modPow(p.y, BigInt('2'), this.prime);

        let newX = this.fieldDivision(
            BigInt('2') * x1y1,
            this.coefA * x_square + y_square,
        );
        let newY = this.fieldDivision(
            y_square - this.coefA * x_square,
            BigInt('2') - this.coefA * x_square - y_square,
        );

        return new AffinePoint(newX, newY);
    }

    addAffinePoint(p1: any, p2: any) {
        // x3 = (x1y2 + y1x2) / (1 + dx1x2y1y2)
        // y3 = (y1y2 - ax1x2) / (1 - dx1x2y1y2)
        let x1x2 = math.mod(p1.x * p2.x, this.prime);
        let x1y2 = math.mod(p1.x * p2.y, this.prime);
        let x2y1 = math.mod(p2.x * p1.y, this.prime);
        let y1y2 = math.mod(p1.y * p2.y, this.prime);
        let dx1x2y1y2 = math.mod(this.coefD * x1x2 * y1y2, this.prime);

        let newX = this.fieldDivision(x1y2 + x2y1, BigInt('1') + dx1x2y1y2);
        let newY = this.fieldDivision(
            y1y2 - this.coefA * x1x2,
            BigInt('1') - dx1x2y1y2,
        );

        return new AffinePoint(newX, newY);
    }

    subAffinePoint(p1: any, p2: any) {
        let negP2 = new AffinePoint(math.mod(-p2.x, this.prime), p2.y);
        return this.addAffinePoint(p1, negP2);
    }

    fieldDivision(a: any, b: any) {
        return math.mod(a * math.modInv(b, this.prime), this.prime);
    }

    checkScalar(value: any) {
        return value.toString(2).length <= this.prime.toString(2).length;
    }


    checkPointOnCurve(p: AffinePoint) {
        let x2 = math.modPow(p.x, BigInt('2'), this.prime);
        let y2 = math.modPow(p.y, BigInt('2'), this.prime);

        let lhs = math.mod(x2 * this.coefA + y2, this.prime);
        let rhs = math.mod(this.coefD * x2 * y2 + BigInt('1'), this.prime);

        console.assert(lhs === rhs, p.toJson());
    }

    computeScalarMul(p: any, exp: any) {
        let bp = this.preprocessBasePoint(p);
        this.checkPointOnCurve(bp);
        let preTable = this.preprocess(bp, exp);
        let output = this.mul(preTable, exp);
        return output;
    }
}


export function basePointMul(exp: any, curveOption: ECType | undefined = undefined) {
    let cvParam = 
        curveOption !== undefined
            ? SetupCurveParam(curveOption)
            : SetupCurveParam('EC_ALT_BN128');
    let curve = new TwistedEdwardsCurve(cvParam);
    let bp = new AffinePoint(curve.g.x, curve.g.y);
    curve.checkPointOnCurve(bp);
    let result = curve.computeScalarMul(bp, exp);
    curve.checkPointOnCurve(result);
    return result;
}


export function randomFieldElement(prime: bigint = SetupCurveParam('EC_ALT_BN128').prime): bigint {
    let bitLength = Math.ceil(prime.toString(2).length / 8);
    let randomHex = CryptoJS.lib.WordArray.random(bitLength).toString(CryptoJS.enc.Hex);
    const random = BigInt('0x' + randomHex);
    return math.mod(random, prime);
}