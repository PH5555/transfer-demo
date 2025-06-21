import Proof from './struct/proof';
import SnarkInput from './struct/snarkInput';
import VerificationKey from './struct/vk';
import ZkryptoCircuitClass from './bridge/zkrypto-circuits';

const ZkryptoCircuits = {
    structure: {
        proof: Proof,
        snarkInput: SnarkInput,
        verificationKey: VerificationKey,
    },
    service: new ZkryptoCircuitClass(),
};

export type ProofType = Proof;
export default ZkryptoCircuits;
