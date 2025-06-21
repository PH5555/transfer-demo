import { toJson } from '../../common/utilities';
import { ZkTransferMeta } from '../types';
import ZkryptoCircuits from '../zkrypto-circuits';
import { generateSnarkInput } from './generateSnarkInput';

export async function generateZkTransferInput(transfer: ZkTransferMeta) {

    consoleDebug("generateZkTransferInput ...")

    const snarkInput = generateSnarkInput(
        {
            zkWalletKeys: transfer.zkWalletKeys,
            tokenInfo: transfer.tokenInfo,
            transferAmount: transfer.amounts,
            sCT: transfer.sCT,
            root: transfer.root,
            merklePath: transfer.merklePath,
        },
        transfer.amounts.toPublicAmount > BigInt(0) ? transfer.networkKeys.receiverEOA : '0x0000000000000000000000000000000000000000',
    );

    consoleDebug("generateZkTransferInput .. : snarkInput = \n", toJson(snarkInput, 2))

    const circuitInput = snarkInput.toCircuitArgs();
    const { statement, witnesses } = JSON.parse(circuitInput);

    consoleDebug("generateZkTransferInput .. : statement = \n", toJson(statement, 2))
    consoleDebug("generateZkTransferInput .. : witnesses = \n", toJson(witnesses, 2))

    const rawProof = await ZkryptoCircuits.service.runProof(circuitInput);

    consoleDebug("generateZkTransferInput .. : rawProof = \n", toJson(rawProof, 2))

    const verified = await ZkryptoCircuits.service.runVerify(
        rawProof,
        toJson(statement),
    );

    consoleDebug("generateZkTransferInput .. : verified = ", toJson(verified, 2))

    if (verified !== true) {
        throw Error('verify failed');
    }

    const proof = ZkryptoCircuits.structure.proof.fromLibrary(rawProof);

    consoleDebug("generateZkTransferInput .. : proof = \n", toJson(proof, 2))

    // blockchain
    return snarkInput.toContractArgs(proof);
}


function consoleDebug(message?: any, ...optionalParams: any[]): void {
    // console.log(message, ...optionalParams);
}