import _ from 'lodash';
import { toJson } from '../../../common/utilities';
import init, { prove, verify } from '../../../wasm/zkwallet_circuit';

export default class ZkryptoCircuits {

    pk_path = '';
    pk = undefined;
    vk = undefined;
    pvk = undefined;

    constructor() { }

    /**
     * call native module [createCircuitContext] in zkrypto-circuits
     * If the contextId exists, it first calls finalizeCircuit.
     * @returns {Promise<true>}
     */
    async start() {
        consoleLog('[ZKRYPTO-CIRCUITS] Initializing wasm');
        await init();

        consoleLog('[ZKRYPTO-CIRCUITS] Initializing module');

        this.pk_path = '/CRS_pk.dat';

        consoleDebug('[ZKRYPTO-CIRCUITS] Loading VK CRS...');
        await this.readVerifyKeyFromFile();
        await this.readProofKeyFromFile();
        await this.readPreparedVerifyKeyFromFile();

        consoleDebug('[ZKRYPTO-CIRCUITS] Loading VK CRS ... Done ');

        consoleDebug('[ZKRYPTO-CIRCUITS] CRS is loaded!');
        consoleLog('[ZKRYPTO-CIRCUITS] Initializing module ... Done');

        return true;
    }

    initialized() {
        return this.pk !== undefined && this.vk !== undefined;
    }

    async runProof(inputJson) {
        consoleLog(" Run Proof : ");
        const proof = prove(this.pk, this.jsonToBase64(inputJson));
        return proof;
    }

    async runVerify(proof, image) {
        return verify(this.pvk, this.jsonToBase64(proof), this.jsonToBase64(image));
    }

    jsonToBase64(json) {
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(json);
        const base64 = btoa(String.fromCharCode(...jsonBytes));
        return base64;
    }

    async readVerifyKeyFromFile() {
        await fetch('/CRS_vk.dat')
                .then(response => {
                    if (!response.ok) {
                    throw new Error('Network response was not ok');
                    }
                    return response.arrayBuffer();
                })
                .then(buffer => {
                    const bytes = new Uint8Array(buffer);
                    let binary = "";
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    console.log('verify key Base64:', base64);
                    this.vk = base64;
                })
                .catch(error => {
                    console.error('Error fetching file:', error);
                });
    }

    async readPreparedVerifyKeyFromFile() {
        await fetch('/CRS_pvk.dat')
                .then(response => {
                    if (!response.ok) {
                    throw new Error('Network response was not ok');
                    }
                    return response.arrayBuffer();
                })
                .then(buffer => {
                    const bytes = new Uint8Array(buffer);
                    let binary = "";
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    console.log('prepared verify key Base64:', base64);
                    this.pvk = base64;
                })
                .catch(error => {
                    console.error('Error fetching file:', error);
                });
    }

    async readProofKeyFromFile() {
        await fetch('/CRS_pk.dat')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                const bytes = new Uint8Array(buffer);
                let binary = "";
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                console.log('proof key Base64:', base64);
                this.pk = base64;
            })
            .catch(error => {
                console.error('Error fetching file:', error);
            });
    }
}


function consoleLog(message, ...optionalParams) {
    console.log(message, ...optionalParams);
}

function consoleDebug(message, ...optionalParams) {
    console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message, ...optionalParams) {
    // console.debug(message, ...optionalParams);
}