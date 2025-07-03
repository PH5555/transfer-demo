import Note from '../note';
import mimc, { MiMCBase } from '../../common/crypto/mimc';
import encryption from '../../common/crypto/deprecated/encryption';
import { randomFieldElement } from '../../common/crypto/curve';
import SnarkInputParam, { Statement, Witness } from './snarkInputParam';
import { GenerationSnarkInput } from '../types';
import { addHexPrefix, toJson } from '../../common/utilities';

function getNullNote(
    mimc: MiMCBase,
    senderENA: bigint,
    tokenAddress: string,
    tokenId: bigint,
) {
    const oldOpen = randomFieldElement();
    const oldAmount = BigInt('0');
    const oldCm = mimc.hash(
        oldOpen,
        BigInt(tokenAddress),
        tokenId,
        oldAmount,
        senderENA,
    );
    const oldNote = {
        open: oldOpen,
        tokenAddress,
        tokenId,
        amount: oldAmount,
        addr: senderENA,
        commitment: oldCm,
        index: BigInt('0'),
    };

    return new Note(oldNote);
}

export function generateSnarkInput(
    rawInput: GenerationSnarkInput,
    receiverEOA: string,
) {

    consoleDebug("generateSnarkInput ...")

    const { zkWalletKeys, transferAmount, sCT, tokenInfo, root, merklePath } = rawInput;

    consoleDebug("generateSnarkInput .. : zkWalletKeys = \n", toJson(zkWalletKeys, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : transferAmount = \n", toJson(transferAmount, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : sCT = \n", toJson(sCT, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : tokenInfo = \n", toJson(tokenInfo, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : root = \n", toJson(root, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : merklePath = \n", toJson(merklePath, 2, 'hex'))

    const mimc7 = new mimc.MiMC7();
    const senc = new encryption.symmetricKeyEncryption(zkWalletKeys.userKey.sk);
    const penc = new encryption.publicKeyEncryption();

    consoleDebug("generateSnarkInput .. : senc = \n", toJson(senc, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : penc = \n", toJson(penc, 2, 'hex'))

    if (!transferAmount.fromNote) {
        consoleDebug("generateSnarkInput .. : getNullNote ... ")
        transferAmount.fromNote = getNullNote(
            mimc7,
            zkWalletKeys.userKey.pk.ena,
            tokenInfo.tokenAddress,
            tokenInfo.tokenId,
        );
    }

    consoleDebug("generateSnarkInput .. : note = \n", toJson(transferAmount.fromNote, 2, 'hex'))

    const [inPrivate, inPublic, outPrivate, outPublic] = [
        transferAmount.fromNote.amount,
        transferAmount.fromPublicAmount,
        transferAmount.toPrivateAmount,
        transferAmount.toPublicAmount,
    ];

    const decryptedSCT = sCT.empty() ? ['0', '0', '0'] : senc.Dec(sCT);

    consoleDebug("generateSnarkInput .. : decryptedSCT = \n", toJson(decryptedSCT, 2, 'hex'))

    const serialNumber = mimc7.hash(
        transferAmount.fromNote.commitment,
        zkWalletKeys.userKey.sk,
    );

    consoleDebug("generateSnarkInput .. : serialNumber = \n", toJson(serialNumber, 2, 'hex'))

    const newOpen = randomFieldElement();

    consoleDebug("generateSnarkInput .. : newOpen = \n", toJson(newOpen, 2, 'hex'))

    const pctMsg = [
        newOpen,
        tokenInfo.tokenAddress,
        tokenInfo.tokenId,
        outPrivate,
        zkWalletKeys.receiverKey.ena,
    ];

    consoleDebug("generateSnarkInput .. : pctMsg = \n", toJson(pctMsg, 2, 'hex'))

    const [newPCT, newR, newK] = penc.Enc(
        zkWalletKeys.auditKey.pk,
        zkWalletKeys.receiverKey,
        ...pctMsg,
    );

    consoleDebug("generateSnarkInput .. : newPCT = \n", toJson(newPCT, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : newR = \n", toJson(newR, 2, 'hex'))
    consoleDebug("generateSnarkInput .. : newK = \n", toJson(newK, 2, 'hex'))

    const newEnaBal =
        BigInt(addHexPrefix(decryptedSCT[2])) +
        (inPrivate + inPublic) -
        (outPrivate + outPublic);

    consoleDebug("generateSnarkInput .. : newEnaBal = \n", toJson(newEnaBal, 2, 'hex'))

    if (newEnaBal < 0) {
        throw new Error('Invalid transfer amount');
    }

    const newSCT = senc.Enc(
        tokenInfo.tokenAddress,
        tokenInfo.tokenId,
        newEnaBal,
    );

    consoleDebug("generateSnarkInput .. : newSCT = \n", toJson(newSCT, 2, 'hex'))

    const newCm = mimc7.hash(
        newOpen,
        BigInt(tokenInfo.tokenAddress),
        tokenInfo.tokenId,
        outPrivate,
        zkWalletKeys.receiverKey.ena,
    );

    consoleDebug("generateSnarkInput .. : newCm = \n", toJson(newCm, 2, 'hex'))

    let token = {
        addressStatement: '0',
        idStatement: BigInt(0),
        addressWitness: tokenInfo.tokenAddress,
        idWitness: tokenInfo.tokenId,
    };

    consoleDebug("generateSnarkInput .. : token = \n", toJson(token, 2, 'hex'))

    if (inPublic !== BigInt(0) || outPublic !== BigInt(0)) {
        token.addressStatement = token.addressWitness;
        token.idStatement = token.idWitness;
    }

    const statement: Statement = {
        apk: zkWalletKeys.auditKey.pk,
        cin: sCT,
        rt: root,
        sn: serialNumber,
        addr: zkWalletKeys.userKey.pk.ena,
        k_b: zkWalletKeys.userKey.pk.pkOwn,
        k_u: zkWalletKeys.userKey.pk.pkEnc,
        cm_: newCm,
        cout: newSCT,
        pv: inPublic,
        pv_: outPublic,
        tk_addr_: token.addressStatement,
        tk_id_: token.idStatement,
        G_r: newPCT.c0,
        K_u: newPCT.c1,
        K_a: newPCT.c2,
        CT: newPCT.c3,
    };

    const witness: Witness = {
        sk: zkWalletKeys.userKey.sk,
        cm: transferAmount.fromNote.commitment,
        du: transferAmount.fromNote.open,
        dv: inPrivate,
        tk_addr: token.addressWitness,
        tk_id: token.idWitness,
        addr_r: zkWalletKeys.receiverKey.ena,
        k_b_: zkWalletKeys.receiverKey.pkOwn,
        k_u_: zkWalletKeys.receiverKey.pkEnc,
        du_: newOpen,
        dv_: outPrivate,
        r: newR,
        k: newK,
        k_point_x: newK.x,
        leaf_pos: transferAmount.fromNote.index,
        tree_proof: merklePath,
    };


    return new SnarkInputParam(
        statement,
        witness,
        tokenInfo.enaIndex,
        receiverEOA,
    );
}


function consoleDebug(message?: any, ...optionalParams: any[]): void {
    console.log(message, ...optionalParams);
}