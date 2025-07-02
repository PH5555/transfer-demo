import { AffinePoint } from '../../common/crypto/interfaces';
import { sCT } from '../../common/crypto/deprecated/encryption';
import { addPrefixHex, removePrefix, toHex, padZeroHexString, toJson } from '../../common/utilities';
import Proof from '../zkrypto-circuits/struct/proof';

export type Statement = {
    apk: AffinePoint;
    cin: sCT;
    rt: bigint;
    sn: bigint;
    addr: bigint;
    k_b: bigint;
    k_u: AffinePoint;
    cm_: bigint;
    cout: sCT;
    pv: bigint;
    pv_: bigint;
    tk_addr_: string;
    tk_id_: bigint;
    G_r: AffinePoint;
    K_u: AffinePoint;
    K_a: AffinePoint;
    CT: string[];
};

export type Witness = {
    sk: bigint;
    cm: bigint;
    du: any;
    dv: bigint;
    tk_addr: string;
    tk_id: bigint;
    addr_r: bigint;
    k_b_: bigint;
    k_u_: AffinePoint;
    du_: bigint;
    dv_: bigint;
    r: string;
    k: AffinePoint;
    k_point_x: bigint;
    leaf_pos: bigint;
    tree_proof: bigint[];
    leaf_index: bigint;
};

export default class SnarkInputParam {
    statement: Statement;
    witness: Witness;
    enaIndex: number | bigint;
    receiverEOA: string;

    constructor(
        statement: Statement,
        witness: Witness,
        enaIndex: number | bigint,
        receiverEOA: string,
    ) {
        this.statement = statement;
        this.witness = witness;

        this.enaIndex = enaIndex;
        this.receiverEOA = receiverEOA;
    }

    toContractArgs(proof: Proof): (string | bigint | bigint[])[] {
        const newSCT = [
            BigInt(addPrefixHex(this.statement.cout.r)),
            ...this.statement.cout.ct.map(addPrefixHex).map(vStr => BigInt(vStr)),
        ];
        const proofArg = [
            ...proof.a.map(addPrefixHex).map(vStr => BigInt(vStr)),
            ...proof.b.map(addPrefixHex).map(vStr => BigInt(vStr)),
            ...proof.c.map(addPrefixHex).map(vStr => BigInt(vStr)),
        ];
        const inputsArg = [
            this.statement.rt,
            this.statement.sn,
            this.statement.cm_,
            ...newSCT,
            this.statement.pv,
            this.statement.pv_,
            BigInt(addPrefixHex(this.statement.tk_addr_)),
            this.statement.tk_id_,
            ...this.statement.G_r.toArray(),
            ...this.statement.K_u.toArray(),
            ...this.statement.K_a.toArray(),
            ...this.statement.CT.map(addPrefixHex).map(vStr => BigInt(vStr)),
        ];
        return [
            proofArg,
            inputsArg,
            this.receiverEOA,
            BigInt(this.enaIndex),
        ];
    }

    toCircuitArgs() {
        return toJson({
            statement: {
                apk: [
                    this.statement.apk.x.toString(16),
                    this.statement.apk.y.toString(16),
                ],
                cin: [
                    removePrefix(this.statement.cin.r),
                    removePrefix(this.statement.cin.ct[0]),
                    removePrefix(this.statement.cin.ct[1]),
                    removePrefix(this.statement.cin.ct[2]),
                ],
                rt: this.statement.rt.toString(16),
                sn: this.statement.sn.toString(16),
                addr: this.statement.addr.toString(16),
                k_b: this.statement.k_b.toString(16),
                k_u: [
                    this.statement.k_u.x.toString(16),
                    this.statement.k_u.y.toString(16),
                ],
                cm_: this.statement.cm_.toString(16),
                cout: [
                    this.statement.cout.r,
                    this.statement.cout.ct[0],
                    this.statement.cout.ct[1],
                    this.statement.cout.ct[2],
                ],
                pv: padZeroHexString(this.statement.pv.toString(16)),
                pv_: padZeroHexString(this.statement.pv_.toString(16)),
                tk_addr_: removePrefix(this.statement.tk_addr_),
                tk_id_: this.statement.tk_id_.toString(16),
                G_r: [
                    this.statement.G_r.x.toString(16),
                    this.statement.G_r.y.toString(16),
                ],
                K_u: [
                    this.statement.K_u.x.toString(16),
                    this.statement.K_u.y.toString(16),
                ],
                K_a: [
                    this.statement.K_a.x.toString(16),
                    this.statement.K_a.y.toString(16),
                ],
                CT: this.statement.CT,
            },
            witnesses: {
                sk: padZeroHexString(this.witness.sk.toString(16)),
                cm: padZeroHexString(this.witness.cm.toString(16)),
                du: padZeroHexString(this.witness.du.toString(16)),
                dv: padZeroHexString(this.witness.dv.toString(16)),
                tk_addr: removePrefix(padZeroHexString(this.witness.tk_addr, 40)),
                tk_id: this.witness.tk_id.toString(16),
                addr_r: this.witness.addr_r.toString(16),
                k_b_: this.witness.k_b_.toString(16),
                k_u_: [
                    this.witness.k_u_.x.toString(16),
                    this.witness.k_u_.y.toString(16),
                ],
                du_: this.witness.du_.toString(16),
                dv_: padZeroHexString(this.witness.dv_.toString(16)),
                r: this.witness.r,
                k: [
                    this.witness.k.x.toString(16),
                    this.witness.k.y.toString(16),
                ],
                k_point_x: this.witness.k_point_x.toString(16),
                leaf_pos: (idx => {
                    let decStr = idx.toString(16);
                    return decStr.substring(0, decStr.length).padStart(32, '0');
                })(this.witness.leaf_pos),
                tree_proof: this.witness.tree_proof.map(x => x.toString(16)),
                leaf_index: this.witness.leaf_index.toString(16),
            },
        });
    }
}
