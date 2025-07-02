import _ from 'lodash';
import { toJson } from '../../../common/utilities';
import init, { prove } from '../../../wasm/zkwallet_circuit';

export default class ZkryptoCircuits {

    pk_path = '';
    pk = undefined;
    vk = undefined;

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

        consoleDebug('[ZKRYPTO-CIRCUITS] Loading VK CRS ... Done ');

        this.vkObj = {
            Alpha_g1: [
                '149adc526b4a8ddc95224fe21b071a596ae5cca1948edaedd1568f4e3f774ba3',
                '258c1d3a2fbfba23365cb5d59c38b2f51f9373ffa326b7b48d796fdae6f755c4',
            ],
            Beta_g2: [
                '1332b4273467121fc259662497f7e6ef463667a15a39c87a810b41b2d4f9538',
                '2b54c7f3f4d0f1c773680a0aba64afe4dbdc27ac80b0af9fe7ce0d364203dfe9',
                'bf72ad03728e7ed3e216a2ca3f9d5f7ff6529c29968df3b136ca8c6d2472e50',
                '11cb159c0fcd620467aa202298434115c9de439fed3d0225079da09bc81d993b',
            ],
            Gamma_g2: [
                'e954c5967d3e2bf5fba2e7221b33b5a9c9c25471d6220a5a2aae8ee9a5220c8',
                'c3b533219cb1ef9fe85dec4b1bccc5481a7332eae5dca9201ae9721cd3da209',
                '201de84dee184ae91d5d1b4b59c8d184b04eab610b32d346eea56b56e389b15d',
                '81665bab72111c43327c35ddc18e4d68447a349c990af5a9bab41dc47a44377',
            ],
            Delta_g2: [
                'ead53ae7d1d1fffc96997f6cc0f8f06996747b662a6aba76ffb7a8d53ca0c65',
                '52a739a592f7f9aa91cd891b06e3826bc8a782ffe9a9e434f5888c8a7ee61eb',
                '23769b914fb20a0b8762cbd3812226086bb1a1028bc24925b2b5b87439a83e3b',
                '293bcc9700bfb85798757dcd4d1b05329ef2ed8375c00712c4baf36ccecc07b3',
            ],
            Gamma_abc_g1: [
                '2d40a3791190f7c8dde7c4748b3846172836ec6a9a58f4527b5aff99af0c026b',
                '559ff3c314dd439ff86afceac074e875b8f5343b1d8989153e6534d225480b7',
                '1843144d9cf4d2b1cfab0aa322a9646a2e689c770bc540e763f62b4aab5096dd',
                '2c072a6a53124b8c5b3c9915ec86384fc1354cc6b2398266ef096f730c0a2e14',
                '20d9e94675a2f25f6e77ce1972db8adae32eec9469ba641865d9a9a4e38ae2a1',
                '61b345bdbae86e57fb8d2c76020f1da7943d79eda2b4aa0ae60f49825c658d7',
                '1294b1744f52af61281a0c9f650883977a8eb48ae392fb9807a153a900110952',
                '1b4cc642730f3cc2c91ab161f1950118c6ffd22f85e614686ba6e3468a4292b4',
                '19f95f34dadd72f4fa1fa5a89a7c4ad69397dda618d05979d4f70b88517c08ad',
                '9696ddf3685cfe3352b15133398f6a5d5bcc32738c1fa21d401ea44151d03ad',
                '1134b2d30e1e70e21876cabe08c761a59abdafe29244d4890876550a689e5964',
                '5dbb5a4137beacfbf63b555859abcd157af7ffa611daa28dc2b37775f4290e0',
                '1a7307a8a8b7205c605d7693031bbc1a8c208ad1a90286e3dc97e4a97a0cb13a',
                '174dbf0d19ec92d2fe85f10d6037257cd2e74fb37a78dfaf3522482690c226a5',
                'e6a3c473132f0ee297ad2c5610c7f0276a72500cffa0f9c9ea20217714dcd19',
                '169d62414cb32118d2477aee629f71b4640c02d7bf0226328b5985015741f10d',
                '12306e6e84b1b5500d144867d8c87165d180044739fd0188a15f07629832e920',
                '22ee49e73d20d2419a46c2c4e809d8dc267e2d4648f11aea96b32df884b8d6',
                '1581c06c2055ad68501ae1e54ebb6e0eea5a08282926ad801a4ba1f6d443dc0b',
                '127dab4111d89554e9cadd860fa25ccb34c02a61eb9cf76fa9a00c636f192b64',
                '2db7682b7ea9adca41283c451f72b61d08537ab9e68f24e5a52f0f10e5755ded',
                '10476e44b37d52f0c3558365b37533708ec340967d07f184d156bd5539564cbd',
                '37bf1ab79dcc56270c8184c3b0ab66eb34ddcff9a0d2ed48897a14f5eb040',
                '2e1ab344b02a9cf5b4af4b9dedcf821c8b2a8cee155f6cc7e07534e2ab60e722',
                '157ef235174714e79bd20d7c58341849431f172e1c8400dfbd1fd14e74e80a6e',
                '18c23be1a74ad666618c77d5950f54d7cfa46de97e1b911745d9e6d94ef1973',
                '12ddf2a8314f7992b3e3f949e489bb5495adb63a8f736f74237d38fdac28ec1e',
                '2b336813543bdaf6c11bd29e180712a20fa287eafcbaed43138fec3cb4300827',
                '1400d83bbfa143e728bb2c70c6483402597b14abe4d3631c37e5f916b8e5885f',
                '1e7dc3c888af3bdd0f5009bdc13025ee63f2f8c59161599c3793266c17bfbc53',
                '1b7cec2abdd854c08d3e9106cfd438ce29d44a9e60e84eb335758c998eaaefd0',
                '23b1afaa8c6a145202721ea2ffdffd4fde3cbc2024aa03d8a0c6c828a40c2bc4',
                '117fe6a8c086ad5283d58b080277e2f0807df76f65a39e28c1060875671750a1',
                '2b4918805c4b64a1e3a0495fc48804478f6573ce0bdcda1e7d726778d91fa8ab',
                '2ccbd34ca17fdebbe88de73101e1368ed3563617e50aca1acad1337e6af22058',
                '223abf92ae54c82aa3d3ad971542de2c3a26b2741344e8f09c6aaa16969b7f4f',
                '2b345ddc561fdacbb662e590c56d6cd0035b5dfc17af5fc3e1fd802c5c302211',
                '9c010b21673e5f1c46db0f3320076bfdabe3eac31ca43dc4ed2ecc2a46a95e0',
                'ee7ca01c7c7b687351962844aa619b03446cbd9cb964b980ba8c7811dc9ae2c',
                '198f80a488fca42d55c9a65bdbb9bf9b81f7b5ade7420fe406bc947d784b83fa',
                '2b7329331b752a354931c4b40d0e3fe333463aaa2011102ca314870b8dc4a61a',
                '220365b5dd0ad046b2007d9446541790d28dd9e0a7be17457d8b41e77862f471',
                '142bf86859e22641d409c7aa29a7b7f77d1054e42548085a530408b45df8a8fb',
                '2d909eafc364f4218c30d2ac5d105b3bc87350e292886046bdd78df55cd0d9d9',
                '10da86e8ee03c5d2dca08eb630b9e0cc8f3ee74644676db00e772da57ddecb6c',
                '86de6b24e28a656d50143841850bde822d9165562362809fc36ac51d6f7ea59',
                '1d7763dd203a64f04e344164d410b3a534404f5f661fe64151000c8ccb51214d',
                '1000b9d91340b64455b1494212bb8874ea19a3764419f692ecc2fbb86527f1d0',
                '29d78ac43120d1fddc7a906388417b205bb544d51c971322557af042d4a63925',
                '1edd86e4f9694d272a995418e4fdff9da9c303a9ad97d144b6b00be4160ae5d1',
                '2dab372e83b86d32c9669fd8c47d2d52eb0c4ff263ba2ee5471d62b1eb9434b3',
                '2d66ad7409d66089fea265b3d0fe2b75277395dddfab22c2ca024727384d9235',
                '1c839291b045858b983e8770867ceac0e7f102752c1f8d5c6d996719a8d5e43f',
                '165224ac6823876d000e20f1d7e090e2c0e46e66fc493b6300e4d40b69d1501c',
                '14a03fcbdb6fcf93cdee545ff09e1456097573e0cee8c9b4375831ee8a900177',
                '1e14734f30c293ebe149a782c8e0e85266b08648ed6197746c4c7774a2e3c59d',
                '14cd569851519ec634a6b4efed2a1d2ed5705bb15a403c0248b2c3a78b0dfc12',
                '24ddaa5d5427a60248bf0a059d9e258bcef51292bbb7b28009783aff04675eb4',
                '12cab3a9378568ac12ca3505a2e6e4243af13bcb978ded59fec7cf6c96321dee',
                '18b280792db8ff0c6ef31506d424ef4e4b43d0ce3b85a3e4d65e8bf4ede92663',
                '300cb4a4b20f941375b8c1d0367548fba6ed5d54b024df333066326002626a63',
                'bcb7e23832815dcc0065e3025e140f277ec46a778f23ce791aa25cc55a036dd',
                '2c7b6996bc3f252c36c83bf6e5d350747e0b77d2f2b29da259285cdc6befa7a3',
                '1f4c3eb380d3d82cc24b425ea3d35e34be3976c8d7e30591f437b5ed8a321013',
                '6bf85553f6dc6b1f6a328269155b54a875cb6b68e32d892edef55adbf8c5284',
                '2d0b5e75f4d6728d7a4641426ac7939fb7fb04cd91f1492688a4d7fa114fe080',
            ],
        };
        consoleDebug('[ZKRYPTO-CIRCUITS] CRS is loaded!');
        consoleLog('[ZKRYPTO-CIRCUITS] Initializing module ... Done');

        return true;
    }

    initialized() {
        return this.pk !== undefined && this.vk !== undefined;
    }

    async runProof(inputJson) {
        consoleLog(" Run Proof : ");
        consoleDebug(toJson(JSON.parse(inputJson), null, ' '));
        const encoder = new TextEncoder();
        const jsonBytes = encoder.encode(inputJson);
        const base64Input = btoa(String.fromCharCode(...jsonBytes));
        const proof = prove(this.pk, base64Input);

        return proof;
    }

    async runVerify(proof, image) {
        // const imageJson = image;
        // const proofJson = proof;
        // const vkJson = toJson(this.vkObj);
        // return NativeCircuitModule.runVerify(imageJson, vkJson, proofJson);
        return true;
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
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                    console.log('verify key Base64:', base64);
                    this.vk = base64;
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
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
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
    // console.debug(message, ...optionalParams);
}

function consoleDebugExtra(message, ...optionalParams) {
    // console.debug(message, ...optionalParams);
}