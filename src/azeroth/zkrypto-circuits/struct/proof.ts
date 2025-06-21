import { toJson } from "../../../common/utilities";

export interface ProofInterface {
    a: string[];
    b: string[];
    c: string[];
}

export default class Proof implements ProofInterface {
    a: string[];
    b: string[];
    c: string[];

    constructor(a: string[], b: string[], c: string[]) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    toJson() {
        return toJson(this, 2);
    }

    static fromJson(proofJson: string) {
        let dataJson = JSON.parse(proofJson);
        return new Proof(dataJson.A, dataJson.B, dataJson.C);
    }

    static fromLibrary(rawProof: string) {
        let proofObj: { A: string[], B: string[], C: string[] } = JSON.parse(rawProof);

        proofObj.B = [
            proofObj.B[1],
            proofObj.B[0],
            proofObj.B[3],
            proofObj.B[2],
        ];

        return new Proof(proofObj.A, proofObj.B, proofObj.C);
    }
}
