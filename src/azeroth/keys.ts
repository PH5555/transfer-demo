import mimc from '../common/crypto/mimc'
import {
    AffinePoint,
    basePointMul,
    randomFieldElement
} from '../common/crypto/curve';
import { Constants } from './types';
import { fromHex, toHex, toJson } from '../common/utilities';
import {
    IAuditKey,
    IUPK,
    IUserKey,
} from './interfaces';

export class AuditKey implements IAuditKey {

    pk: AffinePoint;
    sk: bigint;

    constructor(pk: AffinePoint, sk: bigint) {
        this.pk = pk.clone();
        this.sk = sk;
    }

    toJson() {
        return toJson(
            {
                pk: JSON.parse(this.pk.toJson()),
                sk: toHex(this.sk),
            }
        );
    }

    static fromJson(auditKeyJson: string) {
        let { pk, sk } = JSON.parse(auditKeyJson);
        return new AuditKey(
            AffinePoint.fromJsonObj(pk),
            BigInt(sk)
        );
    }

    static keyGen() {
        let sk = randomFieldElement(Constants.SUBGROUP_ORDER);
        let pk = basePointMul(sk);
        return new AuditKey(pk, sk);
    }
}

export class UPK implements IUPK {

    ena: bigint;
    pkOwn: bigint;
    pkEnc: AffinePoint;

    constructor({ ena, pkOwn, pkEnc }: { ena: bigint, pkOwn: bigint, pkEnc: AffinePoint }) {
        this.ena = ena;
        this.pkOwn = pkOwn;
        this.pkEnc = pkEnc.clone();
    }

    toJson() {
        return toJson({
            ena: toHex(this.ena),
            pkOwn: toHex(this.pkOwn),
            pkEnc: this.pkEnc.toJsonObj(),
        });
    }

    static fromJson(userKeyJson: string) {
        const userKey = JSON.parse(userKeyJson);
        return new UPK({
            ena: BigInt(userKey.ena),
            pkOwn: BigInt(userKey.pkOwn),
            pkEnc: AffinePoint.fromJsonObj(userKey.pkEnc),
        });
    }

    isEmpty() {
        return (this.ena === 0n || this.pkOwn === 0n);
    }
}

export class UserKey implements IUserKey {

    pk: UPK;
    sk: bigint;

    constructor({ ena, pkOwn, pkEnc, sk }: { ena: bigint, pkOwn: bigint, pkEnc: AffinePoint, sk: bigint }) {
        this.pk = new UPK({ ena, pkOwn, pkEnc });
        this.sk = sk;
    }

    toJson() {
        return toJson({
            pk: JSON.parse(this.pk.toJson()),
            sk: toHex(this.sk),
        });
    }

    static fromJson(userKeyJson: string) {
        const jsonData = JSON.parse(userKeyJson);
        return new UserKey({
            ena: fromHex(jsonData.pk.ena),
            pkOwn: fromHex(jsonData.pk.pkOwn),
            pkEnc: new AffinePoint(fromHex(jsonData.pk.pkEnc.x), fromHex(jsonData.pk.pkEnc.y)),
            sk: fromHex(jsonData.sk),
        });
    }

    static keyGen() {

        const sk = randomFieldElement(Constants.SUBGROUP_ORDER);

        return UserKey.recoverFromUserSk(sk);

    }

    static recoverFromUserSk(sk: bigint) {

        const mimc7 = new mimc.MiMC7();

        const pkOwn = mimc7.hash(sk);

        const pkEnc = basePointMul(sk);

        const ena = mimc7.hash(
            pkOwn,
            pkEnc.x,
            pkEnc.y,
        );

        return new UserKey({ ena, pkOwn, pkEnc, sk });
    }
}