
import { AffinePoint } from "../common/crypto/interfaces";

export interface IAuditKey {
    pk: AffinePoint;
    sk: bigint;
    toJson(): string;
}

export interface IUPK {
    ena: bigint;
    pkOwn: bigint;
    pkEnc: AffinePoint;
    toJson(): string;
}

export interface IUserKey {
    pk: IUPK;
    sk: bigint;
    toJson(): string;
}

export interface INote {

    open: bigint;
    tokenAddress: string;
    tokenId: bigint;
    amount: bigint;
    addr: bigint;
    commitment: bigint;
    index: bigint;
    isSpent: boolean;

    toJson(): string;
    isValid(): boolean;
}

export interface IZkEventData {
    readonly nullifier: bigint;
    readonly com: bigint;
    readonly ct: bigint[];           // experts an array of 11 values
    readonly numLeaves: bigint;
    readonly ena: bigint[];          // experts an array of 6 values  
};

export type ITransferMetaAmount = {
    // inPublic
    fromPublicAmount: bigint;
    // (is not use in this function)
    fromPrivateAmount: bigint;
    // inPrivate
    fromNote: INote | undefined;
    // outPublic
    toPublicAmount: bigint;
    // outPrivate
    toPrivateAmount: bigint;
    // (is not use in this function)
    remainingAmount: bigint;
};