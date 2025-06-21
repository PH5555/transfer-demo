import math from './math';
import CurveParam from './curveParam';
import { toHex } from '../../utilities';

BigInt.prototype.mod = function (n) {
    return ((this % n) + n) % n;
};

class AffinePoint {
    constructor(x, y) {
        try {
            this.x = BigInt(x);
            this.y = BigInt(y);
        } catch (e) {
            if (e.name === 'SyntaxError') {
                this.x = BigInt('0x' + x);
                this.y = BigInt('0x' + y);
            } else {
                throw e;
            }
        }
    }

    toJson() {
        let pointJson = {};
        pointJson[0] = this.x.toString(16);
        pointJson[1] = this.y.toString(16);
        return pointJson;
    }

    toHexArray() {
        return [toHex(this.x), toHex(this.y)];
    }

    toArray() {
        return [this.x, this.y];
    }

    static fromJson(pointJson) {
        let dataJson = JSON.parse(pointJson);

        return new AffinePoint(dataJson.x, dataJson.y);
    }
}

class TwistedEdwardsCurve {
    constructor(CurveParam) {
        this.prime = CurveParam.prime;
        this.g = CurveParam.g;
        this.coefA = CurveParam.coefA;
        this.coefD = CurveParam.coefD;
    }

    preprocess(p, exp) {
        let preTable = [p];

        for (let i = 0; i < exp.toString(2).length; i += 1) {
            let baseP = preTable[preTable.length - 1];
            preTable.push(this.doubleAffinePoint(baseP));
        }

        return preTable;
    }

    mul(preTable, exp) {
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

    preprocessBasePoint(p) {
        let newX = math.mod(p.x, this.prime);
        let newY = math.mod(p.y, this.prime);

        return new AffinePoint(newX, newY);
    }

    doubleAffinePoint(p) {
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

    addAffinePoint(p1, p2) {
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

    subAffinePoint(p1, p2) {
        let negP2 = new AffinePoint(math.mod(-p2.x, this.prime), p2.y);
        return this.addAffinePoint(p1, negP2);
    }

    fieldDivision(a, b) {
        return math.mod(a * math.modInv(b, this.prime), this.prime);
    }

    checkScalar(value) {
        return value.toString(2).length <= this.prime.toString(2).length;
    }

    // computeYCoord(x) {
    //     let x2 = math.mod(x * x, this.prime);
    //     let x3 = math.mod(x2 * x, this.prime);
    //     let squared = math.mod(x3 + this.coefA * x2 + x, this.prime);
    //     let ySquared = this.fieldDivision(squared, this.coefB);
    //     let y = math.modularSqrt(ySquared, this.prime);
    //     return y;
    // }

    checkPointOnCurve(p) {
        let x2 = math.modPow(p.x, BigInt('2'), this.prime);
        let y2 = math.modPow(p.y, BigInt('2'), this.prime);

        let lhs = math.mod(x2 * this.coefA + y2, this.prime);
        let rhs = math.mod(this.coefD * x2 * y2 + BigInt('1'), this.prime);

        console.assert(lhs === rhs, p.toJson());
    }

    computeScalarMul(p, exp) {
        let bp = this.preprocessBasePoint(p);
        this.checkPointOnCurve(bp);
        let preTable = this.preprocess(bp, exp);
        let output = this.mul(preTable, exp);
        return output;
    }
}

/**
 *
 * @param {bigint}      exp         expo value
 * @param curveOption
 * @returns {{x: bigint, y: bigint}}                computed point {x, y}
 */
export function basePointMul(exp, curveOption = undefined) {
    let cvParam =
        curveOption !== undefined
            ? CurveParam(curveOption)
            : CurveParam('EC_ALT_BN128');
    let curve = new TwistedEdwardsCurve(cvParam);
    let bp = new AffinePoint(curve.g.x, curve.g.y);
    curve.checkPointOnCurve(bp);
    let result = curve.computeScalarMul(bp, exp);
    curve.checkPointOnCurve(result);
    return result;
}

const Curve = {
    AffinePoint,
    TwistedEdwardsCurve,
    basePointMul,
};

export default Curve;
